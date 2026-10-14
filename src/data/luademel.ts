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
  {
    id: 'hotel',
    nome: 'Mandapa',
    frase: 'Um vilarejo balinês de luxo na beira do rio Ayung, entre arrozais e a selva. O único hotel de Bali com 3 Chaves Michelin. Vila com piscina só nossa e jantar dentro de um casulo de bambu, ouvindo o rio.',
    onde: 'cartinha escondida na estante do mezanino (2º andar da casa), 2ª prateleira de cima, entre o 2º e o 3º grupo de livros (src/casa/CartinhaEstante.tsx). Ela segura o selo de cera até ele quebrar (src/components/CartinhaHotel.tsx)',
  },
  { id: 'segredo3', nome: '???', frase: '', onde: 'ainda não decidido' },
]

/**
 * Quando passa a arara com a cartinha (em segundos olhando o mundo):
 * a primeira vez entre `primeira`, e depois volta a cada `intervalo`, até ela pegar.
 * Depois de pega, nunca mais aparece.
 */
export const ARARA_CARTINHA = { primeira: [15, 30] as [number, number], intervalo: [45, 75] as [number, number] }

/** Só pra testar: true = a arara da cartinha continua aparecendo mesmo depois de pega */
export const ARARA_SEMPRE = false

/** Só pra testar: true = a cartinha da estante continua lá mesmo depois de aberta */
export const ESTANTE_SEMPRE = false

/**
 * O que aparece na carta do hotel (segredo 2), quando o selo quebra.
 * (Mandapa, a Ritz-Carlton Reserve: 3 Chaves Michelin conferidas em out/2026 no Guia Michelin)
 */
export const CARTA_HOTEL = {
  chamada: 'a gente vai ficar aqui',
  nome: 'Mandapa',
  lugar: 'a Ritz-Carlton Reserve · Ubud, Bali',
  texto: 'Um vilarejo balinês na beira do rio Ayung, entre arrozais e a selva. Uma vila com piscina só nossa, um mordomo pra gente o dia inteiro e jantar à luz de velas dentro de um casulo de bambu, ouvindo o rio.',
  destaques: ['3 Chaves Michelin · o único de Bali', 'vila com piscina particular na beira da selva', 'jantar num casulo de bambu na beira do rio'],
}

/** Quanto falta pra desbloquear */
export const TEMPO_DESBLOQUEIO = '???'

/**
 * O que aparece na carta da arara (segredo 1), quando o laço desamarra.
 * (o texto é o mesmo do segredo: troque lá em cima, em SEGREDOS)
 */
export const CARTA_ARARA = {
  chamada: 'a gente vai ver isso, juntinhos',
  nome: SEGREDOS[0].nome,
  lugar: 'Kintamani · Bali',
  texto: SEGREDOS[0].frase,
  destaques: ['trilha de madrugada até o topo do vulcão', 'o sol nascendo em cima das nuvens', 'café da manhã lá em cima, só nós dois'],
}
