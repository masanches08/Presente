// 🔒 Lua de mel: tudo bloqueado no começo.
// São 3 segredos pra ela achar pelo site, sem dica nenhuma (é a brincadeira!).
// Cada um é desbloqueado achando alguma coisa escondida no nosso mundinho.
// ✏️ Pra trocar o que cada segredo revela, edite `nome` e `frase`.

export interface Segredo {
  id: string
  /** O que aparece no card depois de desbloqueado */
  nome: string
  /** A frase que aparece quando ela abre o card */
  frase: string
  /** Onde fica escondido (só pra você lembrar, não aparece no site) */
  onde: string
}

export const SEGREDOS: Segredo[] = [
  {
    id: 'arara',
    nome: 'Nascer do sol no Monte Batur',
    frase: 'Uma trilha de madrugada até o topo de um vulcão, pra ver o sol nascer em cima das nuvens. Com café da manhã lá em cima. Juntinhos.',
    onde: 'cartinha amarrada no pezinho de uma das araras que passam voando no mundo (src/mundo/Revoada.tsx)',
  },
  { id: 'segredo2', nome: '???', frase: '', onde: 'ainda não decidido' },
  { id: 'segredo3', nome: '???', frase: '', onde: 'ainda não decidido' },
]

/**
 * Chance de cada arara que passa voando trazer a cartinha (passa uma a cada ~10–20 s).
 * ⚠️ 0.9 = 90% só pra testar. No final, algo como 0.1 (10%) deixa "de vez em quando".
 */
export const CHANCE_ARARA = 0.9

/** Quanto falta pra desbloquear */
export const TEMPO_DESBLOQUEIO = '???'
