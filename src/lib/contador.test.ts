import { describe, expect, it } from 'vitest'
import { calcularContador, criarDia, formatarMeses } from './contador'

describe('contador do nosso tempo juntos', () => {
  // Os testes obrigatórios da tabela
  it.each([
    [criarDia(2026, 9, 28), '8 meses + 4 dias'],
    [criarDia(2026, 10, 20), '9 meses − 4 dias'],
    [criarDia(2026, 12, 23), '11 meses − 1 dia'],
    [criarDia(2026, 12, 24), 'Feliz 11 meses! 🎉'],
    [criarDia(2026, 12, 25), '11 meses + 1 dia'],
    [criarDia(2027, 1, 24), 'Feliz 1 ano! 🎉'],
  ])('%s → %s', (hoje, esperado) => {
    expect(calcularContador(hoje).texto).toBe(esperado)
  })

  it('28/09/2026 tem 247 dias juntos', () => {
    expect(calcularContador(criarDia(2026, 9, 28)).totalDias).toBe(247)
  })

  it('marca o nosso dia como aniversário', () => {
    expect(calcularContador(criarDia(2026, 12, 24)).tipo).toBe('aniversario')
    expect(calcularContador(criarDia(2026, 12, 25)).tipo).toBe('mais')
  })

  it('conta os dias até o próximo dia 24', () => {
    const r = calcularContador(criarDia(2026, 9, 28))
    expect(r.diasAteProximo).toBe(26)
    expect(r.proximo).toEqual(criarDia(2026, 10, 24))
  })

  it('usa anos a partir de 12 meses', () => {
    expect(calcularContador(criarDia(2027, 3, 27)).texto).toBe('1 ano e 2 meses + 3 dias')
    expect(calcularContador(criarDia(2027, 2, 21)).texto).toBe('1 ano e 1 mês − 3 dias')
    expect(calcularContador(criarDia(2028, 1, 24)).texto).toBe('Feliz 2 anos! 🎉')
  })

  it('primeiro mês não mostra "0 meses"', () => {
    expect(calcularContador(criarDia(2026, 1, 24)).texto).toBe('O nosso primeiro dia 💍')
    expect(calcularContador(criarDia(2026, 1, 25)).texto).toBe('1 dia')
    expect(calcularContador(criarDia(2026, 2, 20)).texto).toBe('1 mês − 4 dias')
  })

  it('formata meses e anos com plural certo', () => {
    expect(formatarMeses(1)).toBe('1 mês')
    expect(formatarMeses(2)).toBe('2 meses')
    expect(formatarMeses(12)).toBe('1 ano')
    expect(formatarMeses(13)).toBe('1 ano e 1 mês')
    expect(formatarMeses(26)).toBe('2 anos e 2 meses')
  })
})
