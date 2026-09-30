import { Ornamento } from './Ornamento'

export function PageHeader({
  sobretitulo,
  titulo,
  subtitulo,
}: {
  sobretitulo?: string
  titulo: string
  subtitulo?: string
}) {
  return (
    <header className="px-6 pt-12 pb-8 text-center">
      {sobretitulo && <p className="sobretitulo">{sobretitulo}</p>}
      <h1 className="mt-3 font-serif text-[2.6rem] leading-none font-medium text-grafite">{titulo}</h1>
      {subtitulo && <p className="mt-3 font-serif text-lg text-grafite/60 italic">{subtitulo}</p>}
      <Ornamento className="mt-5" />
    </header>
  )
}
