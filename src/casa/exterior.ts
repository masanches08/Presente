import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, PlaneGeometry, Shape, TorusGeometry } from 'three'
import { Obra } from '../mundo/obra'
import { guardaCorpo } from './construcao'
import { cadeira, em, planta, sofa, type Andar, type L } from './moveis'

// ======================================================================
// O quintal "americano": lote cercado, gramado grande, área coberta,
// piscina com hidromassagem, fogueira, cozinha externa, playground,
// cama elástica, rede e casinha de ferramentas.
// (metros; a casa ocupa x -9..9, z -9..7; os fundos vão até z = -46)
// ======================================================================

type Ret = { x0: number; x1: number; z0: number; z1: number }

export const LOTE = { x0: -24, x1: 24, z0: -46, zFrente: 4 }
/** Área coberta embaixo da suíte do casal */
export const ALPENDRE: Ret = { x0: -5.3, x1: 5.3, z0: -16.3, z1: -9.3 }
export const PISCINA: Ret = { x0: -7, x1: 5, z0: -24, z1: -18.5 }
export const SPA = { x: 7.6, z: -21.25, r: 1.35 }
export const DECK: Ret = { x0: -10.2, x1: 10.4, z0: -27, z1: -15.6 }
export const GOURMET: Ret = { x0: 12.5, x1: 20, z0: -25, z1: -17 }
export const FOGUEIRA = { x: -15, z: -27.5, r: 3.7 }
export const CAMA_ELASTICA = { x: -2.5, z: -37.5, r: 2.1 }
export const CASA_ARVORE = { x: -19.5, z: -39.5 }
export const PLAYGROUND: Ret = { x0: -17.5, x1: -8.5, z0: -44, z1: -33 }
/** Casinha de ferramentas (a porta dupla olha pro meio do quintal, -x) */
export const CASINHA = { x: 19.8, z: -30.5 }
export const REDE = { x0: 3.6, x1: 8.8, z: -42.5 }
export const LAJE_PEGADAS = { z: 11.6, w: 3.4, d: 1.7 }

/** Área onde NÃO nasce grama */
export function semGrama(x: number, z: number) {
  const dentro = (r: Ret, m = 0.2) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m
  const perto = (cx: number, cz: number, r: number) => Math.hypot(x - cx, z - cz) < r
  if (x > -9.8 && x < 9.8 && z > -10.8 && z < 7.8) return true // casa
  if (Math.abs(x) < 2.1 && z > 7 && z < 9.4) return true // portal
  if (Math.abs(x) < 1.0 && z > 7 && z < 21) return true // caminho da frente
  if (Math.abs(x) < 1.9 && Math.abs(z - LAJE_PEGADAS.z) < 1.1) return true // laje dos pezinhos
  if (Math.abs(x - 6.6) < 0.8 && z < -9 && z > -16) return true // passagem até a piscina
  if (Math.abs(x) > 23.8 || z < LOTE.z0 + 0.2) return true // cerca
  return (
    dentro(ALPENDRE) ||
    dentro(DECK) ||
    dentro(GOURMET) ||
    dentro({ x0: CASINHA.x - 3.9, x1: CASINHA.x + 1.9, z0: CASINHA.z - 2.0, z1: CASINHA.z + 2.0 }, 0) ||
    perto(FOGUEIRA.x, FOGUEIRA.z, FOGUEIRA.r + 0.2) ||
    perto(CAMA_ELASTICA.x, CAMA_ELASTICA.z, CAMA_ELASTICA.r + 0.1) ||
    perto(-12.5, -37, 1.4) // caixa de areia
  )
}

// ---------------- peças ----------------

function espreguicadeira(l: L) {
  for (const x of [-0.3, 0.3]) for (const zz of [-0.85, 0.85]) l.caixa('madeira', x - 0.03, x + 0.03, 0, 0.3, zz - 0.03, zz + 0.03)
  l.caixa('madeira', -0.35, 0.35, 0.28, 0.34, -0.95, 0.95)
  l.caixa('linho', -0.32, 0.32, 0.34, 0.42, -0.55, 0.92)
  l.bloco('linho', 0, 0.62, -0.78, 0.64, 0.08, 0.6, -0.75)
  l.bloco('toalha', 0.05, 0.44, 0.3, 0.5, 0.03, 0.7)
}

function guardaSol(l: L) {
  l.cil('madeira', 0, 0, 2.4, 0, 0.03)
  l.cil('preto', 0, 0, 0.08, 0, 0.3, 0.3, 16)
  l.cone('linho', 0, 2.1, 2.6, 0, 1.4, 12)
}

/** Cadeira Adirondack (a clássica cadeira de madeira dos quintais americanos) */
function adirondack(l: L) {
  for (let i = 0; i < 5; i++) l.bloco('madeiraBranca', -0.26 + i * 0.13, 0.38, 0.02, 0.1, 0.03, 0.55, -0.12)
  for (let i = 0; i < 6; i++) {
    const x = -0.28 + i * 0.112
    const alt = 0.9 - Math.abs(x) * 0.5
    l.bloco('madeiraBranca', x, 0.38 + alt / 2 + 0.05, -0.32, 0.095, alt, 0.03, -0.35)
  }
  for (const x of [-0.36, 0.36]) {
    l.caixa('madeiraBranca', x - 0.07, x + 0.07, 0.6, 0.63, -0.3, 0.35)
    l.caixa('madeiraBranca', x - 0.03, x + 0.03, 0, 0.6, 0.25, 0.3)
    l.bloco('madeiraBranca', x, 0.2, -0.05, 0.04, 0.05, 0.75, -0.35)
  }
}

/** Cerca de madeira alta (tábuas) com mourões e acabamento em cima */
/**
 * Casinha de ferramentas americana: tábuas de madeira em pé com mata-juntas, acabamento branco,
 * telhado de duas águas com cumeeira e catavento, porta dupla de celeiro com "X", janelas com floreira,
 * lampião, ferramentas encostadas, carrinho de mão e regador.
 */
function casinhaFerramentas(a: Andar) {
  const l = em(a, [CASINHA.x, 0, CASINHA.z], -Math.PI / 2) // frente (+z) olhando pro meio do quintal
  const W = 1.6 // meia largura
  const D = 1.3 // meia profundidade
  const Y0 = 0.14 // em cima da base
  const YW = 2.15 // topo das paredes
  const CUME = 1.05 // altura do telhado acima das paredes
  const inc = Math.atan(CUME / W)
  const ord = (p: number, q: number): [number, number] => (p < q ? [p, q] : [q, p])
  const caixa = (m: string, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => l.caixa(m, ...ord(x0, x1), y0, y1, ...ord(z0, z1))

  // base de concreto e rampinha de madeira até a porta
  l.caixa('concreto', -W - 0.12, W + 0.12, 0, Y0, -D - 0.12, D + 0.12)
  l.bloco('madeiraEscura', 0, Y0 / 2, D + 0.42, 1.5, 0.05, 0.62, Math.atan(Y0 / 0.6))

  // corpo de tábuas em pé + mata-juntas escuras a cada 32 cm
  l.caixa('cerca', -W, W, Y0, YW, -D, D)
  for (const s of [-1, 1]) {
    for (let z = -D + 0.25; z < D - 0.15; z += 0.32) caixa('cercaEscura', s * W, s * (W + 0.02), Y0 + 0.12, YW - 0.12, z - 0.025, z + 0.025)
    for (let x = -W + 0.25; x < W - 0.15; x += 0.32) {
      if (s > 0 && Math.abs(x) < 0.95) continue // (a porta)
      caixa('cercaEscura', x - 0.025, x + 0.025, Y0 + 0.12, YW - 0.12, s * D, s * (D + 0.02))
    }
  }
  // acabamento branco: rodapé, faixa de cima e cantoneiras
  l.caixa('madeiraBranca', -W - 0.03, W + 0.03, Y0, Y0 + 0.12, -D - 0.03, D + 0.03)
  l.caixa('madeiraBranca', -W - 0.03, W + 0.03, YW - 0.12, YW, -D - 0.03, D + 0.03)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) caixa('madeiraBranca', sx * (W - 0.08), sx * (W + 0.04), Y0, YW, sz * (D - 0.08), sz * (D + 0.04))

  // oitões (triângulos da frente e de trás) e telhado de duas águas com beiral
  for (const lado of [1, -1]) {
    const t = new Shape()
    t.moveTo(-W, 0)
    t.lineTo(W, 0)
    t.lineTo(0, CUME)
    t.closePath()
    const g = new ExtrudeGeometry(t, { depth: 0.1, bevelEnabled: false })
    g.translate(0, YW, lado > 0 ? D - 0.1 : -D)
    l.put('cerca', g)
  }
  const B = 0.28 // beiral
  const comp = (W + B) / Math.cos(inc)
  for (const s of [-1, 1]) {
    const cx = (s * (W + B)) / 2
    const cy = YW + CUME - ((W + B) / 2) * Math.tan(inc) + 0.04
    l.bloco('telhado', cx, cy, 0, comp, 0.07, 2 * D + 0.6, 0, 0, -s * inc)
    // testeira branca na frente e atrás
    for (const sz of [-1, 1]) l.bloco('madeiraBranca', cx, cy - 0.05, sz * (D + 0.31), comp, 0.16, 0.04, 0, 0, -s * inc)
  }
  l.bloco('preto', 0, YW + CUME + 0.08, 0, 0.18, 0.06, 2 * D + 0.64)

  // cupulazinha no meio da cumeeira com catavento
  const yc = YW + CUME
  l.caixa('madeiraBranca', -0.2, 0.2, yc - 0.05, yc + 0.32, -0.2, 0.2)
  for (const s of [-1, 1]) for (let y = yc + 0.05; y < yc + 0.28; y += 0.07) caixa('cercaEscura', s * 0.2, s * 0.215, y, y + 0.03, -0.13, 0.13)
  l.cone('telhado', 0, yc + 0.32, yc + 0.58, 0, 0.32, 4)
  l.cil('preto', 0, yc + 0.58, yc + 0.95, 0, 0.012)
  l.bloco('preto', 0, yc + 0.85, 0, 0.012, 0.012, 0.42)
  l.bloco('preto', 0, yc + 0.85, 0.2, 0.012, 0.1, 0.1, Math.PI / 4)
  l.bloco('preto', 0, yc + 0.85, -0.2, 0.012, 0.14, 0.08)

  // porta dupla de celeiro: tábuas, moldura branca e "X" embaixo, dobradiças compridas e puxadores
  const yp0 = Y0 + 0.02
  const yp1 = 1.98
  l.caixa('cerca', -0.74, 0.74, yp0, yp1, D, D + 0.03)
  l.caixa('cercaEscura', -0.006, 0.006, yp0, yp1, D + 0.03, D + 0.035)
  l.caixa('madeiraBranca', -0.86, 0.86, yp1, yp1 + 0.12, D, D + 0.045)
  for (const s of [-1, 1]) caixa('madeiraBranca', s * 0.74, s * 0.86, yp0, yp1, D, D + 0.045)
  const ym = 1.12
  for (const s of [-1, 1]) {
    const xc = s * 0.37
    caixa('madeiraBranca', xc - 0.33, xc + 0.33, yp0, yp0 + 0.09, D + 0.03, D + 0.055)
    caixa('madeiraBranca', xc - 0.33, xc + 0.33, yp1 - 0.09, yp1, D + 0.03, D + 0.055)
    caixa('madeiraBranca', xc - 0.33, xc + 0.33, ym - 0.045, ym + 0.045, D + 0.03, D + 0.055)
    caixa('madeiraBranca', xc - 0.33, xc - 0.25, yp0, yp1, D + 0.03, D + 0.055)
    caixa('madeiraBranca', xc + 0.25, xc + 0.33, yp0, yp1, D + 0.03, D + 0.055)
    const dx = 0.5
    const dy = ym - 0.045 - (yp0 + 0.09)
    const ang = Math.atan2(dy, dx)
    for (const r of [ang, -ang]) l.bloco('madeiraBranca', xc, (ym - 0.045 + yp0 + 0.09) / 2, D + 0.045, Math.hypot(dx, dy), 0.07, 0.02, 0, 0, r)
    for (const y of [0.45, 1.65]) caixa('preto', s * 0.74, s * 0.42, y - 0.022, y + 0.022, D + 0.055, D + 0.065)
    caixa('preto', s * 0.06, s * 0.085, 1.0, 1.28, D + 0.055, D + 0.085)
  }

  // janela no oitão da frente (vidro escuro, moldura branca em cruz)
  const janela = (x0: number, x1: number, y0: number, y1: number, z: number) => {
    l.caixa('tela', x0, x1, y0, y1, z, z + 0.01)
    l.caixa('madeiraBranca', x0 - 0.06, x1 + 0.06, y0 - 0.06, y0, z, z + 0.04)
    l.caixa('madeiraBranca', x0 - 0.06, x1 + 0.06, y1, y1 + 0.06, z, z + 0.04)
    l.caixa('madeiraBranca', x0 - 0.06, x0, y0, y1, z, z + 0.04)
    l.caixa('madeiraBranca', x1, x1 + 0.06, y0, y1, z, z + 0.04)
    l.caixa('madeiraBranca', (x0 + x1) / 2 - 0.015, (x0 + x1) / 2 + 0.015, y0, y1, z, z + 0.025)
    l.caixa('madeiraBranca', x0, x1, (y0 + y1) / 2 - 0.015, (y0 + y1) / 2 + 0.015, z, z + 0.025)
  }
  janela(-0.26, 0.26, YW + 0.12, YW + 0.5, D)

  // janelas nas laterais, cada uma com floreira e florzinhas
  for (const s of [-1, 1]) {
    const x = s * W
    caixa('tela', x, x + s * 0.01, 1.0, 1.62, -0.42, 0.42)
    caixa('madeiraBranca', x, x + s * 0.04, 0.94, 1.0, -0.48, 0.48)
    caixa('madeiraBranca', x, x + s * 0.04, 1.62, 1.68, -0.48, 0.48)
    for (const z of [-0.45, 0.45]) caixa('madeiraBranca', x, x + s * 0.04, 1.0, 1.62, z - 0.03, z + 0.03)
    caixa('madeiraBranca', x, x + s * 0.025, 1.0, 1.62, -0.015, 0.015)
    caixa('madeiraBranca', x, x + s * 0.025, 1.295, 1.325, -0.42, 0.42)
    // floreira
    caixa('madeiraBranca', x, x + s * 0.24, 0.74, 0.92, -0.5, 0.5)
    caixa('terra', x + s * 0.03, x + s * 0.21, 0.92, 0.93, -0.47, 0.47)
    for (const z of [-0.3, 0, 0.3]) {
      a.tufos.push({ centro: l.mundo(x + s * 0.12, 0.98, z), raio: 0.12 })
      l.flores(x + s * 0.12, 1.0, z, 0.13, 6)
    }
  }

  // lampião preto do lado da porta
  for (const s of [-1, 1]) {
    const x = s * 1.08
    l.caixa('preto', x - 0.06, x + 0.06, 1.62, 1.86, D, D + 0.03)
    l.caixa('preto', x - 0.015, x + 0.015, 1.72, 1.75, D + 0.03, D + 0.14)
    l.caixa('cupula', x - 0.06, x + 0.06, 1.6, 1.78, D + 0.1, D + 0.22)
    l.caixa('preto', x - 0.08, x + 0.08, 1.78, 1.81, D + 0.08, D + 0.24)
  }

  // ferramentas encostadas na parede: ancinho e pá
  l.bloco('madeira', 1.28, 0.78, D + 0.17, 0.03, 1.55, 0.03, -0.2)
  l.caixa('metal', 1.08, 1.48, 0.02, 0.06, D + 0.31, D + 0.35)
  for (let x = 1.1; x <= 1.47; x += 0.06) l.caixa('metal', x - 0.007, x + 0.007, 0, 0.04, D + 0.33, D + 0.38)
  l.bloco('madeira', 1.5, 0.72, D + 0.15, 0.03, 1.4, 0.03, -0.2)
  l.bloco('metal', 1.5, 0.1, D + 0.29, 0.22, 0.28, 0.02, -0.2)
  l.caixa('preto', 1.44, 1.56, 1.42, 1.45, D + 0.01, D + 0.03)

  // carrinho de mão e regador na frente, à esquerda da porta
  const pc = l.mundo(-1.35, 0, D + 1.0)
  const car = em(a, [pc.x, 0, pc.z], -Math.PI / 2 + 0.6)
  car.bloco('brinquedoD', 0, 0.48, 0.05, 0.56, 0.22, 0.74, -0.12)
  car.bloco('terra', 0, 0.58, 0.05, 0.5, 0.03, 0.68, -0.12) // cheio de terra
  car.esfera('preto', 0, 0.17, 0.55, 0.17, 0.35, 1, 1)
  for (const x of [-0.24, 0.24]) {
    car.bloco('madeira', x, 0.42, -0.25, 0.04, 0.04, 1.1, -0.15)
    car.bloco('metal', x, 0.2, -0.2, 0.025, 0.36, 0.025)
  }
  const pr = l.mundo(-0.7, 0, D + 0.95)
  const reg = em(a, [pr.x, 0, pr.z], 0.8)
  reg.cil('metal', 0, 0, 0.26, 0, 0.11, 0.1, 18)
  reg.bloco('metal', 0.17, 0.22, 0, 0.26, 0.025, 0.025, 0, 0, 0.75)
  reg.aro('metal', -0.02, 0.3, 0, 0.07, 0.012)

  // vasos de barro com planta dos dois lados da rampa e moitinhas nos cantos de trás
  for (const s of [-1, 1]) {
    const p = l.mundo(s * 0.9, 0, D + 0.25)
    planta(a, p.x, p.z, 'arbusto', 0.65, 'vaso')
    a.tufos.push({ centro: l.mundo(s * (W + 0.25), 0.3, -D + 0.1), raio: 0.38 })
    a.tufos.push({ centro: l.mundo(s * (W + 0.2), 0.25, -D + 0.75), raio: 0.3 })
  }
  // pedras de pisar até a porta
  for (const [x, z] of [
    [0.1, D + 1.0],
    [-0.12, D + 1.55],
    [0.08, D + 2.1],
  ])
    l.cil('pedra', x, 0, 0.04, z, 0.25, 0.25, 14)
}

function cerca(o: Obra, eixo: 'x' | 'z', fixo: number, de: number, ate: number, portao?: number) {
  const trecho = (a0: number, a1: number) => {
    if (eixo === 'x') o.caixa('cerca', [a0, a1], [0, 1.8], [fixo - 0.03, fixo + 0.03])
    else o.caixa('cerca', [fixo - 0.03, fixo + 0.03], [0, 1.8], [a0, a1])
  }
  if (portao !== undefined) {
    trecho(de, portao - 0.7)
    trecho(portao + 0.7, ate)
  } else trecho(de, ate)
  const n = Math.round((ate - de) / 2.4)
  for (let i = 0; i <= n; i++) {
    const a = de + (i * (ate - de)) / n
    if (eixo === 'x') o.caixa('cercaEscura', [a - 0.06, a + 0.06], [0, 1.95], [fixo - 0.07, fixo + 0.07])
    else o.caixa('cercaEscura', [fixo - 0.07, fixo + 0.07], [0, 1.95], [a - 0.06, a + 0.06])
  }
  if (eixo === 'x') o.caixa('cercaEscura', [de, ate], [1.8, 1.86], [fixo - 0.06, fixo + 0.06])
  else o.caixa('cercaEscura', [fixo - 0.06, fixo + 0.06], [1.8, 1.86], [de, ate])
}

export function montarExterior(a: Andar) {
  const o = a.o

  // ---------- frente: caminho de placas e a laje dos pezinhos ----------
  for (let z = 9.6; z < 20.5; z += 0.72) {
    if (Math.abs(z - LAJE_PEGADAS.z) < 1.2) continue
    o.caixa('concreto', [-0.68, 0.68], [-0.04, 0.035], [z - 0.25, z + 0.25])
  }
  o.caixa('concreto', [-LAJE_PEGADAS.w / 2 - 0.08, LAJE_PEGADAS.w / 2 + 0.08], [-0.05, 0.04], [LAJE_PEGADAS.z - LAJE_PEGADAS.d / 2 - 0.08, LAJE_PEGADAS.z + LAJE_PEGADAS.d / 2 + 0.08])

  // ---------- cerca em volta do quintal ----------
  cerca(o, 'z', LOTE.x0, LOTE.z0, LOTE.zFrente)
  cerca(o, 'z', LOTE.x1, LOTE.z0, LOTE.zFrente)
  cerca(o, 'x', LOTE.z0, LOTE.x0, LOTE.x1)
  cerca(o, 'x', LOTE.zFrente, LOTE.x0, -9.4, -16)
  cerca(o, 'x', LOTE.zFrente, 9.4, LOTE.x1, 16)

  // ---------- área coberta embaixo da suíte (a laje da suíte é o teto) ----------
  const A = ALPENDRE
  o.caixa('concreto', [A.x0, A.x1], [-0.04, 0.08], [A.z0, A.z1])
  for (const [x, z] of [
    [A.x0 + 0.18, A.z0 + 0.18],
    [A.x1 - 0.18, A.z0 + 0.18],
    [A.x0 + 0.18, -12.6],
    [A.x1 - 0.18, -12.6],
  ])
    o.caixa('branco', [x - 0.15, x + 0.15], [0.08, 3.15], [z - 0.15, z + 0.15])
  for (const [x, z] of [
    [-2.4, -11.6],
    [2.4, -11.6],
    [-2.4, -14.4],
    [2.4, -14.4],
  ]) {
    const s = new CylinderGeometry(0.07, 0.07, 0.02, 12)
    s.translate(x, 3.14, z)
    o.add('luz', s)
  }
  // sala de estar ao ar livre
  a.tapetes.push({ pos: [-2.4, 0.09, -12.6], w: 3.6, d: 3.0, giro: 0, tipo: 'juta' })
  sofa(em(a, [-2.4, 0.08, -14.35]), 2.8, 'linho', ['tecidoSalvia', 'tecidoCreme', 'tecidoTerracota', 'tecidoCreme'])
  sofa(em(a, [-4.4, 0.08, -12.5], Math.PI / 2), 1.8, 'linho', ['tecidoCreme', 'tecidoSalvia'])
  const mesinha = em(a, [-2.4, 0.08, -12.6])
  mesinha.caixa('madeira', -0.65, 0.65, 0.3, 0.36, -0.38, 0.38)
  for (const x of [-0.55, 0.55]) for (const z of [-0.28, 0.28]) mesinha.caixa('preto', x - 0.03, x + 0.03, 0, 0.3, z - 0.03, z + 0.03)
  mesinha.flores(0, 0.45, 0, 0.14, 10)
  // mesa de jantar ao ar livre
  const mesaFora = em(a, [2.6, 0.08, -12.6])
  mesaFora.caixa('madeira', -1.1, 1.1, 0.74, 0.79, -0.5, 0.5)
  for (const x of [-0.95, 0.95]) mesaFora.caixa('madeira', x - 0.05, x + 0.05, 0, 0.74, -0.42, 0.42)
  for (const x of [-0.6, 0.6]) {
    cadeira(em(a, [2.6 + x, 0.08, -13.42], 0), 'linho')
    cadeira(em(a, [2.6 + x, 0.08, -11.78], Math.PI), 'linho')
  }
  mesaFora.flores(0, 0.9, 0, 0.16, 12)
  planta(a, 4.7, -9.9, 'palmeira', 1.1, 'vasoPreto')
  planta(a, -4.7, -9.9, 'ficus', 1.1, 'vasoPreto')
  // da porta da cozinha até a piscina
  for (let z = -9.6; z > -15.7; z -= 0.6) o.caixa('concreto', [6.0, 7.2], [-0.04, 0.035], [z - 0.22, z + 0.22])
  // passagem de pedras até a piscina

  // ---------- piscina, hidromassagem e deck de pedra ----------
  const P = PISCINA
  const D = DECK
  o.caixa('concreto', [D.x0, D.x1], [-0.04, 0.06], [D.z0, P.z0 - 0.4])
  o.caixa('concreto', [D.x0, D.x1], [-0.04, 0.06], [P.z1 + 0.4, D.z1])
  o.caixa('concreto', [D.x0, P.x0 - 0.4], [-0.04, 0.06], [P.z0 - 0.4, P.z1 + 0.4])
  o.caixa('concreto', [P.x1 + 0.4, D.x1], [-0.04, 0.06], [P.z0 - 0.4, P.z1 + 0.4])
  // borda clara
  o.caixa('branco', [P.x0 - 0.4, P.x1 + 0.4], [0, 0.1], [P.z0 - 0.4, P.z0])
  o.caixa('branco', [P.x0 - 0.4, P.x1 + 0.4], [0, 0.1], [P.z1, P.z1 + 0.4])
  o.caixa('branco', [P.x0 - 0.4, P.x0], [0, 0.1], [P.z0, P.z1])
  o.caixa('branco', [P.x1, P.x1 + 0.4], [0, 0.1], [P.z0, P.z1])
  // paredes e fundo azulejados
  o.caixa('azulPiscina', [P.x0, P.x1], [-1.45, -1.4], [P.z0, P.z1])
  o.caixa('azulPiscina', [P.x0 - 0.05, P.x0], [-1.45, 0], [P.z0, P.z1])
  o.caixa('azulPiscina', [P.x1, P.x1 + 0.05], [-1.45, 0], [P.z0, P.z1])
  o.caixa('azulPiscina', [P.x0, P.x1], [-1.45, 0], [P.z0 - 0.05, P.z0])
  o.caixa('azulPiscina', [P.x0, P.x1], [-1.45, 0], [P.z1, P.z1 + 0.05])
  // degraus na ponta
  for (let i = 0; i < 3; i++) o.caixa('branco', [P.x0, P.x0 + 1.4 - i * 0.4], [-0.35 - i * 0.35, -0.3 - i * 0.35], [P.z0, P.z1])
  // hidromassagem redonda, um pouco mais alta
  const spaBorda = new TorusGeometry(SPA.r + 0.1, 0.18, 10, 40)
  spaBorda.rotateX(Math.PI / 2)
  spaBorda.scale(1, 0.9, 1)
  spaBorda.translate(SPA.x, 0.42, SPA.z)
  o.add('branco', spaBorda)
  const spaParede = new CylinderGeometry(SPA.r + 0.28, SPA.r + 0.28, 0.44, 40, 1, true)
  spaParede.translate(SPA.x, 0.22, SPA.z)
  o.add('concreto', spaParede)
  // espreguiçadeiras e guarda-sóis
  for (const x of [-5.6, -3.4, -1.2, 1.0]) espreguicadeira(em(a, [x, 0.06, -25.6]))
  guardaSol(em(a, [-4.5, 0.06, -26.3]))
  guardaSol(em(a, [-0.1, 0.06, -26.3]))
  planta(a, -9.4, -16.4, 'palmeira', 1.3, 'vaso')
  planta(a, 9.6, -26.2, 'oliveira', 1.2, 'vaso')
  planta(a, -9.4, -26.2, 'arbusto', 1.3, 'vaso')

  // ---------- cozinha externa (pergolado, mesa comprida e churrasqueira) ----------
  const G = GOURMET
  o.caixa('concreto', [G.x0, G.x1], [-0.04, 0.05], [G.z0, G.z1])
  for (const [x, z] of [
    [G.x0 + 0.2, G.z0 + 0.2],
    [G.x1 - 0.2, G.z0 + 0.2],
    [G.x0 + 0.2, G.z1 - 0.2],
    [G.x1 - 0.2, G.z1 - 0.2],
  ])
    o.caixa('madeira', [x - 0.1, x + 0.1], [0, 2.9], [z - 0.1, z + 0.1])
  for (const z of [G.z0 + 0.2, G.z1 - 0.2]) o.caixa('madeira', [G.x0, G.x1], [2.75, 3.0], [z - 0.08, z + 0.08])
  for (let x = G.x0 + 0.1; x < G.x1; x += 0.4) o.caixa('madeira', [x - 0.04, x + 0.04], [3.0, 3.18], [G.z0 - 0.2, G.z1 + 0.2])
  const cx = (G.x0 + G.x1) / 2 - 0.8
  const cz = (G.z0 + G.z1) / 2
  const mesa = em(a, [cx, 0.05, cz])
  mesa.caixa('madeira', -1.5, 1.5, 0.74, 0.79, -0.5, 0.5)
  for (const x of [-1.35, 1.35]) mesa.caixa('madeira', x - 0.05, x + 0.05, 0, 0.74, -0.42, 0.42)
  for (const x of [-1.1, -0.35, 0.35, 1.1]) {
    cadeira(em(a, [cx + x, 0.05, cz - 0.82], 0), 'linho')
    cadeira(em(a, [cx + x, 0.05, cz + 0.82], Math.PI), 'linho')
  }
  for (const x of [-0.8, 0, 0.8]) mesa.flores(x, 0.9, 0, 0.16, 10)
  o.caixa('tijolo', [G.x1 - 0.9, G.x1 - 0.1], [0, 0.95], [G.z0 + 0.6, G.z0 + 2.8])
  o.caixa('marmore', [G.x1 - 0.95, G.x1 - 0.05], [0.95, 1.0], [G.z0 + 0.55, G.z1 - 0.8])
  o.caixa('madeira', [G.x1 - 0.9, G.x1 - 0.1], [0, 0.95], [G.z0 + 2.8, G.z1 - 0.85])
  o.caixa('tijolo', [G.x1 - 0.8, G.x1 - 0.1], [1.0, 2.0], [G.z0 + 0.7, G.z0 + 2.7])
  o.caixa('preto', [G.x1 - 0.85, G.x1 - 0.75], [1.1, 1.6], [G.z0 + 1.0, G.z0 + 2.4])
  o.caixa('tijolo', [G.x1 - 0.65, G.x1 - 0.15], [2.0, 3.5], [G.z0 + 1.2, G.z0 + 2.2])
  for (let x = G.x0 + 0.5; x < G.x1 - 0.3; x += 0.55)
    for (const z of [G.z0 + 1.6, (G.z0 + G.z1) / 2, G.z1 - 1.6]) {
      const q = em(a, [x, 2.6 + Math.sin(x * 2) * 0.05, z])
      q.cil('preto', 0, 0.08, 0.4, 0, 0.004, 0.004, 4)
      q.esfera('luz', 0, 0.04, 0, 0.045)
    }

  // ---------- fogueira com cadeiras Adirondack e luzinhas ----------
  const F = FOGUEIRA
  const piso = new CylinderGeometry(F.r, F.r, 0.08, 40)
  piso.translate(F.x, 0.0, F.z)
  o.add('concreto', piso)
  const aro = new CylinderGeometry(0.85, 0.95, 0.45, 20, 1, true)
  aro.translate(F.x, 0.26, F.z)
  o.add('pedra', aro)
  const topoAro = new TorusGeometry(0.85, 0.12, 8, 24)
  topoAro.rotateX(Math.PI / 2)
  topoAro.translate(F.x, 0.48, F.z)
  o.add('pedra', topoAro)
  for (let i = 0; i < 5; i++) {
    const lenha = new CylinderGeometry(0.06, 0.06, 0.8, 8)
    lenha.rotateZ(Math.PI / 2)
    lenha.rotateY((i / 5) * Math.PI)
    lenha.translate(F.x, 0.32 + (i % 2) * 0.06, F.z)
    o.add('madeiraEscura', lenha)
  }
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.3
    adirondack(em(a, [F.x + Math.sin(ang) * 2.5, 0.04, F.z + Math.cos(ang) * 2.5], ang + Math.PI))
  }
  // chamas (o material "fogo" brilha e tremula)
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2
    const c = new CylinderGeometry(0, 0.16 - (i % 3) * 0.03, 0.55 + (i % 3) * 0.2, 6)
    c.translate(F.x + Math.cos(ang) * 0.22, 0.6 + (i % 3) * 0.08, F.z + Math.sin(ang) * 0.22)
    o.add('fogo', c)
  }
  const nucleo = new CylinderGeometry(0.05, 0.3, 0.9, 8)
  nucleo.translate(F.x, 0.75, F.z)
  o.add('fogo', nucleo)
  // postes com varal de lâmpadas cruzando por cima
  const postes: [number, number][] = [0.8, 2.4, 3.9, 5.5].map((ang) => [F.x + Math.cos(ang) * 4.6, F.z + Math.sin(ang) * 4.6])
  for (const [x, z] of postes) o.caixa('madeira', [x - 0.07, x + 0.07], [0, 3.4], [z - 0.07, z + 0.07])
  for (let k = 0; k < 4; k++) {
    const [x0, z0] = postes[k]
    const [x1, z1] = postes[(k + 2) % 4]
    if (k > 1) continue
    for (let i = 0; i <= 22; i++) {
      const t = i / 22
      const x = x0 + (x1 - x0) * t
      const z = z0 + (z1 - z0) * t
      const y = 3.3 - 0.8 * 4 * t * (1 - t)
      em(a, [x, y, z]).esfera('luz', 0, -0.06, 0, 0.05)
    }
  }

  // ---------- cama elástica ----------
  const T = CAMA_ELASTICA
  const lona = new CylinderGeometry(T.r - 0.15, T.r - 0.15, 0.02, 40)
  lona.translate(T.x, 0.85, T.z)
  o.add('preto', lona)
  const protecao = new TorusGeometry(T.r, 0.13, 8, 40)
  protecao.rotateX(Math.PI / 2)
  protecao.translate(T.x, 0.86, T.z)
  o.add('brinquedoC', protecao)
  const tela = new CylinderGeometry(T.r, T.r, 1.6, 40, 1, true)
  tela.translate(T.x, 1.7, T.z)
  o.add('rede', tela)
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2
    const x = T.x + Math.cos(ang) * T.r
    const z = T.z + Math.sin(ang) * T.r
    o.caixa('metal', [x - 0.03, x + 0.03], [0, 2.5], [z - 0.03, z + 0.03])
  }

  // ---------- playground e casa na árvore ----------
  // balanço (estrutura em A)
  const sx = -12.2
  const sz = -41.8
  const topo = 2.5
  for (const x of [sx - 1.8, sx + 1.8]) {
    for (const dz of [-0.8, 0.8]) {
      const b = new BoxGeometry(0.1, Math.hypot(0.8, topo) + 0.1, 0.1)
      b.rotateX(-Math.sign(dz) * Math.atan2(0.8, topo))
      b.translate(x, topo / 2, sz + dz / 2)
      o.add('madeira', b)
    }
  }
  o.caixa('madeira', [sx - 1.9, sx + 1.9], [topo - 0.05, topo + 0.12], [sz - 0.1, sz + 0.1])
  for (const x of [sx - 0.8, sx + 0.8]) {
    for (const dx of [-0.22, 0.22]) o.caixa('preto', [x + dx - 0.01, x + dx + 0.01], [0.5, topo], [sz - 0.01, sz + 0.01])
    o.caixa('brinquedoB', [x - 0.26, x + 0.26], [0.46, 0.51], [sz - 0.12, sz + 0.12])
  }
  // escorregador com torrezinha
  const ex = -15.3
  const ez = -35.3
  for (const dx of [-0.5, 0.5]) for (const dz of [-0.5, 0.5]) o.caixa('madeira', [ex + dx - 0.05, ex + dx + 0.05], [0, 2.4], [ez + dz - 0.05, ez + dz + 0.05])
  o.caixa('madeira', [ex - 0.55, ex + 0.55], [1.4, 1.5], [ez - 0.55, ez + 0.55])
  const telhadinho = new Shape()
  telhadinho.moveTo(-0.7, 0)
  telhadinho.lineTo(0.7, 0)
  telhadinho.lineTo(0, 0.55)
  telhadinho.closePath()
  const tt = new ExtrudeGeometry(telhadinho, { depth: 1.2, bevelEnabled: false })
  tt.translate(ex, 2.4, ez - 0.6)
  o.add('brinquedoC', tt)
  const comp = Math.hypot(2.6, 1.15)
  const rampa = new BoxGeometry(0.55, 0.04, comp)
  rampa.rotateX(-Math.atan2(1.15, 2.6))
  rampa.translate(ex, 0.25 + 1.15 / 2, ez + 0.55 + 1.3)
  rampa.rotateY(0)
  o.add('brinquedoA', rampa)
  for (let y = 0.3; y < 1.45; y += 0.28) o.caixa('madeira', [ex - 0.45, ex + 0.45], [y, y + 0.05], [ez - 0.62, ez - 0.56])
  // caixa de areia com brinquedos
  o.caixa('madeira', [-13.5, -11.5], [0, 0.22], [-38.0, -37.9])
  o.caixa('madeira', [-13.5, -11.5], [0, 0.22], [-36.1, -36.0])
  o.caixa('madeira', [-13.5, -13.4], [0, 0.22], [-38.0, -36.0])
  o.caixa('madeira', [-11.6, -11.5], [0, 0.22], [-38.0, -36.0])
  o.caixa('areia', [-13.4, -11.6], [0, 0.16], [-37.9, -36.1])
  em(a, [-12.8, 0.16, -37.2]).cone('brinquedoB', 0, 0, 0.18, 0, 0.12)
  em(a, [-12.0, 0.16, -36.6]).esfera('brinquedoC', 0, 0.1, 0, 0.1)

  // casa na árvore (plataforma em volta do tronco)
  const C = CASA_ARVORE
  const yP = 3.2
  o.caixa('madeira', [C.x - 1.5, C.x + 1.5], [yP - 0.12, yP], [C.z - 1.5, C.z + 1.5])
  for (const dx of [-1.35, 1.35]) for (const dz of [-1.35, 1.35]) o.caixa('madeira', [C.x + dx - 0.07, C.x + dx + 0.07], [0, yP], [C.z + dz - 0.07, C.z + dz + 0.07])
  o.caixa('madeira', [C.x - 1.0, C.x + 0.8], [yP, yP + 1.6], [C.z - 1.2, C.z + 0.4])
  o.caixa('preto', [C.x - 0.35, C.x + 0.25], [yP + 0.7, yP + 1.2], [C.z + 0.4, C.z + 0.42])
  o.caixa('luz', [C.x - 0.3, C.x + 0.2], [yP + 0.75, yP + 1.15], [C.z + 0.41, C.z + 0.43])
  const telhado = new Shape()
  telhado.moveTo(-1.2, 0)
  telhado.lineTo(1.2, 0)
  telhado.lineTo(0, 0.9)
  telhado.closePath()
  const tc = new ExtrudeGeometry(telhado, { depth: 2.0, bevelEnabled: false })
  tc.translate(C.x - 0.1, yP + 1.6, C.z - 1.4)
  o.add('vaso', tc)
  guardaCorpo(o, 'x', C.z + 1.45, C.x - 1.45, C.x + 1.45, yP)
  guardaCorpo(o, 'z', C.x + 1.45, C.z - 1.45, C.z + 1.45, yP)
  for (const dx of [-0.25, 0.25]) o.caixa('madeira', [C.x + 1.9 + dx - 0.04, C.x + 1.9 + dx + 0.04], [0, yP + 0.9], [C.z + 0.95, C.z + 1.05])
  for (let y = 0.3; y < yP + 0.2; y += 0.32) o.caixa('madeira', [C.x + 1.62, C.x + 2.18], [y, y + 0.05], [C.z + 0.97, C.z + 1.03])
  for (let i = 0; i < 7; i++) {
    const b = new BoxGeometry(0.22, 0.26, 0.01)
    b.translate(C.x - 1.4 + i * 0.4, yP + 1.3, C.z + 1.46)
    o.add(['brinquedoA', 'brinquedoB', 'brinquedoC'][i % 3], b)
  }

  // ---------- casinha de ferramentas ----------
  casinhaFerramentas(a)

  // ---------- rede entre duas árvores ----------
  const R = REDE
  const rede = new PlaneGeometry(R.x1 - R.x0 - 1.0, 1.0, 20, 4)
  const rp = rede.attributes.position
  for (let i = 0; i < rp.count; i++) {
    const t = (rp.getX(i) + (R.x1 - R.x0 - 1.0) / 2) / (R.x1 - R.x0 - 1.0)
    const w = rp.getY(i)
    rp.setXYZ(i, rp.getX(i), 1.25 - Math.sin(Math.PI * t) * 0.55 - w * w * 0.25, w)
  }
  rede.computeVertexNormals()
  rede.translate((R.x0 + R.x1) / 2, 0, R.z)
  o.add('tecidoTerracota', rede)
  for (const lado of [-1, 1]) {
    const corda = new BoxGeometry(0.55, 0.02, 0.02)
    corda.rotateZ(lado * -0.4)
    corda.translate(lado > 0 ? R.x1 - 0.28 : R.x0 + 0.28, 1.35, R.z)
    o.add('linho', corda)
  }
}

export function novoAndar(y: number): Andar {
  return { o: new Obra(), y, tufos: [], arranjos: [], tapetes: [], quadros: [], modelos: [] }
}
