import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { definirAmbiente, ligarSom, somLigado, type Ambiente } from '../lib/ambiente'

function IconeSom({ ligado }: { ligado: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      {ligado ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m16 9.5 5 5m0-5-5 5" />}
    </svg>
  )
}

/**
 * Som ambiente do site (mar, passarinhos…) conforme o lugar, e o botãozinho de ligar/desligar
 * (só aparece na tela inicial, discreto no canto).
 */
export function SomAmbiente({ ambiente, botaoVisivel }: { ambiente: Ambiente; botaoVisivel: boolean }) {
  const [ligado, setLigado] = useState(somLigado)
  useEffect(() => definirAmbiente(ambiente), [ambiente])
  return (
    <AnimatePresence>
      {botaoVisivel && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            ligarSom(!ligado)
            setLigado(!ligado)
          }}
          aria-label={ligado ? 'Desligar o som' : 'Ligar o som'}
          className="fixed top-4 right-4 z-30 grid size-10 place-items-center rounded-full bg-papel/70 text-grafite/70 shadow-suave ring-1 ring-dourado/25 backdrop-blur-md active:scale-[0.97]"
          style={{ marginTop: 'env(safe-area-inset-top)' }}
        >
          <IconeSom ligado={ligado} />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
