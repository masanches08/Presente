import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, HueSaturation, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useState } from 'react'
import { Cena, type Qualidade } from './Cena'
import { Controles } from './Controles'
import { ProjetorMarcadores } from './ProjetorMarcadores'
import type { PontoId } from './pontos'

export interface MundoProps {
  foco: PontoId | null
  onFocar: (id: PontoId) => void
  nossoDia: boolean
  /** Para de desenhar (economiza bateria) quando uma página está aberta por cima */
  pausado: boolean
  onPronto: () => void
}

/** O nosso cantinho em 3D. Este arquivo só é baixado quando precisa (carregamento preguiçoso). */
export default function Mundo({ foco, onFocar, nossoDia, pausado, onPronto }: MundoProps) {
  // qualidade alta, que baixa sozinha se o aparelho começar a sofrer
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2))
  const [qualidade, setQualidade] = useState<Qualidade>(() => (window.matchMedia('(pointer: coarse)').matches ? 'media' : 'alta'))

  return (
    <div className="fixed inset-0">
      <Canvas
        shadows="percentage"
        dpr={dpr}
        frameloop={pausado ? 'never' : 'always'}
        camera={{ fov: 45, near: 0.2, far: 1200, position: [0, 30, 60] }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        onCreated={() => setTimeout(onPronto, 600)}
      >
        <PerformanceMonitor
          onDecline={() => {
            setDpr((d) => Math.max(1, d - 0.5))
            setQualidade((q) => (q === 'alta' ? 'media' : 'baixa'))
          }}
        />
        <Cena onFocar={onFocar} nossoDia={nossoDia} qualidade={qualidade} />
        <Controles foco={foco} />
        <ProjetorMarcadores />
        <EffectComposer multisampling={qualidade === 'alta' ? 2 : 0}>
          <Bloom mipmapBlur intensity={qualidade === 'baixa' ? 0 : 0.6} luminanceThreshold={0.95} luminanceSmoothing={0.2} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          <HueSaturation saturation={0.14} />
          <Vignette offset={0.4} darkness={0.28} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
