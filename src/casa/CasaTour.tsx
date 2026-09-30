import { PerformanceMonitor, useCursor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, HueSaturation, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing'
import { AnimatePresence, motion } from 'framer-motion'
import { ToneMappingMode } from 'postprocessing'
import { useCallback, useState } from 'react'
import { Carregando } from '../components/Carregando'
import { CameraTour, PainelTour } from '../components/Tour'
import { TOUR, type ParadaId } from '../data/tour'
import { CenaCasa, type Qualidade } from './CenaCasa'
import { AREAS, CAMERAS, VISTA_LIVRE } from './paradas'

type Andar = 'tudo' | 'terreo' | 'superior'

/** Na visão livre, tocar num cômodo leva pra ele no tour */
function AreasTocaveis({ andar, onIr }: { andar: Andar; onIr: (id: ParadaId) => void }) {
  const [sobre, setSobre] = useState(false)
  useCursor(sobre)
  return (
    <>
      {AREAS.filter((a) => a.andar === 'fora' || (a.andar === 'terreo' ? andar === 'terreo' : andar !== 'terreo')).map((a) => (
        <mesh
          key={a.id}
          position={[(a.x[0] + a.x[1]) / 2, a.y + 0.03, (a.z[0] + a.z[1]) / 2]}
          rotation-x={-Math.PI / 2}
          onClick={(e) => {
            e.stopPropagation()
            if (e.delta < 10) onIr(a.id)
          }}
          onPointerOver={() => setSobre(true)}
          onPointerOut={() => setSobre(false)}
        >
          <planeGeometry args={[a.x[1] - a.x[0], a.z[1] - a.z[0]]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}

export default function CasaTour({ onSair }: { onSair: () => void }) {
  const [i, setI] = useState(0)
  const [livre, setLivre] = useState(false)
  const [andar, setAndar] = useState<Andar>('tudo')
  const [piscando, setPiscando] = useState(false)
  const [pronto, setPronto] = useState(false)
  const celular = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  const [qualidade, setQualidade] = useState<Qualidade>(celular ? 'media' : 'alta')
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, celular ? 1.5 : 2))
  const piscar = useCallback((v: boolean) => setPiscando(v), [])

  const parada = TOUR[i]
  const cam = CAMERAS[parada.id]
  const ocultos = livre ? { superior: andar === 'terreo', teto: andar !== 'tudo' } : { superior: false, teto: false }

  return (
    <motion.div className="fixed inset-0 z-40 bg-[#DCEBF4]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
      <Canvas
        shadows="percentage"
        dpr={dpr}
        camera={{ fov: 55, near: 0.05, far: 900, position: [30, 25, 45] }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        onCreated={() => setTimeout(() => setPronto(true), 700)}
      >
        <PerformanceMonitor
          onDecline={() => {
            setDpr((d) => Math.max(1, d - 0.5))
            setQualidade('media')
          }}
        />
        <CenaCasa ocultos={ocultos} qualidade={qualidade} foco={cam.alvo} amplo={livre} luzes={livre ? [] : (cam.luzes ?? [])} />
        <CameraTour cam={cam} livre={livre} vistaLivre={VISTA_LIVRE} distancia={[3, 90]} onPiscar={piscar} />
        {livre && (
          <AreasTocaveis
            andar={andar}
            onIr={(id) => {
              setI(TOUR.findIndex((t) => t.id === id))
              setLivre(false)
            }}
          />
        )}
        <EffectComposer multisampling={0}>
          {/* sombra de contato nos cantos e embaixo dos móveis: é o que dá noção de espaço e profundidade */}
          <N8AO aoRadius={0.9} distanceFalloff={0.6} intensity={qualidade === 'alta' ? 2.6 : 2.2} quality={qualidade === 'alta' ? 'medium' : 'performance'} halfRes={qualidade !== 'alta'} color="#2A1E14" />
          <Bloom mipmapBlur intensity={0.5} luminanceThreshold={0.95} luminanceSmoothing={0.2} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          <HueSaturation saturation={0.1} />
          <Vignette offset={0.4} darkness={0.3} />
        </EffectComposer>
      </Canvas>

      {/* "piscar" entre cômodos */}
      <div className={`pointer-events-none fixed inset-0 bg-creme transition-opacity duration-400 ${piscando ? 'opacity-100' : 'opacity-0'}`} />

      <PainelTour
        paradas={TOUR}
        i={i}
        onIr={setI}
        sobretitulo={cam.onde}
        livre={livre}
        onLivre={() => {
          setLivre((v) => !v)
          setAndar('tudo')
        }}
        onSair={onSair}
        painelLivre={
          <>
            <div className="grid grid-cols-3 gap-1 rounded-full bg-grafite/5 p-1">
              {(
                [
                  ['tudo', 'a casa'],
                  ['terreo', 'térreo'],
                  ['superior', '2º andar'],
                ] as [Andar, string][]
              ).map(([v, nome]) => (
                <button
                  key={v}
                  onClick={() => setAndar(v)}
                  className={`rounded-full py-2.5 text-sm font-medium transition ${andar === v ? 'bg-terracota text-creme shadow-suave' : 'text-grafite/60'}`}
                >
                  {nome}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] tracking-[0.18em] text-grafite/50 uppercase">arraste pra girar · pince pra aproximar · toque num cômodo</p>
          </>
        }
      />

      <AnimatePresence>{!pronto && <Carregando texto="abrindo a porta do nosso lar…" />}</AnimatePresence>
    </motion.div>
  )
}
