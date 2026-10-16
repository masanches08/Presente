// 👰 O Ateliê: tudo que dá pra escolher no vestido, e os modelos de inspiração.
// O vestido é desenhado em 3D a partir destas escolhas (src/atelie/vestido3d.ts).

export const SILHUETAS = {
  princesa: 'Princesa',
  evase: 'Evasê (A)',
  sereia: 'Sereia',
  trompete: 'Trompete',
  coluna: 'Reta / coluna',
  imperio: 'Império',
} as const
export const CINTURAS = { natural: 'Natural', basque: 'Basque (em V)', baixa: 'Baixa', alta: 'Alta' } as const
export const DECOTES = {
  coracao: 'Coração',
  reto: 'Tomara que caia',
  ombroAOmbro: 'Ombro a ombro',
  v: 'V',
  vProfundo: 'V profundo',
  quadrado: 'Quadrado',
  redondo: 'Redondo',
  canoa: 'Canoa',
  halter: 'Halter',
  assimetrico: 'Um ombro só',
  golaAlta: 'Gola alta',
} as const
export const COSTAS = { fechada: 'Fechada', redonda: 'Redonda', v: 'Em V', aberta: 'Bem aberta' } as const
export const MANGAS = {
  sem: 'Sem manga',
  alcinha: 'Alcinha fina',
  alca: 'Alça larga',
  curta: 'Curtinha',
  bufanteCurta: 'Bufante curta',
  tresQuartos: '3/4',
  longa: 'Longa',
  bufanteLonga: 'Bufante longa',
  ombroCaido: 'Ombro caído',
} as const
export const COMPRIMENTOS = { longo: 'Longo', midi: 'Midi', curto: 'Curto' } as const
export const CAUDAS = { sem: 'Sem cauda', capela: 'Capela', catedral: 'Catedral', real: 'Real' } as const
export const TECIDOS = {
  cetim: 'Cetim',
  mikado: 'Mikado',
  crepe: 'Crepe',
  seda: 'Seda',
  tule: 'Tule',
  zibeline: 'Zibeline',
} as const
export const CORES = {
  branco: { nome: 'Branco', cor: '#F7F6F2' },
  offwhite: { nome: 'Off-white', cor: '#F3EEE3' },
  perola: { nome: 'Pérola', cor: '#F1E9DA' },
  marfim: { nome: 'Marfim', cor: '#EEE2C8' },
  champanhe: { nome: 'Champanhe', cor: '#E8D5B7' },
  blush: { nome: 'Blush', cor: '#F1D9D3' },
  nude: { nome: 'Nude', cor: '#E7CDB6' },
  lavanda: { nome: 'Lavanda', cor: '#E6E0EE' },
} as const
export const RENDAS = { nenhuma: 'Sem renda', corpete: 'No corpete', mangas: 'Só nas mangas', saia: 'Na saia', total: 'Inteira' } as const
export const CINTOS = { nenhum: 'Sem cinto', fita: 'Fita de cetim', pedraria: 'Pedraria', perolas: 'Pérolas', laco: 'Laço atrás', lacoFrente: 'Laço na frente' } as const
export const CAPAS = { nenhuma: 'Sem capa', curta: 'Capa curta', longa: 'Capa longa' } as const
export const VEUS = { nenhum: 'Sem véu', curto: 'Curto', medio: 'Na cintura', longo: 'Até o chão', catedral: 'Catedral' } as const
export const CABECAS = { nada: 'Nada', tiara: 'Tiara', coroaFlores: 'Coroa de flores', perolas: 'Grampo de pérolas', laco: 'Laço' } as const
export const BUQUES = { nenhum: 'Sem buquê', redondo: 'Redondo branco', cascata: 'Cascata', campestre: 'Campestre', peonias: 'Peônias rosa', lavanda: 'Lavanda' } as const

export interface Vestido {
  silhueta: keyof typeof SILHUETAS
  cintura: keyof typeof CINTURAS
  decote: keyof typeof DECOTES
  costas: keyof typeof COSTAS
  mangas: keyof typeof MANGAS
  mangaTransparente: boolean
  comprimento: keyof typeof COMPRIMENTOS
  cauda: keyof typeof CAUDAS
  /** volume da saia (0 = mínimo, 1 = máximo) */
  volume: number
  /** pregas/drapeado da saia (0..1) */
  drapeado: number
  /** camadas de tule por cima da saia (0..3) */
  camadasTule: number
  fenda: boolean
  tecido: keyof typeof TECIDOS
  cor: keyof typeof CORES
  brilho: number
  renda: keyof typeof RENDAS
  /** a renda por cima de um forro nude (efeito "tatuagem") */
  forroNude: boolean
  perolas: number
  flores: number
  cinto: keyof typeof CINTOS
  capa: keyof typeof CAPAS
  veu: keyof typeof VEUS
  veuBordaRenda: boolean
  cabeca: keyof typeof CABECAS
  buque: keyof typeof BUQUES
}

export const PADRAO: Vestido = {
  silhueta: 'evase',
  cintura: 'natural',
  decote: 'coracao',
  costas: 'v',
  mangas: 'sem',
  mangaTransparente: false,
  comprimento: 'longo',
  cauda: 'capela',
  volume: 0.5,
  drapeado: 0.35,
  camadasTule: 0,
  fenda: false,
  tecido: 'cetim',
  cor: 'perola',
  brilho: 0,
  renda: 'nenhuma',
  forroNude: false,
  perolas: 0,
  flores: 0,
  cinto: 'nenhum',
  capa: 'nenhuma',
  veu: 'longo',
  veuBordaRenda: false,
  cabeca: 'nada',
  buque: 'redondo',
}

export interface Inspiracao {
  id: string
  nome: string
  frase: string
  v: Partial<Vestido>
}

/** Os modelos da galeria (inspirados no que está em alta nas noivas de 2025–2026) */
export const INSPIRACOES: Inspiracao[] = [
  { id: 'classica-princesa', nome: 'Princesa clássica', frase: 'Saia enorme de tule, decote coração e muito brilho.', v: { silhueta: 'princesa', decote: 'coracao', tecido: 'tule', camadasTule: 3, volume: 0.85, brilho: 0.6, cauda: 'catedral', veu: 'catedral', cabeca: 'tiara' } },
  { id: 'sereia-renda', nome: 'Sereia de renda', frase: 'Justinha até o joelho, abrindo em renda chantilly.', v: { silhueta: 'sereia', decote: 'vProfundo', renda: 'total', forroNude: true, costas: 'aberta', cauda: 'catedral', tecido: 'crepe' } },
  { id: 'minimal-crepe', nome: 'Minimalista de crepe', frase: 'Linhas limpas, decote reto, nada além do tecido.', v: { silhueta: 'coluna', decote: 'reto', tecido: 'crepe', cor: 'branco', cauda: 'capela', veu: 'longo', buque: 'cascata' } },
  { id: 'cetim-1990', nome: 'Slip dress de cetim', frase: 'Alcinha fina, cetim fluido e costas baixas.', v: { silhueta: 'coluna', decote: 'v', mangas: 'alcinha', tecido: 'seda', costas: 'aberta', cauda: 'capela', drapeado: 0.2 } },
  { id: 'basque-mikado', nome: 'Basque de mikado', frase: 'Cintura em V abaixo do natural e saia estruturada.', v: { silhueta: 'princesa', cintura: 'basque', decote: 'quadrado', tecido: 'mikado', volume: 0.7, drapeado: 0.5, cauda: 'catedral' } },
  { id: 'halter-moderno', nome: 'Halter moderno', frase: 'Ombros de fora, gola presa no pescoço e costas abertas.', v: { silhueta: 'trompete', decote: 'halter', costas: 'aberta', tecido: 'crepe', cauda: 'capela', veu: 'nenhum', cabeca: 'perolas' } },
  { id: 'ombro-a-ombro', nome: 'Ombro a ombro romântico', frase: 'Mangas caindo nos ombros e saia evasê.', v: { silhueta: 'evase', decote: 'ombroAOmbro', mangas: 'ombroCaido', tecido: 'mikado', volume: 0.6 } },
  { id: 'boho-flores', nome: 'Boho de flores 3D', frase: 'Tule leve com florzinhas aplicadas por toda parte.', v: { silhueta: 'evase', decote: 'v', mangas: 'longa', mangaTransparente: true, tecido: 'tule', camadasTule: 2, flores: 0.7, buque: 'campestre', cabeca: 'coroaFlores', veu: 'nenhum' } },
  { id: 'mangas-bufantes', nome: 'Mangas bufantes', frase: 'Volume nos ombros, cintura marcada e laço atrás.', v: { silhueta: 'evase', decote: 'quadrado', mangas: 'bufanteCurta', cinto: 'laco', tecido: 'mikado', volume: 0.65 } },
  { id: 'renda-tatuagem', nome: 'Renda tatuagem', frase: 'Manga longa transparente, renda colada na pele.', v: { silhueta: 'sereia', decote: 'v', mangas: 'longa', mangaTransparente: true, renda: 'total', forroNude: true, costas: 'v', cauda: 'catedral' } },
  { id: 'perolas-statement', nome: 'Chuva de pérolas', frase: 'Corpete bordado de pérolas e saia lisa.', v: { silhueta: 'evase', decote: 'coracao', perolas: 0.85, cinto: 'perolas', tecido: 'cetim', cor: 'perola', cabeca: 'perolas' } },
  { id: 'assimetrico', nome: 'Um ombro só', frase: 'Decote assimétrico e drapeado diagonal.', v: { silhueta: 'coluna', decote: 'assimetrico', tecido: 'crepe', drapeado: 0.6, fenda: true, veu: 'nenhum' } },
  { id: 'gola-vintage', nome: 'Gola alta vintage', frase: 'Renda até o pescoço, mangas longas e muitos botões.', v: { silhueta: 'evase', decote: 'golaAlta', mangas: 'longa', renda: 'corpete', mangaTransparente: true, cor: 'marfim', veu: 'catedral', veuBordaRenda: true } },
  { id: 'imperio-grego', nome: 'Império grego', frase: 'Cintura logo abaixo do busto e seda fluida.', v: { silhueta: 'imperio', decote: 'v', mangas: 'alca', tecido: 'seda', drapeado: 0.7, cabeca: 'coroaFlores', buque: 'lavanda' } },
  { id: 'capa-tule', nome: 'Com capa de tule', frase: 'Tomara que caia com uma capa leve até o chão.', v: { silhueta: 'coluna', decote: 'reto', capa: 'longa', tecido: 'crepe', veu: 'nenhum' } },
  { id: 'fenda-praia', nome: 'Praia com fenda', frase: 'Leve, com fenda na perna, perfeito pra areia.', v: { silhueta: 'evase', decote: 'v', mangas: 'alcinha', fenda: true, tecido: 'seda', cauda: 'sem', veu: 'curto', buque: 'campestre', volume: 0.35 } },
  { id: 'trompete-glitter', nome: 'Trompete com brilho', frase: 'Justinho no quadril e todo de brilho.', v: { silhueta: 'trompete', decote: 'coracao', brilho: 0.9, tecido: 'tule', camadasTule: 1, cauda: 'catedral', cabeca: 'tiara' } },
  { id: 'champanhe', nome: 'Champanhe', frase: 'Um tom quentinho, renda no corpete.', v: { silhueta: 'sereia', decote: 'coracao', cor: 'champanhe', renda: 'corpete', cauda: 'capela' } },
  { id: 'blush-tule', nome: 'Blush de tule', frase: 'Um rosinha bem clarinho, em camadas de tule.', v: { silhueta: 'princesa', decote: 'ombroAOmbro', mangas: 'ombroCaido', cor: 'blush', tecido: 'tule', camadasTule: 3, volume: 0.75, buque: 'peonias' } },
  { id: 'zibeline-real', nome: 'Real', frase: 'Zibeline encorpada, mangas 3/4 e cauda real.', v: { silhueta: 'princesa', decote: 'canoa', mangas: 'tresQuartos', tecido: 'zibeline', cor: 'branco', cauda: 'real', veu: 'catedral', cabeca: 'tiara', volume: 0.7 } },
  { id: 'cintura-baixa', nome: 'Cintura baixa', frase: 'A cintura dos anos 2000 de volta, com saia cheia.', v: { silhueta: 'princesa', cintura: 'baixa', decote: 'reto', tecido: 'cetim', volume: 0.6, cinto: 'fita' } },
  { id: 'civil-midi', nome: 'Midi pro civil', frase: 'Curtinho elegante pra cerimônia no civil.', v: { silhueta: 'evase', comprimento: 'midi', decote: 'quadrado', mangas: 'bufanteCurta', cauda: 'sem', veu: 'curto', cabeca: 'laco', tecido: 'mikado' } },
  { id: 'festa-curto', nome: 'Curtinho da festa', frase: 'Pra trocar e dançar a noite toda.', v: { silhueta: 'evase', comprimento: 'curto', decote: 'reto', brilho: 0.7, perolas: 0.4, cauda: 'sem', veu: 'nenhum', buque: 'nenhum', volume: 0.6 } },
  { id: 'costas-abertas', nome: 'Costas de fora', frase: 'Frente discreta e costas bem abertas.', v: { silhueta: 'sereia', decote: 'canoa', mangas: 'longa', costas: 'aberta', tecido: 'crepe', cauda: 'catedral' } },
  { id: 'laco-gigante', nome: 'Laço gigante', frase: 'Simples, com um laço enorme nas costas.', v: { silhueta: 'coluna', decote: 'reto', cinto: 'laco', tecido: 'cetim', cauda: 'catedral' } },
  { id: 'jardim-secreto', nome: 'Jardim secreto', frase: 'Flores 3D descendo pela saia de tule.', v: { silhueta: 'princesa', decote: 'v', mangas: 'alcinha', tecido: 'tule', camadasTule: 2, flores: 1, cabeca: 'coroaFlores', buque: 'peonias', cor: 'offwhite' } },
  { id: 'lavanda-sonho', nome: 'Sonho lavanda', frase: 'Um lilás quase branco, combinando com a lavanda da festa.', v: { silhueta: 'evase', decote: 'coracao', cor: 'lavanda', tecido: 'tule', camadasTule: 2, flores: 0.4, buque: 'lavanda' } },
  { id: 'reta-perolas', nome: 'Reta com pérolas', frase: 'Coluna lisa com o decote contornado de pérolas.', v: { silhueta: 'coluna', decote: 'quadrado', perolas: 0.5, cinto: 'perolas', tecido: 'cetim', cor: 'branco', mangas: 'alca' } },
  { id: 'sereia-cetim', nome: 'Sereia de cetim', frase: 'Cetim brilhante que abraça o corpo.', v: { silhueta: 'sereia', decote: 'reto', tecido: 'cetim', costas: 'v', cauda: 'catedral', veu: 'longo' } },
  { id: 'evase-renda-alencon', nome: 'Renda Alençon', frase: 'Evasê inteiro de renda com borda no véu.', v: { silhueta: 'evase', decote: 'v', mangas: 'curta', renda: 'total', cor: 'marfim', veuBordaRenda: true, veu: 'catedral', cauda: 'catedral' } },
  { id: 'princesa-mangas', nome: 'Princesa de mangas longas', frase: 'Saia cheia e mangas longas de renda.', v: { silhueta: 'princesa', decote: 'v', mangas: 'longa', mangaTransparente: true, renda: 'corpete', volume: 0.75, tecido: 'mikado', cauda: 'catedral' } },
  { id: 'pedraria', nome: 'Cinto de pedraria', frase: 'Cetim liso com um cinto bordado brilhando.', v: { silhueta: 'evase', decote: 'coracao', cinto: 'pedraria', tecido: 'cetim', volume: 0.55 } },
  { id: 'bufante-longa', nome: 'Bufante romântica', frase: 'Mangas longas com volume em cima e punho justo.', v: { silhueta: 'evase', decote: 'quadrado', mangas: 'bufanteLonga', mangaTransparente: true, tecido: 'tule', camadasTule: 1, flores: 0.3 } },
  { id: 'capa-curta-perolas', nome: 'Capinha de pérolas', frase: 'Uma capinha curta bordada por cima do vestido.', v: { silhueta: 'sereia', decote: 'reto', capa: 'curta', perolas: 0.6, tecido: 'crepe', cauda: 'capela' } },
]

/** O vestido completo de uma inspiração */
export const deInspiracao = (i: Inspiracao): Vestido => ({ ...PADRAO, ...i.v })
