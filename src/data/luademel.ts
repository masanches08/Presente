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
 * Quando passa a arara com a cartinha (em segundos olhando o mundo):
 * a primeira vez entre `primeira`, e depois volta a cada `intervalo`, até ela pegar.
 * Depois de pega, nunca mais aparece.
 */
export const ARARA_CARTINHA = { primeira: [20, 45] as [number, number], intervalo: [75, 120] as [number, number] }

/** Só pra testar: true = a arara da cartinha continua aparecendo mesmo depois de pega */
export const ARARA_SEMPRE = false

/** Quanto falta pra desbloquear */
export const TEMPO_DESBLOQUEIO = '???'
