// 🎀 O que dá pra usar ao escrever uma cartinha: papéis, selos, adesivos e fitinhas.
// ✏️ Pode trocar/adicionar adesivos à vontade (qualquer emoji serve).

/** Papéis de carta (o fundo da folha) */
export const PAPEIS = {
  creme: {
    nome: 'creme',
    fundo:
      'repeating-linear-gradient(to bottom, transparent 0 40px, rgb(154 107 60 / 0.09) 40px 41px), radial-gradient(120% 80% at 30% 0%, #FFFDF8, #F8F0E1 70%, #F1E5CF)',
    tinta: '#2E2A26',
  },
  rosa: {
    nome: 'rosinha',
    fundo: 'radial-gradient(circle, rgb(200 100 59 / 0.12) 1.6px, transparent 2px) 0 0 / 26px 26px, linear-gradient(170deg, #FFF6F2, #F9E3DA)',
    tinta: '#4A2E28',
  },
  salvia: {
    nome: 'sálvia',
    fundo:
      'linear-gradient(rgb(111 131 96 / 0.1) 1px, transparent 1px) 0 0 / 28px 28px, linear-gradient(90deg, rgb(111 131 96 / 0.1) 1px, transparent 1px) 0 0 / 28px 28px, linear-gradient(170deg, #F8FAF3, #E8EEDF)',
    tinta: '#2C3527',
  },
  kraft: {
    nome: 'kraft',
    fundo: 'radial-gradient(140% 90% at 20% 0%, #E9D5B5, #D9BE96 75%, #CFB088)',
    tinta: '#3A2A1C',
  },
} as const
export type PapelId = keyof typeof PAPEIS

export const SELOS = ['terracota', 'dourado', 'salvia'] as const
export type SeloId = (typeof SELOS)[number]

/** Adesivos (emoji com bordinha branca de adesivo recortado) */
export const ADESIVOS: { grupo: string; itens: string[] }[] = [
  { grupo: 'amor', itens: ['❤️', '💕', '💖', '💌', '💋', '🥰', '😘', '🫶', '🤍', '💍', '🌹', '💐'] },
  { grupo: 'flores e céu', itens: ['🌷', '🌻', '🌸', '🌼', '🦋', '🌿', '☀️', '🌙', '⭐', '✨', '☁️', '🌊'] },
  { grupo: 'nós', itens: ['🏖️', '🐚', '🌴', '🏐', '🏡', '☕', '🍓', '🍰', '🎀', '📸', '🩺', '🧸'] },
]

/** Fitinhas de papel (washi tape) pra "prender" fotos e cantinhos */
export const FITAS = {
  listras: 'repeating-linear-gradient(45deg, #E8B4A0 0 8px, #F6DCCF 8px 16px)',
  bolinhas: 'radial-gradient(circle, #FFFFFF 2.4px, transparent 3px) 0 0 / 14px 14px, #C9A86A',
  xadrez:
    'repeating-linear-gradient(0deg, rgb(255 255 255 / 0.45) 0 6px, transparent 6px 12px), repeating-linear-gradient(90deg, rgb(255 255 255 / 0.45) 0 6px, transparent 6px 12px), #9CAF88',
  coracoes: 'radial-gradient(circle at 30% 40%, #C8643B 2px, transparent 2.5px) 0 0 / 16px 16px, #F3E3D3',
} as const
export type FitaId = keyof typeof FITAS

/** Um enfeite colado na folha. Posições em "pontos" da folha (ela tem sempre 600 de largura). */
export interface Enfeite {
  id: string
  tipo: 'adesivo' | 'fita' | 'foto'
  /** emoji, id da fitinha, ou a foto (caminho na nuvem; no rascunho, a própria imagem) */
  valor: string
  x: number
  y: number
  giro: number
  escala: number
  /** largura/altura (fotos) */
  proporcao?: number
}

export const LARGURA_FOLHA = 600
