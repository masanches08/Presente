import { motion } from 'framer-motion'
import type { DataImportante } from '../data/datas'
import { distancia, formatarData, lerData } from '../lib/datas'

/** Uma linha da lista de datas. Tocar abre a edição. */
export function ItemData({ data, hoje, onClick }: { data: DataImportante; hoje: Date; onClick: () => void }) {
  const dia = lerData(data.data)
  const rel = distancia(dia, hoje)
  const futura = dia >= hoje

  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button
        onClick={onClick}
        className="flex w-full items-center gap-4 rounded-3xl px-3 py-3 text-left transition-colors active:bg-grafite/5"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-papel text-2xl shadow-suave ring-1 ring-dourado/15">
          {data.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-xl leading-tight font-medium">{data.titulo}</span>
          <span className="block text-[13px] text-grafite/50">{formatarData(dia)}</span>
          {data.descricao && (
            <span className="mt-0.5 block truncate text-[13px] text-grafite/60 italic">{data.descricao}</span>
          )}
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${
            futura ? 'bg-salvia/15 text-salvia-escuro' : 'bg-grafite/5 text-grafite/50'
          }`}
        >
          {rel}
        </span>
      </button>
    </motion.li>
  )
}
