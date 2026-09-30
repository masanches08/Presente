import { addMonths, differenceInCalendarDays } from 'date-fns'
import { CONFIG } from '../config'

// Todas as datas aqui são "dias de calendário": um Date à meia-noite local.
export function criarDia(ano: number, mes: number, dia: number): Date {
  return new Date(ano, mes - 1, dia)
}

const { ano, mes, dia } = CONFIG.dataInicio
export const DATA_INICIO = criarDia(ano, mes, dia)

/** "1 dia" / "2 dias", "1 mês" / "2 meses" */
export function plural(n: number, singular: string, pluralForma: string): string {
  return `${n} ${n === 1 ? singular : pluralForma}`
}

/** 11 → "11 meses", 12 → "1 ano", 14 → "1 ano e 2 meses", 0 → "" */
export function formatarMeses(totalMeses: number): string {
  const anos = Math.floor(totalMeses / 12)
  const meses = totalMeses % 12
  const parteAnos = anos > 0 ? plural(anos, 'ano', 'anos') : ''
  const parteMeses = meses > 0 ? plural(meses, 'mês', 'meses') : ''
  if (parteAnos && parteMeses) return `${parteAnos} e ${parteMeses}`
  return parteAnos || parteMeses
}

export type TipoContador = 'antes' | 'inicio' | 'aniversario' | 'mais' | 'menos'

export interface ResultadoContador {
  tipo: TipoContador
  /** Frase completa, ex.: "8 meses + 4 dias" */
  texto: string
  /** Parte grande, ex.: "8 meses" */
  principal: string
  /** Parte menor, ex.: "+ 4 dias" (vazio no nosso dia) */
  complemento: string
  /** Meses completos juntos */
  meses: number
  /** Total de dias desde o pedido */
  totalDias: number
  /** Dias até o próximo dia 24 */
  diasAteProximo: number
  /** Data do próximo dia 24 */
  proximo: Date
}

/**
 * A nossa brincadeira: "X meses + N dias" ou "(X+1) meses − N dias",
 * sempre pelo lado mais perto do dia 24.
 */
export function calcularContador(hoje: Date, inicio: Date = DATA_INICIO): ResultadoContador {
  const totalDias = differenceInCalendarDays(hoje, inicio)

  // Antes do pedido (só por segurança, não deve acontecer)
  if (totalDias < 0) {
    const faltam = plural(-totalDias, 'dia', 'dias')
    return {
      tipo: 'antes',
      texto: `Faltam ${faltam}`,
      principal: 'Faltam',
      complemento: faltam,
      meses: 0,
      totalDias: 0,
      diasAteProximo: -totalDias,
      proximo: inicio,
    }
  }

  // 1. m = meses completos desde o pedido
  let m = (hoje.getFullYear() - inicio.getFullYear()) * 12 + (hoje.getMonth() - inicio.getMonth())
  while (m > 0 && addMonths(inicio, m) > hoje) m--
  while (addMonths(inicio, m + 1) <= hoje) m++

  // 2 e 3. o dia 24 anterior e o próximo, e a distância até cada um
  const anterior = addMonths(inicio, m)
  const proximo = addMonths(inicio, m + 1)
  const dA = differenceInCalendarDays(hoje, anterior)
  const dP = differenceInCalendarDays(proximo, hoje)

  const base = {
    meses: m,
    totalDias,
    diasAteProximo: dP,
    proximo,
  }

  // 4. É o nosso dia!
  if (dA === 0) {
    if (m === 0) {
      const texto = 'O nosso primeiro dia 💍'
      return { ...base, tipo: 'inicio', texto, principal: texto, complemento: '' }
    }
    const principal = `Feliz ${formatarMeses(m)}!`
    return { ...base, tipo: 'aniversario', texto: `${principal} 🎉`, principal, complemento: '' }
  }

  // 5. Mais perto do 24 anterior (empate também conta como "+")
  if (dA <= dP) {
    const principal = formatarMeses(m)
    const complemento = `+ ${plural(dA, 'dia', 'dias')}`
    // no primeiro mês não existe "0 meses": fica só "3 dias"
    if (!principal) {
      const texto = plural(dA, 'dia', 'dias')
      return { ...base, tipo: 'mais', texto, principal: texto, complemento: '' }
    }
    return { ...base, tipo: 'mais', texto: `${principal} ${complemento}`, principal, complemento }
  }

  // 6. Mais perto do próximo 24
  const principal = formatarMeses(m + 1)
  const complemento = `− ${plural(dP, 'dia', 'dias')}`
  return { ...base, tipo: 'menos', texto: `${principal} ${complemento}`, principal, complemento }
}
