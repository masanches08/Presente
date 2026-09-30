import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { SetaEsquerda } from './Icons'

/** Folha de papel que sobe por cima do mundo 3D, com as páginas (calendário, cartas…). */
export function Folha({ onFechar, children }: { onFechar: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40">
      <motion.div
        className="absolute inset-0 bg-grafite/25 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onFechar}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 32 }}
        className="absolute inset-x-0 bottom-0 mx-auto max-w-lg overflow-y-auto overscroll-contain rounded-t-[34px] bg-creme shadow-2xl"
        style={{ top: 'calc(env(safe-area-inset-top) + 1rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}
      >
        <div className="sticky top-0 z-10 flex items-center rounded-t-[34px] bg-creme/85 px-3 pt-3 pb-1 backdrop-blur-md">
          <button
            onClick={onFechar}
            className="flex items-center gap-1 rounded-full py-2 pr-4 pl-2 font-serif text-lg text-grafite/60 italic active:bg-grafite/5"
          >
            <SetaEsquerda className="size-5" /> voltar pro nosso mundo
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  )
}
