import { altura } from './terreno'

// As coisas altas do mundo, pra os pássaros que passam (Revoada.tsx) não atravessarem nada.
// Cada uma vira um "cilindro" invisível: [x, z, raio, altura a partir do chão].

/** Árvores perto da casa: [x, z, altura, semente] (desenhadas em Cena.tsx) */
export const ARVORES: [number, number, number, number][] = [
  [-15, -9, 9.5, 1],
  [11, -11, 8, 2],
  [-5, -16.5, 10.5, 3],
  [13, 12.5, 7, 5],
  [-19.5, 15.5, 7.5, 6], // (afastada: não fica na frente do varal das fotos)
  [-21, 2, 8.5, 7],
  [5.5, -20, 9, 8],
  [-24, -12, 10, 9],
]

/** Coqueiros da praia do casamento: [x, z, altura, giro] (desenhados em objetos/Casamento.tsx) */
export const COQUEIROS: [number, number, number, number][] = [
  [21.5, -14, 7.5, 0.3],
  [20.6, -9.0, 6.8, -0.4],
  [20.2, 10.4, 7.8, 0.6],
  [22.2, 21, 7, -0.2],
  [40.2, -6.8, 8.2, 2.9],
  [40.6, 6.9, 7.2, 3.4],
  [39.4, 21.2, 7.6, 2.6],
  [40.8, -15, 6.9, 3.1],
]

interface Obstaculo {
  x: number
  z: number
  raio: number
  /** altura do topo no mundo */
  topo: number
}

const cilindro = (x: number, z: number, raio: number, alto: number): Obstaculo => ({ x, z, raio, topo: altura(x, z) + alto })

export const OBSTACULOS: Obstaculo[] = [
  cilindro(0, -3.2, 8, 11), // a casa (com telhado e chaminé)
  cilindro(-12, 3, 5, 9.5), // árvore das fotos
  cilindro(30, 0, 13, 5.5), // casamento (postes das luzinhas, altar, mesas)
  cilindro(31, -27, 11, 4.5), // quadra de futevôlei + tenda
  cilindro(44, 7.5, 4, 4), // barquinho e guarda-sol da lua de mel
  ...ARVORES.map(([x, z, alt]) => cilindro(x, z, alt * 0.5, alt + 1)),
  ...COQUEIROS.map(([x, z, alt]) => cilindro(x, z, 4, alt + 1)),
]

/** Folga (m) acima do chão e dos obstáculos: o pássaro balança e a cartinha fica pendurada embaixo dele */
const FOLGA = 2.2

/** Esse ponto bate em alguma coisa (chão, morro, casa, árvore…)? */
export function bate(x: number, y: number, z: number) {
  if (y < altura(x, z) + FOLGA + 1) return true
  for (const o of OBSTACULOS) {
    if (y < o.topo + FOLGA && Math.hypot(x - o.x, z - o.z) < o.raio + 1) return true
  }
  return false
}
