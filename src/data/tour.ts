// 🏡 O tour pela nossa casa: o nome de cada parada e a frase que aparece.
// ✏️ Edite as frases à vontade! A ordem aqui é a ordem do tour.

export const TOUR = [
  { id: 'calcada', nome: 'A calçada', frase: 'Cinco pezinhos na entrada: o seu, o meu e os dos nossos três.' },
  { id: 'fachada', nome: 'O nosso lar', frase: 'Um dia, essa vai ser a nossa porta.' },
  { id: 'hall', nome: 'Hall de entrada', frase: 'Bem-vinda ao nosso lar.' },
  { id: 'sala', nome: 'A sala', frase: 'Aqui a gente vai se ver todo dia.' },
  { id: 'cozinha', nome: 'A cozinha', frase: 'Café da manhã juntos, todo dia.' },
  { id: 'piscina', nome: 'A porta pro quintal', frase: 'E lá fora, a piscina esperando os nossos domingos.' },
  { id: 'quintal', nome: 'O nosso quintal', frase: 'Domingo em família, do jeito que a gente sonha.' },
  { id: 'gourmet', nome: 'Cozinha lá fora', frase: 'Casa cheia, do jeito que a gente gosta.' },
  { id: 'playground', nome: 'Playground e casa na árvore', frase: 'Onde as crianças vão brincar.' },
  { id: 'jogos', nome: 'Sala de jogos', frase: 'Onde eu vou te deixar ganhar (às vezes).' },
  { id: 'mezanino', nome: 'Mezanino', frase: 'Daqui de cima, tudo o que a gente construiu.' },
  { id: 'menino1', nome: 'Quarto do nosso menino', frase: 'Espaço pra sonhar grande.' },
  { id: 'menino2', nome: 'Quarto do nosso outro menino', frase: 'Pra ele sonhar alto também.' },
  { id: 'menina', nome: 'Quarto da nossa menina', frase: 'O quarto da nossa menina.' },
  { id: 'suite', nome: 'A nossa suíte', frase: 'Nosso cantinho.' },
] as const

export type ParadaId = (typeof TOUR)[number]['id']
