// 📸 As nossas fotos.
// 1. Coloque as fotos originais na pasta `fotos-originais/` (na raiz do projeto)
// 2. Rode `npm run fotos`: elas viram .webp leves em `public/fotos/` e aparece a lista pronta pra colar aqui
// 3. Escreva a legenda e a data de cada uma

export interface Foto {
  /** Nome do arquivo dentro de public/fotos, ex.: 'praia.webp' */
  arquivo: string
  legenda?: string
  /** 'aaaa-mm-dd' (opcional) */
  data?: string
}

// TODO: adicionar as nossas fotos
export const FOTOS: Foto[] = [
  // { arquivo: 'exemplo.webp', legenda: 'O dia em que…', data: '2026-01-24' },
]

export const urlFoto = (f: Foto) => `/fotos/${f.arquivo}`
