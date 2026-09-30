import { AnimatePresence, motion } from 'framer-motion'
import { PONTOS, pontoPorId, type Ponto, type PontoId } from '../mundo/pontos'
import { IconeFechar, SetaDireita, SetaEsquerda } from './Icons'

interface Props {
  foco: PontoId | null
  onFocar: (id: PontoId | null) => void
  onEntrar: (ponto: Ponto) => void
}

/** Cartãozinho de vidro que aparece embaixo quando ela toca em algo do mundo. */
export function Legenda({ foco, onFocar, onEntrar }: Props) {
  const ponto = foco ? pontoPorId(foco) : null
  const i = PONTOS.findIndex((p) => p.id === foco)
  const vizinho = (delta: number) => PONTOS[(i + delta + PONTOS.length) % PONTOS.length].id

  return (
    <AnimatePresence>
      {ponto && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-30 px-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
        >
          <div className="relative mx-auto max-w-md rounded-[30px] bg-papel/80 px-6 pt-6 pb-4 text-center shadow-suave ring-1 ring-dourado/25 backdrop-blur-xl">
            <button
              onClick={() => onFocar(null)}
              className="absolute top-3 right-3 grid size-10 place-items-center rounded-full text-grafite/45 active:bg-grafite/5"
              aria-label="Voltar pro nosso mundo"
            >
              <IconeFechar className="size-5" />
            </button>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={ponto.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
              >
                <p className="sobretitulo">{ponto.sobretitulo}</p>
                <h2 className="mt-2 font-serif text-[2.1rem] leading-none font-medium">{ponto.titulo}</h2>
                <p className="mx-auto mt-2 max-w-72 font-serif text-lg leading-snug text-grafite/65 italic">{ponto.frase}</p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={() => onFocar(vizinho(-1))}
                className="grid size-12 shrink-0 place-items-center rounded-full ring-1 ring-dourado/30 active:bg-grafite/5"
                aria-label="Anterior"
              >
                <SetaEsquerda className="size-5" />
              </button>
              {ponto.disponivel ? (
                <button
                  onClick={() => onEntrar(ponto)}
                  className="h-12 flex-1 rounded-full bg-terracota font-medium tracking-wide text-creme shadow-suave transition active:scale-[0.98]"
                >
                  entrar
                </button>
              ) : (
                <span className="grid h-12 flex-1 place-items-center rounded-full bg-grafite/5 font-serif text-lg text-grafite/50 italic">
                  em breve ♡
                </span>
              )}
              <button
                onClick={() => onFocar(vizinho(1))}
                className="grid size-12 shrink-0 place-items-center rounded-full ring-1 ring-dourado/30 active:bg-grafite/5"
                aria-label="Próximo"
              >
                <SetaDireita className="size-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
