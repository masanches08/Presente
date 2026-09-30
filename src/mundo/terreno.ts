// O formato do chão: um campo quase plano perto da casa, colinas suaves em volta,
// morros ao longe e, pro lado do pôr do sol (+x), uma praia descendo até o mar.

export const NIVEL_MAR = -0.9

/** Caminho de pedrinhas: onde ele passa (x) pra cada z */
export const caminhoX = (_z: number) => 0 // caminho reto, como na foto da casa

// ---------- ruído (value noise) ----------
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return s - Math.floor(s)
}

function ruido(x: number, y: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy)
  const b = hash(ix + 1, iy)
  const c = hash(ix, iy + 1)
  const d = hash(ix + 1, iy + 1)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

/** Ruído em camadas (0..1): parece natural */
export function fbm(x: number, y: number, oitavas = 4) {
  let v = 0
  let amp = 0.5
  let f = 1
  for (let i = 0; i < oitavas; i++) {
    v += amp * ruido(x * f, y * f)
    f *= 2
    amp *= 0.5
  }
  return v / (1 - Math.pow(0.5, oitavas))
}

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// A praia começa em x ≈ 16 e a água em x ≈ 47 (uma faixa larga de areia pro casamento)
const INICIO_PRAIA = 16
const LARGURA_PRAIA = 31

/** Linha da costa levemente ondulada */
const xCosta = (x: number, z: number) => x + (fbm(z * 0.05 + 7, 1.3, 3) - 0.5) * 4

/** Quanto "de praia" é esse ponto: 0 = campo, 1 = beira d'água */
export function fatorCosta(x: number, z: number) {
  return Math.min(1, Math.max(0, (xCosta(x, z) - INICIO_PRAIA) / LARGURA_PRAIA))
}

/** Altura do chão em (x, z) */
export function altura(x: number, z: number) {
  const d = Math.hypot(x, z + 2)
  // colinas suaves, bem planinho perto da casa
  let h = (fbm(x * 0.03, z * 0.03) - 0.45) * 3.2 * suave(10, 26, d)
  // morros ao longe (só do lado da terra)
  h += suave(45, 110, d) * (5 + fbm(x * 0.018 + 10, z * 0.018) * 18) * (1 - suave(0, 30, x))
  // praia: desce bem devagarinho até a água e depois afunda
  const xc = xCosta(x, z)
  if (xc > INICIO_PRAIA) {
    const fim = INICIO_PRAIA + LARGURA_PRAIA
    const praia = xc < fim ? -(xc - INICIO_PRAIA) * 0.029 : -0.9 - (xc - fim) * 0.22
    h = h * (1 - suave(INICIO_PRAIA, INICIO_PRAIA + 3, xc)) + Math.max(-4, praia)
  }
  return h
}

/** Areia? (pra decidir cor do chão e onde não nasce grama) */
export const ehAreia = (x: number, z: number) => xCosta(x, z) > INICIO_PRAIA + 1

/** Gramado aparadinho em volta da casa (sem flores do campo, grama baixa) */
export const ehGramado = (x: number, z: number) => Math.abs(x) < 14 && z > -13 && z < 19

/** Lugares onde não deve nascer grama (casa, caminho, praia...) */
export function areaLivre(x: number, z: number) {
  if (ehAreia(x, z)) return false
  if (x > -6.8 && x < 6.8 && z > -8.6 && z < 3.6) return false // casa + canteiros + escada
  if (z > 3 && z < 18 && Math.abs(x) < 1.0) return false // caminho
  if (Math.hypot(x - 8.5, z - 11) < 1.9) return false // relógio de sol
  return true
}
