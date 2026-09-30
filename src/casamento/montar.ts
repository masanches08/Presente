import {
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  OctahedronGeometry,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Arranjo } from '../mundo/arranjos'
import { Obra } from '../mundo/obra'
import { sorteador, type Vec3 } from '../mundo/util'
import { alturaAreia } from './Ambiente'

// ======================================================================
// O casamento na praia: onde fica cada coisa (metros).
// O mar fica pro lado -z; o sol se põe atrás do altar.
// ======================================================================
export const ARCO = { x: 0, z: -8 }
export const TENDA = { x0: 8, x1: 27, z0: -7, z1: 7, beiral: 3.4, cume: 5.2, piso: 0.25 }
export const PISTA = { x0: 8.5, x1: 12.4, z0: -3.2, z1: 3.2 }
export const MESAS = { x0: 13.0, x1: 24.4, z: 2.6 }
export const NOIVOS = { x: 26.0, z: 0 }
export const BOLO = { x: 25.7, z: -4.4 }
export const LOUNGE = { x: -12.5, z: 2.5 }
export const BAR = { x: -12.8, z: -5.2 }

/** Uma cópia de um objeto repetido (desenhada por instância: bem leve) */
export interface Inst {
  pos: Vec3
  rot?: Vec3
  esc?: number | Vec3
  cor?: string
}

const FLORES_PRAIA = ['#FFFFFF', '#FFF7F1', '#FBE0D8', '#F6CFC6', '#D8C8EC', '#C7B3E3', '#FFFFFF', '#FFEFE4']

type Ret = (o: Obra, m: string, x: [number, number], y: [number, number], z: [number, number]) => void
const cx: Ret = (o, m, x, y, z) => o.caixa(m, x, y, z)

function cilindro(o: Obra, m: string, x: number, y0: number, y1: number, z: number, r: number, rTopo = r, seg = 16, aberto = false) {
  const c = new CylinderGeometry(rTopo, r, y1 - y0, seg, 1, aberto)
  c.translate(x, (y0 + y1) / 2, z)
  o.add(m, c)
}

function esfera(o: Obra, m: string, p: Vec3, r: number, seg = 14) {
  const s = new SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)))
  s.translate(...p)
  o.add(m, s)
}

/** Barra entre dois pontos (vigas, braços de lustre) */
function barra(o: Obra, m: string, a: Vector3, b: Vector3, r: number, seg = 6) {
  const d = b.clone().sub(a)
  const c = new CylinderGeometry(r, r, d.length(), seg)
  c.translate(0, d.length() / 2, 0)
  c.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize()))
  c.translate(a.x, a.y, a.z)
  o.add(m, c)
}

/** Curva de fio caindo entre dois pontos */
function catenaria(a: Vector3, b: Vector3, queda: number, n = 20) {
  const pts: Vector3[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push(a.clone().lerp(b, t).add(new Vector3(0, -queda * 4 * t * (1 - t), 0)))
  }
  return new CatmullRomCurve3(pts)
}

// ---------------- peças prontas ----------------

/** Lustre de cristal: anel dourado, braços, velinhas e pingentes de cristal */
function lustre(o: Obra, cxp: number, cy: number, cz: number, s: number, teto: number) {
  cilindro(o, 'ouro', cxp, cy + 0.55 * s, teto, cz, 0.012 * s, 0.012 * s, 6)
  for (const [y, r] of [
    [cy, 0.55],
    [cy + 0.35, 0.3],
  ] as [number, number][]) {
    const anel = new TorusGeometry(r * s, 0.018 * s, 6, 40)
    anel.rotateX(Math.PI / 2)
    anel.translate(cxp, y, cz)
    o.add('ouro', anel)
  }
  cilindro(o, 'ouro', cxp, cy - 0.25 * s, cy + 0.55 * s, cz, 0.04 * s, 0.03 * s, 10)
  esfera(o, 'cristal', [cxp, cy - 0.32 * s, cz], 0.08 * s, 10)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const x = cxp + Math.cos(a) * 0.55 * s
    const z = cz + Math.sin(a) * 0.55 * s
    barra(o, 'ouro', new Vector3(cxp, cy + 0.1 * s, cz), new Vector3(x, cy + 0.02 * s, z), 0.01 * s)
    cilindro(o, 'vela', x, cy + 0.02 * s, cy + 0.14 * s, z, 0.018 * s)
    const chama = new CylinderGeometry(0, 0.014 * s, 0.05 * s, 6)
    chama.translate(x, cy + 0.17 * s, z)
    o.add('chama', chama)
    // cortina de cristais pendurados
    for (let k = 0; k < 4; k++) {
      const c = new OctahedronGeometry(0.022 * s, 0)
      c.scale(1, 1.6, 1)
      c.translate(cxp + Math.cos(a + 0.3) * 0.5 * s, cy - (0.08 + k * 0.08) * s, cz + Math.sin(a + 0.3) * 0.5 * s)
      o.add('cristal', c)
    }
    for (let k = 0; k < 3; k++) {
      const c = new OctahedronGeometry(0.02 * s, 0)
      c.scale(1, 1.6, 1)
      c.translate(cxp + Math.cos(a) * 0.3 * s, cy + (0.28 - k * 0.07) * s, cz + Math.sin(a) * 0.3 * s)
      o.add('cristal', c)
    }
  }
}

/** Vela: pilar/cone de cera + chaminha (em instâncias) */
function vela(velas: Inst[], chamas: Inst[], x: number, y: number, z: number, alt: number, r = 0.035) {
  velas.push({ pos: [x, y + alt / 2, z], esc: [r / 0.035, alt / 0.1, r / 0.035] })
  chamas.push({ pos: [x, y + alt + 0.025, z], esc: 0.8 + (r / 0.035) * 0.3 })
}

/** Cortina de chiffon: presa em cima, amarrada no meio e caindo solta embaixo */
function cortinaAmarrada(larg: number, alt: number, amarra: number, segX = 6, segY = 22) {
  const g = new PlaneGeometry(larg, alt, segX, segY)
  g.translate(0, -alt / 2, 0)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = -p.getY(i) / alt // 0 em cima, 1 embaixo
    const aperto = 1 - Math.exp(-Math.pow((y - amarra) * 5, 2)) * 0.82
    const largura = (0.55 + 0.45 * y) * aperto
    p.setXYZ(i, x * largura, p.getY(i), Math.sin((x / larg) * Math.PI * 5) * 0.05 * aperto + y * y * 0.12)
  }
  g.computeVertexNormals()
  return g
}

/** Painel de tecido drapeado entre dois pontos, caindo no meio */
function faixaTecido(a: Vector3, b: Vector3, larg: number, queda: number) {
  const n = 18
  const d = b.clone().sub(a)
  const lado = new Vector3(0, 1, 0).cross(d).normalize().multiplyScalar(larg / 2)
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const c = a.clone().lerp(b, t)
    c.y -= queda * 4 * t * (1 - t)
    for (const s of [-1, -0.5, 0, 0.5, 1]) {
      const onda = Math.abs(s) === 0.5 ? -0.04 : 0
      pos.push(c.x + lado.x * s, c.y + onda, c.z + lado.z * s)
    }
  }
  for (let i = 0; i < n; i++)
    for (let k = 0; k < 4; k++) {
      const a0 = i * 5 + k
      idx.push(a0, a0 + 5, a0 + 1, a0 + 1, a0 + 5, a0 + 6)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

// ======================================================================

export function montarCasamento() {
  const rand = sorteador(2412)
  const o = new Obra()
  const tecidos: BufferGeometry[] = []
  const arranjos: Arranjo[] = []
  const espigas: { base: Vector3; alt: number; giro: number; incl: number }[] = []
  const I = {
    cadeiras: [] as Inst[],
    almofadas: [] as Inst[],
    velas: [] as Inst[],
    chamas: [] as Inst[],
    copos: [] as Inst[],
    lanternas: [] as Inst[],
    lanternasPalha: [] as Inst[],
    lampadas: [] as Inst[],
    pisca: [] as Inst[],
    petalas: [] as Inst[],
    florzinhas: [] as Inst[],
    capim: [] as Inst[],
    pratos: [] as Inst[],
    sousplats: [] as Inst[],
    guardanapos: [] as Inst[],
    tacas: [] as Inst[],
    coqueiros: [] as { pos: Vec3; alt: number; giro: number }[],
  }
  const chao = (x: number, z: number) => alturaAreia(x, z)
  const arranjo = (x: number, y: number, z: number, raio: number, flores: number, lavanda = 0, achatado?: number) => {
    arranjos.push({ centro: new Vector3(x, y, z), raio, flores, achatado, cores: FLORES_PRAIA })
    for (let i = 0; i < lavanda; i++)
      espigas.push({
        base: new Vector3(x + (rand() - 0.5) * raio * 1.2, y - raio * 0.3, z + (rand() - 0.5) * raio * 1.2),
        alt: raio * (1.2 + rand() * 0.9),
        giro: rand() * 6,
        incl: (rand() - 0.5) * 0.7,
      })
    for (let i = 0; i < flores * 0.8; i++) {
      const d = new Vector3(rand() - 0.5, rand() - 0.3, rand() - 0.5).normalize().multiplyScalar(raio * (0.9 + rand() * 0.35))
      I.florzinhas.push({ pos: [x + d.x, y + d.y * (achatado ?? 1), z + d.z], esc: 0.7 + rand() * 0.6 })
    }
  }

  // =================== CERIMÔNIA ===================
  const A = ARCO
  // altar de madeira (tablado) + degrau
  cx(o, 'deck', [-2.6, 2.6], [-0.2, 0.22], [A.z - 1.8, A.z + 1.6])
  cx(o, 'deck', [-1.4, 1.4], [-0.2, 0.11], [A.z + 1.6, A.z + 1.95])
  // arco: colunas e viga
  const H = 3.1
  for (const x of [-1.5, 1.5]) cx(o, 'madeiraClara', [x - 0.07, x + 0.07], [0.22, 0.22 + H], [A.z - 0.07, A.z + 0.07])
  cx(o, 'madeiraClara', [-1.75, 1.75], [0.22 + H - 0.14, 0.22 + H], [A.z - 0.08, A.z + 0.08])
  // lustre no meio do arco
  lustre(o, 0, 2.55, A.z, 0.85, 0.22 + H - 0.14)
  // cortinas de chiffon amarradas nas colunas
  for (const x of [-1.5, 1.5]) {
    const c = cortinaAmarrada(1.3, H - 0.1, 0.55)
    c.translate(x - Math.sign(x) * 0.1, 0.22 + H - 0.1, A.z + 0.12)
    tecidos.push(c)
  }
  // tecido caindo em arco na viga (swag)
  tecidos.push(faixaTecido(new Vector3(-1.6, 0.22 + H - 0.1, A.z + 0.16), new Vector3(1.6, 0.22 + H - 0.1, A.z + 0.16), 0.5, 0.55))
  // cascata de flores: canto esquerdo cheio descendo pela coluna, canto direito menor, e os pés
  arranjo(-1.45, 0.22 + H, A.z, 0.7, 110, 16)
  arranjo(-0.9, 0.22 + H + 0.05, A.z + 0.05, 0.45, 50, 8)
  arranjo(-1.55, 2.5, A.z + 0.05, 0.42, 45, 7)
  arranjo(-1.55, 1.9, A.z + 0.08, 0.32, 28, 5)
  arranjo(1.45, 0.22 + H, A.z, 0.5, 60, 10)
  arranjo(1.0, 0.22 + H + 0.05, A.z + 0.05, 0.32, 26, 5)
  arranjo(-1.75, 0.55, A.z + 0.3, 0.6, 70, 14, 0.75)
  arranjo(1.75, 0.5, A.z + 0.3, 0.55, 60, 12, 0.75)
  // pedestais altos com bolas de flores dos lados do altar
  for (const x of [-3.1, 3.1]) {
    cilindro(o, 'vidro', x, 0, 1.4, A.z + 0.6, 0.05, 0.05, 10)
    cilindro(o, 'ouro', x, 0, 0.05, A.z + 0.6, 0.22, 0.22, 20)
    cilindro(o, 'ouro', x, 1.38, 1.42, A.z + 0.6, 0.18, 0.18, 20)
    arranjo(x, 1.85, A.z + 0.6, 0.5, 70, 10)
  }
  // muitas velas em cilindros de vidro na frente do altar
  for (let i = 0; i < 26; i++) {
    const lado = i % 2 ? 1 : -1
    const x = lado * (0.9 + rand() * 1.8)
    const z = A.z + 1.2 + rand() * 0.9
    const alt = 0.12 + rand() * 0.35
    const y = 0.22 // em cima do tablado
    I.copos.push({ pos: [x, y + alt * 0.6, z], esc: [0.08, alt * 1.25, 0.08] })
    vela(I.velas, I.chamas, x, y, z, alt, 0.045)
  }

  // corredor de juta com pétalas
  const zIni = A.z + 1.95
  const zFim = 10
  const corredor = new PlaneGeometry(1.35, zFim - zIni, 2, 30)
  corredor.rotateX(-Math.PI / 2)
  const cp = corredor.attributes.position
  for (let i = 0; i < cp.count; i++) {
    const z = cp.getZ(i) + (zIni + zFim) / 2
    cp.setXYZ(i, cp.getX(i), chao(cp.getX(i), z) + 0.02, z)
  }
  corredor.computeVertexNormals()
  o.add('juta', corredor)
  const coresPetala = ['#FFFFFF', '#F8D6CF', '#F2B9B4', '#D9C7EE', '#FFF1EA']
  for (let i = 0; i < 520; i++) {
    const x = (rand() - 0.5) * 1.25 * (rand() < 0.7 ? 1 : 1.3)
    const z = zIni + rand() * (zFim - zIni)
    I.petalas.push({ pos: [x, chao(x, z) + 0.03, z], rot: [-Math.PI / 2, 0, rand() * 6], cor: coresPetala[i % coresPetala.length] })
  }

  // cadeiras dos convidados (olhando pro mar)
  const FILEIRAS = 9
  for (let r = 0; r < FILEIRAS; r++) {
    const z = -4.4 + r * 1.05
    for (let c = 0; c < 5; c++)
      for (const lado of [-1, 1]) {
        const x = lado * (1.15 + c * 0.56)
        I.cadeiras.push({ pos: [x, chao(x, z), z], rot: [0, Math.PI, 0] })
        I.almofadas.push({ pos: [x, chao(x, z) + 0.49, z], rot: [0, Math.PI, 0] })
      }
    // enfeite na ponta de cada fileira (lado do corredor): flores no chão, lanternas e velas
    for (const lado of [-1, 1]) {
      const x = lado * 0.88
      if (r % 2 === 0) arranjo(x, chao(x, z) + 0.22, z - 0.2, 0.34, 32, 7, 0.8)
      else {
        I.lanternas.push({ pos: [x, chao(x, z), z - 0.1], rot: [0, rand(), 0] })
        vela(I.velas, I.chamas, x, chao(x, z) + 0.04, z - 0.1, 0.2, 0.04)
      }
      for (let k = 0; k < 2; k++) {
        const xx = x + lado * (0.05 + k * 0.1)
        const zz = z + 0.35 + k * 0.12
        const alt = 0.1 + k * 0.12
        I.copos.push({ pos: [xx, chao(xx, zz) + alt * 0.6, zz], esc: [0.06, alt * 1.3, 0.06] })
        vela(I.velas, I.chamas, xx, chao(xx, zz), zz, alt, 0.035)
      }
    }
  }

  // varais de luzinhas cruzando o corredor, com lanternas de papel
  const postesCorredor: [number, number][] = []
  for (const z of [-6, -0.8, 4.6, 9.6]) for (const x of [-4.6, 4.6]) postesCorredor.push([x, z])
  for (const [x, z] of postesCorredor) cx(o, 'madeira', [x - 0.07, x + 0.07], [chao(x, z) - 0.2, 4.6], [z - 0.07, z + 0.07])
  const ligar = (a: Vector3, b: Vector3, queda: number, papel = false, palha = false) => {
    const curva = catenaria(a, b, queda)
    o.add('preto', new TubeGeometry(curva, 30, 0.01, 3))
    const n = Math.floor(curva.getLength() / 0.45)
    for (let i = 1; i < n; i++) {
      const p = curva.getPoint(i / n)
      I.lampadas.push({ pos: [p.x, p.y - 0.08, p.z] })
    }
    if (papel || palha) {
      for (const t of [0.3, 0.5, 0.7]) {
        const p = curva.getPoint(t)
        if (papel) esfera(o, 'papel', [p.x, p.y - 0.42, p.z], 0.19, 16)
        else I.lanternasPalha.push({ pos: [p.x, p.y - 0.5, p.z] })
        o.add('preto', new TubeGeometry(catenaria(p, new Vector3(p.x, p.y - 0.2, p.z), 0, 2), 2, 0.004, 3))
      }
    }
  }
  for (const z of [-6, -0.8, 4.6, 9.6]) ligar(new Vector3(-4.6, 4.5, z), new Vector3(4.6, 4.5, z), 1.0, true)
  for (const x of [-4.6, 4.6]) for (const [z0, z1] of [[-6, -0.8], [-0.8, 4.6], [4.6, 9.6]]) ligar(new Vector3(x, 4.5, z0), new Vector3(x, 4.5, z1), 0.6)

  // placa de boas-vindas (cavalete) no começo do corredor
  cx(o, 'madeira', [-2.5, -2.45], [0, 1.7], [10.2, 10.26])
  cx(o, 'madeira', [-1.75, -1.7], [0, 1.7], [10.2, 10.26])
  cx(o, 'madeira', [-2.12, -2.08], [0, 1.6], [10.5, 10.9])
  arranjo(-2.1, 0.35, 10.1, 0.38, 36, 8, 0.8)

  // =================== RECEPÇÃO (tenda) ===================
  const T = TENDA
  const y0 = T.piso
  cx(o, 'deck', [T.x0 - 0.5, T.x1 + 0.5], [-0.2, y0], [T.z0 - 0.5, T.z1 + 0.5])
  for (let i = 0; i < 3; i++) cx(o, 'deck', [T.x0 - 0.8 - i * 0.3, T.x0 - 0.5 - i * 0.3], [-0.2, y0 - (i + 1) * 0.07], [-1.5, 1.5])
  const colunas = [8, 12.75, 17.5, 22.25, 27]
  for (const x of colunas) {
    for (const z of [T.z0, T.z1]) cx(o, 'madeiraClara', [x - 0.08, x + 0.08], [y0, T.beiral], [z - 0.08, z + 0.08])
    // caibros subindo até o cume
    for (const z of [T.z0, T.z1]) barra(o, 'madeiraClara', new Vector3(x, T.beiral, z), new Vector3(x, T.cume, 0), 0.06)
    // cortina amarrada em cada coluna
    for (const z of [T.z0, T.z1]) {
      const c = cortinaAmarrada(1.4, T.beiral - y0, 0.45, 6, 20)
      if (z > 0) c.rotateY(Math.PI)
      c.translate(x, T.beiral, z + (z > 0 ? -0.15 : 0.15))
      tecidos.push(c)
    }
  }
  for (const z of [T.z0, T.z1]) barra(o, 'madeiraClara', new Vector3(T.x0, T.beiral, z), new Vector3(T.x1, T.beiral, z), 0.07)
  barra(o, 'madeiraClara', new Vector3(T.x0, T.cume, 0), new Vector3(T.x1, T.cume, 0), 0.08)
  // teto de tecido drapeado com luzinhas por dentro
  for (let x = T.x0 + 0.6; x < T.x1 - 0.4; x += 1.9) {
    for (const z of [T.z0, T.z1]) {
      const a = new Vector3(x, T.beiral - 0.05, z)
      const b = new Vector3(x, T.cume - 0.12, 0)
      tecidos.push(faixaTecido(a, b, 1.55, 0.5))
      for (const dx of [-0.45, 0, 0.45]) {
        const curva = catenaria(new Vector3(x + dx, T.beiral - 0.12, z * 0.98), new Vector3(x + dx, T.cume - 0.2, 0), 0.5, 12)
        const n = 16
        for (let i = 1; i < n; i++) {
          const p = curva.getPoint(i / n)
          I.pisca.push({ pos: [p.x, p.y - 0.02, p.z] })
        }
      }
    }
  }
  // três lustres de cristal pendurados no cume
  for (const x of [14.9, 19.4, 23.6]) lustre(o, x, 3.75, 0, 1.2, T.cume)

  // pista de dança iluminada
  cx(o, 'pista', [PISTA.x0, PISTA.x1], [y0, y0 + 0.04], [PISTA.z0, PISTA.z1])

  // mesas compridas com toalha até o chão
  const M = MESAS
  for (const lado of [-1, 1]) {
    const z = lado * M.z
    cx(o, 'toalha', [M.x0, M.x1], [y0, y0 + 0.76], [z - 0.55, z + 0.55])
    cx(o, 'linho', [M.x0 - 0.1, M.x1 + 0.1], [y0 + 0.76, y0 + 0.768], [z - 0.2, z + 0.2]) // caminho de mesa
    for (let x = M.x0 + 0.5; x < M.x1 - 0.2; x += 0.7) {
      for (const s of [-1, 1]) {
        const zc = z + s * 0.8
        I.cadeiras.push({ pos: [x, y0, zc], rot: [0, s > 0 ? 0 : Math.PI, 0] })
        I.almofadas.push({ pos: [x, y0 + 0.49, zc], rot: [0, s > 0 ? 0 : Math.PI, 0] })
        const zp = z + s * 0.36
        I.sousplats.push({ pos: [x, y0 + 0.77, zp] })
        I.pratos.push({ pos: [x, y0 + 0.785, zp] })
        I.guardanapos.push({ pos: [x, y0 + 0.8, zp], rot: [0, 0.2, 0] })
        I.tacas.push({ pos: [x + 0.18, y0 + 0.76, z + s * 0.2] })
      }
    }
    // centro de mesa: flores baixas, velas altas e velinhas
    for (let x = M.x0 + 0.75; x < M.x1 - 0.3; x += 1.45) {
      arranjo(x, y0 + 0.86, z, 0.26, 26, 6, 0.6)
      for (const dx of [-0.42, 0.42]) {
        cilindro(o, 'ouro', x + dx, y0 + 0.77, y0 + 0.86, z, 0.035, 0.02, 10)
        vela(I.velas, I.chamas, x + dx, y0 + 0.86, z, 0.28, 0.018)
      }
      for (const dx of [-0.2, 0.2]) {
        I.copos.push({ pos: [x + dx + 0.05, y0 + 0.83, z + 0.12], esc: [0.045, 0.12, 0.045] })
        vela(I.velas, I.chamas, x + dx + 0.05, y0 + 0.77, z + 0.12, 0.06, 0.03)
      }
    }
  }

  // mesa dos noivos (de frente pros convidados) com guirlanda de flores
  const N = NOIVOS
  cx(o, 'toalha', [N.x - 0.45, N.x + 0.45], [y0, y0 + 0.76], [N.z - 1.2, N.z + 1.2])
  for (const dz of [-0.45, 0.45]) {
    I.cadeiras.push({ pos: [N.x + 0.8, y0, N.z + dz], rot: [0, -Math.PI / 2, 0] })
    I.almofadas.push({ pos: [N.x + 0.8, y0 + 0.49, N.z + dz], rot: [0, -Math.PI / 2, 0] })
    I.sousplats.push({ pos: [N.x + 0.1, y0 + 0.77, N.z + dz] })
    I.pratos.push({ pos: [N.x + 0.1, y0 + 0.785, N.z + dz] })
  }
  for (let dz = -1.1; dz <= 1.1; dz += 0.36) arranjo(N.x - 0.5, y0 + 0.62 + Math.cos(dz * 1.4) * 0.12, N.z + dz, 0.26, 20, 4)
  arranjo(N.x - 0.1, y0 + 0.95, N.z, 0.3, 36, 8, 0.7)
  for (const dz of [-0.9, 0.9]) {
    cilindro(o, 'ouro', N.x - 0.1, y0 + 0.77, y0 + 0.9, N.z + dz, 0.04, 0.025, 10)
    vela(I.velas, I.chamas, N.x - 0.1, y0 + 0.9, N.z + dz, 0.32, 0.02)
  }
  // o bolo: três andares brancos com flores
  const B = BOLO
  cilindro(o, 'toalha', B.x, y0, y0 + 0.78, B.z, 0.55, 0.55, 28)
  cilindro(o, 'ouro', B.x, y0 + 0.78, y0 + 0.82, B.z, 0.24, 0.24, 24)
  cilindro(o, 'bolo', B.x, y0 + 0.82, y0 + 1.0, B.z, 0.2, 0.2, 28)
  cilindro(o, 'bolo', B.x, y0 + 1.0, y0 + 1.15, B.z, 0.15, 0.15, 28)
  cilindro(o, 'bolo', B.x, y0 + 1.15, y0 + 1.28, B.z, 0.1, 0.1, 28)
  arranjo(B.x + 0.05, y0 + 1.1, B.z + 0.12, 0.1, 10, 2)
  arranjo(B.x - 0.06, y0 + 1.3, B.z, 0.08, 8, 2)

  // =================== LOUNGE E BAR ===================
  const L = LOUNGE
  const sofa = (x: number, z: number, giro: number, comp: number) => {
    const partes: [number, number, number, number, number, number][] = [
      [0, 0.22, 0, comp, 0.3, 0.85],
      [0, 0.44, 0.06, comp - 0.3, 0.16, 0.68],
      [0, 0.62, -0.34, comp, 0.55, 0.2],
      [-comp / 2 + 0.1, 0.5, 0, 0.2, 0.34, 0.85],
      [comp / 2 - 0.1, 0.5, 0, 0.2, 0.34, 0.85],
    ]
    for (const [px, py, pz, w, h, d] of partes) {
      const g = new RoundedBoxGeometry(w, h, d, 2, 0.05)
      g.translate(px, py, pz)
      g.rotateY(giro)
      g.translate(x, chao(x, z), z)
      o.add('sofa', g)
    }
    const cores = ['almTerracota', 'almSalvia', 'almLavanda', 'almCreme']
    for (let i = 0; i < Math.round(comp / 0.6); i++) {
      const g = new RoundedBoxGeometry(0.42, 0.4, 0.12, 2, 0.05)
      g.rotateX(-0.25)
      g.translate(-comp / 2 + 0.45 + i * 0.6, 0.72, -0.18)
      g.rotateY(giro)
      g.translate(x, chao(x, z), z)
      o.add(cores[(i + Math.round(x)) % cores.length], g)
    }
  }
  const tapete = new CircleGeometry(2.6, 40)
  tapete.rotateX(-Math.PI / 2)
  tapete.translate(L.x, chao(L.x, L.z) + 0.03, L.z)
  o.add('juta', tapete)
  sofa(L.x, L.z - 1.7, 0, 2.4)
  sofa(L.x, L.z + 1.7, Math.PI, 2.4)
  sofa(L.x - 1.8, L.z, Math.PI / 2, 1.6)
  cilindro(o, 'madeira', L.x, chao(L.x, L.z), chao(L.x, L.z) + 0.38, L.z, 0.5, 0.45, 24)
  arranjo(L.x, chao(L.x, L.z) + 0.5, L.z, 0.2, 18, 4)
  for (const dx of [-0.25, 0.25]) {
    I.copos.push({ pos: [L.x + dx, chao(L.x, L.z) + 0.46, L.z + 0.2], esc: [0.05, 0.14, 0.05] })
    vela(I.velas, I.chamas, L.x + dx, chao(L.x, L.z) + 0.38, L.z + 0.2, 0.08, 0.035)
  }
  for (const [x, z] of [
    [L.x + 1.8, L.z - 0.7],
    [L.x + 1.8, L.z + 0.7],
  ]) {
    const g = new SphereGeometry(0.34, 16, 10)
    g.scale(1, 0.6, 1)
    g.translate(x, chao(x, z) + 0.2, z)
    o.add(z < L.z ? 'almCreme' : 'almTerracota', g)
  }
  // pergolado leve sobre o lounge, com lanternas de palha penduradas
  const pl: [number, number][] = [
    [L.x - 3, L.z - 3],
    [L.x + 3, L.z - 3],
    [L.x - 3, L.z + 3],
    [L.x + 3, L.z + 3],
  ]
  for (const [x, z] of pl) cx(o, 'madeira', [x - 0.08, x + 0.08], [chao(x, z) - 0.2, 3.3], [z - 0.08, z + 0.08])
  for (const z of [L.z - 3, L.z + 3]) cx(o, 'madeira', [L.x - 3.2, L.x + 3.2], [3.2, 3.35], [z - 0.08, z + 0.08])
  for (let x = L.x - 2.8; x <= L.x + 2.8; x += 0.7) cx(o, 'madeira', [x - 0.04, x + 0.04], [3.35, 3.47], [L.z - 3.3, L.z + 3.3])
  for (const [x, z] of [
    [L.x - 1.2, L.z - 1],
    [L.x + 1.1, L.z + 0.2],
    [L.x - 0.2, L.z + 1.3],
    [L.x + 0.5, L.z - 1.6],
  ]) {
    I.lanternasPalha.push({ pos: [x, 2.35, z], esc: 1.1 })
    o.add('preto', new TubeGeometry(catenaria(new Vector3(x, 3.2, z), new Vector3(x, 2.7, z), 0, 2), 2, 0.005, 3))
  }
  for (const [a, b] of [
    [0, 3],
    [1, 2],
  ]) {
    const [x0, z0] = pl[a]
    const [x1, z1] = pl[b]
    ligar(new Vector3(x0, 3.2, z0), new Vector3(x1, 3.2, z1), 0.5)
  }

  // bar de madeira e palha
  const BR = BAR
  cx(o, 'rattan', [BR.x - 1.8, BR.x + 1.8], [chao(BR.x, BR.z), 1.05], [BR.z - 0.3, BR.z + 0.3])
  cx(o, 'marmore', [BR.x - 1.9, BR.x + 1.9], [1.05, 1.1], [BR.z - 0.38, BR.z + 0.38])
  cx(o, 'madeira', [BR.x - 1.8, BR.x + 1.8], [0, 2.1], [BR.z - 1.55, BR.z - 1.45])
  for (const y of [1.1, 1.6]) cx(o, 'madeira', [BR.x - 1.7, BR.x + 1.7], [y, y + 0.04], [BR.z - 1.45, BR.z - 1.2])
  for (let i = 0; i < 16; i++) {
    const x = BR.x - 1.5 + i * 0.2
    const y = i % 2 ? 1.14 : 1.64
    cilindro(o, ['garrafaA', 'garrafaB', 'garrafaC'][i % 3], x, y, y + 0.28, BR.z - 1.32, 0.035, 0.035, 8)
    cilindro(o, ['garrafaA', 'garrafaB', 'garrafaC'][i % 3], x, y + 0.28, y + 0.36, BR.z - 1.32, 0.035, 0.012, 8)
  }
  for (let i = 0; i < 6; i++) I.tacas.push({ pos: [BR.x - 1.2 + i * 0.35, 1.1, BR.z + 0.1] })
  arranjo(BR.x + 1.3, 1.3, BR.z, 0.26, 24, 6)
  for (const dx of [-1.1, 0, 1.1]) {
    const x = BR.x + dx
    cilindro(o, 'madeira', x, chao(x, BR.z + 0.8), chao(x, BR.z + 0.8) + 0.75, BR.z + 0.8, 0.03, 0.03, 6)
    cilindro(o, 'rattan', x, chao(x, BR.z + 0.8) + 0.72, chao(x, BR.z + 0.8) + 0.78, BR.z + 0.8, 0.2, 0.2, 16)
  }

  // =================== NATUREZA DA PRAIA ===================
  I.coqueiros.push(
    { pos: [-7.5, chao(-7.5, -12.5), -12.5], alt: 8, giro: 0.4 },
    { pos: [6.2, chao(6.2, -13), -13], alt: 7.2, giro: 2.6 },
    { pos: [-20, chao(-20, 4), 4], alt: 8.4, giro: -0.3 },
    { pos: [-18.5, chao(-18.5, -10), -10], alt: 7.4, giro: 0.9 },
    { pos: [30.5, chao(30.5, -9), -9], alt: 8.2, giro: 3.4 },
    { pos: [31, chao(31, 9), 9], alt: 7.6, giro: 2.8 },
    { pos: [4.8, chao(4.8, 15), 15], alt: 7.8, giro: -2.4 },
    { pos: [-7.2, chao(-7.2, 16), 16], alt: 8.8, giro: 1.9 },
    { pos: [18, chao(18, 14), 14], alt: 7, giro: -1.2 },
  )
  const moitas: [number, number, number][] = [
    [-6.2, -9.5, 14],
    [6.2, -9.8, 14],
    [-6.5, 6.5, 12],
    [6.3, 7.2, 12],
    [-16, 7.5, 16],
    [-17.5, -3.5, 14],
    [29, -3, 12],
    [29.3, 4.5, 12],
    [2, 16.5, 18],
    [-3, 18, 18],
    [12, 16, 16],
    [22, 15, 16],
    [-12, 13, 16],
  ]
  for (const [x0, z0, n] of moitas)
    for (let i = 0; i < n; i++) {
      const a = rand() * 6.28
      const r = Math.sqrt(rand()) * 1.2
      const x = x0 + Math.cos(a) * r
      const z = z0 + Math.sin(a) * r
      const s = 1.5 + rand() * 1.4
      I.capim.push({ pos: [x, chao(x, z), z], rot: [(rand() - 0.5) * 0.3, rand() * 6, 0], esc: [s * 0.6, s * 1.4, s * 0.6] })
    }
  // tochas iluminando o caminho da areia até a festa
  for (let i = 0; i < 6; i++) {
    const x = 4.5 + i * 0.6
    for (const z of [-1.4, 1.4]) {
      if (i % 2) continue
      cilindro(o, 'madeira', x, chao(x, z), chao(x, z) + 1.3, z, 0.025, 0.03, 6)
      cilindro(o, 'rattan', x, chao(x, z) + 1.3, chao(x, z) + 1.45, z, 0.07, 0.05, 10)
      const f = new CylinderGeometry(0, 0.06, 0.2, 6)
      f.translate(x, chao(x, z) + 1.55, z)
      o.add('chama', f)
    }
  }

  // espigas de lavanda (dois planos cruzados cada)
  const partesLavanda: BufferGeometry[] = []
  for (const e of espigas)
    for (const r of [0, Math.PI / 2]) {
      const p = new PlaneGeometry(0.1, e.alt)
      p.translate(0, e.alt / 2, 0)
      p.rotateZ(e.incl)
      p.rotateY(e.giro + r)
      p.translate(e.base.x, e.base.y, e.base.z)
      partesLavanda.push(p)
    }

  return {
    pecas: o.finalizar({ deck: 1.8, madeira: 1.8, madeiraClara: 1.8, juta: 0.9, toalha: 0.27, linho: 0.27, pista: 0.6, rattan: 0.45, marmore: 1.2, sofa: 0.27 }),
    tecidos: mergeGeometries(
      tecidos.map((g) => {
        const n = g.index ? g.toNonIndexed() : g
        n.deleteAttribute('uv') // nem todas as peças têm, e o tecido não usa textura
        return n
      }),
    )!,
    lavanda: partesLavanda.length ? mergeGeometries(partesLavanda)! : null,
    arranjos,
    I,
  }
}

export type Casamento = ReturnType<typeof montarCasamento>
