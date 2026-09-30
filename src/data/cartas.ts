// ✉️ As cartinhas. Escreva aqui do seu jeito!
// - `texto` aceita vários parágrafos (é só pular linha).
// - Enquanto o texto começar com "TODO", ela vê um aviso delicado de "carta ainda sendo escrita".

export interface Carta {
  id: string
  /** Título dentro da carta */
  titulo: string
  /** O que aparece no envelope (se vazio, usa o título) */
  envelope?: string
  /** Data (opcional), formato 'aaaa-mm-dd' */
  data?: string
  texto: string
  /** Cor do selo de cera */
  selo?: 'terracota' | 'dourado' | 'salvia'
}

// TODO: como você assina as cartas
export const ASSINATURA = 'Com todo o meu amor'

export const CARTAS: Carta[] = [
  {
    id: 'carta-1',
    titulo: 'TODO: título da primeira carta',
    envelope: 'Pra você',
    data: '2026-09-28',
    texto: `TODO: escreva aqui a primeira carta.

Pode ter quantos parágrafos quiser.`,
    selo: 'terracota',
  },
  {
    id: 'carta-2',
    titulo: 'TODO: título da segunda carta',
    envelope: 'Sobre nós',
    texto: 'TODO: escreva aqui a segunda carta.',
    selo: 'dourado',
  },
  {
    id: 'carta-3',
    titulo: 'TODO: título da terceira carta',
    envelope: 'O nosso futuro',
    texto: 'TODO: escreva aqui a terceira carta.',
    selo: 'salvia',
  },
]

/** Cartas "abra quando…" */
export const ABRA_QUANDO: Carta[] = [
  { id: 'triste', titulo: 'Pra quando você estiver triste', envelope: 'Abra quando estiver triste', texto: 'TODO: escreva aqui.', selo: 'salvia' },
  { id: 'saudade', titulo: 'Pra quando bater saudade', envelope: 'Abra quando estiver com saudade', texto: 'TODO: escreva aqui.', selo: 'terracota' },
  { id: 'dormir', titulo: 'Pra quando o sono não vier', envelope: 'Abra quando não conseguir dormir', texto: 'TODO: escreva aqui.', selo: 'dourado' },
  { id: 'sorrir', titulo: 'Pra quando você precisar sorrir', envelope: 'Abra quando precisar sorrir', texto: 'TODO: escreva aqui.', selo: 'terracota' },
  { id: 'coragem', titulo: 'Pra quando faltar coragem', envelope: 'Abra quando precisar de coragem', texto: 'TODO: escreva aqui.', selo: 'salvia' },
]
