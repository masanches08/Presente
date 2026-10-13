import { AnimatePresence, motion } from 'framer-motion'
import { IconeRecentrar } from './Icons'

interface Props {
  visivel: boolean
  onClick: () => void
  /** Sozinho no pé da tela (quando não tem cartão embaixo pra ele ficar em cima) */
  solto?: boolean
}

/**
 * "Recentralizar", como no GPS: aparece quando ela tira a câmera da vista padrão
 * e leva de volta. Fica centralizado logo acima do cartão de baixo.
 */
export function BotaoRecentrar({ visivel, onClick, solto = false }: Props) {
  const botao = (
    <AnimatePresence>
      {visivel && (
        <motion.button
          initial={{ opacity: 0, y: 10, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.94 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          onClick={onClick}
          className="pointer-events-auto mx-auto mb-3 flex w-fit items-center gap-2 rounded-full bg-papel/85 py-2.5 pr-4.5 pl-3.5 text-[13px] font-medium tracking-wide text-grafite/80 shadow-suave ring-1 ring-dourado/25 backdrop-blur-md active:scale-[0.97]"
        >
          <IconeRecentrar className="size-[18px] text-terracota" />
          recentralizar
        </motion.button>
      )}
    </AnimatePresence>
  )
  if (!solto) return botao
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
      {botao}
    </div>
  )
}
