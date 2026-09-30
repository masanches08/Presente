import { TZDate } from '@date-fns/tz'
import { CONFIG } from '../config'

/**
 * Pra testar outro dia sem esperar: abra o site com ?hoje=2026-12-24
 * (ex.: http://localhost:5173/?hoje=2026-12-24). O relógio anda normalmente a partir desse dia.
 */
function lerDeslocamento(): number {
  if (typeof window === 'undefined') return 0
  const param = new URLSearchParams(window.location.search).get('hoje')
  if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return 0
  const [a, m, d] = param.split('-').map(Number)
  const real = new TZDate(Date.now(), CONFIG.fuso)
  const simulado = new TZDate(a, m - 1, d, real.getHours(), real.getMinutes(), real.getSeconds(), CONFIG.fuso)
  return simulado.getTime() - Date.now()
}

const DESLOCAMENTO = lerDeslocamento()

/** O instante atual (respeitando a simulação ?hoje=). */
export function agora(): Date {
  return new Date(Date.now() + DESLOCAMENTO)
}

/** Que dia é hoje em São Paulo, como dia de calendário (meia-noite local). */
export function diaDeHoje(instante: Date = agora()): Date {
  const t = new TZDate(instante.getTime(), CONFIG.fuso)
  return new Date(t.getFullYear(), t.getMonth(), t.getDate())
}

/** Hora atual em São Paulo (0–23). */
export function horaAgora(): number {
  return new TZDate(agora().getTime(), CONFIG.fuso).getHours()
}

/** O instante exato em que um dia começa em São Paulo (00:00). */
export function inicioDoDia(dia: Date): number {
  return new TZDate(dia.getFullYear(), dia.getMonth(), dia.getDate(), CONFIG.fuso).getTime()
}
