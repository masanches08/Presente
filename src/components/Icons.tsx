import type { SVGProps } from 'react'

// Ícones de traço fino, desenhados à mão, que herdam a cor do texto.
type P = SVGProps<SVGSVGElement>

function Svg(props: P) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  )
}

export const IconeCoracao = (p: P) => (
  <Svg {...p}>
    <path d="M12 19.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 6.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" />
  </Svg>
)

export const CoracaoCheio = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M12 20.5s-8-4.9-8-10.9A4.6 4.6 0 0 1 12 6.7a4.6 4.6 0 0 1 8 2.9c0 6-8 10.9-8 10.9z" />
  </svg>
)

export const IconeCasa = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 11 12 4l8.5 7" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M10 20v-5.5h4V20" />
  </Svg>
)

export const IconeAliancas = (p: P) => (
  <Svg {...p}>
    <circle cx="9" cy="14.5" r="5" />
    <circle cx="15" cy="14.5" r="5" />
    <path d="M15 9.5 13.4 7.4l.9-1.4h1.4l.9 1.4z" />
  </Svg>
)

export const IconeCarta = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m3.8 7 8.2 6 8.2-6" />
  </Svg>
)

export const IconeFotos = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m20.5 15.5-4.5-4.5-8.5 8.5" />
  </Svg>
)

export const IconeCalendario = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
    <path d="M12 17.6s-2.4-1.4-2.4-3.1a1.2 1.2 0 0 1 2.4-.4 1.2 1.2 0 0 1 2.4.4c0 1.7-2.4 3.1-2.4 3.1z" />
  </Svg>
)

export const SetaEsquerda = (p: P) => (
  <Svg {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </Svg>
)

export const SetaDireita = (p: P) => (
  <Svg {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Svg>
)

export const IconeMais = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const IconeFechar = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)

export const IconeAviao = (p: P) => (
  <Svg {...p}>
    <path d="M10.5 13.5 4 11l1.2-1.2 7.3.8 4.3-4.3a1.8 1.8 0 0 1 2.6 2.6l-4.3 4.3.8 7.3L14.7 21l-2.5-6.5-3 3 .3 2.3-1 1-1.3-2.9-2.9-1.3 1-1 2.3.3z" />
  </Svg>
)
