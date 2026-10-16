import type { Vestido } from './modelo'

// Desenhinhos de croqui (traço dourado) pros botões do Ateliê: silhueta, decote, costas e mangas.

const traco = { fill: 'rgb(255 253 249)', stroke: '#B8945A', strokeWidth: 1.3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
const corpo = { fill: 'none', stroke: '#B8945A', strokeOpacity: 0.35, strokeWidth: 1, strokeLinecap: 'round' as const }

const SILHUETA: Record<Vestido['silhueta'], string> = {
  princesa: 'M14 8 L26 8 L24 22 C34 30 38 44 38 56 L2 56 C2 44 6 30 16 22 Z',
  evase: 'M14 8 L26 8 L24 22 L33 56 L7 56 L16 22 Z',
  sereia: 'M14 8 L26 8 L24 22 C26 30 25 38 23.5 43 C26 49 32 54 37 56 L3 56 C8 54 14 49 16.5 43 C15 38 14 30 16 22 Z',
  trompete: 'M14 8 L26 8 L24 22 C26 30 25 34 24 37 C28 45 31 51 34 56 L6 56 C9 51 12 45 16 37 C15 34 14 30 16 22 Z',
  coluna: 'M14 8 L26 8 L24 22 C26 30 25.5 44 25.5 56 L14.5 56 C14.5 44 14 30 16 22 Z',
  imperio: 'M14 8 L26 8 L25.3 14 C28 30 31 46 32 56 L8 56 C9 46 12 30 14.7 14 Z',
}

export function IconeSilhueta({ id }: { id: Vestido['silhueta'] }) {
  return (
    <svg viewBox="0 0 40 60" className="h-full w-full" aria-hidden>
      <path d="M17 2 Q20 0 23 2 L23 6 M17 2 L17 6" {...corpo} />
      <path d={SILHUETA[id]} {...traco} />
      <path d={id === 'imperio' ? 'M14.7 14 L25.3 14' : 'M16 22 L24 22'} {...traco} fill="none" strokeOpacity={0.6} />
    </svg>
  )
}

// o tronco visto de frente: pescoço, ombros e os lados; o vestido é a parte pintada
const TRONCO = 'M17 0 L17 6 Q12 7 4 10 M23 0 L23 6 Q28 7 36 10 M6 12 L7 28 M34 12 L33 28'

const DECOTE: Record<Vestido['decote'], [string, number, number]> = {
  coracao: ['M6.5 16 C10 13 15 13 18 15 Q20 17 22 15 C25 13 30 13 33.5 16', 6.5, 33.5],
  reto: ['M6.5 15 L33.5 15', 6.5, 33.5],
  ombroAOmbro: ['M2 11.5 C12 13.5 28 13.5 38 11.5', 2, 38],
  v: ['M4.5 10 Q11 8.5 16 7 L20 20 L24 7 Q29 8.5 35.5 10', 4.5, 35.5],
  vProfundo: ['M4.5 10 Q11 8.5 16 7 L20 26 L24 7 Q29 8.5 35.5 10', 4.5, 35.5],
  quadrado: ['M4.5 10 Q8 9 13 8 L13 16 L27 16 L27 8 Q32 9 35.5 10', 4.5, 35.5],
  redondo: ['M4.5 10 Q11 8.5 15 7 Q20 17 25 7 Q29 8.5 35.5 10', 4.5, 35.5],
  canoa: ['M3.5 10 Q12 6 20 6.6 Q28 6 36.5 10', 3.5, 36.5],
  halter: ['M6.5 17 L15.5 6.5 L16.5 2.5 L23.5 2.5 L24.5 6.5 L33.5 17', 6.5, 33.5],
  assimetrico: ['M6.5 17 L26 7 Q31 8 35.5 10', 6.5, 35.5],
  golaAlta: ['M4.5 10 Q11 8.5 16 7 L16.4 0.8 L23.6 0.8 L24 7 Q29 8.5 35.5 10', 4.5, 35.5],
}

export function IconeDecote({ id }: { id: Vestido['decote'] }) {
  const [topo, a, b] = DECOTE[id]
  return (
    <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden>
      <path d={TRONCO} {...corpo} />
      <path d={`${topo} L${Math.min(b, 34)} 29 L${Math.max(a, 6)} 29 Z`} {...traco} />
    </svg>
  )
}

const COSTAS: Record<Vestido['costas'], string> = {
  fechada: 'M4.5 10 Q11 8.5 15 7 Q20 8.5 25 7 Q29 8.5 35.5 10',
  redonda: 'M4.5 10 Q11 8.5 14 7.5 Q20 21 26 7.5 Q29 8.5 35.5 10',
  v: 'M4.5 10 Q11 8.5 14 7.5 L20 25 L26 7.5 Q29 8.5 35.5 10',
  aberta: 'M6.5 13 Q10 26 20 26.5 Q30 26 33.5 13',
}

export function IconeCostas({ id }: { id: Vestido['costas'] }) {
  return (
    <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden>
      <path d={TRONCO} {...corpo} />
      <path d="M20 9 L20 27" {...corpo} />
      <path d={`${COSTAS[id]} L34 29 L6 29 Z`} {...traco} />
    </svg>
  )
}

/** Manga: um traço grosso ao longo do braço (do ombro ao punho), de t0 a t1 */
const BRACO = (t: number, lado: 1 | -1): [number, number] => [20 + lado * (11 - t * 5), 8 + t * 21]
const MANGA: Record<Vestido['mangas'], { t: [number, number]; largura: number; bufo?: number; caido?: boolean } | null> = {
  sem: null,
  alcinha: null,
  alca: null,
  curta: { t: [0, 0.28], largura: 5.5 },
  bufanteCurta: { t: [0, 0.3], largura: 5, bufo: 4.5 },
  tresQuartos: { t: [0, 0.72], largura: 4.5 },
  longa: { t: [0, 1], largura: 4.5 },
  bufanteLonga: { t: [0, 1], largura: 4.5, bufo: 4 },
  ombroCaido: { t: [0.14, 0.38], largura: 5, caido: true },
}

export function IconeMangas({ id }: { id: Vestido['mangas'] }) {
  const m = MANGA[id]
  const alturaTopo = id === 'ombroCaido' ? 13 : id === 'alca' || id === 'alcinha' || id === 'sem' ? 15 : 10
  return (
    <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden>
      <path d="M17 0 L17 6 Q12 7 9 8.5 M23 0 L23 6 Q28 7 31 8.5" {...corpo} />
      {([1, -1] as const).map((lado) => {
        const [x0, y0] = BRACO(0, lado)
        const [x1, y1] = BRACO(1, lado)
        return <path key={lado} d={`M${x0} ${y0} L${x1} ${y1}`} {...corpo} strokeWidth={3.6} strokeOpacity={0.18} />
      })}
      {/* o corpete */}
      <path d={`M${alturaTopo === 10 ? 9.5 : 10} ${alturaTopo} L30 ${alturaTopo} L28.5 29 L11.5 29 Z`} {...traco} />
      {(id === 'alcinha' || id === 'alca') &&
        ([1, -1] as const).map((lado) => (
          <path key={lado} d={`M${20 + lado * 6} ${alturaTopo} L${20 + lado * 7} 6.5`} {...traco} fill="none" strokeWidth={id === 'alca' ? 3 : 1.1} />
        ))}
      {m &&
        ([1, -1] as const).map((lado) => {
          const [x0, y0] = BRACO(m.t[0], lado)
          const [x1, y1] = BRACO(m.t[1], lado)
          const dy = m.caido ? 2.5 : 0
          return (
            <g key={lado}>
              <path d={`M${x0} ${y0 + dy} L${x1} ${y1 + dy}`} stroke="#B8945A" strokeWidth={m.largura + 1.3} strokeLinecap="round" />
              <path d={`M${x0} ${y0 + dy} L${x1} ${y1 + dy}`} stroke="rgb(255 253 249)" strokeWidth={m.largura - 0.6} strokeLinecap="round" />
              {m.bufo && <ellipse cx={BRACO(0.12, lado)[0]} cy={BRACO(0.12, lado)[1] + 0.5} rx={m.bufo} ry={m.bufo * 0.9} {...traco} />}
            </g>
          )
        })}
    </svg>
  )
}
