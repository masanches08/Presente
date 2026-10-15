import { Preload } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { Carregando } from '../components/Carregando'
import { CLASSE_CANVAS, Desempenho, dprInicial, ehCelular, GL_LEVE, LimiteFps, MedidorDebug, SombraCongelada, Vinheta } from '../lib/leve'
import { CameraTour, PainelTour, type CamTour } from '../components/Tour'
import { PASSEIO_CASAMENTO, type ParadaCasamento } from '../data/casamento'
import { area } from '../lib/cameraNoChao'
import { alturaAreia, NIVEL_MAR } from './Ambiente'
import { CenaCasamento, type Qualidade } from './CenaCasamento'
import { SinoCapela } from './Capela'
import { Fogos } from './Fogos'
import { Lanternas } from './Lanternas'
import { RelogioNoite } from './noite'
import { NIVEIS, TouroMecanico } from './TouroMecanico'

// Onde a câmera fica e pra onde olha em cada parada (o mar e o sol ficam pro lado -z)
const CAMERAS: Record<ParadaCasamento, CamTour> = {
  chegada: { pos: [0, 3.4, 17], alvo: [0, 1.4, -8] },
  altar: { pos: [2.4, 1.6, -3.4], alvo: [-0.2, 1.8, -8.4] },
  corredor: { pos: [0, 1.5, 10.8], alvo: [0, 1.25, -10] },
  // chega do lado de fora (a fachada, o sino) e depois entra pela porta até o altar, com o mar atrás do vidro
  // de frente pra porta, olhando o sino lá em cima (a corda desce até perto da porta)
  // de frente pra porta, com a câmera nivelada (olhando só um pouquinho pra cima: o sino aparece lá no alto)
  capela: { pos: [-30, 3.4, 13.5], alvo: [-30, 4.2, 4.5] },
  festa: { pos: [12.1, 2.5, 5.2], alvo: [24.5, 0.8, 1.6] },
  pista: { pos: [16, 2.8, 5.4], alvo: [10.2, 0.5, -0.6] },
  noivos: { pos: [21.3, 2.2, 1.6], alvo: [26.2, 0.95, -0.6] },
  touro: { pos: [9.4, 3.8, 14.4], alvo: [13.6, 1.25, 19.6] },
  lounge: { pos: [-6.2, 2.3, 7.2], alvo: [-12.8, 0.8, 0.2] },
  // em cima do píer, olhando o gazebo lá no fim (o varal de luzinhas por cima)
  // chega no píer e vai andando até dentro do gazebo, olhando o mar (as lanternas acendem ali)
  pier: { pos: [-40, 2.4, -40], alvo: [-40, 2.7, -66], depois: { pos: [-40, 1.9, -63.2], alvo: [-40, 3.1, -90], espera: 2.2 }, recuoMax: 1 },
  pordosol: { pos: [-5, 5.5, 23], alvo: [7, 1.2, -22] },
  // na beira do mar, olhando o céu por cima da água (os fogos estouram lá, sobre a balsa)
  // (não recua em tela estreita: o alvo fica tão longe que recuar jogava a câmera no meio das cadeiras)
  fogos: { pos: [-2, 2.4, -14], alvo: [3, 14, -75], recuoMax: 1 },
}
const VISTA_LIVRE = { pos: [-20, 17, 30] as [number, number, number], alvo: [6, 0.5, -3] as [number, number, number] }
const chaoDaPraia = (x: number, z: number) => Math.max(alturaAreia(x, z), NIVEL_MAR)
/** Visão livre: da cerimônia à festa e ao lounge, sem sair pro mar nem pras dunas lá de trás */
const AREA_LIVRE = area(-48, 35, -72, 28, 0.2, 20)

/** Dica de gesto: flutua no alto da tela e some no primeiro toque (ou sozinha depois de uns segundos) */
function DicaFlutuante({ texto }: { texto: string }) {
  const [visivel, setVisivel] = useState(true)
  useEffect(() => {
    const id = window.setTimeout(() => setVisivel(false), 7000)
    const tocou = () => window.setTimeout(() => setVisivel(false), 900)
    window.addEventListener('pointerdown', tocou, { once: true })
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('pointerdown', tocou)
    }
  }, [])
  return (
    <AnimatePresence>
      {visivel && (
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: [0, -5, 0] }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ opacity: { duration: 0.6 }, y: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } }}
          className="pointer-events-none fixed inset-x-0 z-10 text-center font-serif text-[1.35rem] text-white italic"
          style={{ top: 'calc(env(safe-area-inset-top) + 4.6rem)', textShadow: '0 1px 12px rgb(0 0 0 / 0.45), 0 0 2px rgb(0 0 0 / 0.3)' }}
        >
          {texto}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

export default function CasamentoTour({ onSair }: { onSair: () => void }) {
  const [i, setI] = useState(0)
  const [livre, setLivre] = useState(false)
  // "recentralizar" da visão livre
  const [fora, setFora] = useState(false)
  const [recentrar, setRecentrar] = useState(0)
  const [pronto, setPronto] = useState(false)
  const [qualidade, setQualidade] = useState<Qualidade>(() => (ehCelular() ? 'media' : 'alta'))
  const [dpr, setDpr] = useState(dprInicial)


  // o touro mecânico (sempre funcionando; tocar acelera) e o show de fogos (só na última parada, de noite)
  const [nivelTouro, setNivelTouro] = useState(0)
  const acelerar = () => setNivelTouro((n) => (n + 1) % NIVEIS.length)
  // o show de fogos: enquanto ele acontece, o cartão de baixo some (volta quando acaba)
  const [showAcabou, setShowAcabou] = useState(false)
  const fimDoShow = useCallback(() => setShowAcabou(true), [])
  // "piscar" suave entre lugares longe (a câmera não atravessa a praia deslizando)
  const [piscando, setPiscando] = useState(false)
  const piscar = useCallback((v: boolean) => setPiscando(v), [])
  // o sino da capela e as lanternas do píer
  const [toquesSino, setToquesSino] = useState(0)
  const [lanternas, setLanternas] = useState(0)

  const parada = PASSEIO_CASAMENTO[i]
  const cam = CAMERAS[parada.id]
  const noFogos = !livre && parada.id === 'fogos'
  // chegou no píer: umas lanternas sobem sozinhas (o botão solta mais)
  useEffect(() => {
    if (livre || parada.id !== 'pier') return
    const t = window.setTimeout(() => setLanternas((n) => n + 1), 1800)
    return () => window.clearTimeout(t)
  }, [livre, parada.id])
  useEffect(() => {
    if (!noFogos) setShowAcabou(false)
  }, [noFogos])
  const dica = livre
    ? null
    : {
        capela: '👆 puxe a corda do sino pra baixo',
        pier: '✋ segure pra acender a lanterna',
        touro: '👆 toque no touro',
      }[parada.id as string] ?? null

  return (
    <motion.div className={`fixed inset-0 z-40 bg-[#F1B4A6] ${CLASSE_CANVAS}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
      <Canvas
        shadows="percentage"
        frameloop="never"
        dpr={dpr}
        camera={{ fov: 55, near: 0.05, far: 1200, position: [0, 20, -80] }}
        gl={GL_LEVE}
        onCreated={() => setTimeout(() => setPronto(true), 700)}
      >
        <SombraCongelada />
        {/* prepara todos os shaders já no carregamento (senão dá uma travadinha quando algo aparece pela 1ª vez) */}
        <Preload all />
        <MedidorDebug />
        <LimiteFps />
        <Desempenho setDpr={setDpr} onPiorar={() => setQualidade('media')} />
        <CenaCasamento qualidade={qualidade} />
        <RelogioNoite alvo={noFogos ? 1 : 0} />
        <TouroMecanico nivel={nivelTouro} onTocar={acelerar} />
        <Fogos ativo={noFogos} onFim={fimDoShow} />
        <SinoCapela toques={toquesSino} onTocar={() => setToquesSino((n) => n + 1)} gesto={!livre && parada.id === 'capela'} />
        <Lanternas soltar={lanternas} gesto={!livre && parada.id === 'pier'} noite={false} />
        {/* entrada de cinema: vem lá do mar até o altar */}
        <CameraTour cam={cam} livre={livre} onPiscar={piscar} recentrar={recentrar} onFora={setFora} vistaLivre={VISTA_LIVRE} distancia={[2, 70]} area={AREA_LIVRE} chao={chaoDaPraia} entrada={[0, 9, -85]} duracaoEntrada={3.2} fovMax={80} recuoMax={1.4} />
      </Canvas>
      <Vinheta forca={0.36} />
      {/* "piscar" entre lugares longe */}
      <div className={`pointer-events-none fixed inset-0 bg-[#F6E3D8] transition-opacity duration-400 ${piscando ? 'opacity-100' : 'opacity-0'}`} />
      {/* a noite dos fogos começa: uma frase aparece no céu e some sozinha */}
      <AnimatePresence>
        {noFogos && !showAcabou && (
          <motion.p
            key="noite"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 7, times: [0, 0.2, 0.7, 1], delay: 0.8 }}
            className="pointer-events-none fixed inset-x-0 z-10 text-center font-serif text-[2.1rem] text-white italic"
            style={{ top: '22%', textShadow: '0 2px 18px rgb(20 20 60 / 0.6)' }}
          >
            fica aqui comigo… e olha pro céu ✨
          </motion.p>
        )}
      </AnimatePresence>

      <PainelTour
        paradas={PASSEIO_CASAMENTO}
        i={i}
        onIr={setI}
        sobretitulo="nosso casamento"
        livre={livre}
        onLivre={() => setLivre((v) => !v)}
        onSair={onSair}
        recentrar={{ visivel: fora, onClick: () => setRecentrar((n) => n + 1) }}
        semCartao={noFogos && !showAcabou}
        painelLivre={
          <>
            <p className="font-serif text-lg text-grafite/75 italic">toque no touro, no sino da capela, no gazebo do píer e na pista ✨</p>
            <p className="mt-1 text-[11px] tracking-[0.18em] text-grafite/50 uppercase">um dedo gira · dois dedos andam e aproximam</p>
          </>
        }
      />

      {pronto && dica && <DicaFlutuante key={parada.id} texto={dica} />}
      <AnimatePresence>{!pronto && <Carregando texto="preparando o nosso casamento…" />}</AnimatePresence>
    </motion.div>
  )
}
