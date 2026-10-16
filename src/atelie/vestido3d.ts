import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type Material,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CORES, type Vestido } from './modelo'
import { texBrilho, texRenda, texTrama, texTule } from './texturas'

// O vestido em 3D, montado a partir das escolhas (modelo.ts), num manequim.
// Medidas em metros; y pra cima, a frente é +z. O corpo é uma "coluna" de elipses (corpo(y)):
// o corpete segue o corpo, a saia sai da cintura com a silhueta escolhida, e o resto (mangas, véu,
// pérolas, flores…) é montado em volta. Cada parte vira uma malha; tudo junto num Group.

// ---------------- o corpo (manequim) ----------------

/** [altura, meia-largura, meia-profundidade] do corpo, de cima pra baixo */
const CORPO: [number, number, number][] = [
  [1.47, 0.054, 0.054],
  [1.452, 0.075, 0.064],
  [1.432, 0.128, 0.074],
  [1.408, 0.164, 0.082],
  [1.385, 0.172, 0.088],
  [1.35, 0.163, 0.096],
  [1.31, 0.151, 0.104],
  [1.26, 0.149, 0.112],
  [1.19, 0.127, 0.097],
  [1.08, 0.111, 0.084],
  [0.99, 0.142, 0.097],
  [0.9, 0.164, 0.109],
  [0.8, 0.158, 0.104],
  [0.45, 0.13, 0.09],
  [0.0, 0.11, 0.08],
]
const suave = (t: number) => t * t * (3 - 2 * t)
const passo = (a: number, b: number, x: number) => suave(Math.min(1, Math.max(0, (x - a) / (b - a))))

function corpo(y: number): [number, number] {
  if (y >= CORPO[0][0]) return [CORPO[0][1], CORPO[0][2]]
  for (let i = 0; i < CORPO.length - 1; i++) {
    const [y0, x0, z0] = CORPO[i]
    const [y1, x1, z1] = CORPO[i + 1]
    if (y <= y0 && y >= y1) {
      const t = suave((y0 - y) / (y0 - y1))
      return [x0 + (x1 - x0) * t, z0 + (z1 - z0) * t]
    }
  }
  const u = CORPO[CORPO.length - 1]
  return [u[1], u[2]]
}
/** O volume do busto na frente */
const busto = (y: number, cosT: number) => Math.max(0, cosT) ** 2.5 * 0.022 * Math.exp(-(((y - 1.255) / 0.05) ** 2))

/** Ponto na superfície do corpo, "folga" a mais pra fora */
function noCorpo(theta: number, y: number, folga: number, alvo = new Vector3()) {
  const [rx, rz] = corpo(y)
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  return alvo.set(s * (rx + folga), y, c * (rz + folga) + busto(y, c))
}

// ---------------- braços (a mesma curva serve pro manequim e pras mangas) ----------------

function curvaBraco(lado: 1 | -1) {
  // os braços descem colados ao corpo e as mãos se encontram na frente, na altura da cintura
  // (altas o bastante pra não entrarem numa saia de princesa: é como a noiva segura o buquê)
  return new CatmullRomCurve3([
    new Vector3(lado * 0.15, 1.392, -0.006),
    new Vector3(lado * 0.2, 1.33, -0.003),
    new Vector3(lado * 0.218, 1.25, 0.002),
    new Vector3(lado * 0.235, 1.15, 0.035),
    new Vector3(lado * 0.2, 1.075, 0.13),
    new Vector3(lado * 0.11, 1.045, 0.225),
    new Vector3(lado * 0.035, 1.045, 0.262),
  ])
}
const raioBraco = (t: number) => 0.046 - 0.012 * passo(0, 0.45, t) - 0.008 * passo(0.45, 0.85, t)

/** Tubo ao longo de uma curva, com raio variando; de t0 a t1 */
function tubo(curva: CatmullRomCurve3, t0: number, t1: number, raio: (t: number) => number, segs = 36, lados = 20, fechar = false) {
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const p = new Vector3()
  const tg = new Vector3()
  const n = new Vector3()
  const b = new Vector3()
  const cima = new Vector3(0, 0, 1)
  for (let i = 0; i <= segs; i++) {
    const t = t0 + ((t1 - t0) * i) / segs
    curva.getPointAt(t, p)
    curva.getTangentAt(t, tg)
    n.crossVectors(tg, cima).normalize()
    if (n.lengthSq() < 1e-6) n.set(1, 0, 0)
    b.crossVectors(n, tg).normalize()
    const r = raio(t)
    for (let j = 0; j <= lados; j++) {
      const a = (j / lados) * Math.PI * 2
      pos.push(p.x + (n.x * Math.cos(a) + b.x * Math.sin(a)) * r, p.y + (n.y * Math.cos(a) + b.y * Math.sin(a)) * r, p.z + (n.z * Math.cos(a) + b.z * Math.sin(a)) * r)
      uv.push((j / lados) * 2, t * 6)
    }
  }
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < lados; j++) {
      const a = i * (lados + 1) + j
      const c = a + lados + 1
      idx.push(a, c, a + 1, a + 1, c, c + 1)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  if (fechar) {
    // as pontas arredondadas (o ombro e a mão)
    const pontas = [t0, t1].map((t) => {
      const e = new SphereGeometry(raio(t), 16, 12)
      curva.getPointAt(t, p)
      return e.translate(p.x, p.y, p.z)
    })
    return mergeGeometries([g, ...pontas], false) ?? g
  }
  return g
}

let semente = 1
/** Aleatório com semente (reinicia a cada vestido montado) */
const rnd = () => ((semente = (semente * 16807) % 2147483647) - 1) / 2147483646

// ---------------- o vestido ----------------

interface Linhas {
  /** topo do corpete (decote) pra cada ângulo */
  topo: (phi: number) => number
  /** altura da cintura (onde a saia começa) */
  cintura: (phi: number) => number
  bainha: number
}

function linhas(v: Vestido): Linhas {
  const frente = (phi: number) => {
    const a = Math.abs(phi)
    switch (v.decote) {
      case 'coracao':
        return 1.293 + 0.016 * Math.exp(-(((a - 0.42) / 0.2) ** 2)) - 0.05 * Math.exp(-((a / 0.12) ** 2))
      case 'reto':
        return 1.285
      case 'ombroAOmbro':
        return 1.335 - 0.018 * Math.exp(-((a / 0.5) ** 2))
      case 'v':
        return 1.17 + (1.398 - 1.17) * passo(0, 1.15, a)
      case 'vProfundo':
        return 1.075 + (1.398 - 1.075) * passo(0, 1.25, a)
      case 'quadrado':
        return a < 0.4 ? 1.24 : 1.24 + (1.398 - 1.24) * passo(0.4, 0.62, a)
      case 'redondo':
        return 1.245 + (1.398 - 1.245) * passo(0, 1.15, a) ** 0.75
      case 'canoa':
        return 1.418 - 0.012 * Math.cos(a)
      case 'halter':
        return 1.275 + 0.17 * (1 - passo(0.12, 0.85, a))
      case 'assimetrico':
        return 1.285 + 0.113 * passo(-0.35, 0.95, Math.sin(phi))
      case 'golaAlta':
        return 1.468
    }
  }
  const lateral = frente(Math.PI / 2)
  const costas = (phi: number) => {
    const d = Math.PI - Math.abs(phi) // 0 = meio das costas
    const base = v.decote === 'assimetrico' ? frente(phi) : v.decote === 'halter' ? 1.28 : Math.max(1.27, lateral - (lateral > 1.38 ? 0.0 : 0.01))
    switch (v.costas) {
      case 'fechada':
        return v.decote === 'halter' ? 1.27 : base
      case 'redonda':
        return base - 0.13 * Math.exp(-((d / 0.75) ** 2))
      case 'v':
        return base - 0.26 * (1 - passo(0, 0.95, d))
      case 'aberta':
        return Math.min(base, 1.02 + (base - 1.02) * passo(0.35, 1.25, d))
    }
  }
  const imperio = v.silhueta === 'imperio'
  const cintura = (phi: number) => {
    if (imperio || v.cintura === 'alta') return 1.19
    if (v.cintura === 'baixa') return 0.955
    if (v.cintura === 'basque') return 1.0 - 0.075 * Math.max(0, Math.cos(phi)) ** 5
    return 1.08
  }
  const topo = (phi: number) => {
    const a = Math.abs(phi)
    const s = passo(1.3, 1.95, a)
    return Math.max(frente(phi) * (1 - s) + costas(phi) * s, cintura(phi) + 0.06)
  }
  const bainha = v.comprimento === 'curto' ? 0.62 : v.comprimento === 'midi' ? 0.33 : 0.012
  return { topo, cintura, bainha }
}

/** Raio da saia (multiplicador sobre o corpo) — t vai de 0 (cintura) a 1 (bainha) */
function perfilSaia(v: Vestido, y: number, t: number, yC: number, yB: number) {
  const [bx, bz] = corpo(Math.max(y, 0.0))
  const corpoX = bx + 0.01
  const corpoZ = bz + 0.01
  const vol = 0.75 + 0.5 * v.volume
  const larg: Record<Vestido['silhueta'], number> = { princesa: 0.62, evase: 0.52, sereia: 0.5, trompete: 0.46, coluna: 0.21, imperio: 0.46 }
  const R = v.silhueta === 'coluna' ? 0.2 + 0.07 * v.volume : larg[v.silhueta] * vol
  const [cx] = corpo(yC)
  let r: number
  switch (v.silhueta) {
    case 'princesa': {
      // sai firme da cintura (com a anágua) e abre redondo
      const e = 1 - (1 - t) ** 2.4
      r = cx + 0.008 + (R - cx) * e
      break
    }
    case 'evase':
    case 'imperio': {
      r = cx + 0.007 + (R - cx) * t ** (v.silhueta === 'imperio' ? 0.85 : 0.95)
      break
    }
    case 'sereia':
    case 'trompete': {
      const joelho = v.silhueta === 'sereia' ? 0.42 : 0.62
      if (y > joelho) r = corpoX + 0.008
      else {
        const u = (joelho - y) / Math.max(0.05, joelho - yB)
        r = corpoX + 0.008 + (R - corpoX) * u ** (v.silhueta === 'sereia' ? 1.7 : 1.35)
      }
      break
    }
    case 'coluna':
    default: {
      r = Math.max(corpoX + 0.01, cx + 0.01 + (R - cx) * t ** 0.8)
    }
  }
  r = Math.max(r, corpoX + 0.006)
  // achatadinha na frente/atrás (o tecido cai assim)
  const achata = v.silhueta === 'coluna' || v.silhueta === 'sereia' ? corpoZ / corpoX : 0.86
  return [r, Math.max(r * achata, corpoZ + 0.006)] as const
}

const COLS = 128
const ROWS = 150

interface Grade {
  pos: Float32Array
  y: Float32Array
  cols: number
  rows: number
}

/** A superfície do vestido (corpete + saia), como uma grade (ângulo × altura) */
function grade(v: Vestido, L: Linhas, opcoes: { folga?: number; soSaia?: boolean; escala?: number; bainhaExtra?: number } = {}): Grade {
  const folga = opcoes.folga ?? 0.006
  const escala = opcoes.escala ?? 1
  const pos = new Float32Array((COLS + 1) * (ROWS + 1) * 3)
  const ys = new Float32Array((COLS + 1) * (ROWS + 1))
  const cauda = { sem: 0, capela: 0.55, catedral: 1.25, real: 2.1 }[v.cauda] * (v.comprimento === 'longo' ? 1 : 0)
  const dobras = { princesa: 16, evase: 11, sereia: 13, trompete: 12, coluna: 7, imperio: 9 }[v.silhueta]
  const p = new Vector3()
  for (let j = 0; j <= COLS; j++) {
    const theta = (j / COLS) * Math.PI * 2
    const phi = Math.atan2(Math.sin(theta), Math.cos(theta))
    const c = Math.cos(theta)
    const s = Math.sin(theta)
    const yC = L.cintura(phi)
    const yT = opcoes.soSaia ? yC : L.topo(phi)
    const yB = Math.max(0.006, L.bainha - (opcoes.bainhaExtra ?? 0))
    for (let i = 0; i <= ROWS; i++) {
      const k = j * (ROWS + 1) + i
      const u = i / ROWS
      // mais linhas no corpete (é onde tem detalhe)
      const fracCorpete = opcoes.soSaia ? 0 : 0.28
      let y: number
      if (fracCorpete > 0 && u <= fracCorpete) y = yT + (yC - yT) * (u / fracCorpete)
      else y = yC + (yB - yC) * ((u - fracCorpete) / (1 - fracCorpete))
      ys[k] = y
      if (y >= yC - 1e-4 && !opcoes.soSaia) {
        noCorpo(theta, y, folga, p)
      } else {
        const t = (yC - y) / Math.max(0.01, yC - yB)
        let [rx, rz] = perfilSaia(v, y, t, yC, yB)
        rx *= escala
        rz *= escala
        // drapeado: pregas que vão abrindo pra baixo
        const amp = (0.008 + 0.055 * v.drapeado) * t ** 1.25
        const onda = Math.sin(dobras * theta + 0.8 * Math.sin(3 * theta)) * 0.75 + Math.sin(dobras * 2.1 * theta + 1.3) * 0.25
        rx *= 1 + amp * onda
        rz *= 1 + amp * onda
        p.set(s * rx, y, c * rz)
        // a cauda: atrás, perto do chão, o tecido vai escorrendo pra trás
        if (cauda > 0 && c < 0) {
          const peso = (-c) ** 2.2
          const g = passo(0.42, 0, y)
          p.z -= cauda * peso * g ** 1.6
          p.x *= 1 + 0.35 * peso * g ** 2
        }
        // na bainha, encosta no chão e espalha um tiquinho
        if (L.bainha < 0.05 && y < 0.03) {
          p.x *= 1.02
          p.z *= 1.02
        }
      }
      pos.set([p.x, p.y, p.z], k * 3)
    }
  }
  return { pos, y: ys, cols: COLS, rows: ROWS }
}

/** Transforma a grade em malha (só as linhas entre yMin e yMax; pode pular um pedaço, como a fenda) */
function malha(gr: Grade, o: { yMin?: number; yMax?: number; pular?: (theta: number, y: number) => boolean; cores?: (y: number) => Color; repU?: number; repV?: number } = {}) {
  const { cols, rows } = gr
  const uv = new Float32Array((cols + 1) * (rows + 1) * 2)
  const cor = o.cores ? new Float32Array((cols + 1) * (rows + 1) * 3) : null
  for (let j = 0; j <= cols; j++)
    for (let i = 0; i <= rows; i++) {
      const k = j * (rows + 1) + i
      uv[k * 2] = (j / cols) * (o.repU ?? 14)
      uv[k * 2 + 1] = gr.y[k] * (o.repV ?? 4.2)
      if (cor && o.cores) {
        const c = o.cores(gr.y[k])
        cor.set([c.r, c.g, c.b], k * 3)
      }
    }
  const idx: number[] = []
  for (let j = 0; j < cols; j++)
    for (let i = 0; i < rows; i++) {
      const a = j * (rows + 1) + i
      const b = (j + 1) * (rows + 1) + i
      const ym = (gr.y[a] + gr.y[a + 1]) / 2
      if (o.yMin !== undefined && ym < o.yMin) continue
      if (o.yMax !== undefined && ym > o.yMax) continue
      if (o.pular?.(((j + 0.5) / cols) * Math.PI * 2, ym)) continue
      idx.push(a, a + 1, b, b, a + 1, b + 1)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(gr.pos.slice(), 3))
  g.setAttribute('uv', new BufferAttribute(uv, 2))
  if (cor) g.setAttribute('color', new BufferAttribute(cor, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  // costura de trás (a primeira e a última coluna são o mesmo lugar): normal igualzinha
  const n = g.attributes.normal as BufferAttribute
  for (let i = 0; i <= rows; i++) {
    const a = i
    const b = cols * (rows + 1) + i
    const nx = n.getX(a) + n.getX(b)
    const ny = n.getY(a) + n.getY(b)
    const nz = n.getZ(a) + n.getZ(b)
    const l = Math.hypot(nx, ny, nz) || 1
    n.setXYZ(a, nx / l, ny / l, nz / l)
    n.setXYZ(b, nx / l, ny / l, nz / l)
  }
  return g
}

/** Um ponto e a normal da grade (pra grudar pérolas e flores no tecido) */
function amostrar(gr: Grade, theta: number, i: number, saida: Vector3, normal?: Vector3) {
  const j = Math.round((((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * gr.cols)
  const ii = Math.max(0, Math.min(gr.rows - 1, i))
  const k = j * (gr.rows + 1) + ii
  saida.set(gr.pos[k * 3], gr.pos[k * 3 + 1], gr.pos[k * 3 + 2])
  if (normal) {
    const k2 = Math.min(j + 1, gr.cols) * (gr.rows + 1) + ii
    const k3 = j * (gr.rows + 1) + ii + 1
    const a = new Vector3(gr.pos[k2 * 3] - saida.x, gr.pos[k2 * 3 + 1] - saida.y, gr.pos[k2 * 3 + 2] - saida.z)
    const b = new Vector3(gr.pos[k3 * 3] - saida.x, gr.pos[k3 * 3 + 1] - saida.y, gr.pos[k3 * 3 + 2] - saida.z)
    normal.crossVectors(b, a).normalize()
    if (normal.dot(new Vector3(saida.x, 0, saida.z)) < 0) normal.negate()
  }
  return saida
}

// ---------------- materiais ----------------

export function materiaisDoVestido(v: Vestido) {
  const base = new Color(CORES[v.cor].cor)
  const tecido = v.tecido === 'tule' ? 'crepe' : v.tecido
  const cfg: Record<string, { rough: number; sheen: number; sheenR: number; clear?: number; bump?: boolean }> = {
    cetim: { rough: 0.36, sheen: 0.85, sheenR: 0.32, clear: 0.12 },
    seda: { rough: 0.3, sheen: 1, sheenR: 0.24, clear: 0.05 },
    mikado: { rough: 0.48, sheen: 0.55, sheenR: 0.45, bump: true },
    zibeline: { rough: 0.42, sheen: 0.65, sheenR: 0.4, bump: true },
    crepe: { rough: 0.88, sheen: 0.25, sheenR: 0.7 },
  }
  const c = cfg[tecido]
  const brilho = v.brilho > 0.02
  const tecidoMat = new MeshPhysicalMaterial({
    color: '#FFFFFF',
    vertexColors: true,
    roughness: c.rough,
    sheen: c.sheen,
    sheenRoughness: c.sheenR,
    sheenColor: new Color('#FFFFFF'),
    clearcoat: c.clear ?? 0,
    clearcoatRoughness: 0.4,
    side: DoubleSide,
    ...(c.bump ? { bumpMap: texTrama(), bumpScale: 0.6 } : {}),
    ...(brilho ? { emissiveMap: texBrilho(), emissive: new Color('#FFF8EC'), emissiveIntensity: 0.25 + 1.4 * v.brilho } : {}),
  })
  const renda = new MeshStandardMaterial({ color: base.clone().offsetHSL(0, 0, 0.02), map: texRenda(), alphaTest: 0.45, transparent: false, side: DoubleSide, roughness: 0.8 })
  const tule = new MeshStandardMaterial({ color: base, map: texTule(), transparent: true, opacity: 0.42, depthWrite: false, side: DoubleSide, roughness: 1, ...(brilho ? { emissiveMap: texBrilho(), emissive: new Color('#FFF8EC'), emissiveIntensity: 0.6 * v.brilho } : {}) })
  const tuleManga = new MeshStandardMaterial({ color: base, transparent: true, opacity: 0.38, depthWrite: false, side: DoubleSide, roughness: 0.9 })
  const veu = new MeshStandardMaterial({ color: '#FFFFFF', map: texTule(), transparent: true, opacity: 0.32, depthWrite: false, side: DoubleSide, roughness: 1 })
  const perola = new MeshPhysicalMaterial({ color: '#FBF6EC', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 1, sheenColor: new Color('#FFE6F0') })
  const cristal = new MeshPhysicalMaterial({ color: '#FFFFFF', roughness: 0.05, metalness: 0.2, transmission: 0, clearcoat: 1, emissive: new Color('#DCE8FF'), emissiveIntensity: 0.35 })
  const prata = new MeshStandardMaterial({ color: '#D9DCE0', metalness: 0.9, roughness: 0.22 })
  const flor = new MeshStandardMaterial({ color: base.clone().offsetHSL(0, 0, 0.03), roughness: 0.75, side: DoubleSide })
  const pele = new MeshStandardMaterial({ color: '#EFE8E0', roughness: 0.55 })
  return { base, tecidoMat, renda, tule, tuleManga, veu, perola, cristal, prata, flor, pele }
}

// ---------------- buquê e flores ----------------

/** Uma rosinha/florzinha 3D (5 pétalas em concha + miolo), em pé no +y */
function geoFlor(tam: number, petalas = 5) {
  const partes: BufferGeometry[] = []
  for (let k = 0; k < petalas; k++) {
    const p = new SphereGeometry(tam * 0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)
    p.scale(1, 0.45, 0.75)
    p.rotateX(-0.9)
    p.translate(0, tam * 0.1, tam * 0.42)
    p.rotateY((k / petalas) * Math.PI * 2)
    partes.push(p.toNonIndexed())
  }
  const miolo = new SphereGeometry(tam * 0.28, 12, 8)
  miolo.translate(0, tam * 0.2, 0)
  partes.push(miolo.toNonIndexed())
  return mergeGeometries(partes)!
}

const CORES_BUQUE: Record<string, string[]> = {
  redondo: ['#FFFFFF', '#FBF5EC', '#F7EFE4'],
  cascata: ['#FFFFFF', '#FBF5EC', '#F3E7EE'],
  campestre: ['#F7D9A8', '#F2B8C6', '#FFFFFF', '#C9B5E8', '#F5C77E'],
  peonias: ['#F4C0CC', '#F7D3DA', '#EDA6B8', '#FFFFFF'],
  lavanda: ['#B9A3D9', '#A88FD0', '#C8B6E2'],
}

function buque(tipo: Vestido['buque'], g: Group) {
  if (tipo === 'nenhum') return
  const centro = new Vector3(0, 1.085, 0.31)
  const folha = new MeshStandardMaterial({ color: '#7D9A72', roughness: 0.75, side: DoubleSide })
  const fita = new MeshPhysicalMaterial({ color: '#F4EEE4', roughness: 0.38, sheen: 0.8, sheenColor: new Color('#FFFFFF') })
  const verde = new MeshStandardMaterial({ color: '#8FA77E', roughness: 0.8 })
  // os cabinhos: enrolados em fita de cetim, só as pontinhas verdes aparecendo embaixo
  const inclina = new Matrix4().makeRotationX(0.3)
  const cabo = new CylinderGeometry(0.03, 0.026, 0.1, 20)
  cabo.translate(0, -0.075, 0)
  cabo.applyMatrix4(inclina)
  const ponta = new CylinderGeometry(0.024, 0.02, 0.035, 14)
  ponta.translate(0, -0.14, 0)
  ponta.applyMatrix4(inclina)
  for (const [geo, mat] of [
    [cabo, fita],
    [ponta, verde],
  ] as const) {
    const m = new Mesh(geo, mat)
    m.position.copy(centro)
    g.add(m)
  }
  if (tipo === 'lavanda') {
    // raminhos de lavanda: caule fininho e a espiga de botõezinhos roxos na ponta, abrindo em leque
    const ramos = 30
    const porRamo = 11
    const caules = new InstancedMesh(new CylinderGeometry(0.0018, 0.0022, 0.1, 5).translate(0, 0.05, 0), verde, ramos)
    const botoes = new InstancedMesh(new SphereGeometry(0.0055, 7, 5).scale(1, 1.5, 1), new MeshStandardMaterial({ color: '#9A84C4', roughness: 0.85 }), ramos * porRamo)
    const o = new Object3D()
    const dir = new Vector3()
    let k = 0
    for (let i = 0; i < ramos; i++) {
      const a = rnd() * Math.PI * 2
      const r = Math.sqrt(rnd()) * 0.05
      const base = new Vector3(centro.x + Math.cos(a) * r * 0.5, centro.y - 0.02, centro.z + Math.sin(a) * r * 0.4)
      dir.set(Math.cos(a) * r * 4.5, 1, Math.sin(a) * r * 3.6 + 0.2).normalize()
      o.position.copy(base)
      o.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir)
      o.scale.setScalar(1)
      o.updateMatrix()
      caules.setMatrixAt(i, o.matrix)
      const alto = 0.09 + rnd() * 0.04
      for (let b = 0; b < porRamo; b++) {
        const t = alto + (b / porRamo) * 0.065
        o.position.copy(base).addScaledVector(dir, t)
        o.position.x += Math.cos(b * 2.4) * 0.004
        o.position.z += Math.sin(b * 2.4) * 0.004
        o.scale.setScalar(1 - (b / porRamo) * 0.45)
        o.updateMatrix()
        botoes.setMatrixAt(k++, o.matrix)
      }
    }
    g.add(caules, botoes)
    return
  }
  const cores = CORES_BUQUE[tipo]
  const tam = tipo === 'peonias' ? 0.058 : 0.046
  const geo = geoFlor(tam, tipo === 'peonias' ? 8 : 6)
  const n = tipo === 'cascata' ? 46 : 34
  const inst = new InstancedMesh(geo, new MeshStandardMaterial({ roughness: 0.62, side: DoubleSide }), n)
  const o = new Object3D()
  const cor = new Color()
  const raio = 0.115
  for (let i = 0; i < n; i++) {
    // um domo de flores (a cascata vai escorrendo pra baixo na frente)
    const a = rnd() * Math.PI * 2
    const r = Math.sqrt(rnd()) * raio
    let x = Math.cos(a) * r
    let z = Math.sin(a) * r * 0.85
    let y = Math.sqrt(Math.max(0, raio * raio - r * r)) * 0.55
    if (tipo === 'cascata' && i >= 30) {
      const t = (i - 30) / (n - 30)
      x = (rnd() - 0.5) * 0.1 * (1 - t * 0.7)
      y = -0.03 - t * 0.3
      z = raio * 0.75 + t * 0.03
    }
    if (tipo === 'campestre') y += (rnd() - 0.3) * 0.05
    o.position.set(centro.x + x, centro.y + y, centro.z + z)
    o.lookAt(o.position.clone().add(new Vector3(x * 5, 0.5, z * 5 + 0.25)))
    o.rotateX(Math.PI / 2)
    o.scale.setScalar(0.8 + rnd() * 0.4)
    o.updateMatrix()
    inst.setMatrixAt(i, o.matrix)
    inst.setColorAt(i, cor.set(cores[i % cores.length]))
  }
  // folhinhas por baixo da borda, quase escondidas
  const nf = 14
  const folhas = new InstancedMesh(new SphereGeometry(0.03, 8, 5).scale(0.42, 0.08, 1.1).translate(0, 0, 0.025), folha, nf)
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * Math.PI * 2 + rnd() * 0.3
    o.position.set(centro.x + Math.cos(a) * raio * 0.85, centro.y - 0.01, centro.z + Math.sin(a) * raio * 0.75)
    o.rotation.set(0, -a + Math.PI / 2, 0)
    o.rotateX(0.35)
    o.scale.setScalar(0.9 + rnd() * 0.3)
    o.updateMatrix()
    folhas.setMatrixAt(i, o.matrix)
  }
  g.add(inst, folhas)
}

// ---------------- montando tudo ----------------

/** O manequim (de linho clarinho, pra o vestido se destacar): tronco, pescoço, cabeça, braços e pernas */
export function montarManequim(mat: Material) {
  const g = new Group()
  const rows = 80
  const cols = 64
  const pos: number[] = []
  const idx: number[] = []
  const p = new Vector3()
  for (let j = 0; j <= cols; j++)
    for (let i = 0; i <= rows; i++) {
      const y = 1.49 - (i / rows) * 0.73
      noCorpo((j / cols) * Math.PI * 2, y, 0, p)
      pos.push(p.x, p.y, p.z)
    }
  for (let j = 0; j < cols; j++)
    for (let i = 0; i < rows; i++) {
      const a = j * (rows + 1) + i
      const b = a + rows + 1
      idx.push(a, a + 1, b, b, a + 1, b + 1)
    }
  const tronco = new BufferGeometry()
  tronco.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  tronco.setIndex(idx)
  tronco.computeVertexNormals()
  // (a costura de trás: a primeira e a última coluna com a mesma normal)
  const n = tronco.attributes.normal as BufferAttribute
  for (let i = 0; i <= rows; i++) {
    const b = cols * (rows + 1) + i
    const nx = n.getX(i) + n.getX(b)
    const ny = n.getY(i) + n.getY(b)
    const nz = n.getZ(i) + n.getZ(b)
    const l = Math.hypot(nx, ny, nz) || 1
    n.setXYZ(i, nx / l, ny / l, nz / l)
    n.setXYZ(b, nx / l, ny / l, nz / l)
  }
  g.add(new Mesh(tronco, mat))
  const pesc = new Mesh(new CylinderGeometry(0.045, 0.053, 0.11, 28), mat)
  pesc.position.set(0, 1.525, 0.004)
  const cab = new Mesh(new SphereGeometry(1, 40, 30), mat)
  cab.scale.set(0.071, 0.09, 0.083)
  cab.position.set(0, 1.628, 0.014)
  cab.rotation.x = -0.12
  g.add(pesc, cab)
  for (const lado of [1, -1] as const) g.add(new Mesh(tubo(curvaBraco(lado), 0, 1, raioBraco, 48, 18, true), mat))
  // pernas (só aparecem com fenda / vestido curto)
  for (const lado of [1, -1]) {
    const perna = new Mesh(new CylinderGeometry(0.068, 0.036, 0.8, 20), mat)
    perna.position.set(lado * 0.075, 0.42, 0)
    g.add(perna)
  }
  return g
}

export function montarVestido(v: Vestido): Group {
  semente = 12345
  const g = new Group()
  const L = linhas(v)
  const M = materiaisDoVestido(v)
  const gr = grade(v, L)
  const corBase = M.base
  const nude = new Color('#E8CDB8')
  const comRenda = v.renda !== 'nenhuma' && v.renda !== 'mangas'
  // cor por altura: com renda "tatuagem", o forro do corpete vira nude
  const cores = (y: number) => {
    const ehCorpete = y > L.cintura(0) - 0.01
    if (v.forroNude && comRenda && (v.renda === 'total' || (v.renda === 'corpete' && ehCorpete) || (v.renda === 'saia' && !ehCorpete))) return ehCorpete ? nude : corBase.clone().lerp(nude, 0.35)
    return corBase
  }
  // a fenda: na frente, do lado direito, da bainha até o meio da coxa
  const fenda = v.fenda && v.comprimento !== 'curto' ? (theta: number, y: number) => {
    const phi = Math.atan2(Math.sin(theta), Math.cos(theta))
    return phi > 0.3 && phi < 0.62 && y < 0.62
  } : undefined
  // o corpo do vestido
  g.add(new Mesh(malha(gr, { pular: fenda, cores }), M.tecidoMat))

  // renda por cima
  if (comRenda) {
    const yC = L.cintura(0)
    const lim = v.renda === 'corpete' ? { yMin: yC - 0.02 } : v.renda === 'saia' ? { yMax: yC + 0.01 } : {}
    const grR = grade(v, L, { folga: 0.009, escala: 1.008 })
    g.add(new Mesh(malha(grR, { ...lim, pular: fenda, repU: 16, repV: 4 }), M.renda))
  }

  // camadas de tule (o tecido "tule" ganha pelo menos duas)
  const camadas = Math.max(v.camadasTule, v.tecido === 'tule' ? 2 : 0)
  for (let k = 0; k < camadas; k++) {
    const grT = grade(v, L, { soSaia: true, escala: 1.025 + k * 0.03, folga: 0.012, bainhaExtra: 0.004 })
    const m = new Mesh(malha(grT, { pular: fenda, repU: 10, repV: 3 }), M.tule)
    m.renderOrder = 2 + k
    g.add(m)
  }

  // mangas e alças
  const mangaMat = v.mangaTransparente ? M.renda : M.tecidoMat
  const mangaCor = (geo: BufferGeometry) => {
    // (o tecido usa cor por vértice)
    const n = geo.attributes.position.count
    const c = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) c.set([corBase.r, corBase.g, corBase.b], i * 3)
    geo.setAttribute('color', new BufferAttribute(c, 3))
    return geo
  }
  for (const lado of [1, -1] as const) {
    const curva = curvaBraco(lado)
    const justa = (t: number) => raioBraco(t) + 0.006
    const bufo = (t: number, centro: number, larg: number, alto: number) => alto * Math.exp(-(((t - centro) / larg) ** 2))
    let geo: BufferGeometry | null = null
    switch (v.mangas) {
      case 'curta':
        geo = tubo(curva, 0.02, 0.2, (t) => justa(t) + 0.004)
        break
      case 'bufanteCurta':
        geo = tubo(curva, 0.0, 0.26, (t) => justa(t) + bufo(t, 0.11, 0.09, 0.055) + 0.004)
        break
      case 'tresQuartos':
        geo = tubo(curva, 0.02, 0.68, justa, 50)
        break
      case 'longa':
        geo = tubo(curva, 0.02, 0.9, (t) => justa(t) + passo(0.82, 0.9, t) * 0.008, 60)
        break
      case 'bufanteLonga':
        geo = tubo(curva, 0.0, 0.9, (t) => justa(t) + bufo(t, 0.14, 0.12, 0.06) + bufo(t, 0.62, 0.16, 0.012), 60)
        break
      case 'ombroCaido':
        geo = tubo(curva, 0.1, 0.32, (t) => justa(t) + bufo(t, 0.2, 0.09, 0.03) + 0.006)
        break
      case 'alcinha':
      case 'alca': {
        // a alça: da frente do corpete, passando pelo ombro, até as costas
        const raio = v.mangas === 'alca' ? 0.016 : 0.005
        const xF = lado * 0.088
        const tF = Math.asin(Math.min(0.95, 0.088 / corpo(1.29)[0]))
        const frente = noCorpo(lado * tF, L.topo(lado * tF) - 0.004, 0.008)
        const tras = noCorpo(Math.PI - lado * tF, L.topo(Math.PI - lado * tF) - 0.004, 0.008)
        const c = new CatmullRomCurve3([frente, new Vector3(xF * 1.15, 1.38, 0.06), new Vector3(lado * 0.105, 1.425, 0), new Vector3(xF * 1.15, 1.38, -0.06), tras])
        geo = tubo(c, 0, 1, () => raio, 30, 10)
        if (v.mangas === 'alca') geo.scale(1, 1, 1)
        break
      }
    }
    if (geo) {
      const m = new Mesh(mangaCor(geo), mangaMat)
      g.add(m)
      // manga transparente: um tule bem fininho por baixo da renda (a pele aparece, mas a manga existe)
      if (v.mangaTransparente && v.mangas !== 'alca' && v.mangas !== 'alcinha') {
        const veuManga = new Mesh(geo, M.tuleManga)
        veuManga.scale.setScalar(0.998)
        veuManga.renderOrder = 1
        g.add(veuManga)
      }
    }
  }

  // cinto, pedraria, pérolas e laço
  const yW = L.cintura(0)
  const instancias = (geo: BufferGeometry, mat: Material, pontos: { p: Vector3; s: number; n?: Vector3 }[]) => {
    if (!pontos.length) return
    const inst = new InstancedMesh(geo, mat, pontos.length)
    const o = new Object3D()
    pontos.forEach(({ p, s, n }, i) => {
      o.position.copy(p)
      if (n) o.lookAt(p.clone().add(n))
      else o.rotation.set(rnd() * 3, rnd() * 3, 0)
      o.scale.setScalar(s)
      o.updateMatrix()
      inst.setMatrixAt(i, o.matrix)
    })
    g.add(inst)
  }
  if (v.cinto !== 'nenhum') {
    // a faixa da cintura
    const faixa: number[] = []
    const fi: number[] = []
    const cols = 96
    const p = new Vector3()
    for (let j = 0; j <= cols; j++) {
      const th = (j / cols) * Math.PI * 2
      const phi = Math.atan2(Math.sin(th), Math.cos(th))
      const yc = L.cintura(phi)
      for (const dy of [-0.022, 0.022]) {
        noCorpo(th, yc + dy + 0.01, 0.014, p)
        faixa.push(p.x, p.y, p.z)
      }
    }
    for (let j = 0; j < cols; j++) {
      const a = j * 2
      fi.push(a, a + 1, a + 2, a + 2, a + 1, a + 3)
    }
    const geoF = new BufferGeometry()
    geoF.setAttribute('position', new BufferAttribute(new Float32Array(faixa), 3))
    geoF.setIndex(fi)
    geoF.computeVertexNormals()
    const corFaixa = v.cinto === 'pedraria' ? new Color('#E9ECEF') : corBase.clone().offsetHSL(0, 0.04, -0.06)
    const matFaixa = v.cinto === 'pedraria' ? M.prata : new MeshPhysicalMaterial({ color: corFaixa, roughness: 0.3, sheen: 1, sheenRoughness: 0.3, side: DoubleSide })
    g.add(new Mesh(geoF, matFaixa))
    if (v.cinto === 'pedraria' || v.cinto === 'perolas') {
      const pts: { p: Vector3; s: number }[] = []
      for (let j = 0; j < 140; j++) {
        const th = (j / 140) * Math.PI * 2
        const phi = Math.atan2(Math.sin(th), Math.cos(th))
        for (const dy of v.cinto === 'perolas' ? [-0.012, 0.012] : [-0.014, 0, 0.014]) pts.push({ p: noCorpo(th + (dy ? 0.02 : 0), L.cintura(phi) + dy + 0.01, 0.02), s: v.cinto === 'perolas' ? 0.0075 : 0.0055 })
      }
      instancias(v.cinto === 'perolas' ? new SphereGeometry(1, 10, 8) : new OctahedronGeometry(1, 0), v.cinto === 'perolas' ? M.perola : M.cristal, pts)
    }
    if (v.cinto === 'laco' || v.cinto === 'lacoFrente') {
      // o laço de fita de cetim: duas alças (a fita dá a volta "de pé", com a face virada pra fora)
      // e duas pontas compridas caindo, cortadas em V
      const atras = v.cinto === 'laco'
      const theta = atras ? Math.PI : 0.55
      const centro = noCorpo(theta, yW + 0.012, 0.022)
      const fora = new Vector3(Math.sin(theta), 0, Math.cos(theta))
      const lado = new Vector3(Math.cos(theta), 0, -Math.sin(theta))
      const cima = new Vector3(0, 1, 0)
      const tam = atras ? 1 : 0.62
      const W = 0.062 * tam
      const pecas: BufferGeometry[] = []
      const q = new Vector3()
      for (const s of [1, -1]) {
        const L = 0.15 * tam
        const D = 0.05 * tam
        pecas.push(
          lencol((u, w, p) => {
            const a = w * Math.PI * 2
            const x = L * (0.5 - 0.5 * Math.cos(a))
            const larg = W * (0.45 + 0.55 * Math.sin(Math.min(1, x / L) * Math.PI * 0.5))
            p.copy(centro)
              .addScaledVector(lado, s * x)
              .addScaledVector(fora, 0.018 + D * Math.sin(a) + D * 0.6 * (x / L))
              .addScaledVector(cima, 0.34 * x + (u * larg) / 2 - 0.014 * Math.sin(a) ** 2)
          }, 6, 56, 1, 1, 4),
        )
        // a ponta caindo (bem comprida atrás), balançando de leve
        const comp = atras ? 0.78 : 0.32
        pecas.push(
          lencol((u, w, p) => {
            const larg = W * (0.85 + 0.35 * w)
            q.copy(centro)
              .addScaledVector(cima, -comp * w)
              .addScaledVector(lado, s * (0.015 + 0.09 * tam * w + (u * larg) / 2) + 0.012 * Math.sin(w * 7 + s))
              .addScaledVector(fora, 0.03 + 0.06 * w + 0.025 * Math.sin(w * 5 + s * 1.3) + (atras ? 0.12 * w * w : 0))
            // o corte em V na ponta
            if (w > 0.97) q.addScaledVector(cima, 0.045 * tam * (1 - Math.abs(u)))
            p.copy(q)
          }, 6, 40, 1, 1, 6),
        )
      }
      // o nó no meio
      const no = new SphereGeometry(1, 16, 12)
      no.scale(W * 0.42, W * 0.5, 0.022 * tam)
      no.applyMatrix4(new Matrix4().makeBasis(lado, cima, fora))
      no.translate(centro.x + fora.x * 0.03, centro.y, centro.z + fora.z * 0.03)
      pecas.push(no.toNonIndexed())
      const geo = mergeGeometries(pecas.map((x) => (x.index ? x.toNonIndexed() : x)))!
      g.add(new Mesh(geo, matFaixa))
    }
  }

  // pérolas bordadas no corpete (e contornando o decote)
  if (v.perolas > 0.02) {
    const pts: { p: Vector3; s: number }[] = []
    const n = Math.round(700 * v.perolas)
    const fracCorpete = 0.28
    for (let i = 0; i < n; i++) {
      const th = rnd() * Math.PI * 2
      const row = Math.floor(rnd() * ROWS * fracCorpete * 0.98)
      const p = new Vector3()
      const nrm = new Vector3()
      amostrar(gr, th, row, p, nrm)
      pts.push({ p: p.add(nrm.multiplyScalar(0.004)), s: 0.0035 + rnd() * 0.0035 })
    }
    // a fileira do decote
    if (v.perolas > 0.25)
      for (let j = 0; j < 150; j++) {
        const th = (j / 150) * Math.PI * 2
        const p = new Vector3()
        const nrm = new Vector3()
        amostrar(gr, th, 0, p, nrm)
        pts.push({ p: p.add(nrm.multiplyScalar(0.005)), s: 0.0062 })
      }
    // e algumas descendo pela saia
    for (let i = 0; i < n * 0.35; i++) {
      const th = rnd() * Math.PI * 2
      const row = Math.floor(ROWS * fracCorpete + rnd() ** 2 * ROWS * 0.4)
      const p = new Vector3()
      const nrm = new Vector3()
      amostrar(gr, th, row, p, nrm)
      pts.push({ p: p.add(nrm.multiplyScalar(0.004)), s: 0.004 })
    }
    instancias(new SphereGeometry(1, 10, 8), M.perola, pts)
  }

  // flores 3D aplicadas (mais na cintura e descendo pela saia, algumas no corpete)
  if (v.flores > 0.02) {
    const n = Math.round(150 * v.flores)
    const geo = geoFlor(1, 5)
    const pts: { p: Vector3; s: number; n?: Vector3 }[] = []
    for (let i = 0; i < n; i++) {
      const naSaia = rnd() < 0.75
      const th = rnd() * Math.PI * 2
      const row = naSaia ? Math.floor(ROWS * 0.28 + rnd() ** 1.6 * ROWS * 0.7) : Math.floor(rnd() * ROWS * 0.27)
      const p = new Vector3()
      const nrm = new Vector3()
      amostrar(gr, th, row, p, nrm)
      pts.push({ p: p.add(nrm.clone().multiplyScalar(0.006)), s: (naSaia ? 0.03 : 0.018) * (0.75 + rnd() * 0.6), n: nrm })
    }
    // (a flor "olha" pra fora do tecido: o +y dela vira a normal)
    const inst = new InstancedMesh(geo, M.flor, pts.length)
    const o = new Object3D()
    pts.forEach(({ p, s, n }, i) => {
      o.position.copy(p)
      o.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), n!)
      o.rotateY(rnd() * 6)
      o.scale.setScalar(s)
      o.updateMatrix()
      inst.setMatrixAt(i, o.matrix)
    })
    g.add(inst)
  }

  // capa de tule (presa nos ombros, caindo atrás)
  if (v.capa !== 'nenhuma') {
    const comp = v.capa === 'curta' ? 0.42 : 1.38 + (v.cauda !== 'sem' ? 0.2 : 0)
    g.add(new Mesh(lencol((u, w, p) => {
      // u: de um ombro ao outro (por trás); w: de cima pra baixo
      const th = Math.PI / 2 + u * Math.PI
      const y = 1.4 - w * comp
      const abre = 1 + w * (v.capa === 'curta' ? 0.6 : 1.8)
      const [rx, rz] = corpo(Math.max(1.0, Math.min(1.4, y)))
      p.set(Math.sin(th) * (rx + 0.02) * abre, Math.max(0.006, y), Math.cos(th) * (rz + 0.02) * abre - (y < 0.05 ? (0.05 - y) * 1.2 : 0))
      if (y < 0.006) p.z -= (0.006 - (1.4 - w * comp)) * 0.9
    }, 40, 40), M.tule))
  }

  // véu (preso atrás da cabeça)
  if (v.veu !== 'nenhum') {
    const queda = { curto: 0.42, medio: 0.62, longo: 1.66, catedral: 1.66 }[v.veu]
    const chao = { curto: 0, medio: 0, longo: 0.25, catedral: 1.6 }[v.veu]
    const largura = { curto: 0.3, medio: 0.38, longo: 0.5, catedral: 0.62 }[v.veu]
    const pente = new Vector3(0, 1.69, -0.06)
    // o véu desce por cima da saia (e da cauda): a linha do meio das costas e a largura da saia, por altura
    const meio = Math.round(gr.cols / 2)
    const lado = Math.round(gr.cols / 4)
    const costasDaSaia = (y: number) => {
      // [z do meio das costas, meia-largura] na altura y (null = acima do vestido)
      for (let i = 0; i < gr.rows; i++) {
        const k0 = meio * (gr.rows + 1) + i
        const k1 = k0 + 1
        const y0 = gr.y[k0]
        const y1 = gr.y[k1]
        if (y <= y0 && y >= y1) {
          const t = (y0 - y) / Math.max(1e-5, y0 - y1)
          const z = gr.pos[k0 * 3 + 2] + (gr.pos[k1 * 3 + 2] - gr.pos[k0 * 3 + 2]) * t
          const l0 = lado * (gr.rows + 1) + i
          const rx = Math.abs(gr.pos[l0 * 3] + (gr.pos[(l0 + 1) * 3] - gr.pos[l0 * 3]) * t)
          return [z, rx] as const
        }
      }
      return null
    }
    /** altura da cauda (meio das costas) num ponto z do chão: o véu deita por cima dela */
    const alturaCauda = (z: number) => {
      let y = 0
      for (let i = 0; i < gr.rows; i++) {
        const k0 = meio * (gr.rows + 1) + i
        const z0 = gr.pos[k0 * 3 + 2]
        const z1 = gr.pos[(k0 + 1) * 3 + 2]
        if ((z <= z0 && z >= z1) || (z >= z0 && z <= z1)) y = Math.max(y, gr.pos[k0 * 3 + 1] + (gr.pos[(k0 + 1) * 3 + 1] - gr.pos[k0 * 3 + 1]) * ((z - z0) / (z1 - z0 || 1)))
      }
      return y
    }
    const total = queda + chao
    let zChao = -0.3
    const pontoVeu = (u: number, w: number, p: Vector3) => {
      const s = w * total
      const x = u * (0.07 + largura * (Math.min(s, queda) / queda) ** 0.6 * (queda / total) ** 0.25)
      if (s <= queda) {
        // caindo, um pouquinho afastado das costas, e escorregando por cima da saia
        const yy = Math.max(0.02, pente.y - s)
        const [, rz] = corpo(Math.min(1.45, yy))
        const afasta = 0.06 + Math.min(0.1, s * 0.1)
        let z = Math.min(pente.z - s * 0.08, -rz - afasta) - x * x * 0.9
        const sa = costasDaSaia(yy)
        if (sa && Math.abs(x) < sa[1]) z = Math.min(z, sa[0] * Math.sqrt(1 - (x / sa[1]) ** 2) - 0.02)
        p.set(x, yy, z)
        if (u === 0) zChao = Math.min(zChao, z)
      } else {
        // no chão, por cima da cauda, escorrendo pra trás
        const d = s - queda
        const z = zChao - d - x * x * 0.4
        p.set(x * (1 + d * 0.25), Math.max(0.03, alturaCauda(z) + 0.02 - Math.abs(x) * 0.02), z)
      }
      // ondinhas do tule
      p.x += Math.sin(u * 9 + w * 4) * 0.01 * w
      p.z += Math.sin(u * 13) * 0.01 * w
    }
    pontoVeu(0, 0.999 * (queda / total), new Vector3()) // (acha onde o véu encosta no chão)
    const veu = new Mesh(lencol(pontoVeu, 30, 70), M.veu)
    veu.renderOrder = 6
    g.add(veu)
    if (v.veuBordaRenda) {
      // a barra de renda nas duas laterais do véu
      for (const l of [1, -1])
        g.add(new Mesh(lencol((u, w, p) => {
          pontoVeu(l * (1 - 0.06 * (u + 1)), w, p)
          p.z -= 0.002
        }, 1, 90, 1, 0.35, total * 7), M.renda))
    }
  }

  // cabeça
  if (v.cabeca === 'tiara') {
    const arco = new TorusGeometry(0.083, 0.004, 8, 40, Math.PI)
    arco.rotateX(-0.35)
    arco.translate(0, 1.7, 0.012)
    g.add(new Mesh(arco, M.prata))
    const pts: { p: Vector3; s: number }[] = []
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI
      const alto = 1 + 0.9 * Math.exp(-(((a - Math.PI / 2) / 0.35) ** 2))
      pts.push({ p: new Vector3(Math.cos(a) * 0.083, 1.7 + Math.sin(a) * 0.083 * 0.94 + 0.006 * alto, 0.012 + Math.sin(a) * 0.083 * -0.34), s: 0.0045 * alto })
    }
    instancias(new OctahedronGeometry(1, 0), M.cristal, pts)
  } else if (v.cabeca === 'coroaFlores') {
    const geo = geoFlor(0.022, 6)
    const inst = new InstancedMesh(geo, new MeshStandardMaterial({ roughness: 0.65, side: DoubleSide }), 22)
    const o = new Object3D()
    const cs = ['#FFFFFF', '#F7D3DA', '#F5E6C4', '#D7C8EC']
    const cor = new Color()
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2
      o.position.set(Math.cos(a) * 0.08, 1.68 + Math.sin(a * 2) * 0.006, 0.01 + Math.sin(a) * 0.088)
      o.lookAt(new Vector3(Math.cos(a) * 0.3, 1.8, Math.sin(a) * 0.3))
      o.rotateX(Math.PI / 2)
      o.updateMatrix()
      inst.setMatrixAt(i, o.matrix)
      inst.setColorAt(i, cor.set(cs[i % cs.length]))
    }
    g.add(inst)
  } else if (v.cabeca === 'perolas') {
    const pts: { p: Vector3; s: number }[] = []
    for (let i = 0; i < 16; i++) pts.push({ p: new Vector3(0.06 + rnd() * 0.02, 1.67 + (i / 16) * 0.05, -0.03 + rnd() * 0.03), s: 0.005 + rnd() * 0.004 })
    instancias(new SphereGeometry(1, 10, 8), M.perola, pts)
  } else if (v.cabeca === 'laco') {
    const partes: BufferGeometry[] = []
    for (const s of [1, -1]) {
      const al = new TorusGeometry(0.035, 0.012, 8, 20)
      al.scale(1.3, 0.8, 0.5)
      al.translate(s * 0.04, 1.69, -0.075)
      partes.push(al.toNonIndexed())
    }
    g.add(new Mesh(mergeGeometries(partes)!, new MeshPhysicalMaterial({ color: corBase, roughness: 0.3, sheen: 1 })))
  }

  buque(v.buque, g)
  return g
}

/** Um "lençol" (véu, capa): grade u ∈ [-1,1] × w ∈ [0,1], posição dada pela função */
function lencol(f: (u: number, w: number, p: Vector3) => void, nu: number, nw: number, larguraU = 1, repU = 3, repW = 6) {
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const p = new Vector3()
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nw; j++) {
      const u = (i / nu) * 2 - 1
      f(u * larguraU, j / nw, p)
      pos.push(p.x, p.y, p.z)
      uv.push(u * repU, (j / nw) * repW)
    }
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nw; j++) {
      const a = i * (nw + 1) + j
      const b = a + nw + 1
      idx.push(a, a + 1, b, b, a + 1, b + 1)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Solta tudo da memória (geometrias e materiais) */
export function descartar(g: Object3D) {
  g.traverse((o) => {
    const m = o as Mesh
    if (m.geometry) m.geometry.dispose()
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : []
    for (const mt of mats) mt.dispose()
  })
}
