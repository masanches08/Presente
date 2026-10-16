// 💍 O passeio pelo nosso casamento: o nome de cada parada e a frase que aparece.
// ✏️ Edite as frases à vontade! A ordem aqui é a ordem do passeio.

export const PASSEIO_CASAMENTO = [
  // a ordem conta o dia e anda pela praia sem ir e voltar: a chegada, o corredor e o altar (a cerimônia),
  // a festa na tenda, o touro logo atrás dela, depois o lounge, a capela e o píer do outro lado, e a noite
  { id: 'chegada', nome: 'Um dia, aqui', frase: 'Pé na areia, com o mar e o pôr do sol de fundo.' },
  { id: 'corredor', nome: 'O corredor', frase: 'O caminho mais bonito que eu vou esperar você atravessar.' },
  { id: 'altar', nome: 'O altar', frase: 'Onde a gente vai dizer sim.' },
  { id: 'festa', nome: 'A festa', frase: 'Todo mundo que a gente ama, numa mesa só.' },
  { id: 'pista', nome: 'A pista', frase: 'A nossa primeira dança.' },
  { id: 'noivos', nome: 'Nós dois', frase: 'Lado a lado, como sempre.' },
  { id: 'touro', nome: 'O touro mecânico', frase: 'Quem ficar mais tempo em cima escolhe a próxima música.' },
  { id: 'lounge', nome: 'Lounge e bar', frase: 'Pra conversar até a última estrela aparecer.' },
  { id: 'capela', nome: 'A capela', frase: 'Uma capelinha de vidro, de frente pro mar.' },
  { id: 'pier', nome: 'O píer', frase: 'No fim do píer, só nós dois e o pôr do sol.' },
  { id: 'pordosol', nome: 'O pôr do sol', frase: 'E o céu inteiro como testemunha.' },
  { id: 'fogos', nome: 'Quando a noite cair', frase: 'E o céu inteiro só pra nós dois.' },
] as const

export type ParadaCasamento = (typeof PASSEIO_CASAMENTO)[number]['id']
