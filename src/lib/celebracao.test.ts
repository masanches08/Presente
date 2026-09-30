import { describe, expect, it } from 'vitest'
import { celebracaoDoDia } from './celebracao'
import { calcularContador, criarDia } from './contador'

const no = (ano: number, mes: number, dia: number) => {
  const hoje = criarDia(ano, mes, dia)
  return celebracaoDoDia(hoje, calcularContador(hoje))
}

describe('dias especiais (regra das comemorações)', () => {
  it('29/10 é o aniversário dela, todo ano', () => {
    expect(no(2026, 10, 29)).toEqual({ tipo: 'aniversario' })
    expect(no(2027, 10, 29)).toEqual({ tipo: 'aniversario' })
    expect(no(2030, 10, 29)).toEqual({ tipo: 'aniversario' })
  })

  it('todo dia 24 é mesversário, com o número de meses certo', () => {
    expect(no(2026, 10, 24)).toEqual({ tipo: 'mesversario', meses: 9 })
    expect(no(2026, 12, 24)).toEqual({ tipo: 'mesversario', meses: 11 })
    expect(no(2027, 1, 24)).toEqual({ tipo: 'mesversario', meses: 12 }) // 1 ano
    expect(no(2027, 3, 24)).toEqual({ tipo: 'mesversario', meses: 14 })
    expect(no(2028, 1, 24)).toEqual({ tipo: 'mesversario', meses: 24 }) // 2 anos
  })

  it('nos outros dias, nada aparece', () => {
    for (const [a, m, d] of [
      [2026, 9, 30],
      [2026, 10, 23],
      [2026, 10, 25],
      [2026, 10, 28],
      [2026, 10, 30],
      [2026, 11, 29],
      [2027, 2, 14],
    ])
      expect(no(a, m, d)).toBeNull()
  })

  it('o dia do pedido (24/01/2026) e antes dele não são mesversário', () => {
    expect(no(2026, 1, 24)).toBeNull() // (esse é o "nosso primeiro dia", já tem o próprio texto)
    expect(no(2025, 12, 24)).toBeNull()
  })
})
