// As seções do app, na ordem da barra de navegação.
export const ROTAS = [
  { id: 'inicio', nome: 'Início', titulo: 'Início' },
  { id: 'lar', nome: 'Lar', titulo: 'Nosso Lar' },
  { id: 'casamento', nome: 'Casamento', titulo: 'Nosso Casamento' },
  { id: 'cartas', nome: 'Cartas', titulo: 'Cartinhas' },
  { id: 'fotos', nome: 'Fotos', titulo: 'Nossas Fotos' },
  { id: 'dias', nome: 'Dias', titulo: 'Nossos Dias' },
  { id: 'luademel', nome: 'Lua de mel', titulo: 'Lua de mel' },
] as const

export type RotaId = (typeof ROTAS)[number]['id']
