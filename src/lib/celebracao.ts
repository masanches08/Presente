import { CONFIG } from '../config'
import type { ResultadoContador } from './contador'

// Os dias especiais que ganham um "momento" quando ela abre o site.
// Pra ver como fica sem esperar o dia: abra o site com ?hoje=2026-10-29 (aniversário) ou ?hoje=2026-10-24 (dia 24).

export type Celebracao = { tipo: 'aniversario' } | { tipo: 'mesversario'; meses: number } | null

export function celebracaoDoDia(hoje: Date, contador: ResultadoContador): Celebracao {
  const { dia, mes } = CONFIG.aniversarioDela
  if (hoje.getDate() === dia && hoje.getMonth() + 1 === mes) return { tipo: 'aniversario' }
  if (contador.tipo === 'aniversario') return { tipo: 'mesversario', meses: contador.meses }
  return null
}
