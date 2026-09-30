import { motion } from 'framer-motion'
import type { RotaId } from '../lib/rotas'
import { ICONES_ROTA } from './iconesRota'
import { PageHeader } from './PageHeader'

/** Tela provisória pras seções que ainda vão ser construídas nas próximas fases. */
export function EmBreve({
  rota,
  titulo,
  subtitulo,
  texto,
}: {
  rota: RotaId
  titulo: string
  subtitulo: string
  texto: string
}) {
  const Icone = ICONES_ROTA[rota]
  return (
    <div className="px-5">
      <PageHeader sobretitulo="em construção" titulo={titulo} subtitulo={subtitulo} />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="cartao flex flex-col items-center px-8 py-14 text-center"
      >
        <motion.span
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="grid size-20 place-items-center rounded-full bg-salvia/15 text-salvia-escuro"
        >
          <Icone className="size-9" strokeWidth={1.2} />
        </motion.span>
        <p className="mt-7 font-serif text-3xl italic">Em breve</p>
        <p className="mt-3 max-w-64 text-[15px] leading-relaxed text-grafite/60">{texto}</p>
      </motion.div>
    </div>
  )
}
