import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Shape } from 'three'
import { Obra, telhadoDuasAguas, telhadoQuatroAguas } from '../mundo/obra'

// ================= PLANTA DA CASA (metros) =================
// A frente da casa fica em z = +7 (entrada), os fundos em z = -9 (piscina).
// x vai de -9 (esquerda, sala de jogos) a +9 (direita, cozinha).
export const X = 9
export const ZF = 7
export const ZB = -9
export const Y1 = 3.4 // chão do 2º andar
export const TETO1 = 3.15 // teto do térreo (embaixo da laje)
export const Y2 = 6.4 // teto do 2º andar
const EXT = 0.3 // espessura das paredes externas (ficam do lado de fora da planta)
const INT = 0.14 // paredes internas

// Escada: junto da parede esquerda da sala, subindo em direção aos fundos
/** A ala da suíte do casal: sai dos fundos da casa no 2º andar, virada pro quintal */
export const SUITE = { x0: -5, x1: 5, z0: -16, z1: -9 }

export const ESCADA = { x0: -4, x1: -2.8, zBase: 1.8, degraus: 16, piso: 0.265 }

type Tipo = 'janela' | 'porta' | 'vao' | 'vidro'
export interface Abertura {
  em: number // centro, ao longo da parede
  larg: number
  y0: number // em relação à base da parede
  y1: number
  tipo: Tipo
}
const jan = (em: number, larg: number, y0 = 0.8, y1 = 2.6): Abertura => ({ em, larg, y0, y1, tipo: 'janela' })
const alta = (em: number, larg = 0.6): Abertura => ({ em, larg, y0: 1.7, y1: 2.4, tipo: 'janela' }) // janelinha de banheiro
const porta = (em: number, larg = 0.9): Abertura => ({ em, larg, y0: 0, y1: 2.2, tipo: 'porta' })
const vao = (em: number, larg: number, y1 = 2.6): Abertura => ({ em, larg, y0: 0, y1, tipo: 'vao' })
const vidro = (em: number, larg: number, y1 = 2.8): Abertura => ({ em, larg, y0: 0, y1, tipo: 'vidro' })

export type Eixo = 'x' | 'z'

/** Caixa "ao longo de uma parede": a = posição ao longo, y = altura, d = profundidade a partir do centro da parede */
function peca(o: Obra, mat: string, eixo: Eixo, fixo: number, a0: number, a1: number, y0: number, y1: number, d0: number, d1: number) {
  if (eixo === 'x') o.caixa(mat, [a0, a1], [y0, y1], [fixo + d0, fixo + d1])
  else o.caixa(mat, [fixo + d0, fixo + d1], [y0, y1], [a0, a1])
}

/** Parede com recortes pras aberturas */
export function parede(o: Obra, mat: string, eixo: Eixo, fixo: number, de: number, ate: number, yb: number, yt: number, esp: number, abs: Abertura[] = []) {
  const h = yt - yb
  let c = de
  for (const ab of [...abs].sort((a, b) => a.em - b.em)) {
    const a0 = ab.em - ab.larg / 2
    const a1 = ab.em + ab.larg / 2
    if (a0 > c + 0.001) peca(o, mat, eixo, fixo, c, a0, yb, yt, -esp / 2, esp / 2)
    if (ab.y0 > 0.001) peca(o, mat, eixo, fixo, a0, a1, yb, yb + ab.y0, -esp / 2, esp / 2)
    if (ab.y1 < h - 0.001) peca(o, mat, eixo, fixo, a0, a1, yb + ab.y1, yt, -esp / 2, esp / 2)
    c = a1
  }
  if (ate > c + 0.001) peca(o, mat, eixo, fixo, c, ate, yb, yt, -esp / 2, esp / 2)
}

/** Caixilhos pretos, vidros, peitoris e guarnições das portas */
function molduras(o: Obra, eixo: Eixo, fixo: number, yb: number, esp: number, abs: Abertura[]) {
  for (const ab of abs) {
    const a0 = ab.em - ab.larg / 2
    const a1 = ab.em + ab.larg / 2
    const y0 = yb + ab.y0
    const y1 = yb + ab.y1
    if (ab.tipo === 'janela' || ab.tipo === 'vidro') {
      const e = 0.055
      const p = (x0: number, x1: number, ya: number, yb2: number) => peca(o, 'preto', eixo, fixo, x0, x1, ya, yb2, -0.045, 0.045)
      p(a0, a1, y1 - e, y1)
      p(a0, a1, y0, y0 + e)
      p(a0, a0 + e, y0, y1)
      p(a1 - e, a1, y0, y1)
      const n = Math.max(1, Math.round(ab.larg / 1.0))
      for (let i = 1; i < n; i++) {
        const a = a0 + (i * ab.larg) / n
        p(a - 0.025, a + 0.025, y0, y1)
      }
      if (y1 - y0 > 1.9) p(a0, a1, y0 + (y1 - y0) * 0.8 - 0.025, y0 + (y1 - y0) * 0.8 + 0.025)
      peca(o, 'vidro', eixo, fixo, a0, a1, y0, y1, -0.006, 0.006)
      if (ab.tipo === 'janela' && ab.y0 > 0.3) peca(o, 'branco', eixo, fixo, a0 - 0.05, a1 + 0.05, y0 - 0.04, y0, -esp / 2 - 0.05, esp / 2 + 0.05)
    } else {
      // guarnição branca em volta (dos dois lados)
      const g = 0.07
      for (const lado of [-1, 1]) {
        const d0 = lado > 0 ? esp / 2 : -esp / 2 - 0.02
        const d1 = d0 + 0.02
        peca(o, 'branco', eixo, fixo, a0 - g, a0, y0, y1 + g, d0, d1)
        peca(o, 'branco', eixo, fixo, a1, a1 + g, y0, y1 + g, d0, d1)
        peca(o, 'branco', eixo, fixo, a0 - g, a1 + g, y1, y1 + g, d0, d1)
      }
    }
  }
}

/**
 * Acabamentos que dão noção de espaço: rodapé embaixo e sanca (moldura) no teto.
 * `faces` = [posição da face em relação ao centro da parede, pra que lado ela olha]
 */
function acabamentos(o: Obra, eixo: Eixo, fixo: number, de: number, ate: number, yb: number, yTeto: number | null, faces: [number, 1 | -1][], abs: Abertura[]) {
  const ordenadas = [...abs].sort((a, b) => a.em - b.em)
  for (const [f, s] of faces) {
    const d = (esp: number): [number, number] => (s > 0 ? [f, f + esp] : [f - esp, f])
    // rodapé: pula portas e vãos (que vão até o chão)
    let c = de
    const trecho = (a0: number, a1: number) => {
      if (a1 - a0 < 0.05) return
      const [d0, d1] = d(0.018)
      peca(o, 'branco', eixo, fixo, a0, a1, yb, yb + 0.12, d0, d1)
    }
    for (const ab of ordenadas) {
      if (ab.y0 > 0.01) continue
      trecho(c, ab.em - ab.larg / 2 - 0.07)
      c = ab.em + ab.larg / 2 + 0.07
    }
    trecho(c, ate)
    // sanca: pula aberturas que chegam no teto
    if (yTeto !== null) {
      let c2 = de
      const sanca = (a0: number, a1: number) => {
        if (a1 - a0 < 0.05) return
        const [d0, d1] = d(0.045)
        const [e0, e1] = d(0.02)
        peca(o, 'branco', eixo, fixo, a0, a1, yTeto - 0.05, yTeto, d0, d1)
        peca(o, 'branco', eixo, fixo, a0, a1, yTeto - 0.1, yTeto - 0.05, e0, e1)
      }
      for (const ab of ordenadas) {
        if (yb + ab.y1 < yTeto - 0.12) continue
        sanca(c2, ab.em - ab.larg / 2)
        c2 = ab.em + ab.larg / 2
      }
      sanca(c2, ate)
    }
  }
}

/** Parede externa: camada de dentro (pintura clara) + camada de fora (fachada) */
function paredeExterna(o: Obra, eixo: Eixo, fixo: number, sentido: 1 | -1, de: number, ate: number, yb: number, yt: number, abs: Abertura[], fora: string, cantos: [boolean, boolean] = [true, true]) {
  const extra = eixo === 'x' ? EXT : 0 // as paredes da frente e do fundo cobrem os cantos
  const d0 = de - (cantos[0] ? extra : 0)
  const d1 = ate + (cantos[1] ? extra : 0)
  parede(o, 'parede', eixo, fixo + sentido * EXT * 0.25, d0, d1, yb, yt, EXT / 2, abs)
  parede(o, fora, eixo, fixo + sentido * EXT * 0.75, d0, d1, yb, yt, EXT / 2, abs)
  molduras(o, eixo, fixo + sentido * EXT * 0.5, yb, EXT, abs)
  // no 2º andar tem sanca; no térreo a parede de fora sobe junto com a sala de pé-direito duplo
  acabamentos(o, eixo, fixo, de, ate, yb, yb > 1 ? yt : null, [[0, sentido > 0 ? -1 : 1]], abs)
}

/** Guarda-corpo de madeira com balaústres pretos (como nas fotos de referência) */
export function guardaCorpo(o: Obra, eixo: Eixo, fixo: number, de: number, ate: number, y: number) {
  const len = ate - de
  peca(o, 'madeira', eixo, fixo, de, ate, y + 0.98, y + 1.05, -0.04, 0.04)
  peca(o, 'madeira', eixo, fixo, de, ate, y + 0.06, y + 0.1, -0.03, 0.03)
  const n = Math.round(len / 0.13)
  for (let i = 1; i < n; i++) {
    const a = de + (i * len) / n
    peca(o, 'preto', eixo, fixo, a - 0.011, a + 0.011, y + 0.1, y + 0.98, -0.011, 0.011)
  }
  for (let a = de; a <= ate + 0.01; a += Math.max(1.2, len / Math.ceil(len / 1.8))) peca(o, 'madeira', eixo, fixo, a - 0.05, a + 0.05, y, y + 1.1, -0.05, 0.05)
}

// ================= TÉRREO =================
function terreo(o: Obra) {
  // piso de madeira e base
  o.caixa('concreto', [-X - 0.5, X + 0.5], [-0.4, -0.03], [ZB - 0.5, ZF + 0.5])
  o.caixa('piso', [-X, X], [-0.25, 0], [ZB, ZF])

  // ---- paredes externas ----
  paredeExterna(o, 'x', ZF, 1, -X, X, 0, Y1, [
    vidro(0, 1.9, 2.7), // porta de entrada (a porta de madeira vai em cima)
    jan(-2.75, 1.6, 0.35, 2.8),
    jan(2.75, 1.6, 0.35, 2.8),
    alta(-5.25),
    jan(-7.75, 1.6),
    alta(6.5, 1.0),
  ], 'blocos')
  paredeExterna(o, 'x', ZB, -1, -X, X, 0, Y1, [jan(-6.5, 2.4), jan(0, 4.8, 0.45, 2.9), vidro(6.5, 3.6)], 'blocos')
  paredeExterna(o, 'z', -X, -1, ZB, ZF, 0, Y1, [jan(-6.5, 2.2), jan(-3, 2.2), jan(5.25, 1.6)], 'blocos')
  paredeExterna(o, 'z', X, 1, ZB, ZF, 0, Y1, [jan(-5.3, 2.0, 1.2, 2.5), alta(0.25, 0.8), alta(2.75)], 'blocos')
  // faixa preta entre os andares (do lado de fora)
  o.caixa('preto', [-X - 0.34, X + 0.34], [Y1 - 0.12, Y1 + 0.08], [ZF + EXT, ZF + EXT + 0.04])
  o.caixa('preto', [-X - 0.34, X + 0.34], [Y1 - 0.12, Y1 + 0.08], [ZB - EXT - 0.04, ZB - EXT])
  o.caixa('preto', [-X - EXT - 0.04, -X - EXT], [Y1 - 0.12, Y1 + 0.08], [ZB - 0.34, ZF + 0.34])
  o.caixa('preto', [X + EXT, X + EXT + 0.04], [Y1 - 0.12, Y1 + 0.08], [ZB - 0.34, ZF + 0.34])

  // ---- paredes internas ----
  const ab1: [Eixo, number, number, number, Abertura[]][] = [
    ['z', -4, ZB, ZF, [vao(-3.7, 1.2), porta(5.25)]], // sala de jogos | sala (e lavabo)
    ['x', 3.5, -6.5, -4, []], // lavabo
    ['z', -6.5, 3.5, ZF, []],
    ['x', -5, -4, 4, [vao(0, 5, 2.7)]], // sala | jantar
    ['z', 4, ZB, ZF, [vao(-7, 3.2), vao(-3.2, 2.4), porta(0.25, 0.8), porta(2.75, 0.8), porta(5.5, 0.8)]], // lado direito
    ['x', -1, 4, X, []], // cozinha | lavanderia
    ['x', 1.5, 4, X, []], // lavanderia | banheiro
    ['x', 4, 4, X, []], // banheiro | depósito
  ]
  for (const [eixo, fixo, de, ate, abs] of ab1) {
    parede(o, 'parede', eixo, fixo, de, ate, 0, TETO1, INT, abs)
    molduras(o, eixo, fixo, 0, INT, abs)
    acabamentos(o, eixo, fixo, de, ate, 0, TETO1, [[-INT / 2, -1], [INT / 2, 1]], abs)
  }

  // pisos de pedra nos banheiros
  o.caixa('pisoBanho', [-6.5, -4], [0, 0.012], [3.5, ZF])
  o.caixa('pisoBanho', [4, X], [0, 0.012], [1.5, 4])

  // ---- escada: degraus de madeira sobre base branca ----
  const { x0, x1, zBase, degraus, piso } = ESCADA
  const alt = Y1 / degraus
  for (let i = 0; i < degraus; i++) {
    const zA = zBase - i * piso
    const topo = (i + 1) * alt
    o.caixa('branco', [x0, x1], [0, topo - 0.035], [zA - piso, zA])
    o.caixa('madeira', [x0, x1 + 0.03], [topo - 0.035, topo], [zA - piso, zA + 0.03])
  }
  // corrimão inclinado com balaústres
  const comp = degraus * piso
  const inc = Math.atan2(Y1, comp)
  const L = Math.hypot(Y1, comp)
  const corrimao = new BoxGeometry(0.07, 0.06, L)
  corrimao.rotateX(inc)
  corrimao.translate(x1 - 0.04, 0.95 + Y1 / 2, zBase - comp / 2)
  o.add('madeira', corrimao)
  for (let i = 0; i < degraus; i++) {
    const zA = zBase - (i + 0.5) * piso
    const topo = (i + 1) * alt
    o.caixa('preto', [x1 - 0.055, x1 - 0.025], [topo, topo + 0.95 - 0.02], [zA - 0.012, zA + 0.012])
  }
  o.caixa('madeira', [x1 - 0.1, x1 + 0.02], [0, 1.15], [zBase - 0.12, zBase])

  // ---- porta de entrada de madeira e o portal lá fora ----
  const zp = ZF + EXT * 0.5
  o.caixa('madeiraEscura', [-0.5, 0.5], [0, 2.55], [zp - 0.03, zp + 0.03])
  for (const y of [0.8, 1.3, 1.8]) o.caixa('vidro', [-0.3, 0.3], [y, y + 0.14], [zp + 0.03, zp + 0.035])
  o.caixa('latao', [0.36, 0.4], [0.9, 1.5], [zp + 0.03, zp + 0.08])
  o.caixa('preto', [-1.7, 1.7], [2.95, 3.2], [ZF + EXT, ZF + 2.0])
  o.caixa('madeira', [-1.62, 1.62], [2.92, 2.95], [ZF + EXT, ZF + 1.95])
  for (const x of [-1.55, 1.55]) o.caixa('preto', [x - 0.08, x + 0.08], [0, 2.95], [ZF + 1.8, ZF + 1.96])
  o.caixa('concreto', [-1.9, 1.9], [-0.05, 0.03], [ZF + EXT, ZF + 2.2])
}

// ================= 2º ANDAR =================
function superior(o: Obra) {
  // laje (com o vão da sala de pé-direito duplo): embaixo branca, em cima madeira
  const laje = (x: [number, number], z: [number, number]) => {
    o.caixa('teto', x, [TETO1, Y1 - 0.03], z)
    o.caixa('piso', x, [Y1 - 0.03, Y1], z)
  }
  laje([-X, -4], [ZB, ZF])
  laje([4, X], [ZB, ZF])
  laje([-4, 4], [ZB, -2.4])

  // ---- paredes externas ----
  paredeExterna(o, 'x', ZF, 1, -X, X, Y1, Y2, [
    alta(-7.8),
    jan(-5.9, 1.0, 0.9, 2.5),
    jan(0, 7.2, 0.15, 2.85), // o janelão da sala (pé-direito duplo)
    jan(5.9, 1.0, 0.9, 2.5),
    alta(7.8),
  ], 'fachada')
  // fundos: dos lados continua a fachada; no meio abre pra ala da suíte
  paredeExterna(o, 'x', ZB, -1, -X, SUITE.x0, Y1, Y2, [alta(-7.8), jan(-5.9, 1.0, 0.9, 2.5)], 'fachada', [true, false])
  paredeExterna(o, 'x', ZB, -1, SUITE.x1, X, Y1, Y2, [jan(5.9, 0.7, 0.9, 2.5), alta(7.8)], 'fachada', [false, true])
  const passagem: Abertura[] = [porta(-2.1, 0.9), { em: 3.3, larg: 1.3, y0: 0, y1: 2.5, tipo: 'vao' }]
  parede(o, 'parede', 'x', ZB, SUITE.x0, SUITE.x1, Y1, Y2, EXT, passagem)
  molduras(o, 'x', ZB, Y1, EXT, passagem)
  acabamentos(o, 'x', ZB, SUITE.x0, SUITE.x1, Y1, Y2, [[-EXT / 2, -1], [EXT / 2, 1]], passagem)

  // ---- a ala da suíte: 10 x 7 m, parede de vidro pro quintal ----
  laje([SUITE.x0, SUITE.x1], [SUITE.z0, ZB - EXT / 2])
  paredeExterna(o, 'z', SUITE.x0, -1, SUITE.z0, ZB - EXT / 2, Y1, Y2, [jan(-14.9, 1.2, 0.5, 2.6)], 'fachada')
  paredeExterna(o, 'z', SUITE.x1, 1, SUITE.z0, ZB - EXT / 2, Y1, Y2, [jan(-12.3, 2.4, 0.5, 2.7)], 'fachada')
  paredeExterna(o, 'x', SUITE.z0, -1, SUITE.x0, SUITE.x1, Y1, Y2, [jan(-3.95, 1.3, 0.3, 2.7), vidro(0, 5.6, 2.85), jan(3.95, 1.3, 0.3, 2.7)], 'fachada')
  // faixa preta na altura da laje (como no resto da casa)
  o.caixa('preto', [SUITE.x0 - EXT - 0.04, SUITE.x1 + EXT + 0.04], [TETO1 - 0.05, Y1 + 0.08], [SUITE.z0 - EXT - 0.04, SUITE.z0 - EXT])
  o.caixa('preto', [SUITE.x0 - EXT - 0.04, SUITE.x0 - EXT], [TETO1 - 0.05, Y1 + 0.08], [SUITE.z0 - EXT, ZB - EXT])
  o.caixa('preto', [SUITE.x1 + EXT, SUITE.x1 + EXT + 0.04], [TETO1 - 0.05, Y1 + 0.08], [SUITE.z0 - EXT, ZB - EXT])
  // varanda da suíte, com guarda-corpo de vidro
  const zv = SUITE.z0 - EXT
  o.caixa('concreto', [-3.3, 3.3], [Y1 - 0.25, Y1], [zv - 1.7, zv])
  o.caixa('piso', [-3.25, 3.25], [Y1, Y1 + 0.01], [zv - 1.65, zv])
  o.caixa('vidro', [-3.25, 3.25], [Y1, Y1 + 1.05], [zv - 1.66, zv - 1.64])
  for (const x of [-3.25, 3.25]) o.caixa('vidro', [x - 0.01, x + 0.01], [Y1, Y1 + 1.05], [zv - 1.65, zv])
  o.caixa('preto', [-3.28, 3.28], [Y1 + 1.05, Y1 + 1.09], [zv - 1.68, zv - 1.62])
  for (const x of [-3.28, 3.28]) o.caixa('preto', [x - 0.03, x + 0.03], [Y1 + 1.05, Y1 + 1.09], [zv - 1.65, zv])
  paredeExterna(o, 'z', -X, -1, ZB, ZF, Y1, Y2, [jan(-4.9, 1.6, 0.9, 2.5), jan(1.5, 1.6, 0.9, 2.5), alta(5.9)], 'fachada')
  paredeExterna(o, 'z', X, 1, ZB, ZF, Y1, Y2, [alta(-7.9), jan(-4.9, 1.6, 0.9, 2.5), jan(1.5, 1.6, 0.9, 2.5), alta(5.9)], 'fachada')

  // ---- paredes internas ----
  const ab2: [Eixo, number, number, number, Abertura[]][] = [
    ['z', -5.2, -5, ZF, [porta(-3.5), porta(1.5)]], // corredor esquerdo | quartos dos meninos
    ['z', 5.2, -5, ZF, [porta(-3.5), porta(1.5)]], // corredor direito | menina e hóspedes
    ['x', -5, -5.2, 5.2, [porta(3.3, 1.0)]], // mezanino | entrada da suíte (e os cantinhos dos quartos)
    ['z', -4, ZB, -5, []],
    ['z', 4, ZB, -5, []],
    ['x', -1, -X, -5.2, []], // menino 1 | menino 2
    ['x', -1, 5.2, X, []], // menina | hóspedes
    // banheiros dos quartos
    ['z', -6.6, ZB, -6.8, [porta(-7.9, 0.8)]],
    ['x', -6.8, -X, -6.6, []],
    ['z', -6.6, 4.8, ZF, [porta(5.9, 0.8)]],
    ['x', 4.8, -X, -6.6, []],
    ['z', 6.6, ZB, -6.8, [porta(-7.9, 0.8)]],
    ['x', -6.8, 6.6, X, []],
    ['z', 6.6, 4.8, ZF, [porta(5.9, 0.8)]],
    ['x', 4.8, 6.6, X, []],
    // antes do quarto: banheiro do casal | closet | corredor de entrada
    ['z', -0.2, ZB, -5, []],
    ['z', 2.6, ZB, -5, [{ em: -7.1, larg: 1.6, y0: 0, y1: 2.4, tipo: 'vao' }]],
  ]
  for (const [eixo, fixo, de, ate, abs] of ab2) {
    parede(o, 'parede', eixo, fixo, de, ate, Y1, Y2, INT, abs)
    molduras(o, eixo, fixo, Y1, INT, abs)
    acabamentos(o, eixo, fixo, de, ate, Y1, Y2, [[-INT / 2, -1], [INT / 2, 1]], abs)
  }

  // pisos dos banheiros
  for (const [x, z] of [
    [[-X, -6.6], [ZB, -6.8]],
    [[-X, -6.6], [4.8, ZF]],
    [[6.6, X], [ZB, -6.8]],
    [[6.6, X], [4.8, ZF]],
    [[-4, -0.2], [ZB, -5]],
  ] as [number, number][][])
    o.caixa('pisoBanho', x, [Y1, Y1 + 0.012], z)

  // guarda-corpos em volta do vão (o mezanino)
  guardaCorpo(o, 'x', -2.4, ESCADA.x1, 4, Y1)
  guardaCorpo(o, 'z', 4, -2.4, ZF, Y1)
  guardaCorpo(o, 'z', -4, -2.4, ZF, Y1)

}

// ================= TELHADO =================
function telhado(o: Obra) {
  const bx = X + EXT
  const zc = (ZF + ZB) / 2
  const mz = (ZF - ZB) / 2 + EXT
  o.caixa('teto', [-bx, bx], [Y2, Y2 + 0.15], [ZB - EXT, ZF + EXT])
  const beiral = 0.55
  o.add('telhado', telhadoQuatroAguas(bx + beiral, mz + beiral, Y2 + 0.12, 3.1).translate(0, 0, zc))
  o.caixa('madeira', [-bx - beiral, bx + beiral], [Y2 + 0.08, Y2 + 0.12], [ZB - EXT - beiral, ZF + EXT + beiral])
  const f = (x: [number, number], z: [number, number]) => o.caixa('preto', x, [Y2 - 0.05, Y2 + 0.18], z)
  f([-bx - beiral, bx + beiral], [ZF + EXT + beiral - 0.07, ZF + EXT + beiral])
  f([-bx - beiral, bx + beiral], [ZB - EXT - beiral, ZB - EXT - beiral + 0.07])
  f([-bx - beiral, -bx - beiral + 0.07], [ZB - EXT - beiral, ZF + EXT + beiral])
  f([bx + beiral - 0.07, bx + beiral], [ZB - EXT - beiral, ZF + EXT + beiral])

  // telhado da ala da suíte (quatro águas, encaixado no telhado da casa)
  const sx = (SUITE.x1 - SUITE.x0) / 2 + EXT
  const sz = (ZB - SUITE.z0) / 2 + EXT
  const szc = (ZB + SUITE.z0) / 2 - EXT / 2
  o.caixa('teto', [SUITE.x0 - EXT, SUITE.x1 + EXT], [Y2, Y2 + 0.15], [SUITE.z0 - EXT, ZB])
  o.add('telhado', telhadoQuatroAguas(sx + beiral, sz + beiral, Y2 + 0.12, 2.3).translate(0, 0, szc))
  o.caixa('madeira', [SUITE.x0 - EXT - beiral, SUITE.x1 + EXT + beiral], [Y2 + 0.08, Y2 + 0.12], [SUITE.z0 - EXT - beiral, ZB - EXT - beiral])
  f([SUITE.x0 - EXT - beiral, SUITE.x1 + EXT + beiral], [SUITE.z0 - EXT - beiral, SUITE.z0 - EXT - beiral + 0.07])
  f([SUITE.x0 - EXT - beiral, SUITE.x0 - EXT - beiral + 0.07], [SUITE.z0 - EXT - beiral, ZB - EXT - beiral])
  f([SUITE.x1 + EXT + beiral - 0.07, SUITE.x1 + EXT + beiral], [SUITE.z0 - EXT - beiral, ZB - EXT - beiral])

  // frontão sobre o janelão (como na foto da fachada)
  const larg = 9.2
  const sub = 2.7
  const zFrente = ZF + EXT + 0.5
  const { geo, L, ang } = telhadoDuasAguas(larg + 0.8, zFrente, zc, Y2 + 0.1, sub)
  o.add('telhado', geo)
  const s = new Shape()
  s.moveTo(-larg / 2, 0)
  s.lineTo(larg / 2, 0)
  s.lineTo(0, sub * (larg / (larg + 0.8)))
  s.closePath()
  const tri = new ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false })
  tri.translate(0, Y2 + 0.1, ZF)
  o.add('fachada', tri)
  for (const lado of [-1, 1]) {
    const t = new BoxGeometry(L + 0.06, 0.24, 0.07)
    t.rotateZ(-lado * ang)
    t.translate((lado * (larg + 0.8)) / 4, Y2 + 0.1 + sub / 2 - 0.06, zFrente + 0.02)
    o.add('preto', t)
  }
  // janelinha redonda no frontão
  const c = new CylinderGeometry(0.45, 0.45, 0.06, 24)
  c.rotateX(Math.PI / 2)
  c.translate(0, Y2 + 1.0, ZF + EXT + 0.02)
  o.add('preto', c)
  const v = new CylinderGeometry(0.38, 0.38, 0.07, 24)
  v.rotateX(Math.PI / 2)
  v.translate(0, Y2 + 1.0, ZF + EXT + 0.03)
  o.add('luz', v)
}

/** Monta a casa inteira (sem os móveis), separada em andares */
export function montarEstrutura() {
  const andares = { terreo: new Obra(), superior: new Obra(), teto: new Obra() }
  terreo(andares.terreo)
  superior(andares.superior)
  telhado(andares.teto)
  return andares
}
