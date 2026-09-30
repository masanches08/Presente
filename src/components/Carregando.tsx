import { motion } from 'framer-motion'
import { CoracaoCheio } from './Icons'

/** Tela de carregamento enquanto o mundinho 3D é montado. */
export function Carregando({ texto = 'construindo o nosso mundinho…' }: { texto?: string }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.1, ease: 'easeInOut' }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-creme"
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        className="text-terracota"
      >
        <CoracaoCheio className="size-9" />
      </motion.div>
      <p className="mt-6 font-serif text-xl text-grafite/60 italic">{texto}</p>
    </motion.div>
  )
}
