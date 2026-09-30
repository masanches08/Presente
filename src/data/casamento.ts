// 💍 O passeio pelo nosso casamento: o nome de cada parada e a frase que aparece.
// ✏️ Edite as frases à vontade! A ordem aqui é a ordem do passeio.

export const PASSEIO_CASAMENTO = [
  { id: 'chegada', nome: 'Um dia, aqui', frase: 'Pé na areia, com o mar e o pôr do sol de fundo.' },
  { id: 'altar', nome: 'O altar', frase: 'Onde a gente vai dizer sim.' },
  { id: 'corredor', nome: 'O corredor', frase: 'O caminho mais bonito que eu vou esperar você atravessar.' },
  { id: 'festa', nome: 'A festa', frase: 'Todo mundo que a gente ama, numa mesa só.' },
  { id: 'pista', nome: 'A pista', frase: 'A nossa primeira dança.' },
  { id: 'noivos', nome: 'Nós dois', frase: 'Lado a lado, como sempre.' },
  { id: 'lounge', nome: 'Lounge e bar', frase: 'Pra conversar até a última estrela aparecer.' },
  { id: 'pordosol', nome: 'O pôr do sol', frase: 'E o céu inteiro como testemunha.' },
] as const

export type ParadaCasamento = (typeof PASSEIO_CASAMENTO)[number]['id']
