import type { ParadaId } from '../data/tour'

type V3 = [number, number, number]

export interface Camera {
  pos: V3
  alvo: V3
  /** Paradas do mesmo grupo: a câmera desliza. Grupos diferentes: um "piscar" suave (pra não atravessar paredes) */
  grupo: string
  onde: 'lá fora' | 'térreo' | '2º andar'
  /** Luminárias acesas nesse cômodo (no máximo 2) */
  luzes?: V3[]
  /** Depois de chegar, a câmera vira devagar (na mesma parada) pra essa segunda vista */
  depois?: { pos: V3; alvo: V3; espera: number }
}

// Onde a câmera fica (pos), pra onde ela olha (alvo) e quais luzes acendem em cada parada do tour
export const CAMERAS: Record<ParadaId, Camera> = {
  calcada: { pos: [0, 2.5, 14.5], alvo: [0, 0, 11.4], grupo: 'frente', onde: 'lá fora' },
  fachada: { pos: [1.2, 2.6, 33], alvo: [0, 4.6, 1], grupo: 'frente', onde: 'lá fora' },
  hall: { pos: [1.4, 1.65, 6.4], alvo: [-1.6, 2.1, -3.5], grupo: 'social', onde: 'térreo', luzes: [[0.6, 4.3, 0.9], [2.6, 2.6, 5.4]] },
  sala: { pos: [-1.2, 2.0, -4.4], alvo: [1.8, 1.5, 3.8], grupo: 'social', onde: 'térreo', luzes: [[0.6, 4.3, 0.9], [-1.55, 1.4, 2.45]] },
  cozinha: { pos: [4.9, 1.8, -1.6], alvo: [7.4, 1.0, -6.8], grupo: 'social', onde: 'térreo', luzes: [[6.25, 2.0, -4.9], [8.3, 2.4, -2.4]] },
  piscina: { pos: [6.5, 1.7, -5.6], alvo: [5.2, 0.3, -22], grupo: 'social', onde: 'térreo', luzes: [[6.25, 2.0, -4.9]] },
  quintal: { pos: [12, 5.4, -15.8], alvo: [-6, 0.4, -34], grupo: 'quintal', onde: 'lá fora' },
  gourmet: { pos: [9.8, 2.5, -29.5], alvo: [16.2, 1.0, -21], grupo: 'gourmet', onde: 'lá fora' },
  playground: { pos: [-5.8, 3.0, -29.5], alvo: [-15.5, 1.6, -40], grupo: 'lado', onde: 'lá fora' },
  jogos: { pos: [-4.6, 1.9, -8.4], alvo: [-7.6, 0.8, 1.6], grupo: 'jogos', onde: 'térreo', luzes: [[-6.5, 1.9, -5.2], [-7.3, 1.6, 0.8]] },
  mezanino: { pos: [3.3, 5.2, -4.4], alvo: [-0.8, 3.0, 5.5], grupo: 'social', onde: '2º andar', luzes: [[0.6, 4.3, 0.9], [3.55, 4.9, -4.6]] },
  menino1: { pos: [-5.6, 5.0, -6.4], alvo: [-8.3, 3.9, -1.8], grupo: 'q1', onde: '2º andar', luzes: [[-7.1, 5.5, -3.9]] },
  menino2: { pos: [-5.65, 5.0, 5.4], alvo: [-8.2, 3.9, 0.4], grupo: 'q2', onde: '2º andar', luzes: [[-7.1, 5.5, 1.9]] },
  menina: { pos: [5.6, 5.0, -6.3], alvo: [8.3, 3.9, -1.9], grupo: 'q3', onde: '2º andar', luzes: [[7.0, 5.5, -3.9]] },
  // a vista de sempre da suíte; depois de uns segundos a câmera vira devagar pra TV na frente da cama
  suite: {
    pos: [4.15, 5.55, -15.55],
    alvo: [-1.3, 3.8, -10.2],
    depois: { pos: [2.9, 5.45, -9.6], alvo: [0.5, 4.4, -15.3], espera: 2.5 },
    grupo: 'q4',
    onde: '2º andar',
    luzes: [[0.5, 5.9, -11.2], [-4.4, 4.0, -12.4]],
  },
}

/** Vista de cima pra "visão livre" (o lote inteiro) */
export const VISTA_LIVRE = { pos: [-16, 44, 24] as V3, alvo: [0, 0, -15] as V3 }
