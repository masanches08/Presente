// Coisinhas de enfermeira espalhadas pela casa, como se ela tivesse acabado de chegar do plantão:
// o pijama cirúrgico jogado no banco do pé da cama, o estetoscópio por cima, os tamancos largados no tapete
// e o crachá esquecido na mesinha da sala. (Poucas coisas, de propósito.)
// Os desenhos (cor do pijama, nome bordado, crachá) ficam em texturasEnfermeira.ts.
import {
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Matrix4,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  BoxGeometry,
} from 'three'
import { em, type Andar, type L, type V3 } from './moveis'

const PI = Math.PI
const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const onda = (x: number) => 0.5 + 0.5 * Math.sin(x)

// ======================= O PANO CAINDO DO BANCO =======================

/**
 * O caminho por onde o pano escorrega, visto de lado (avanço f, altura y):
 * em cima do banco, dobra na quina arredondada, desce pela frente e deita no chão.
 * `folga` = quanto o pano fica acima da superfície (pra uma peça poder ficar por cima da outra).
 */
function perfil(b: Banco, folga: number) {
  const pts: [number, number][] = []
  const R = b.raio + folga
  const bordaTopo = b.frente - b.raio
  for (let f = -1; f < bordaTopo; f += 0.01) pts.push([f, b.topo + folga])
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * (PI / 2)
    pts.push([bordaTopo + Math.sin(a) * R, b.topo - b.raio + Math.cos(a) * R])
  }
  const xf = b.frente + folga
  const R2 = 0.05 // o pano faz uma curva antes de deitar no chão
  for (let y = b.topo - b.raio - 0.01; y > b.chao + folga + R2; y -= 0.01) pts.push([xf + (b.topo - y) * 0.03, y])
  const xBase = xf + (b.topo - b.chao) * 0.03
  for (let i = 1; i <= 10; i++) {
    const a = (i / 10) * (PI / 2)
    pts.push([xBase + R2 - Math.cos(a) * R2, b.chao + folga + R2 - Math.sin(a) * R2])
  }
  for (let f = xBase + R2 + 0.01; f < 3; f += 0.01) pts.push([f, b.chao + folga])
  // tabela de distância percorrida (d = 0 em f = 0)
  const dist = [0]
  for (let i = 1; i < pts.length; i++) dist.push(dist[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const zero = 1 // começou em f = -1, em cima do banco
  /** posição e "pra fora" (normal) no ponto a uma distância d */
  return (d: number) => {
    const alvo = Math.min(dist[dist.length - 1], Math.max(0, d + zero))
    let i = 1
    while (i < dist.length - 1 && dist[i] < alvo) i++
    const k = (alvo - dist[i - 1]) / (dist[i] - dist[i - 1] || 1)
    const [f0, y0] = pts[i - 1]
    const [f1, y1] = pts[i]
    const tf = f1 - f0
    const ty = y1 - y0
    const n = Math.hypot(tf, ty) || 1
    return { f: f0 + tf * k, y: y0 + ty * k, nf: -ty / n, ny: tf / n }
  }
}

interface Banco {
  /** altura do tampo */
  topo: number
  /** onde fica a frente do banco (no eixo do avanço) */
  frente: number
  /** raio da quina */
  raio: number
  /** altura do chão (ou do tapete) */
  chao: number
}

interface Roupa {
  /** largura e comprimento do pedaço de pano (m) */
  larg: number
  comp: number
  /** pedaço do desenho (u0, v0, u1, v1) */
  uv: [number, number, number, number]
  /** onde fica o começo da peça (gola/cós) em cima do banco: x, avanço, giro */
  x: number
  d: number
  giro: number
  /** quanto a peça flutua acima de onde encosta (s = de lado a lado, t = do começo pra barra, D = avanço) */
  altura: (s: number, t: number, D: number) => number
}

/** Do pano (s, t) pro banco (x, avanço) */
const noBanco = (r: Roupa, s: number, t: number) => {
  const c = Math.cos(r.giro)
  const sn = Math.sin(r.giro)
  return { X: r.x + s * c - t * sn, D: r.d + s * sn + t * c }
}
/** Uma peça de roupa largada: uma malha bem dividida que segue o banco, com dobrinhas */
function roupaLargada(l: L, b: Banco, r: Roupa, segs: [number, number]) {
  const caminho = perfil(b, 0)
  const [n, m] = segs
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let j = 0; j <= m; j++)
    for (let i = 0; i <= n; i++) {
      const s = -r.larg / 2 + (r.larg * i) / n
      const t = (r.comp * j) / m
      const { X, D } = noBanco(r, s, t)
      const p = caminho(D)
      const h = r.altura(s, t, D)
      pos.push(X, p.y + p.ny * h, p.f + p.nf * h)
      uv.push(r.uv[0] + (i / n) * (r.uv[2] - r.uv[0]), r.uv[3] - (j / m) * (r.uv[3] - r.uv[1]))
    }
  for (let j = 0; j < m; j++)
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i
      idx.push(a, a + n + 1, a + 1, a + 1, a + n + 1, a + n + 2)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  l.put('pijama', g)
}

// ======================= ESTETOSCÓPIO =======================

/** Um tubo passando por pontos (x, altura, avanço) */
function tubo(l: L, mat: string, pts: Vector3[], raio: number) {
  const curva = new CatmullRomCurve3(pts, false, 'centripetal')
  l.put(mat, new TubeGeometry(curva, Math.max(12, pts.length * 6), raio, 8, false))
}

/** Bolinha/disco/cilindro já posicionado (coordenadas do móvel) */
function peca(l: L, mat: string, g: BufferGeometry, m: Matrix4) {
  g.applyMatrix4(m)
  l.put(mat, g)
}

// ======================= TAMANCO =======================

/** Um tamanco de enfermagem (fechado na frente, tira no calcanhar). Bico pra +z, sola em y = 0. */
function tamanco(): { corpo: BufferGeometry[]; sola: BufferGeometry[] } {
  // pegada: mais larga no meio do pé, arredondada nas pontas
  const forma = new Shape()
  const N = 40
  const z0 = -0.13
  const z1 = 0.135
  const meiaLargura = (z: number) => {
    const base = z < 0.04 ? 0.036 + ((z - z0) / (0.04 - z0)) * 0.014 : 0.05 - ((z - 0.04) / (z1 - 0.04)) * 0.006
    const u = (2 * (z - (z0 + z1) / 2)) / (z1 - z0)
    return base * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 6)), 1 / 6)
  }
  const lado: [number, number][] = []
  for (let i = 0; i <= N; i++) {
    const z = z0 + ((z1 - z0) * i) / N
    lado.push([meiaLargura(z), z])
  }
  // (o Shape fica no plano x,y; depois de deitar, y vira -z: por isso o sinal trocado)
  forma.moveTo(lado[0][0], -lado[0][1])
  for (const [x, z] of lado) forma.lineTo(x, -z)
  for (const [x, z] of [...lado].reverse()) forma.lineTo(-x, -z)
  const sola = new ExtrudeGeometry(forma, { depth: 0.026, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.006, bevelSegments: 2, curveSegments: 4 })
  sola.rotateX(-PI / 2)
  sola.translate(0, 0.007, 0)

  // biqueira: metade da frente de um ovo, aberta pra trás, bem "gordinha" como os tamancos de enfermagem
  const biqueira = new SphereGeometry(1, 32, 14, 0, PI, 0, PI / 2)
  biqueira.scale(0.055, 0.07, 0.14)
  // (bico largo e redondo, não pontudo)
  const bp = biqueira.attributes.position
  for (let i = 0; i < bp.count; i++) {
    const zn = Math.max(0, bp.getZ(i) / 0.14)
    bp.setX(i, bp.getX(i) * (1 + 0.32 * zn * zn))
  }
  biqueira.computeVertexNormals()
  biqueira.translate(0, 0.03, -0.005)
  // borda arredondada da abertura
  const borda = new TorusGeometry(1, 0.1, 8, 32, PI)
  borda.scale(0.055, 0.07, 0.07)
  borda.translate(0, 0.03, -0.005)
  // tira do calcanhar (deitada pra trás)
  const tira = new TorusGeometry(0.052, 0.007, 8, 24, PI)
  tira.rotateX(-1.3)
  tira.scale(1, 1, 2.0)
  tira.translate(0, 0.064, -0.005)
  const rebites = [-1, 1].map((s) => {
    const c = new CylinderGeometry(0.01, 0.01, 0.007, 14)
    c.rotateZ(PI / 2)
    c.translate(s * 0.05, 0.064, -0.005)
    return c
  })
  return { corpo: [biqueira, borda, tira, ...rebites], sola: [sola] }
}

/** Põe um tamanco no chão: giro (em pé), tombo (deitado de lado) */
function porTamanco(l: L, x: number, z: number, chao: number, giro: number, tombo = 0) {
  const { corpo, sola } = tamanco()
  const m = new Matrix4().makeRotationY(giro).multiply(new Matrix4().makeRotationZ(tombo))
  const todas = [...corpo, ...sola]
  for (const g of todas) g.applyMatrix4(m)
  // apoia no chão (o ponto mais baixo encosta no tapete)
  let min = Infinity
  for (const g of todas) {
    g.computeBoundingBox()
    min = Math.min(min, g.boundingBox!.min.y)
  }
  for (const g of todas) g.translate(x, chao - min, z)
  corpo.forEach((g) => l.put('tamanco', g))
  sola.forEach((g) => l.put('tamancoSola', g))
}

// ======================= CRACHÁ =======================

/** Crachá deitado na mesa com o cordão largado em volta (coordenadas do móvel; mesa em y = topo) */
function cracha(l: L, x: number, z: number, topo: number, giro: number) {
  const W = 0.054
  const H = 0.086
  const m = new Matrix4().makeTranslation(x, 0, z).multiply(new Matrix4().makeRotationY(giro))
  // o cartão (corpo fininho + a frente com o desenho)
  const corpo = new BoxGeometry(W, 0.0016, H)
  corpo.translate(0, topo + 0.0008, 0)
  peca(l, 'crachaCorpo', corpo, m)
  const frente = new PlaneGeometry(W, H)
  frente.rotateX(-PI / 2)
  frente.translate(0, topo + 0.0019, 0)
  peca(l, 'cracha', frente, m)
  // presilha
  const presilha = new BoxGeometry(0.014, 0.004, 0.022)
  presilha.translate(0, topo + 0.003, -H / 2 - 0.004)
  peca(l, 'estetoMetal', presilha, m)
  // o cordão: sai da presilha, faz uma volta larga e solta na mesa e volta (sem se cruzar)
  const volta: [number, number][] = [
    [-0.006, -H / 2 - 0.012],
    [-0.03, -H / 2 - 0.05],
    [-0.1, -0.1],
    [-0.2, -0.13],
    [-0.29, -0.09],
    [-0.33, 0.0],
    [-0.3, 0.09],
    [-0.21, 0.12],
    [-0.13, 0.08],
    [-0.07, -0.0],
    [-0.035, -H / 2 - 0.03],
    [0.006, -H / 2 - 0.012],
  ]
  const curva = new CatmullRomCurve3(
    volta.map(([a, b]) => new Vector3(a, topo + 0.0012, b)),
    false,
    'centripetal',
  )
  const pts = curva.getSpacedPoints(120)
  const largura = 0.016
  const pos: number[] = []
  const idx: number[] = []
  pts.forEach((p, i) => {
    const prox = pts[Math.min(pts.length - 1, i + 1)]
    const ant = pts[Math.max(0, i - 1)]
    const tx = prox.x - ant.x
    const tz = prox.z - ant.z
    const n = Math.hypot(tx, tz) || 1
    const lx = (-tz / n) * (largura / 2)
    const lz = (tx / n) * (largura / 2)
    // (a fita sobe um tiquinho perto da presilha, pra passar por cima do cartão)
    const sobe = Math.max(0, 1 - Math.min(i, pts.length - 1 - i) / 6) * 0.003
    pos.push(p.x - lx, p.y + sobe, p.z - lz, p.x + lx, p.y + sobe, p.z + lz)
    if (i < pts.length - 1) {
      const a = i * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  })
  const fita = new BufferGeometry()
  fita.setAttribute('position', new Float32BufferAttribute(pos, 3))
  fita.setIndex(idx)
  fita.computeVertexNormals()
  // (a fita tem que olhar pra cima)
  const nor = fita.attributes.normal
  for (let i = 0; i < nor.count; i++) if (nor.getY(i) < 0) nor.setXYZ(i, -nor.getX(i), -nor.getY(i), -nor.getZ(i))
  peca(l, 'esteto', fita, m)
}

// ======================= NA CASA =======================

/** Suíte: pijama no banco do pé da cama, estetoscópio por cima e os tamancos no tapete */
export function enfermeiraNaSuite(a: Andar, banco: V3) {
  // virado pro lado de fora da cama (o lado que a gente vê da porta)
  const l = em(a, banco, PI)
  const b: Banco = { topo: 0.48, frente: 0.22, raio: 0.06, chao: 0.011 }

  // calça: o cós em cima do banco e as pernas escorregando até o tapete
  const calca: Roupa = {
    larg: 0.6,
    comp: 1.2,
    uv: [0.5, 0, 1, 1],
    x: 0.36,
    d: -0.2,
    giro: 0.1,
    altura: (s, t, D) => {
      const emCima = 1 - suave(0.1, 0.2, D)
      const caindo = suave(0.2, 0.32, D) * (1 - suave(0.7, 0.9, D))
      const noChao = suave(0.8, 0.95, D)
      return (
        0.003 +
        emCima * 0.004 * onda(13 * s + 7 * t + 1) +
        caindo * 0.012 * onda(s * 30 + 0.6) +
        noChao * (0.022 * onda(s * 15 + t * 9 + 2) * onda(t * 6 - s * 4) + 0.012 * onda(t * 21))
      )
    },
  }
  roupaLargada(l, b, calca, [30, 90])

  // blusa: a gola em cima do banco, por cima do cós, e a barra caindo pela frente
  const blusa: Roupa = {
    larg: 0.74,
    comp: 0.74,
    uv: [0, 0.5, 0.5, 1],
    x: -0.18,
    d: -0.2,
    giro: -0.13,
    altura: (s, t, D) => {
      const { X } = noBanco(blusa, s, t)
      const emCima = 1 - suave(0.1, 0.2, D)
      const caindo = suave(0.2, 0.3, D)
      const sobreCalca = suave(0.0, 0.07, X)
      return (
        0.004 +
        sobreCalca * 0.022 +
        emCima * (0.005 * onda(11 * s + 8 * t + 0.4) * onda(5 * t - 3 * s) + 0.016 * Math.exp(-((s + 0.14) ** 2 + (t - 0.27) ** 2) / 0.004)) +
        caindo * 0.013 * onda(s * 24 + 1.7)
      )
    },
  }
  roupaLargada(l, b, blusa, [44, 44])

  // estetoscópio enrolado de qualquer jeito em cima da blusa
  const acima = (s: number, t: number, r: number) => {
    const { X, D } = noBanco(blusa, s, t)
    return new Vector3(X, b.topo + blusa.altura(s, t, D) + r, D)
  }
  const R = 0.0055
  const pontos = (lista: [number, number][], r: number) => lista.map(([s, t]) => acima(s, t, r))
  // (longe do bolso, pra não tapar o nome bordado)
  const campanula: [number, number] = [-0.215, 0.37]
  const juncao: [number, number] = [-0.05, 0.12]
  tubo(
    l,
    'esteto',
    pontos(
      [
        [-0.185, 0.355],
        [-0.1, 0.385],
        [-0.02, 0.355],
        [0.01, 0.285],
        [-0.03, 0.215],
        [-0.11, 0.2],
        [-0.17, 0.16],
        [-0.12, 0.112],
        juncao,
      ],
      R,
    ),
    R,
  )
  // os dois tubinhos que vão pros ouvidos, e as hastes de metal com as olivas na ponta
  const ramos: [number, number][][] = [
    [juncao, [0.0, 0.1], [0.05, 0.095], [0.09, 0.1]],
    [juncao, [-0.01, 0.14], [0.04, 0.16], [0.075, 0.172]],
  ]
  const hastes: [number, number][][] = [
    [[0.09, 0.1], [0.14, 0.12], [0.17, 0.16]],
    [[0.075, 0.172], [0.105, 0.195], [0.115, 0.228]],
  ]
  for (const r of ramos) tubo(l, 'esteto', pontos(r, R * 0.75), R * 0.75)
  for (const h of hastes) {
    tubo(l, 'estetoMetal', pontos(h, 0.003), 0.003)
    const fim = acima(h[2][0], h[2][1], 0.0065)
    const oliva = new SphereGeometry(0.0075, 12, 8)
    oliva.translate(fim.x, fim.y, fim.z)
    l.put('esteto', oliva)
  }
  const j = acima(juncao[0], juncao[1], R)
  const y = new SphereGeometry(R * 1.35, 12, 8)
  y.translate(j.x, j.y, j.z)
  l.put('estetoMetal', y)
  // a campânula (o "disco" que encosta no peito), deitada, com a hastezinha até o tubo
  const c = acima(campanula[0], campanula[1], 0)
  const disco = new CylinderGeometry(0.022, 0.022, 0.011, 28)
  disco.translate(c.x, c.y + 0.0055, c.z)
  l.put('estetoMetal', disco)
  const aro = new TorusGeometry(0.022, 0.0035, 8, 28)
  aro.rotateX(PI / 2)
  aro.translate(c.x, c.y + 0.009, c.z)
  l.put('esteto', aro)
  const ponta = acima(-0.185, 0.355, R)
  const dx = ponta.x - c.x
  const dz = ponta.z - c.z
  const haste = new CylinderGeometry(0.004, 0.004, Math.hypot(dx, dz), 10)
  haste.rotateZ(PI / 2)
  haste.rotateY(-Math.atan2(dz, dx))
  haste.translate((c.x + ponta.x) / 2, (c.y + ponta.y) / 2 + 0.004, (c.z + ponta.z) / 2)
  l.put('estetoMetal', haste)

  // os tamancos, tirados com o pé e largados no tapete (um tombou)
  porTamanco(l, -0.3, 0.5, b.chao, 0.55)
  porTamanco(l, -0.08, 0.68, b.chao, -0.35)
}

/** Sala: o crachá esquecido na mesinha de centro */
export function enfermeiraNaSala(a: Andar, mesa: V3, topo: number) {
  cracha(em(a, mesa), -0.1, 0.24, topo, 0.45)
}
