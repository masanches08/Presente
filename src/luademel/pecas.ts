import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three'
import type { Tufo } from '../mundo/Arvore'
import type { Obra } from '../mundo/obra'
import { fbm } from '../mundo/terreno'
import { sorteador } from '../mundo/util'

type V3 = [number, number, number]

/** Coloca uma geometria já girada/escalada no lugar certo */
export function por(o: Obra, mat: string, g: BufferGeometry, pos: V3, giro = 0, esc: number | V3 = 1) {
  if (Array.isArray(esc)) g.scale(...esc)
  else if (esc !== 1) g.scale(esc, esc, esc)
  if (giro) g.rotateY(giro)
  g.translate(...pos)
  o.add(mat, g)
}

const caixa = (w: number, h: number, d: number, y = 0) => new BoxGeometry(w, h, d).translate(0, y + h / 2, 0)
const cil = (r: number, h: number, rTopo = r, seg = 16, y = 0) => new CylinderGeometry(rTopo, r, h, seg).translate(0, y + h / 2, 0)

/** Barra entre dois pontos */
export function barra(o: Obra, mat: string, a: Vector3, b: Vector3, r: number, seg = 6) {
  const d = b.clone().sub(a)
  const c = new CylinderGeometry(r, r, d.length(), seg)
  c.translate(0, d.length() / 2, 0)
  c.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize()))
  c.translate(a.x, a.y, a.z)
  o.add(mat, c)
}

// ======================================================================
// PENHASCO DE CALCÁRIO (karst): coluna irregular com listras cor de ferrugem,
// base escavada pela água e mata nas bordas e no topo
// ======================================================================
export function penhasco(semente: number, r: number, h: number, achatar = 1) {
  const g = new CylinderGeometry(r, r, h, 48, 36, false)
  g.translate(0, h / 2, 0)
  const p = g.attributes.position
  const cores: number[] = []
  const c = new Color()
  const cinza = new Color('#E6E0D6')
  const claro = new Color('#FFFFFF')
  const ferrugem = new Color('#F0B27A')
  const escuro = new Color('#9C958A')
  const molhado = new Color('#556A5E')
  const verde = new Color('#8DB46A')
  const s = semente * 7.13
  const raio = (a: number, t: number) => {
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const n1 = fbm(ca * 1.4 + s + t * 1.8, sa * 1.4 + t * 1.2, 4)
    const n2 = fbm(ca * 4 + s * 2, sa * 4 + t * 6, 3)
    let rr = r * (0.62 + n1 * 0.75) * (1 - Math.pow(t, 1.6) * 0.42)
    rr *= 1 + 0.07 * Math.sin(a * 23 + n2 * 9) // estrias verticais
    rr *= 1 + (n2 - 0.5) * 0.18
    if (t < 0.07) rr *= 0.8 + (t / 0.07) * 0.2 // a água escava a base
    return rr
  }
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const z = p.getZ(i)
    const y = p.getY(i)
    const t = Math.min(1, Math.max(0, y / h))
    const a = Math.atan2(z, x)
    const dist = Math.hypot(x, z) / r // < 1 nas tampas
    const rr = raio(a, t)
    let ny = y
    if (t > 0.999) ny = h + (1 - dist) * r * 0.35 * (0.6 + fbm(x * 0.1 + s, z * 0.1, 2)) // topo arredondado
    p.setXYZ(i, Math.cos(a) * rr * dist, ny, Math.sin(a) * rr * dist * achatar)
    // cores: listras de ferrugem escorrendo, base molhada, topo verde
    const listra = fbm(Math.cos(a) * 6 + s, Math.sin(a) * 6 + t * 0.6, 3)
    c.copy(cinza).lerp(claro, Math.max(0, fbm(a * 3 + s, t * 5, 2) - 0.45) * 1.4)
    if (listra > 0.55) c.lerp(ferrugem, Math.min(1, (listra - 0.55) * 3.2))
    if (listra < 0.3) c.lerp(escuro, (0.3 - listra) * 2.2)
    if (t < 0.05) c.lerp(molhado, 1 - t / 0.05)
    if (t > 0.9) c.lerp(verde, (t - 0.9) * 8)
    cores.push(c.r, c.g, c.b)
  }
  g.setAttribute('color', new Float32BufferAttribute(cores, 3))
  g.computeVertexNormals()

  // mata: no topo, nos "degraus" e pendurada nas paredes
  const rand = sorteador(semente * 31)
  const tufos: Tufo[] = []
  const n = g.attributes.normal
  const v = new Vector3()
  const nn = new Vector3()
  for (let i = 0; i < p.count; i += 2) {
    v.fromBufferAttribute(p, i)
    nn.fromBufferAttribute(n, i)
    const t = v.y / h
    const noTopo = t > 0.9 && rand() < 0.75
    const degrau = nn.y > 0.2 && t > 0.12 && rand() < 0.5
    const pendurada = t > 0.2 && t < 0.92 && fbm(v.x * 0.07 + s, v.y * 0.04 + v.z * 0.03, 2) > 0.58 && rand() < 0.22
    if (noTopo || degrau || pendurada) tufos.push({ centro: v.clone().addScaledVector(nn, 1.0), raio: (noTopo ? 4.2 : pendurada ? 2.2 : 2.8) + rand() * 2 })
  }
  return { geo: g, tufos }
}

// ======================================================================
// ARQUITETURA BALINESA
// ======================================================================

/** Telhado quadrado de fibra (ijuk): tronco de pirâmide grossinho com beiral */
function telhadoQuadrado(o: Obra, mat: string, x: number, y: number, z: number, larg: number, alt: number, topo = 0.25) {
  const r = larg * Math.SQRT1_2
  const g = new CylinderGeometry(r * topo, r, alt, 4, 1)
  g.rotateY(Math.PI / 4)
  g.translate(x, y + alt / 2, z)
  o.add(mat, g)
  const beiral = new CylinderGeometry(r * 1.02, r * 1.05, alt * 0.18, 4, 1)
  beiral.rotateY(Math.PI / 4)
  beiral.translate(x, y + alt * 0.09, z)
  o.add(mat, beiral)
}

/** Base de pedra vulcânica com faixa de tijolo vermelho e degraus */
function base(o: Obra, x: number, y: number, z: number, larg: number, alt: number) {
  por(o, 'pedraVulc', caixa(larg + 0.5, alt * 0.35, larg + 0.5), [x, y, z])
  por(o, 'tijolo', caixa(larg + 0.2, alt * 0.4, larg + 0.2), [x, y + alt * 0.35, z])
  por(o, 'pedraVulc', caixa(larg + 0.4, alt * 0.25, larg + 0.4), [x, y + alt * 0.75, z])
  // ornamentos dos cantos
  for (const dx of [-1, 1])
    for (const dz of [-1, 1]) {
      por(o, 'pedraVulc', cil(0.14, 0.45, 0.02, 8), [x + dx * (larg / 2 + 0.15), y + alt, z + dz * (larg / 2 + 0.15)])
    }
}

/**
 * Meru: o pagode balinês de telhados empilhados (11, 9, 7, 5 ou 3 andares)
 * sobre uma base de pedra, com o santuário de madeira e portinha dourada.
 */
export function meru(o: Obra, x: number, y: number, z: number, niveis: number, larg: number, giro = 0) {
  const altBase = 1.1
  base(o, x, y, z, larg * 0.62, altBase)
  let yy = y + altBase
  // santuário
  const ls = larg * 0.42
  por(o, 'madeiraEscura', caixa(ls, 1.5, ls), [x, yy, z])
  const porta = new BoxGeometry(ls * 0.36, 0.95, 0.04).translate(0, 0.62, ls / 2 + 0.02)
  porta.rotateY(giro)
  porta.translate(x, yy, z)
  o.add('ouro', porta)
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) por(o, 'madeira', cil(0.06, 1.5, 0.06, 8), [x + dx * ls * 0.5, yy, z + dz * ls * 0.5])
  yy += 1.5
  // os telhados, cada um um pouco menor, com um "pescoço" de madeira entre eles
  for (let i = 0; i < niveis; i++) {
    const f = 1 - (i / Math.max(1, niveis)) * 0.72
    const l = larg * f
    const alt = 0.5 + 0.1 * f
    telhadoQuadrado(o, 'ijuk', x, yy, z, l, alt, 0.42)
    for (const [cx2, cz2] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const ponta = new ConeGeometry(0.05 * l, 0.28 * l, 5).rotateZ(cx2 * 0.9).rotateX(-cz2 * 0.9)
      ponta.translate(x + cx2 * l * 0.5, yy + 0.12, z + cz2 * l * 0.5)
      o.add('ijuk', ponta)
    }
    yy += alt
    if (i < niveis - 1) {
      por(o, 'madeiraEscura', caixa(l * 0.34, 0.32, l * 0.34), [x, yy, z])
      yy += 0.32
    }
  }
  // arremate dourado no topo
  por(o, 'ijuk', cil(0.3, 0.4, 0.05, 8), [x, yy, z])
  por(o, 'ouro', cil(0.08, 0.5, 0.01, 8), [x, yy + 0.4, z])
  const bola = new SphereGeometry(0.1, 10, 8).translate(x, yy + 0.45, z)
  o.add('ouro', bola)
  return yy + 0.9
}

/** Bale: pavilhão aberto com colunas de madeira e telhado de fibra */
export function bale(o: Obra, x: number, y: number, z: number, larg: number, prof: number, telhado = 'ijuk') {
  base(o, x, y, z, Math.max(larg, prof) * 0.9, 0.7)
  const yy = y + 0.7
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) por(o, 'madeira', cil(0.09, 2.1, 0.09, 8), [x + (dx * larg) / 2, yy, z + (dz * prof) / 2])
  por(o, 'madeiraEscura', caixa(larg + 0.2, 0.15, prof + 0.2), [x, yy + 2.1, z])
  telhadoQuadrado(o, telhado, x, yy + 2.2, z, Math.max(larg, prof) + 1.4, 1.5, 0.12)
}

/** Portal balinês "candi bentar" (o portão partido ao meio) */
export function candiBentar(o: Obra, x: number, y: number, z: number, giro: number, alt = 5) {
  for (const lado of [-1, 1]) {
    let yy = y
    let w = 2.2
    for (let i = 0; i < 7; i++) {
      const h = alt / 7
      const g = new BoxGeometry(w, h, 1.2).translate(lado * (w / 2 + 0.9), yy + h / 2, 0)
      g.rotateY(giro)
      g.translate(x, 0, z)
      o.add(i % 2 ? 'tijolo' : 'pedraVulc', g)
      yy += h
      w *= 0.84
    }
  }
}

/**
 * Estátua guardiã balinesa: pedestal, flor de lótus, saia de tecido poleng
 * (xadrez preto e branco), tronco, braços segurando uma clava e coroa.
 */
export function estatua(o: Obra, x: number, y: number, z: number, giro = 0, esc = 1) {
  const partes: [string, BufferGeometry][] = []
  const add = (m: string, g: BufferGeometry) => partes.push([m, g])
  add('pedraMusgo', caixa(0.75, 0.55, 0.75))
  add('pedraMusgo', cil(0.4, 0.14, 0.34, 16, 0.55))
  // saia poleng
  add('poleng', new CylinderGeometry(0.24, 0.32, 0.72, 20, 1, true).translate(0, 1.02, 0))
  add('pedraMusgo', new CylinderGeometry(0.3, 0.3, 0.05, 20).translate(0, 0.68, 0))
  add('pedraMusgo', cil(0.24, 0.08, 0.24, 14, 1.36))
  // tronco largo, com a faixa de tecido poleng cruzando o peito
  add('pedraMusgo', new BoxGeometry(0.5, 0.5, 0.3).translate(0, 1.64, 0))
  add('pedraMusgo', new SphereGeometry(0.22, 14, 10).scale(1.15, 0.9, 0.8).translate(0, 1.5, 0.05))
  add('poleng', new TorusGeometry(0.29, 0.05, 6, 20).scale(1, 1, 0.6).rotateZ(0.7).translate(0, 1.66, 0))
  // ombros, braços fortes e a clava
  for (const lado of [-1, 1]) add('pedraMusgo', new SphereGeometry(0.11, 10, 8).translate(lado * 0.28, 1.84, 0))
  add('pedraMusgo', new CylinderGeometry(0.075, 0.09, 0.55, 8).rotateZ(0.35).translate(-0.36, 1.58, 0.05))
  add('pedraMusgo', new CylinderGeometry(0.075, 0.09, 0.5, 8).rotateZ(-1.0).translate(0.4, 1.6, 0.12))
  add('pedraMusgo', new SphereGeometry(0.07, 8, 6).translate(0.58, 1.46, 0.16))
  add('pedraVulc', new CylinderGeometry(0.04, 0.1, 1.2, 8).translate(0.6, 1.6, 0.18))
  add('pedraVulc', new SphereGeometry(0.12, 10, 8).translate(0.6, 2.2, 0.18))
  // cabeça grande, olhos esbugalhados, bigode e presas
  add('pedraMusgo', new SphereGeometry(0.22, 16, 12).scale(1, 1.05, 0.95).translate(0, 2.1, 0.03))
  for (const dx of [-0.085, 0.085]) {
    add('pedraMusgo', new SphereGeometry(0.045, 10, 8).translate(dx, 2.15, 0.2))
    add('pedraVulc', new SphereGeometry(0.018, 8, 6).translate(dx, 2.15, 0.24))
    add('pedraMusgo', new ConeGeometry(0.02, 0.07, 6).rotateX(Math.PI).translate(dx * 0.6, 1.98, 0.21))
  }
  add('pedraMusgo', new SphereGeometry(0.06, 8, 6).scale(1.4, 0.8, 1).translate(0, 2.06, 0.23))
  // coroa em camadas e a auréola atrás da cabeça
  add('pedraMusgo', new CylinderGeometry(0.17, 0.23, 0.14, 12).translate(0, 2.3, 0))
  add('pedraMusgo', new CylinderGeometry(0.1, 0.17, 0.2, 10).translate(0, 2.47, 0))
  add('pedraMusgo', new ConeGeometry(0.1, 0.36, 10).translate(0, 2.74, 0))
  add('pedraMusgo', new CylinderGeometry(0.4, 0.4, 0.05, 20).rotateX(Math.PI / 2).translate(0, 2.25, -0.2))
  for (const [m, g] of partes) {
    g.scale(esc, esc, esc)
    g.rotateY(giro)
    g.translate(x, y, z)
    o.add(m, g)
  }
}

/** Corpo de dragão (naga): tubo com escamas que vai afinando até a cauda */
export function nagaCorpo(pontos: Vector3[], raio: number) {
  const curva = new CatmullRomCurve3(pontos)
  const g = new TubeGeometry(curva, 80, raio, 14)
  const p = g.attributes.position
  const segs = 80
  const cols = 15
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const centro = curva.getPoint(t)
    const f = Math.min(1, 0.25 + (1 - t) * 1.1) // mais grosso perto da cabeça (t = 0)
    for (let j = 0; j < cols; j++) {
      const k = i * cols + j
      const v = new Vector3(p.getX(k), p.getY(k), p.getZ(k)).sub(centro).multiplyScalar(f).add(centro)
      p.setXYZ(k, v.x, v.y, v.z)
    }
  }
  g.computeVertexNormals()
  return { geo: g, curva }
}

/** Cabeça do naga com coroa dourada e boca aberta (de onde sai a água) */
export function nagaCabeca(o: Obra, pos: Vector3, direcao: Vector3, esc: number) {
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), direcao.clone().normalize())
  const partes: [string, BufferGeometry][] = [
    ['escamas', new SphereGeometry(0.5, 16, 12).scale(0.9, 0.8, 1.3)],
    ['escamas', new SphereGeometry(0.34, 14, 10).scale(0.9, 0.55, 1.2).translate(0, 0.08, 0.6)], // focinho
    ['escamas', new SphereGeometry(0.3, 14, 10).scale(0.85, 0.35, 1.1).translate(0, -0.24, 0.52)], // queixo
    ['ouro', new ConeGeometry(0.3, 0.8, 5).translate(0, 0.7, -0.1)], // coroa
    ['ouro', new TorusGeometry(0.34, 0.06, 6, 18).rotateX(Math.PI / 2 - 0.3).translate(0, 0.36, 0)],
    ['pedraClara', new SphereGeometry(0.1, 10, 8).translate(-0.3, 0.2, 0.42)], // olhos
    ['pedraClara', new SphereGeometry(0.1, 10, 8).translate(0.3, 0.2, 0.42)],
    ['madeiraEscura', new SphereGeometry(0.05, 8, 6).translate(-0.32, 0.21, 0.5)],
    ['madeiraEscura', new SphereGeometry(0.05, 8, 6).translate(0.32, 0.21, 0.5)],
    ['ouro', new ConeGeometry(0.05, 0.3, 6).rotateX(-1.2).translate(-0.22, -0.02, 0.8)], // presas
    ['ouro', new ConeGeometry(0.05, 0.3, 6).rotateX(-1.2).translate(0.22, -0.02, 0.8)],
  ]
  for (let i = 0; i < 5; i++) partes.push(['ouro', new ConeGeometry(0.06, 0.4, 5).rotateZ((i - 2) * 0.35).translate((i - 2) * 0.16, 0.45, -0.45)]) // jubinha
  for (const [m, g] of partes) {
    g.scale(esc, esc, esc)
    g.applyQuaternion(q)
    g.translate(pos.x, pos.y, pos.z)
    o.add(m, g)
  }
  // a boca fica aqui (pra sair a água)
  return pos.clone().add(new Vector3(0, -0.08, 0.95).multiplyScalar(esc).applyQuaternion(q))
}

// ======================================================================
// BANGALÔ SOBRE O MAR
// ======================================================================
export function bangalo(o: Obra, x: number, z: number, giro: number) {
  const partes: [string, BufferGeometry][] = []
  const add = (m: string, g: BufferGeometry) => partes.push([m, g])
  const Y = 1.6 // altura do deck acima da água
  // palafitas
  for (const px of [-3.8, -1.3, 1.3, 3.8]) for (const pz of [-4.4, -1.5, 1.5, 4.6]) add('madeiraEscura', cil(0.13, Y + 1.5, 0.13, 8, -1.5).translate(px, 0, pz))
  // deck
  add('deck', caixa(8.2, 0.2, 10.4, Y - 0.2))
  // casa: paredes de madeira, frente de vidro, vigas brancas
  add('madeira', caixa(6.4, 2.8, 0.14, Y).translate(0, 0, -4.4))
  add('madeira', caixa(0.14, 2.8, 5.2, Y).translate(-3.2, 0, -1.9))
  add('madeira', caixa(0.14, 2.8, 5.2, Y).translate(3.2, 0, -1.9))
  add('vidro', caixa(6.2, 2.6, 0.04, Y).translate(0, 0, 0.65))
  for (const px of [-3.1, -1.05, 1.05, 3.1]) add('branco', caixa(0.1, 2.8, 0.1, Y).translate(px, 0, 0.66))
  add('branco', caixa(6.5, 0.18, 5.4, Y + 2.8).translate(0, 0, -1.9))
  // telhado de palha em quatro águas, bem alto (o charme das Maldivas)
  const tl = new CylinderGeometry(0.4, 5.6, 3.1, 4, 1)
  tl.rotateY(Math.PI / 4)
  tl.scale(1, 1, 1.12)
  tl.translate(0, Y + 2.95 + 1.55, -1.8)
  add('palha', tl)
  add('palha', new CylinderGeometry(5.7, 5.8, 0.25, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 1.12).translate(0, Y + 2.95, -1.8))
  // piscininha privativa, espreguiçadeiras e escadinha pro mar
  add('bordaPiscina', caixa(2.6, 0.25, 3.2, Y).translate(1.9, 0, 3.1))
  add('aguaPiscina', caixa(2.3, 0.02, 2.9, Y + 0.24).translate(1.9, 0, 3.1))
  for (const px of [-1.6, -2.7]) {
    add('madeira', caixa(0.7, 0.3, 1.9, Y).translate(px, 0, 3.0))
    add('almofada', caixa(0.66, 0.1, 1.3, Y + 0.3).translate(px, 0, 3.3))
    add('almofada', caixa(0.66, 0.1, 0.6, Y + 0.3).rotateX(-0.9).translate(px, 0.25, 2.35))
  }
  add('metal', caixa(0.05, Y + 1.0, 0.05, -1).translate(-0.35, 0, 5.2))
  add('metal', caixa(0.05, Y + 1.0, 0.05, -1).translate(0.35, 0, 5.2))
  for (let i = 0; i < 5; i++) add('metal', caixa(0.7, 0.04, 0.05, -0.8 + i * 0.5).translate(0, 0, 5.2))
  // guarda-corpo de corda nos lados do deck
  for (const lado of [-1, 1]) add('madeira', caixa(0.06, 0.06, 10.3, Y + 0.9).translate(lado * 4.05, 0, 0))
  for (const lado of [-1, 1]) for (const pz of [-5, -2.5, 0, 2.5, 5]) add('madeira', caixa(0.08, 0.9, 0.08, Y).translate(lado * 4.05, 0, pz))
  for (const [m, g] of partes) {
    g.rotateY(giro)
    g.translate(x, 0, z)
    o.add(m, g)
  }
}

// ======================================================================
// BARCO DE CAUDA LONGA (longtail)
// ======================================================================
export function geoBarco() {
  const comp = 9
  const g = new CylinderGeometry(0.75, 0.75, comp, 16, 30, true)
  g.rotateZ(Math.PI / 2)
  const p = g.attributes.position
  const cores: number[] = []
  const madeira = new Color('#8A5A32')
  const madeiraClara = new Color('#B07A48')
  const azul = new Color('#2A6FB0')
  const c = new Color()
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    let y = p.getY(i)
    let z = p.getZ(i)
    const t = x / (comp / 2) // -1 popa, +1 proa
    const at = Math.abs(t)
    const afina = 1 - Math.pow(at, 2.4) * 0.9
    if (y > 0.15) y = 0.15
    const proa = t > 0 ? Math.pow(t, 3) * 1.9 : Math.pow(at, 4) * 0.5 // a proa sobe bem alto
    y = y * afina + proa
    z *= afina
    p.setXYZ(i, x, y, z)
    const faixa = Math.abs(y - (0.15 * afina + proa)) < 0.14
    c.copy(faixa ? azul : Math.sin(y * 18) > 0.6 ? madeiraClara : madeira)
    cores.push(c.r, c.g, c.b)
  }
  g.setAttribute('color', new Float32BufferAttribute(cores, 3))
  g.computeVertexNormals()
  return g
}

/** Partes do barco que não são o casco: toldo, bancos, motor e fitas coloridas na proa */
export function acessoriosBarco(o: Obra, pos: V3, giro: number) {
  const partes: [string, BufferGeometry][] = []
  const add = (m: string, g: BufferGeometry) => partes.push([m, g])
  for (const px of [-2.2, 1.4]) for (const pz of [-0.55, 0.55]) add('madeira', cil(0.04, 1.9, 0.04, 6, 0.1).translate(px, 0, pz))
  add('toldo', caixa(4.1, 0.08, 1.6, 2.0).translate(-0.4, 0, 0))
  for (const px of [-1.6, -0.2, 1.0]) add('madeira', caixa(0.3, 0.06, 1.2, 0.2).translate(px, 0, 0))
  // motor com o "rabo" comprido entrando na água
  add('metal', caixa(0.5, 0.45, 0.4, 0.3).translate(-4.2, 0, 0))
  add('metal', new CylinderGeometry(0.04, 0.04, 3.2, 6).rotateZ(1.25).translate(-5.6, -0.2, 0))
  // fitas coloridas amarradas na proa (tradição: oferenda pra proteção)
  const cores = ['fitaA', 'fitaB', 'fitaC', 'fitaD']
  for (let i = 0; i < 8; i++) add(cores[i % 4], new BoxGeometry(0.06, 0.7 + (i % 3) * 0.2, 0.02).rotateZ(0.2 + i * 0.05).translate(4.05 + (i % 3) * 0.04, 1.35, -0.12 + i * 0.035))
  add('flores', new SphereGeometry(0.18, 10, 8).translate(4.15, 1.95, 0))
  for (const [m, g] of partes) {
    g.rotateY(giro)
    g.translate(...pos)
    o.add(m, g)
  }
}


/**
 * Cordilheira: morros cobertos de floresta, tudo acima do nível `y0` (pra poder refletir no lago).
 * Cresce de altura da frente (zFrente) pro fundo, com cristas e vales.
 */
export function cordilheira(x0: number, x1: number, zFrente: number, zFundo: number, y0: number, altura: number, semente: number) {
  const nx = 140
  const nz = 50
  const g = new PlaneGeometry(x1 - x0, zFrente - zFundo, nx, nz)
  g.rotateX(-Math.PI / 2)
  g.translate((x0 + x1) / 2, 0, (zFrente + zFundo) / 2)
  const p = g.attributes.position
  const cores: number[] = []
  const c = new Color()
  const mata = new Color('#2F5A2A')
  const clara = new Color('#5E8A4A')
  const topo = new Color('#6E8E7E')
  const s = semente * 3.7
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const z = p.getZ(i)
    const t = (zFrente - z) / (zFrente - zFundo) // 0 na frente, 1 no fundo
    const borda = Math.min(1, (x - x0) / 60, (x1 - x) / 60)
    const crista = 1 - Math.abs(fbm(x * 0.006 + s, z * 0.006, 3) - 0.5) * 2 // cristas afiadas
    const n = fbm(x * 0.012 + s, z * 0.012 + 3, 4)
    let h = altura * Math.pow(t, 0.7) * (0.35 + crista * 0.45 + n * 0.4) * Math.max(0, borda)
    h = Math.max(0, h * Math.min(1, t * 6))
    p.setY(i, y0 + h)
    const k = Math.min(1, h / altura)
    c.copy(mata).lerp(clara, fbm(x * 0.05, z * 0.05, 2) * 0.8).lerp(topo, k * 0.5)
    cores.push(c.r, c.g, c.b)
  }
  g.setAttribute('color', new Float32BufferAttribute(cores, 3))
  g.computeVertexNormals()
  return g
}
