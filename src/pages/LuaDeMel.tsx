import { Canvas, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, HueSaturation, ToneMapping } from '@react-three/postprocessing'
import { motion } from 'framer-motion'
import { ToneMappingMode } from 'postprocessing'
import { useLayoutEffect } from 'react'
import { ESCONDIDOS, TEMPO_DESBLOQUEIO } from '../data/luademel'
import { CENTRO, CenaLuaDeMel } from '../luademel/Cena'

function Cadeado({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15.3" r="1.2" fill="currentColor" />
    </svg>
  )
}

// o fundo: as casinhas sobre o mar vistas do alto, em 3D, desfocadas atrás do cadeado
const [vx, vz] = CENTRO.vilas
const CAM: [number, number, number] = [vx - 70, 120, vz + 170]
const ALVO: [number, number, number] = [vx + 30, 0, vz - 10]

function Olhar() {
  const camera = useThree((s) => s.camera)
  useLayoutEffect(() => {
    camera.position.set(...CAM)
    camera.lookAt(...ALVO)
  }, [camera])
  return null
}

function Fundo() {
  const celular = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  return (
    <Canvas shadows="percentage" dpr={1} camera={{ fov: 55, near: 0.5, far: 2400, position: CAM }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
      <Olhar />
      <CenaLuaDeMel zona="vilas" foco={ALVO} raioSombra={80} qualidade={celular ? 'media' : 'alta'} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.45} luminanceThreshold={0.95} luminanceSmoothing={0.2} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <HueSaturation saturation={0.08} />
      </EffectComposer>
    </Canvas>
  )
}

/** Lua de mel: tudo bloqueado. Só dá pra ver que existem 3 coisas escondidas (e "sem dicks": brincadeira nossa). */
export default function LuaDeMel({ onSair }: { onSair: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-50 overflow-hidden bg-[#1C4A5A] text-white"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="absolute inset-0">
        <Fundo />
      </div>
      <div className="absolute inset-0 bg-[#0E1A24]/45 backdrop-blur-xl" />

      <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 140, damping: 14, delay: 0.3 }}
          className="grid size-24 place-items-center rounded-full bg-white/10 ring-1 ring-white/30 backdrop-blur-md"
        >
          <Cadeado className="size-11 text-[#F3DFA8]" />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }} className="mt-7 font-serif text-[3rem] leading-none font-medium">
          Bloqueado
        </motion.h2>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.8 }} className="mt-8">
          <p className="text-[11px] tracking-[0.35em] text-white/65 uppercase">tempo de desbloqueio</p>
          <p className="mt-2 font-serif text-[3.4rem] leading-none tracking-[0.2em] text-[#F3DFA8]">{TEMPO_DESBLOQUEIO}</p>
        </motion.div>

        <div className="mt-10 grid w-full max-w-xs grid-cols-3 gap-3">
          {ESCONDIDOS.map((nome, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 + i * 0.15, duration: 0.7 }}
              className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl bg-white/8 ring-1 ring-white/20 backdrop-blur-md"
            >
              <Cadeado className="size-6 text-white/55" />
              <span className="font-serif text-lg tracking-[0.15em] text-white/60">{nome}</span>
            </motion.div>
          ))}
        </div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="mt-5 text-[11px] tracking-[0.35em] text-white/55 uppercase">
          sem dicks
        </motion.p>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2 }}
          onClick={onSair}
          className="mt-10 rounded-full bg-[#F3DFA8] px-7 py-3 text-sm font-medium whitespace-nowrap text-[#2E2A26] active:scale-[0.98]"
        >
          voltar
        </motion.button>
      </div>
    </motion.div>
  )
}
