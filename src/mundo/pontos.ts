import type { RotaId } from '../lib/rotas'
import { altura } from './terreno'
import type { Vec3 } from './util'

/** Tudo que dá pra tocar no mundo: as seções (rotas) e a quadra, que é só pra olhar */
export type PontoId = Exclude<RotaId, 'inicio'> | 'futevolei'

export interface Ponto {
  id: PontoId
  sobretitulo: string
  titulo: string
  /** Frase que aparece quando ela toca no objeto (pode editar!) */
  frase: string
  /** Se a seção já pode ser aberta */
  disponivel: boolean
  /** Só pra olhar: a câmera vai até lá e mostra a frase, sem botão de entrar */
  soOlhar?: boolean
  /** Onde fica a etiqueta flutuante */
  marcador: Vec3
  /** Pra onde a câmera olha */
  alvo: Vec3
  /** De que lado a câmera chega (direção a partir do alvo) */
  direcao: Vec3
  /** Distância da câmera até o alvo (em tela deitada; no celular em pé fica um pouco mais longe) */
  distancia: number
}

// (a ordem das setinhas ‹ › na legenda fica em ORDEM, lá embaixo)
// Alturas (y) de marcador e alvo são medidas a partir do chão.
export const PONTOS: Ponto[] = [
  {
    id: 'lar',
    sobretitulo: 'o nosso futuro',
    titulo: 'Nosso Lar',
    frase: 'A casa onde a nossa família vai crescer.',
    disponivel: true,
    marcador: [0, 11.8, -3],
    alvo: [0, 3.6, -1],
    direcao: [0.18, 0.28, 1],
    distancia: 21,
  },
  {
    id: 'casamento',
    sobretitulo: 'um dia, aqui',
    titulo: 'Nosso Casamento',
    frase: 'Pé na areia, luzinhas acesas e o pôr do sol de testemunha.',
    disponivel: true,
    marcador: [34, 6.5, 2],
    alvo: [33, 1.5, 1.5],
    direcao: [-1, 0.4, 0.14],
    distancia: 15,
  },
  {
    id: 'cartas',
    sobretitulo: 'chegou correspondência',
    titulo: 'Cartinhas',
    frase: 'Palavras guardadas só pra você.',
    disponivel: true,
    marcador: [1.6, 2.4, 18],
    alvo: [1.6, 1.0, 18],
    direcao: [0.25, 0.35, 1],
    distancia: 3.8,
  },
  {
    id: 'fotos',
    sobretitulo: 'penduradas no varal',
    titulo: 'Nossas Fotos',
    frase: 'Os nossos momentos, secando ao sol.',
    disponivel: true,
    marcador: [-10.1, 2.9, 4.8], // logo acima do varal das fotos
    alvo: [-10.1, 2.0, 4.8],
    direcao: [-0.35, 0.26, 1],
    distancia: 8.5,
  },
  {
    id: 'dias',
    sobretitulo: 'o nosso tempo',
    titulo: 'Nossos Dias',
    frase: 'Cada dia 24, e todas as datas que ainda vamos viver.',
    disponivel: true,
    marcador: [8.5, 2.4, 11],
    alvo: [8.5, 1.0, 11],
    direcao: [0.3, 0.85, 1],
    distancia: 4,
  },
]

PONTOS.push({
  id: 'luademel',
  sobretitulo: 'um segredo',
  titulo: 'Lua de mel',
  frase: 'Tudo trancado, por enquanto.',
  disponivel: true,
  marcador: [43.2, 4.4, 9.5],
  alvo: [43.2, 1.0, 8.6],
  direcao: [0.15, 0.3, 1],
  distancia: 10.5,
})

// a quadra de futevôlei na areia, do lado do casamento (só pra olhar)
PONTOS.push({
  id: 'futevolei',
  sobretitulo: 'onde tudo começou',
  titulo: 'Nosso Futevôlei',
  frase: 'O esporte que juntou a gente pela primeira vez. E alguém aqui é craque.',
  disponivel: true,
  soOlhar: true,
  marcador: [31, 3.6, -25],
  alvo: [31, 0.9, -25],
  direcao: [-0.8, 0.36, 0.6],
  distancia: 12.5,
})

// A ordem do passeio pelas setinhas ‹ › (depois das fotos, volta pra casa)
const ORDEM: PontoId[] = ['lar', 'futevolei', 'casamento', 'luademel', 'dias', 'cartas', 'fotos']
PONTOS.sort((a, b) => ORDEM.indexOf(a.id) - ORDEM.indexOf(b.id))

export const pontoPorId = (id: PontoId) => PONTOS.find((p) => p.id === id)!

/** Converte um ponto com altura "a partir do chão" em posição no mundo */
export const noChao = ([x, y, z]: Vec3): Vec3 => [x, y + altura(x, z), z]
