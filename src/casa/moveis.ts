import { BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, PlaneGeometry, SphereGeometry, TorusGeometry, Vector3 } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { Arranjo } from '../mundo/arranjos'
import type { Tufo } from '../mundo/Arvore'
import type { Obra } from '../mundo/obra'

export type V3 = [number, number, number]
export interface Tapete {
  pos: V3
  w: number
  d: number
  giro: number
  tipo: 'listrado' | 'persa' | 'juta' | 'redondo' | 'infantil'
  cor?: string
  /** Cores dos anéis do tapete infantil */
  cores?: string[]
}
export interface Quadro {
  pos: V3
  w: number
  h: number
  giro: number
  variante: number
  /** Desenho pintado direto na parede (quartos das crianças), sem moldura */
  desenho?: Desenho
}
export type Desenho = 'montanhas' | 'balao' | 'sol' | 'arcoiris' | 'lua' | 'nuvem' | 'borboletas' | 'estrelas' | 'foguete'
/** Tudo que vai num andar: peças juntadas por material, plantas, flores, tapetes e quadros */
export interface Andar {
  o: Obra
  y: number
  tufos: Tufo[]
  arranjos: Arranjo[]
  tapetes: Tapete[]
  quadros: Quadro[]
}

// Estofados (tecidos) ganham cantos arredondados: é o que tira a cara de "caixa pintada"
const MACIOS = /^(tecido|linho|almofada)/
function caixaMacia(m: string, w: number, h: number, d: number): BufferGeometry {
  if (!MACIOS.test(m)) return new BoxGeometry(w, h, d)
  const r = Math.min(0.06, w * 0.3, h * 0.3, d * 0.3)
  return new RoundedBoxGeometry(w, h, d, 2, r)
}

/**
 * Ajudante pra desenhar um móvel no "jeito dele" (coordenadas locais):
 * a frente do móvel olha pra +z. `giro` vira o móvel no mundo.
 */
export class L {
  readonly a: Andar
  readonly p: V3
  readonly g: number
  constructor(a: Andar, p: V3, g: number) {
    this.a = a
    this.p = p
    this.g = g
  }
  put(m: string, geo: BufferGeometry) {
    geo.rotateY(this.g)
    geo.translate(this.p[0], this.p[1], this.p[2])
    this.a.o.add(m, geo)
  }
  caixa(m: string, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
    const b = caixaMacia(m, x1 - x0, y1 - y0, z1 - z0)
    b.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    this.put(m, b)
  }
  bloco(m: string, cx: number, cy: number, cz: number, w: number, h: number, d: number, rx = 0, ry = 0, rz = 0) {
    const b = caixaMacia(m, w, h, d)
    b.rotateX(rx)
    b.rotateZ(rz)
    b.rotateY(ry)
    b.translate(cx, cy, cz)
    this.put(m, b)
  }
  cil(m: string, x: number, y0: number, y1: number, z: number, r: number, rTopo = r, seg = 16, aberto = false) {
    const c = new CylinderGeometry(rTopo, r, y1 - y0, seg, 1, aberto)
    c.translate(x, (y0 + y1) / 2, z)
    this.put(m, c)
  }
  /** Cilindro deitado, virado pra frente (+z) — espelhos, portas de máquina, etc. */
  disco(m: string, x: number, y: number, z: number, r: number, esp = 0.02, seg = 24) {
    const c = new CylinderGeometry(r, r, esp, seg)
    c.rotateX(Math.PI / 2)
    c.translate(x, y, z)
    this.put(m, c)
  }
  /** Aro deitado (paralelo ao chão) */
  aroDeitado(m: string, x: number, y: number, z: number, r: number, tubo = 0.02) {
    const t = new TorusGeometry(r, tubo, 8, 40)
    t.rotateX(Math.PI / 2)
    t.translate(x, y, z)
    this.put(m, t)
  }
  aro(m: string, x: number, y: number, z: number, r: number, tubo = 0.02) {
    const t = new TorusGeometry(r, tubo, 8, 32)
    t.translate(x, y, z)
    this.put(m, t)
  }
  esfera(m: string, x: number, y: number, z: number, r: number, sx = 1, sy = 1, sz = 1) {
    const s = new SphereGeometry(r, 14, 10)
    s.scale(sx, sy, sz)
    s.translate(x, y, z)
    this.put(m, s)
  }
  cone(m: string, x: number, y0: number, y1: number, z: number, r: number, seg = 12, aberto = false) {
    const c = new ConeGeometry(r, y1 - y0, seg, 1, aberto)
    c.translate(x, (y0 + y1) / 2, z)
    this.put(m, c)
  }
  /** Converte um ponto local em posição no mundo */
  mundo(x: number, y: number, z: number) {
    const c = Math.cos(this.g)
    const s = Math.sin(this.g)
    return new Vector3(this.p[0] + x * c + z * s, this.p[1] + y, this.p[2] - x * s + z * c)
  }
  flores(x: number, y: number, z: number, raio: number, flores = 16) {
    this.a.arranjos.push({ centro: this.mundo(x, y, z), raio, flores })
  }
  plantinha(x: number, y: number, z: number, r = 0.14) {
    this.cil('vaso', x, y, y + 0.14, z, 0.08, 0.1)
    this.a.tufos.push({ centro: this.mundo(x, y + 0.26, z), raio: r })
  }
}
export const em = (a: Andar, p: V3, g = 0) => new L(a, p, g)

// ======================= PLANTAS =======================

type TipoPlanta = 'palmeira' | 'ficus' | 'arbusto' | 'oliveira'

/** Planta grande num vaso (posição no mundo) */
export function planta(a: Andar, x: number, z: number, tipo: TipoPlanta, esc = 1, vaso = 'vasoPreto') {
  const l = em(a, [x, a.y, z])
  const r = 0.24 * esc
  l.cil(vaso, 0, 0, 0.5 * esc, 0, r * 0.78, r, 20)
  l.cil('preto', 0, 0.46 * esc, 0.48 * esc, 0, r * 0.95, r * 0.95, 20)
  const T = (dx: number, dy: number, dz: number, raio: number) => a.tufos.push({ centro: new Vector3(x + dx * esc, a.y + dy * esc, z + dz * esc), raio: raio * esc })
  if (tipo === 'palmeira') {
    for (const [dx, dz] of [
      [0.2, 0.1],
      [-0.2, -0.15],
      [0.05, -0.25],
      [-0.1, 0.25],
    ])
      l.bloco('madeira', dx * 0.6 * esc, 1.0 * esc, dz * 0.6 * esc, 0.025, 1.0 * esc, 0.025, dz * 0.5, 0, -dx * 0.5)
    T(0, 1.75, 0, 0.42)
    T(0.38, 1.4, 0.12, 0.36)
    T(-0.34, 1.5, -0.2, 0.36)
    T(0.12, 2.05, -0.28, 0.32)
    T(-0.22, 1.1, 0.32, 0.3)
    T(0.3, 0.95, -0.32, 0.28)
  } else if (tipo === 'ficus' || tipo === 'oliveira') {
    l.cil('madeira', 0, 0.45 * esc, 1.5 * esc, 0, 0.03 * esc, 0.02 * esc, 6)
    const r2 = tipo === 'oliveira' ? 0.8 : 1
    T(0, 1.65, 0, 0.38 * r2)
    T(0.26, 1.4, 0.15, 0.3 * r2)
    T(-0.24, 1.45, -0.1, 0.3 * r2)
    T(0.05, 1.9, 0.05, 0.28 * r2)
  } else {
    T(0, 0.78, 0, 0.34)
    T(0.22, 0.62, 0.16, 0.26)
    T(-0.22, 0.66, -0.12, 0.27)
  }
}

// ======================= MÓVEIS =======================

export function sofa(l: L, comp: number, tecido: string, almofadas: string[] = []) {
  const w = comp / 2
  for (const x of [-w + 0.08, w - 0.08]) for (const z of [-0.38, 0.38]) l.cil('madeira', x, 0, 0.1, z, 0.025, 0.03, 8)
  l.caixa(tecido, -w, w, 0.1, 0.42, -0.45, 0.45)
  l.bloco(tecido, 0, 0.5, 0.08, comp - 0.4, 0.16, 0.74)
  l.caixa(tecido, -w, w, 0.42, 0.92, -0.47, -0.24)
  l.bloco(tecido, -w + 0.1, 0.55, 0, 0.2, 0.3, 0.92)
  l.bloco(tecido, w - 0.1, 0.55, 0, 0.2, 0.3, 0.92)
  almofadas.forEach((m, i) => {
    const n = almofadas.length
    const x = n === 1 ? 0 : -w + 0.5 + (i * (comp - 1.0)) / (n - 1)
    l.bloco(m, x, 0.76, -0.14, 0.44, 0.42, 0.13, -0.28, 0, (i % 2 ? 1 : -1) * 0.06)
  })
}

export function poltrona(l: L, tecido: string, almofada?: string) {
  sofa(l, 0.9, tecido)
  if (almofada) l.bloco(almofada, 0, 0.74, -0.12, 0.38, 0.36, 0.12, -0.3)
}

export function mesaRedonda(l: L, r: number, h: number, mat = 'madeira') {
  l.cil(mat, 0, h - 0.04, h, 0, r, r, 32)
  l.cil(mat, 0, 0.02, h - 0.04, 0, 0.07, 0.05, 12)
  l.cil(mat, 0, 0, 0.04, 0, r * 0.55, r * 0.55, 20)
}

export function mesaLateral(l: L) {
  mesaRedonda(l, 0.25, 0.55)
}

export function abajur(l: L, y: number) {
  l.cil('ceramica', 0, y, y + 0.28, 0, 0.09, 0.06, 14)
  l.cil('cupula', 0, y + 0.28, y + 0.5, 0, 0.19, 0.13, 20, true)
  l.esfera('luz', 0, y + 0.36, 0, 0.05)
}

export function luminariaPe(l: L) {
  l.cil('preto', 0, 0, 0.03, 0, 0.18)
  l.cil('latao', 0, 0.03, 1.45, 0, 0.012, 0.012, 6)
  l.cil('cupula', 0, 1.4, 1.72, 0, 0.26, 0.18, 20, true)
  l.esfera('luz', 0, 1.5, 0, 0.06)
}

/** Pendente de globo (bola de vidro leitoso) pendurado até o teto */
export function pendente(l: L, y: number, teto: number, r = 0.2) {
  l.cil('preto', 0, y + r * 0.9, teto, 0, 0.006, 0.006, 4)
  l.esfera('cupula', 0, y, 0, r)
  l.esfera('luz', 0, y - r * 0.1, 0, r * 0.35)
}

export function aparador(l: L, comp: number, h = 0.82, prof = 0.42) {
  const w = comp / 2
  l.caixa('madeira', -w, w, h - 0.04, h, -prof / 2, prof / 2)
  l.caixa('madeira', -w + 0.03, w - 0.03, 0.14, h - 0.04, -prof / 2 + 0.02, prof / 2 - 0.02)
  for (const x of [-w + 0.05, w - 0.05]) for (const z of [-prof / 2 + 0.05, prof / 2 - 0.05]) l.caixa('madeira', x - 0.025, x + 0.025, 0, 0.14, z - 0.025, z + 0.025)
  for (let i = 0; i < Math.round(comp / 0.45); i++) {
    const x = -w + 0.25 + i * 0.45
    if (x < w - 0.1) l.caixa('latao', x - 0.03, x + 0.03, 0.5, 0.52, prof / 2 - 0.02, prof / 2 + 0.01)
  }
}

const LIVROS = ['livroA', 'livroB', 'livroC', 'livroD']
/** Estante de madeira com livros, vasinhos e caixas */
export function estante(l: L, comp: number, alt: number, prof = 0.35, prateleiras = 5) {
  const w = comp / 2
  l.caixa('madeira', -w, -w + 0.03, 0, alt, -prof / 2, prof / 2)
  l.caixa('madeira', w - 0.03, w, 0, alt, -prof / 2, prof / 2)
  l.caixa('madeira', -w, w, 0, alt, -prof / 2, -prof / 2 + 0.02)
  let k = 0
  for (let i = 0; i <= prateleiras; i++) {
    const y = 0.05 + (i * (alt - 0.08)) / prateleiras
    l.caixa('madeira', -w, w, y, y + 0.03, -prof / 2, prof / 2)
    if (i === prateleiras) break
    // livros e objetos em cima de cada prateleira
    let x = -w + 0.06
    while (x < w - 0.12) {
      k++
      if (k % 5 === 0) {
        l.cil('ceramica', x + 0.1, y + 0.03, y + 0.2, 0, 0.05, 0.035, 14)
        x += 0.28
        continue
      }
      const n = 3 + (k % 5)
      for (let j = 0; j < n && x < w - 0.06; j++) {
        const hLivro = 0.2 + ((k * 7 + j * 3) % 6) * 0.02
        l.caixa(LIVROS[(k + j) % 4], x, x + 0.035, y + 0.03, y + 0.03 + hLivro, -prof / 2 + 0.05, prof / 2 - 0.06)
        x += 0.04
      }
      x += 0.12
    }
  }
}

/** Cama: cabeceira em z = -comp/2, pés pra +z */
export function cama(l: L, larg: number, comp: number, edredom: string, cabeceira = 'tecidoCreme', almofadas: string[] = []) {
  const w = larg / 2
  const c = comp / 2
  l.caixa('madeira', -w - 0.04, w + 0.04, 0.1, 0.32, -c, c + 0.04)
  for (const x of [-w + 0.05, w - 0.05]) for (const z of [-c + 0.05, c - 0.05]) l.caixa('madeira', x - 0.03, x + 0.03, 0, 0.1, z - 0.03, z + 0.03)
  l.caixa('linho', -w, w, 0.32, 0.55, -c + 0.05, c)
  l.caixa(edredom, -w - 0.03, w + 0.03, 0.4, 0.6, -c + 0.55, c + 0.03)
  l.bloco(edredom, 0, 0.61, -c + 0.62, larg + 0.04, 0.06, 0.2) // dobra do edredom
  l.caixa(cabeceira, -w - 0.06, w + 0.06, 0.3, 1.25, -c - 0.08, -c + 0.02)
  const nTravesseiros = larg > 1.2 ? 2 : 1
  for (let i = 0; i < nTravesseiros; i++) {
    const x = nTravesseiros === 1 ? 0 : (i - 0.5) * (larg / 2)
    l.bloco('linho', x, 0.66, -c + 0.25, larg / nTravesseiros - 0.12, 0.14, 0.34, -0.35)
  }
  almofadas.forEach((m, i) => {
    const x = (i - (almofadas.length - 1) / 2) * 0.42
    l.bloco(m, x, 0.72, -c + 0.45, 0.38, 0.34, 0.12, -0.4, 0, (i % 2 ? 1 : -1) * 0.08)
  })
}

export function criado(l: L) {
  l.caixa('madeira', -0.24, 0.24, 0.1, 0.55, -0.2, 0.2)
  l.caixa('latao', -0.04, 0.04, 0.38, 0.4, 0.2, 0.22)
  for (const x of [-0.2, 0.2]) for (const z of [-0.16, 0.16]) l.cil('madeira', x, 0, 0.1, z, 0.018, 0.018, 6)
  abajur(l, 0.55)
}

export function cadeira(l: L, tecido: string) {
  for (const x of [-0.19, 0.19]) for (const z of [-0.18, 0.18]) l.bloco('madeira', x, 0.23, z, 0.035, 0.46, 0.035, z * 0.25, 0, -x * 0.25)
  l.bloco(tecido, 0, 0.5, 0, 0.46, 0.08, 0.44)
  l.bloco(tecido, 0, 0.8, -0.2, 0.46, 0.5, 0.07, 0.12)
}

export function banqueta(l: L, h = 0.68) {
  l.cil('juta', 0, h - 0.05, h, 0, 0.19, 0.19, 18)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.78
    l.bloco('madeira', Math.cos(a) * 0.12, h / 2, Math.sin(a) * 0.12, 0.03, h, 0.03, Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12)
  }
  l.aro('madeira', 0, h * 0.35, 0, 0.14, 0.012)
}

export function escrivaninha(l: L, comp: number, tecidoCadeira: string) {
  const w = comp / 2
  l.caixa('madeira', -w, w, 0.72, 0.76, -0.28, 0.28)
  for (const x of [-w + 0.04, w - 0.04]) l.caixa('branco', x - 0.02, x + 0.02, 0, 0.72, -0.26, 0.26)
  l.caixa('branco', -w + 0.06, -w + 0.45, 0.55, 0.72, -0.26, 0.26)
  abajur(em2(l, -w + 0.2, 0.76, -0.1), 0)
  for (let i = 0; i < 4; i++) l.caixa(LIVROS[i], w - 0.3 + i * 0.045, w - 0.26 + i * 0.045, 0.76, 0.98, -0.2, 0.0)
  const c = em2(l, 0, 0, 0.55, Math.PI)
  cadeira(c, tecidoCadeira)
}

// sub-peça relativa a outra peça local
function em2(l: L, x: number, y: number, z: number, g = 0): L {
  const p = l.mundo(x, y, z)
  return new L(l.a, [p.x, p.y, p.z], l.g + g)
}

export function vasoSanitario(l: L) {
  l.cil('ceramica', 0, 0, 0.36, 0.05, 0.16, 0.2, 18)
  l.esfera('ceramica', 0, 0.36, 0.08, 0.2, 1, 0.25, 1.25)
  l.caixa('ceramica', -0.2, 0.2, 0.36, 0.78, -0.28, -0.1)
  l.caixa('latao', -0.04, 0.04, 0.72, 0.74, -0.1, -0.09)
}

/** Gabinete de banheiro (suspenso, madeira) com cuba de apoio e espelho redondo */
export function gabinete(l: L, comp = 0.9) {
  const w = comp / 2
  l.caixa('madeira', -w, w, 0.32, 0.82, -0.24, 0.24)
  l.caixa('marmore', -w - 0.02, w + 0.02, 0.82, 0.85, -0.25, 0.25)
  l.cil('ceramica', 0, 0.85, 0.99, 0.02, 0.17, 0.2, 24)
  l.caixa('latao', -0.015, 0.015, 0.85, 1.12, -0.2, -0.17)
  l.caixa('latao', -0.015, 0.015, 1.1, 1.12, -0.2, -0.05)
  l.disco('espelho', 0, 1.62, -0.235, 0.34, 0.015)
  l.aro('latao', 0, 1.62, -0.225, 0.345, 0.015)
}

/** Box de chuveiro: vidro nos lados abertos, azulejo verde nas paredes */
export function chuveiro(a: Andar, x0: number, x1: number, z0: number, z1: number, paredeX: 'x0' | 'x1', paredeZ: 'z0' | 'z1') {
  const o = a.o
  const y = a.y
  o.caixa('ceramica', [x0, x1], [y, y + 0.04], [z0, z1])
  const e = 0.015
  const px = paredeX === 'x0' ? x0 : x1
  const pz = paredeZ === 'z0' ? z0 : z1
  const sx = paredeX === 'x0' ? 1 : -1
  const sz = paredeZ === 'z0' ? 1 : -1
  o.caixa('azulejo', [Math.min(px, px + sx * e), Math.max(px, px + sx * e)], [y, y + 2.2], [z0, z1])
  o.caixa('azulejo', [x0, x1], [y, y + 2.2], [Math.min(pz, pz + sz * e), Math.max(pz, pz + sz * e)])
  // vidros nos outros dois lados (um deles deixa a "porta" aberta)
  const gx = paredeX === 'x0' ? x1 : x0
  const gz = paredeZ === 'z0' ? z1 : z0
  o.caixa('vidro', [gx - 0.005, gx + 0.005], [y + 0.04, y + 2.0], [z0, z1])
  const meio = (x0 + x1) / 2
  o.caixa('vidro', paredeX === 'x0' ? [x0, meio] : [meio, x1], [y + 0.04, y + 2.0], [gz - 0.005, gz + 0.005])
  o.caixa('preto', [gx - 0.015, gx + 0.015], [y + 1.98, y + 2.02], [z0, z1])
  // ducha
  const cx = px + sx * 0.3
  const cz = pz + sz * 0.3
  o.caixa('preto', [cx - 0.01, cx + 0.01], [y + 2.05, y + 2.12], [Math.min(pz, cz), Math.max(pz, cz)])
  const d = new CylinderGeometry(0.12, 0.12, 0.02, 20)
  d.translate(cx, y + 2.04, cz)
  o.add('preto', d)
}

export function maquinaLavar(l: L) {
  l.caixa('branco', -0.3, 0.3, 0, 0.85, -0.3, 0.3)
  l.disco('preto', 0, 0.42, 0.3, 0.2, 0.02)
  l.disco('vidro', 0, 0.42, 0.31, 0.16, 0.02)
  l.caixa('preto', -0.25, 0.1, 0.75, 0.8, 0.3, 0.31)
}

/** Estante de metal com caixas (depósito) */
export function estanteMetal(l: L, comp: number) {
  const w = comp / 2
  for (const x of [-w, w]) for (const z of [-0.2, 0.2]) l.caixa('metal', x - 0.02, x + 0.02, 0, 2.0, z - 0.02, z + 0.02)
  const cores = ['juta', 'tecidoCreme', 'juta', 'livroC']
  for (let i = 0; i < 4; i++) {
    const y = 0.1 + i * 0.6
    l.caixa('metal', -w, w, y, y + 0.03, -0.22, 0.22)
    let x = -w + 0.08
    let k = i
    while (x < w - 0.3) {
      const cw = 0.3 + (k % 3) * 0.08
      l.caixa(cores[k % cores.length], x, x + cw, y + 0.03, y + 0.03 + 0.28 + (k % 2) * 0.06, -0.18, 0.16)
      x += cw + 0.06
      k++
    }
  }
}

/** Mesa de sinuca (comprida em z) */
export function sinuca(l: L) {
  for (const x of [-0.6, 0.6]) for (const z of [-1.1, 1.1]) l.caixa('madeiraEscura', x - 0.07, x + 0.07, 0, 0.62, z - 0.07, z + 0.07)
  l.caixa('madeiraEscura', -0.72, 0.72, 0.55, 0.74, -1.3, 1.3)
  l.caixa('feltro', -0.6, 0.6, 0.74, 0.77, -1.18, 1.18)
  for (const x of [-0.66, 0.66]) l.caixa('madeiraEscura', x - 0.06, x + 0.06, 0.74, 0.82, -1.3, 1.3)
  for (const z of [-1.24, 1.24]) l.caixa('madeiraEscura', -0.72, 0.72, 0.74, 0.82, z - 0.06, z + 0.06)
  const bolas: [number, number, string][] = [
    [0, 0.6, 'ceramica'],
    [0, -0.5, 'brinquedoA'],
    [0.06, -0.6, 'brinquedoB'],
    [-0.06, -0.6, 'brinquedoC'],
    [0.12, -0.7, 'livroB'],
    [0, -0.7, 'preto'],
    [-0.12, -0.7, 'tecidoTerracota'],
  ]
  for (const [x, z, m] of bolas) l.esfera(m, x, 0.8, z, 0.03)
  l.bloco('madeira', 0.3, 0.79, 0.35, 0.02, 0.02, 1.4, 0, 0.35)
}

/** Tenda de índio (teepee) pro quarto das crianças */
export function tenda(l: L) {
  l.cone('tecidoCreme', 0, 0, 1.55, 0, 0.7, 6, true)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4
    l.bloco('madeira', Math.cos(a) * 0.36, 0.95, Math.sin(a) * 0.36, 0.03, 1.95, 0.03, Math.sin(a) * 0.38, 0, -Math.cos(a) * 0.38)
  }
  l.cil('tecidoMostarda', 0, 0, 0.1, 0, 0.5, 0.5, 20)
}

export function casinhaBoneca(l: L) {
  l.caixa('madeira', -0.4, 0.4, 0, 0.35, -0.2, 0.2)
  l.caixa('branco', -0.35, 0.35, 0.35, 0.95, -0.17, 0.17)
  l.bloco('tecidoRosa', -0.19, 1.1, 0, 0.45, 0.03, 0.4, 0, 0, 0.7)
  l.bloco('tecidoRosa', 0.19, 1.1, 0, 0.45, 0.03, 0.4, 0, 0, -0.7)
  for (const x of [-0.18, 0.18]) for (const y of [0.5, 0.78]) l.caixa('luz', x - 0.07, x + 0.07, y, y + 0.12, 0.17, 0.18)
}

export function ursinho(l: L) {
  l.esfera('tecidoMostarda', 0, 0.14, 0, 0.13, 1, 1.1, 0.9)
  l.esfera('tecidoMostarda', 0, 0.34, 0.02, 0.1)
  for (const x of [-0.07, 0.07]) l.esfera('tecidoMostarda', x, 0.42, 0.0, 0.04)
  for (const x of [-0.11, 0.11]) l.esfera('tecidoMostarda', x, 0.08, 0.08, 0.05)
}

export function brinquedos(l: L) {
  // carrinho
  l.caixa('brinquedoB', -0.15, 0.15, 0.05, 0.14, -0.08, 0.08)
  l.caixa('brinquedoB', -0.06, 0.1, 0.14, 0.22, -0.07, 0.07)
  for (const x of [-0.1, 0.1]) for (const z of [-0.08, 0.08]) l.disco('preto', x, 0.05, z, 0.04, 0.03, 12)
  // bola e blocos
  l.esfera('brinquedoC', 0.45, 0.12, 0.2, 0.12)
  l.caixa('brinquedoA', 0.2, 0.32, 0, 0.12, -0.35, -0.23)
  l.caixa('brinquedoC', 0.22, 0.3, 0.12, 0.2, -0.33, -0.25)
  l.caixa('brinquedoB', 0.35, 0.45, 0, 0.1, -0.3, -0.2)
}

/** Guarda-roupa aberto (cabideiro + prateleiras) pro closet */
export function araraRoupas(l: L, comp: number) {
  const w = comp / 2
  const roupas = ['linho', 'tecidoAzul', 'tecidoRosa', 'tecidoCreme', 'tecidoSalvia', 'tecidoTerracota', 'preto']
  l.bloco('latao', 0, 1.75, 0, comp, 0.02, 0.02)
  l.caixa('branco', -w, w, 2.1, 2.13, -0.3, 0.3)
  l.caixa('branco', -w, w, 2.45, 2.48, -0.3, 0.3)
  for (let i = 0; i < Math.floor(comp / 0.11); i++) {
    const x = -w + 0.08 + i * 0.11
    const h = 0.75 + ((i * 7) % 5) * 0.08
    l.caixa(roupas[(i * 3) % roupas.length], x - 0.012, x + 0.012, 1.72 - h, 1.72, -0.24, 0.24)
  }
  for (let i = 0; i < Math.floor(comp / 0.35); i++) l.caixa(roupas[i % roupas.length], -w + 0.05 + i * 0.35, -w + 0.3 + i * 0.35, 2.13, 2.3, -0.2, 0.2)
}

export function banheira(l: L) {
  const c = new CylinderGeometry(0.45, 0.4, 0.55, 32)
  c.scale(1.9, 1, 1)
  c.translate(0, 0.275, 0)
  l.put('ceramica', c)
  const agua = new CylinderGeometry(0.4, 0.4, 0.02, 32)
  agua.scale(1.85, 1, 0.92)
  agua.translate(0, 0.5, 0)
  l.put('azulejo', agua)
  l.caixa('latao', 0.72, 0.76, 0.3, 0.95, -0.02, 0.02)
  l.bloco('latao', 0.64, 0.94, 0, 0.18, 0.025, 0.025)
}

export function tvRack(l: L, comp = 2.0) {
  const w = comp / 2
  l.caixa('madeira', -w, w, 0.12, 0.52, -0.22, 0.22)
  l.caixa('preto', -w + 0.05, w - 0.05, 0, 0.12, -0.18, 0.18)
  l.caixa('tela', -0.7, 0.7, 1.0, 1.8, -0.26, -0.23)
  l.caixa('preto', -0.72, 0.72, 0.98, 1.82, -0.28, -0.26)
  l.caixa('branco', 0.3, 0.6, 0.52, 0.58, -0.1, 0.1)
  l.caixa('preto', -0.2, 0.0, 0.52, 0.56, 0.05, 0.15)
}

export function pufe(l: L, mat: string) {
  l.esfera(mat, 0, 0.25, 0, 0.42, 1, 0.6, 1)
}

// ======================= CRIANÇAS E ACABAMENTOS =======================

const CORES_INFANTIS = ['brinquedoA', 'brinquedoB', 'brinquedoC', 'brinquedoD', 'brinquedoE', 'brinquedoF']

/** Cama-casinha (estrutura de madeira em forma de casa, estilo montessoriano) */
export function camaCasinha(l: L, larg: number, comp: number, edredom: string, almofadas: string[]) {
  cama(l, larg, comp, edredom, 'madeira', almofadas)
  const w = larg / 2 + 0.06
  const c = comp / 2
  const h = 1.45
  for (const z of [-c, c]) {
    for (const x of [-w, w]) l.caixa('madeira', x - 0.03, x + 0.03, 0, h, z - 0.03, z + 0.03)
    // telhadinho
    for (const lado of [-1, 1]) l.bloco('madeira', (lado * w) / 2, h + w * 0.42, z, Math.hypot(w, w * 0.84) + 0.06, 0.05, 0.05, 0, 0, -lado * Math.atan2(w * 0.84, w))
  }
  l.bloco('madeira', 0, h + w * 0.84, 0, 0.05, 0.05, comp + 0.06)
}

/** Estante baixa com nichos e cestos coloridos */
export function estanteInfantil(l: L, comp: number) {
  const w = comp / 2
  const alt = 1.0
  l.caixa('madeiraBranca', -w, w, 0, 0.04, -0.17, 0.17)
  l.caixa('madeiraBranca', -w, w, alt / 2 - 0.02, alt / 2 + 0.02, -0.17, 0.17)
  l.caixa('madeiraBranca', -w, w, alt - 0.04, alt, -0.17, 0.17)
  l.caixa('madeiraBranca', -w, w, 0, alt, -0.17, -0.15)
  const n = Math.max(2, Math.round(comp / 0.4))
  for (let i = 0; i <= n; i++) {
    const x = -w + (i * comp) / n
    l.caixa('madeiraBranca', x - 0.02, x + 0.02, 0, alt, -0.17, 0.17)
  }
  for (let i = 0; i < n; i++) {
    const x0 = -w + (i * comp) / n + 0.05
    const x1 = -w + ((i + 1) * comp) / n - 0.05
    l.caixa(CORES_INFANTIS[i % CORES_INFANTIS.length], x0, x1, 0.05, 0.4, -0.13, 0.15)
    // em cima: livrinhos e brinquedos
    if (i % 2) l.esfera(CORES_INFANTIS[(i + 2) % 6], (x0 + x1) / 2, alt + 0.09, 0, 0.09)
    else for (let k = 0; k < 4; k++) l.caixa(CORES_INFANTIS[(i + k) % 6], x0 + k * 0.05, x0 + k * 0.05 + 0.035, alt, alt + 0.2 + (k % 2) * 0.03, -0.08, 0.08)
  }
}

/** Varal de bandeirinhas entre dois pontos (em coordenadas do mundo) */
export function bandeirinhas(a: Andar, de: V3, ate: V3, cores: string[], queda = 0.3) {
  const dx = ate[0] - de[0]
  const dz = ate[2] - de[2]
  const len = Math.hypot(dx, dz)
  const g = Math.atan2(dx, dz) - Math.PI / 2
  const n = Math.round(len / 0.24)
  const altura = (t: number) => de[1] + (ate[1] - de[1]) * t - queda * 4 * t * (1 - t)
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const l = em(a, [de[0] + dx * t, altura(t), de[2] + dz * t], g)
    if (i < n) {
      const b = new BoxGeometry(len / n, 0.012, 0.012)
      const t2 = (i + 0.5) / n
      b.rotateZ(Math.atan2(altura((i + 1) / n) - altura(i / n), len / n))
      b.translate(len / n / 2, altura(t2) - altura(t), 0)
      l.put('linho', b)
    }
    if (i < n) {
      const tri = new ConeGeometry(0.1, 0.22, 3)
      tri.rotateZ(Math.PI)
      tri.scale(1, 1, 0.12)
      tri.translate(len / n / 2, -0.11, 0)
      l.put(cores[i % cores.length], tri)
    }
  }
}

/** Luminária de nuvem (bolinhas brancas iluminadas) */
export function lustreNuvem(l: L, y: number, teto: number) {
  l.cil('preto', 0, y + 0.14, teto, 0, 0.005, 0.005, 4)
  for (const [x, dy, z, r] of [
    [-0.18, 0, 0, 0.13],
    [0, 0.05, 0, 0.17],
    [0.18, 0, 0.01, 0.13],
    [0.08, -0.03, 0.08, 0.11],
    [-0.08, -0.03, -0.06, 0.12],
  ])
    l.esfera('cupula', x, y + dy, z, r)
}

/** Cortina de linho com pregas, virada pra +z (use o giro pra virar) */
export function cortina(l: L, x: number, z: number, larg: number, y0: number, y1: number) {
  const p = new PlaneGeometry(larg, y1 - y0, Math.round(larg * 30), 1)
  const pos = p.attributes.position
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 26) * 0.035 + 0.035)
  p.computeVertexNormals()
  p.translate(x, (y0 + y1) / 2, z)
  l.put('cortina', p)
  // varão dourado
  l.bloco('latao', x, y1 + 0.03, z + 0.04, larg + 0.2, 0.025, 0.025)
}

/** Lustre moderno: aro dourado com globos de vidro leitoso */
export function lustre(l: L, y: number, teto: number, r = 0.55) {
  l.cil('latao', 0, y + 0.05, teto, 0, 0.012, 0.012, 6)
  l.aroDeitado('latao', 0, y, 0, r, 0.018)
  l.aroDeitado('latao', 0, y + 0.18, 0, r * 0.55, 0.014)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4
    l.bloco('latao', Math.cos(a) * r * 0.5, y + 0.09, Math.sin(a) * r * 0.5, 0.012, 0.012, r, 0, -a + Math.PI / 2, 0)
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    l.esfera('cupula', Math.cos(a) * r, y - 0.08, Math.sin(a) * r, 0.085)
    l.cil('latao', Math.cos(a) * r, y - 0.02, y, Math.sin(a) * r, 0.02, 0.02, 8)
  }
  l.esfera('cupula', 0, y + 0.02, 0, 0.14)
}

/** Painel estofado de cabeceira (gomos verticais), encostado na parede atrás da cama */
export function painelCabeceira(l: L, larg: number, alt: number, tecido: string) {
  const n = Math.round(larg / 0.34)
  const w = larg / n
  for (let i = 0; i < n; i++) {
    const x = -larg / 2 + (i + 0.5) * w
    l.bloco(tecido, x, alt / 2 + 0.05, 0.05, w - 0.02, alt, 0.1)
  }
  l.caixa('latao', -larg / 2 - 0.02, larg / 2 + 0.02, alt + 0.05, alt + 0.08, 0, 0.1)
}

/** Lareira de mármore com fogo aceso e prateleira (a frente olha pra +z) */
export function lareira(l: L, larg = 2.4, alt = 2.9) {
  const w = larg / 2
  l.caixa('marmore', -w, w, 0, alt, -0.05, 0.12)
  l.caixa('preto', -0.65, 0.65, 0.32, 0.95, 0.12, 0.13)
  l.caixa('pedraEscura', -0.62, 0.62, 0.34, 0.36, 0.0, 0.13)
  for (let i = 0; i < 3; i++) l.bloco('madeiraEscura', -0.3 + i * 0.3, 0.42, 0.07, 0.07, 0.07, 0.35, 0, 0.3 * (i - 1))
  for (let i = 0; i < 6; i++) l.cone('fogo', -0.45 + i * 0.18, 0.4, 0.62 + (i % 3) * 0.08, 0.08, 0.07)
  l.caixa('madeira', -w - 0.1, w + 0.1, 1.15, 1.2, -0.05, 0.28)
  l.cil('vela', -w + 0.25, 1.2, 1.42, 0.14, 0.05)
  l.cil('vela', -w + 0.42, 1.2, 1.34, 0.12, 0.05)
  l.cil('ceramica', w - 0.3, 1.2, 1.45, 0.12, 0.07, 0.05, 16)
}
