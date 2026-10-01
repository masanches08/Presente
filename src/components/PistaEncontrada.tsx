import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { SEGREDOS } from '../data/luademel'
import { useDesbloqueios } from '../lib/desbloqueios'

/**
 * Quando ela pega a cartinha da arara: a cartinha cai na tela balançando como papel,
 * o selo abre, sai um bilhetinho e ele desdobra com o recado. Sem fogos, delicado.
 */
export function PistaEncontrada({ onIr, onFechar }: { onIr: () => void; onFechar: () => void }) {
  const achados = useDesbloqueios().length
  // 0 = caindo · 1 = abrindo · 2 = bilhete aberto
  const [fase, setFase] = useState(0)
  useEffect(() => {
    const t1 = window.setTimeout(() => setFase(1), 1700)
    const t2 = window.setTimeout(() => setFase(2), 2700)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-[65] flex items-center justify-center overflow-hidden bg-[#1E1A16]/45 px-8 backdrop-blur-[4px]"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* a cartinha caindo, balançando de um lado pro outro como papel */}
      {fase < 2 && (
        <motion.div
          initial={{ y: '-60vh', x: -40, rotate: -25, opacity: 0 }}
          animate={{ y: [null, '-30vh', '-10vh', 0], x: [null, 30, -20, 0], rotate: [null, 18, -10, 0], opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
          className="relative h-28 w-40"
          style={{ perspective: 500 }}
        >
          {/* o bilhete saindo de dentro */}
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: fase >= 1 ? -40 : 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute inset-x-3 top-3 z-[2] h-24 rounded-sm bg-[#FFFDF7] shadow"
            style={{ backgroundImage: 'repeating-linear-gradient(#FFFDF7 0 13px, #E9E1D2 13px 14px)' }}
          />
          {/* o envelope (papel comum) */}
          <div className="absolute inset-0 z-[3] rounded-sm bg-[#EFE6D4] shadow-xl" style={{ clipPath: 'polygon(0 30%, 50% 62%, 100% 30%, 100% 100%, 0 100%)' }} />
          <svg viewBox="0 0 160 112" className="absolute inset-0 z-[3] h-full w-full" aria-hidden>
            <path d="M0 112 L72 66 M160 112 L88 66" stroke="#D6CAB2" strokeWidth="1.5" />
          </svg>
          {/* a aba com o selo de cera, que abre */}
          <motion.div
            initial={{ rotateX: 0 }}
            animate={{ rotateX: fase >= 1 ? 180 : 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            style={{ transformOrigin: 'top center', transformStyle: 'preserve-3d', zIndex: fase >= 1 ? 1 : 4 }}
            className="absolute inset-x-0 top-0 h-16"
          >
            <svg viewBox="0 0 160 64" className="h-full w-full" aria-hidden>
              <path d="M0 0 L80 64 L160 0 Z" fill="#E4D8C2" />
            </svg>
            <div className="absolute top-9 left-1/2 size-6 -translate-x-1/2 rounded-full bg-[#9C2B25] shadow-sm [backface-visibility:hidden]" />
          </motion.div>
        </motion.div>
      )}

      {/* o bilhete aberto, com o recado */}
      {fase === 2 && (
        <motion.div
          initial={{ scaleY: 0.25, scaleX: 0.55, opacity: 0, rotate: -3 }}
          animate={{ scaleY: 1, scaleX: 1, opacity: 1, rotate: -1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 16 }}
          className="w-full max-w-xs rounded-sm px-7 pt-8 pb-6 text-center text-[#3B342C] shadow-2xl"
          style={{ backgroundColor: '#FFFDF7', backgroundImage: 'repeating-linear-gradient(#FFFDF7 0 31px, #ECE4D6 31px 32px)' }}
        >
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-[10px] tracking-[0.4em] text-[#9C2B25]/80 uppercase">
            uma pista
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }} className="mt-3 font-serif text-[2rem] leading-tight font-medium italic">
            Você achou um segredo
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="mt-3 font-serif text-lg text-[#3B342C]/70 italic">
            {achados} de {SEGREDOS.length} da nossa lua de mel
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="mt-6 flex flex-col items-center gap-1">
            <button onClick={onIr} className="rounded-full bg-[#3B342C] px-6 py-3 text-sm font-medium text-[#FFFDF7] active:scale-[0.98]">
              abrir na lua de mel
            </button>
            <button onClick={onFechar} className="rounded-full px-5 py-2 text-[13px] text-[#3B342C]/55 active:bg-black/5">
              depois
            </button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
}
