import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, HueSaturation, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing'
import { AnimatePresence, motion } from 'framer-motion'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useState } from 'react'
import { Carregando } from '../components/Carregando'
import { CameraTour, PainelTour, type CamTour } from '../components/Tour'
import { PASSEIO_CASAMENTO, type ParadaCasamento } from '../data/casamento'
import { somDoMar } from '../lib/somDoMar'
import { CenaCasamento, type Qualidade } from './CenaCasamento'

// Onde a câmera fica e pra onde olha em cada parada (o mar e o sol ficam pro lado -z)
const CAMERAS: Record<ParadaCasamento, CamTour> = {
  chegada: { pos: [0, 3.4, 17], alvo: [0, 1.4, -8] },
  altar: { pos: [2.4, 1.6, -3.4], alvo: [-0.2, 1.8, -8.4] },
  corredor: { pos: [0, 1.5, 10.8], alvo: [0, 1.25, -10] },
  festa: { pos: [12.1, 2.5, 5.2], alvo: [24.5, 0.8, 1.6] },
  pista: { pos: [16, 2.8, 5.4], alvo: [10.2, 0.5, -0.6] },
  noivos: { pos: [21.3, 2.2, 1.6], alvo: [26.2, 0.95, -0.6] },
  lounge: { pos: [-6.2, 2.3, 7.2], alvo: [-12.8, 0.8, 0.2] },
  pordosol: { pos: [-5, 5.5, 23], alvo: [7, 1.2, -22] },
}
const VISTA_LIVRE = { pos: [-20, 17, 30] as [number, number, number], alvo: [6, 0.5, -3] as [number, number, number] }

function IconeSom({ ligado }: { ligado: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      {ligado ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m16 9.5 5 5m0-5-5 5" />}
    </svg>
  )
}

export default function CasamentoTour({ onSair }: { onSair: () => void }) {
  const [i, setI] = useState(0)
  const [livre, setLivre] = useState(false)
  const [pronto, setPronto] = useState(false)
  const [som, setSom] = useState(false) // desligado por padrão
  const celular = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  const [qualidade, setQualidade] = useState<Qualidade>(celular ? 'media' : 'alta')
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, celular ? 1.5 : 2))

  useEffect(() => {
    somDoMar(som)
  }, [som])
  // desliga o som ao sair
  useEffect(() => () => somDoMar(false), [])

  const parada = PASSEIO_CASAMENTO[i]
  const cam = CAMERAS[parada.id]

  return (
    <motion.div className="fixed inset-0 z-40 bg-[#F1B4A6]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
      <Canvas
        shadows="percentage"
        dpr={dpr}
        camera={{ fov: 55, near: 0.05, far: 1200, position: [0, 20, -80] }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        onCreated={() => setTimeout(() => setPronto(true), 700)}
      >
        <PerformanceMonitor
          onDecline={() => {
            setDpr((d) => Math.max(1, d - 0.5))
            setQualidade('media')
          }}
        />
        <CenaCasamento qualidade={qualidade} />
        {/* entrada de cinema: vem lá do mar até o altar */}
        <CameraTour cam={cam} livre={livre} vistaLivre={VISTA_LIVRE} distancia={[4, 80]} entrada={[0, 9, -85]} duracaoEntrada={3.2} />
        <EffectComposer multisampling={0}>
          <N8AO enabled={qualidade === 'alta'} aoRadius={0.8} distanceFalloff={0.6} intensity={2} quality="performance" color="#3A2418" />
          <Bloom mipmapBlur intensity={1.0} luminanceThreshold={0.82} luminanceSmoothing={0.25} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          <HueSaturation saturation={0.12} />
          <Vignette offset={0.35} darkness={0.4} />
        </EffectComposer>
      </Canvas>

      <PainelTour
        paradas={PASSEIO_CASAMENTO}
        i={i}
        onIr={setI}
        sobretitulo="nosso casamento"
        livre={livre}
        onLivre={() => setLivre((v) => !v)}
        onSair={onSair}
        extras={
          <button
            onClick={() => setSom((v) => !v)}
            aria-label={som ? 'Desligar o som do mar' : 'Ligar o som do mar'}
            className="grid size-10 place-items-center rounded-full bg-papel/80 text-grafite/75 shadow-suave ring-1 ring-dourado/25 backdrop-blur-md active:scale-[0.97]"
          >
            <IconeSom ligado={som} />
          </button>
        }
        painelLivre={<p className="py-1 text-[11px] tracking-[0.18em] text-grafite/55 uppercase">arraste pra girar · pince pra aproximar</p>}
      />

      <AnimatePresence>{!pronto && <Carregando texto="preparando o nosso casamento…" />}</AnimatePresence>
    </motion.div>
  )
}
