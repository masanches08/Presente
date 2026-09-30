// 📸 As nossas fotos.
// 1. Coloque as fotos originais na pasta `fotos-originais/` (na raiz do projeto)
// 2. Rode `npm run fotos`: elas viram .webp em 3:4 (sem borda) em `public/fotos/` e aparece a lista pronta pra colar aqui
// 3. Escreva a legenda e a data de cada uma

export interface Foto {
  /** Nome do arquivo dentro de public/fotos, ex.: 'praia.webp' */
  arquivo: string
  legenda?: string
  /** 'aaaa-mm-dd' (opcional) */
  data?: string
}

// (todas em 3:4, em pé; as 6 primeiras também ficam penduradas no varal da árvore)
// pra pôr legenda ou data: { arquivo: 'foto-01.webp', legenda: 'O dia em que…', data: '2026-01-24' }
export const FOTOS: Foto[] = [
  { arquivo: 'foto-01.webp' },
  { arquivo: 'foto-02.webp' },
  { arquivo: 'foto-03.webp' },
  { arquivo: 'foto-04.webp' },
  { arquivo: 'foto-05.webp' },
  { arquivo: 'foto-06.webp' },
  { arquivo: 'foto-07.webp' },
  { arquivo: 'foto-08.webp' },
  { arquivo: 'foto-09.webp' },
  { arquivo: 'foto-10.webp' },
  { arquivo: 'foto-11.webp' },
  { arquivo: 'foto-12.webp' },
  { arquivo: 'foto-13.webp' },
  { arquivo: 'foto-14.webp' },
  { arquivo: 'foto-15.webp' },
  { arquivo: 'foto-16.webp' },
  { arquivo: 'foto-17.webp' },
  { arquivo: 'foto-18.webp' },
  { arquivo: 'foto-19.webp' },
  { arquivo: 'foto-20.webp' },
  { arquivo: 'foto-21.webp' },
  { arquivo: 'foto-22.webp' },
  { arquivo: 'foto-23.webp' },
  { arquivo: 'foto-24.webp' },
  { arquivo: 'foto-25.webp' },
]

/** Foto grande (tela cheia) */
export const urlFoto = (f: Foto) => `${import.meta.env.BASE_URL}fotos/${f.arquivo}`
/** Versão menor (galeria e varal): carrega bem mais rápido */
export const urlMini = (f: Foto) => `${import.meta.env.BASE_URL}fotos/mini/${f.arquivo}`
