import { Preload } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Carregando } from '../components/Carregando'
import { CLASSE_CANVAS, Desempenho, dprInicial, ehCelular, GL_LEVE, LimiteFps, MedidorDebug, SombraCongelada, Vinheta } from '../lib/leve'
import { CameraTour, PainelTour, type CamTour } from '../components/Tour'
import { PASSEIO_CASAMENTO, type ParadaCasamento } from '../data/casamento'
import { area } from '../lib/cameraNoChao'
import { alturaAreia, NIVEL_MAR } from './Ambiente'
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
const chaoDaPraia = (x: number, z: number) => Math.max(alturaAreia(x, z), NIVEL_MAR)
/** Visão livre: da cerimônia à festa e ao lounge, sem sair pro mar nem pras dunas lá de trás */
const AREA_LIVRE = area(-25, 35, -30, 28, 0.2, 20)

export default function CasamentoTour({ onSair }: { onSair: () => void }) {
  const [i, setI] = useState(0)
  const [livre, setLivre] = useState(false)
  // "recentralizar" da visão livre
  const [fora, setFora] = useState(false)
  const [recentrar, setRecentrar] = useState(0)
  const [pronto, setPronto] = useState(false)
  const [qualidade, setQualidade] = useState<Qualidade>(() => (ehCelular() ? 'media' : 'alta'))
  const [dpr, setDpr] = useState(dprInicial)


  const parada = PASSEIO_CASAMENTO[i]
  const cam = CAMERAS[parada.id]

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
        {/* entrada de cinema: vem lá do mar até o altar */}
        <CameraTour cam={cam} livre={livre} recentrar={recentrar} onFora={setFora} vistaLivre={VISTA_LIVRE} distancia={[2, 70]} area={AREA_LIVRE} chao={chaoDaPraia} entrada={[0, 9, -85]} duracaoEntrada={3.2} fovMax={80} recuoMax={1.4} />
      </Canvas>
      <Vinheta forca={0.36} />

      <PainelTour
        paradas={PASSEIO_CASAMENTO}
        i={i}
        onIr={setI}
        sobretitulo="nosso casamento"
        livre={livre}
        onLivre={() => setLivre((v) => !v)}
        onSair={onSair}
        recentrar={{ visivel: fora, onClick: () => setRecentrar((n) => n + 1) }}
        painelLivre={<p className="py-1 text-[11px] tracking-[0.18em] text-grafite/55 uppercase">um dedo gira · dois dedos andam e aproximam</p>}
      />

      <AnimatePresence>{!pronto && <Carregando texto="preparando o nosso casamento…" />}</AnimatePresence>
    </motion.div>
  )
}
