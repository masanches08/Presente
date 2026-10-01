import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { SEGREDOS } from '../data/luademel'
import { useDesbloqueios } from '../lib/desbloqueios'
import { CeuDeFesta } from './CeuDeFesta'

const aparecer = (atraso: number) => ({
  initial: { opacity: 0, y: 14, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { delay: atraso, duration: 0.9, ease: [0.22, 1, 0.36, 1] as const },
})

/** O envelope abrindo: a aba vira pra cima e sai um cartãozinho dourado com um cadeado aberto */
function EnvelopeAbrindo() {
  // depois de abrir, a aba vai pra trás do cartão (senão cobre ele)
  const [abriu, setAbriu] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setAbriu(true), 900)
    return () => window.clearTimeout(t)
  }, [])
  return (
    <div className="relative mx-auto h-36 w-48" style={{ perspective: 600 }}>
      {/* o cartão que sobe de dentro */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: -64, opacity: 1 }}
        transition={{ delay: 1.1, duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-x-5 top-6 z-[2] grid h-28 place-items-center rounded-lg bg-gradient-to-b from-[#FFF4D6] to-[#F3D99A] shadow-lg"
      >
        <svg viewBox="0 0 24 24" className="size-9 text-[#A8742A]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
          <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
          <path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7" />
          <circle cx="12" cy="15.3" r="1.2" fill="currentColor" />
        </svg>
      </motion.div>
      {/* corpo do envelope (fica na frente do cartão) */}
      <div className="absolute inset-x-0 bottom-0 z-[3] h-24 rounded-md bg-[#FFF6E2] shadow-xl" />
      <svg viewBox="0 0 192 96" className="absolute inset-x-0 bottom-0 z-[3] h-24 w-full" aria-hidden>
        <path d="M0 0 L96 58 L192 0 L192 96 L0 96 Z" fill="#F7E9CB" />
        <path d="M0 96 L84 50 M192 96 L108 50" stroke="#E6D3AB" strokeWidth="2" />
      </svg>
      {/* a aba, que abre virando pra cima */}
      <motion.div
        initial={{ rotateX: 0 }}
        animate={{ rotateX: 180 }}
        transition={{ delay: 0.5, duration: 0.7, ease: 'easeInOut' }}
        style={{ transformOrigin: 'top center', transformStyle: 'preserve-3d', zIndex: abriu ? 1 : 4 }}
        className="absolute inset-x-0 top-12 h-14"
      >
        <svg viewBox="0 0 192 56" className="h-full w-full" aria-hidden>
          <path d="M0 0 L96 56 L192 0 Z" fill="#F3E3C0" />
        </svg>
        {/* selo de cera */}
        <div className="absolute top-7 left-1/2 size-7 -translate-x-1/2 rounded-full bg-[#B0302A] shadow ring-2 ring-[#8F2420] [backface-visibility:hidden]" />
      </motion.div>
    </div>
  )
}

/** Quando ela pega a cartinha da arara: festa e o aviso de que um segredo foi desbloqueado */
export function PistaEncontrada({ onIr, onFechar }: { onIr: () => void; onFechar: () => void }) {
  const achados = useDesbloqueios().length
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6 } }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[65] flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_40%,rgb(60_40_70/0.6),rgb(16_14_30/0.88))] px-8 text-center text-white backdrop-blur-[3px]"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <CeuDeFesta modo="fogos" className="absolute inset-0" />
      <div className="relative">
        <motion.div initial={{ scale: 0.4, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 130, damping: 13 }}>
          <EnvelopeAbrindo />
        </motion.div>
        <motion.p {...aparecer(1.6)} className="mt-6 text-[11px] tracking-[0.4em] text-[#F3DFA8]/85 uppercase">
          você achou uma pista
        </motion.p>
        <motion.div {...aparecer(1.9)}>
          <h2 className="brilho-champanhe mt-3 font-serif text-[2.6rem] leading-[1.05] font-semibold">
            Um segredo foi
            <br />
            desbloqueado
          </h2>
        </motion.div>
        <motion.p {...aparecer(2.3)} className="mt-4 font-serif text-xl text-[#FFE9EE] italic">
          {achados} de {SEGREDOS.length} da nossa lua de mel
        </motion.p>
        <motion.div {...aparecer(2.7)} className="mt-9 flex flex-col items-center gap-2">
          <button
            onClick={onIr}
            className="rounded-full bg-[#F3DFA8] px-7 py-3 text-sm font-medium text-[#2E2A26] shadow-[0_0_30px_rgb(243_223_168/0.35)] active:scale-[0.98]"
          >
            ver na lua de mel ✈
          </button>
          <button onClick={onFechar} className="rounded-full px-5 py-2 text-[13px] text-white/60 active:bg-white/10">
            depois
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}
