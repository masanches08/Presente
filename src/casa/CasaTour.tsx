import { Preload } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'
import { Carregando } from '../components/Carregando'
import { CLASSE_CANVAS, Desempenho, dprInicial, ehCelular, GL_LEVE, LimiteFps, MedidorDebug, SombraCongelada, Vinheta } from '../lib/leve'
import { CameraTour, PainelTour } from '../components/Tour'
import { CartinhaHotel } from '../components/CartinhaHotel'
import { irPara } from '../hooks/useRota'
import { TOUR } from '../data/tour'
import { CartinhaEstante } from './CartinhaEstante'
import { CenaCasa, type Qualidade } from './CenaCasa'
import { CAMERAS, VISTA_LIVRE } from './paradas'
import { TvSuite } from './TvSuite'

type Andar = 'tudo' | 'terreo' | 'superior'

// (na visão livre, tocar num lugar não leva mais pra parada do tour: dá pra explorar à vontade
// sem ser levado pra outro cômodo por um toque sem querer)

export default function CasaTour({ onSair }: { onSair: () => void }) {
  const [i, setI] = useState(0)
  const [livre, setLivre] = useState(false)
  const [andar, setAndar] = useState<Andar>('tudo')
  const [piscando, setPiscando] = useState(false)
  const [pronto, setPronto] = useState(false)
  const [qualidade, setQualidade] = useState<Qualidade>(() => (ehCelular() ? 'media' : 'alta'))
  const [dpr, setDpr] = useState(dprInicial)
  const [cartinha, setCartinha] = useState(false)
  const piscar = useCallback((v: boolean) => setPiscando(v), [])

  const parada = TOUR[i]
  // celular em pé: lá fora a câmera pode recuar; dentro de casa só abre o ângulo (recuar atravessaria parede)
  const cam = useMemo(() => {
    const c = CAMERAS[parada.id]
    return { ...c, recuoMax: c.onde === 'lá fora' ? 1.3 : 1 }
  }, [parada.id])
  const ocultos = livre ? { superior: andar === 'terreo', teto: andar !== 'tudo' } : { superior: false, teto: false }
  // a TV da suíte toca quando a câmera chega lá; o vídeo começa a baixar uma parada antes
  const naSuite = !livre && parada.id === 'suite'
  const pertoDaSuite = i >= TOUR.findIndex((p) => p.id === 'suite') - 1

  return (
    <motion.div className={`fixed inset-0 z-40 bg-[#DCEBF4] ${CLASSE_CANVAS}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
      <Canvas
        shadows="percentage"
        frameloop="never"
        dpr={dpr}
        camera={{ fov: 55, near: 0.05, far: 900, position: [30, 25, 45] }}
        gl={GL_LEVE}
        onCreated={() => setTimeout(() => setPronto(true), 700)}
      >
        {/* a sombra do sol muda de lugar a cada cômodo: redesenha só nessa hora */}
        <SombraCongelada chave={`${cam.alvo.join()}${livre}`} />
        {/* prepara todos os shaders já no carregamento (senão dá uma travadinha quando algo aparece pela 1ª vez) */}
        <Preload all />
        <MedidorDebug />
        <LimiteFps />
        <Desempenho setDpr={setDpr} onPiorar={() => setQualidade('media')} />
        <CenaCasa ocultos={ocultos} qualidade={qualidade} foco={cam.alvo} amplo={livre} luzes={livre ? [] : (cam.luzes ?? [])} />
        <CameraTour cam={cam} livre={livre} vistaLivre={VISTA_LIVRE} distancia={[3, 90]} onPiscar={piscar} fovMax={84} recuoMax={1.3} />
        {/* segredo 2 da lua de mel: a cartinha escondida na estante do mezanino */}
        <CartinhaEstante oculto={ocultos.superior} onPegou={() => setCartinha(true)} />
        <TvSuite ligada={naSuite} carregar={pertoDaSuite} oculto={ocultos.superior} />
      </Canvas>
      <Vinheta forca={0.3} />

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
            <p className="mt-3 text-[11px] tracking-[0.18em] text-grafite/50 uppercase">arraste pra girar · pince pra aproximar</p>
          </>
        }
      />

      {/* a cartinha da estante: segura o selo até quebrar e aparece o hotel */}
      <AnimatePresence>
        {cartinha && (
          <CartinhaHotel
            onIr={() => {
              setCartinha(false)
              irPara('luademel')
            }}
            onFechar={() => setCartinha(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{!pronto && <Carregando texto="abrindo a porta do nosso lar…" />}</AnimatePresence>
    </motion.div>
  )
}
