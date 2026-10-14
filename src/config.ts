// Configurações pessoais do site: edite aqui à vontade.

export const CONFIG = {
  /** O dia do pedido de namoro (mes: 1 = janeiro). */
  dataInicio: { ano: 2026, mes: 1, dia: 24 },

  /** O aniversário dela (mes: 10 = outubro): nesse dia, o site abre com "Feliz aniversário". */
  aniversarioDela: { dia: 29, mes: 10 },

  /**
   * Uma conta pra cada um no Supabase (ninguém digita isso: a resposta de "Nome do amor da minha vida:"
   * decide em qual conta o site entra — veja supabase/duas-contas.sql).
   */
  contas: { ele: 'ele@nossolar.app', ela: 'nos@nossolar.app' },

  /** Os nomes de vocês (aparecem nas cartinhas: "de Matheus", "pra Camila"). */
  pessoas: { ele: 'Matheus', ela: 'Camila' },

  /** Fuso usado pra saber "que dia é hoje". */
  fuso: 'America/Sao_Paulo',

  // TODO: trocar pelo jeito que você chama ela (aparece na saudação da tela inicial)
  apelidoDela: 'meu amor',

  // iniciais embaixo dos pezinhos na calçada (e na placa do casamento)
  iniciais: { pai: 'M', mae: 'C' },

  // TODO: frase pequenininha no rodapé da tela inicial (pode deixar vazio: '')
  assinatura: 'feito com amor, só pra você',
}
