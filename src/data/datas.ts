// Datas importantes. Na Fase 2 elas passam a morar no Supabase (e aparecem nos dois celulares).

export interface DataImportante {
  id: string
  titulo: string
  /** Formato 'aaaa-mm-dd', ex.: '2026-01-24' */
  data: string
  descricao?: string
  emoji: string
}

export type NovaData = Omit<DataImportante, 'id'>

export const DATAS_INICIAIS: DataImportante[] = [
  { id: 'pedido-de-namoro', titulo: 'Pedido de namoro', data: '2026-01-24', emoji: '💍' },
]

/** Emojis sugeridos no formulário */
export const EMOJIS_SUGERIDOS = ['💍', '❤️', '🌹', '🎂', '✈️', '🏖️', '🍷', '🎬', '🏠', '📸', '⭐', '🎉']
