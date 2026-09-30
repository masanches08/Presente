import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DATA_INICIO } from './contador'

/** '2026-01-24' → Date (meia-noite local) */
export const lerData = (iso: string) => parseISO(iso)

/** Date → '2026-01-24' */
export const paraIso = (d: Date) => format(d, 'yyyy-MM-dd')

export const formatarData = (d: Date, padrao = "d 'de' MMMM 'de' yyyy") => format(d, padrao, { locale: ptBR })

/** "é hoje" / "amanhã" / "faltam 12 dias" / "ontem" / "há 247 dias" */
export function distancia(d: Date, hoje: Date): string {
  const n = differenceInCalendarDays(d, hoje)
  if (n === 0) return 'é hoje ✨'
  if (n === 1) return 'amanhã'
  if (n === -1) return 'ontem'
  if (n > 0) return `faltam ${n} dias`
  return `há ${-n} dias`
}

/** Todo dia 24 a partir do pedido é o nosso dia. */
export const ehNossoDia = (d: Date) => d.getDate() === DATA_INICIO.getDate() && d >= DATA_INICIO
