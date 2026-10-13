import { Preload } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useState } from 'react'
import { CLASSE_CANVAS, Desempenho, dprInicial, ehCelular, GL_LEVE, LimiteFps, MedidorDebug, SombraCongelada, Vinheta } from '../lib/leve'
import { Cena, type Qualidade } from './Cena'
import { Controles } from './Controles'
import { ProjetorMarcadores } from './ProjetorMarcadores'
import type { PontoId } from './pontos'

export interface MundoProps {
  foco: PontoId | null
  onFocar: (id: PontoId) => void
  onPista: () => void
  nossoDia: boolean
  /** Para de desenhar (economiza bateria) quando uma página está aberta por cima */
  pausado: boolean
  onPronto: () => void
  /** Muda a cada toque no "recentralizar" */
  recentrar: number
  /** A câmera saiu (ou voltou) da vista padrão */
  onFora: (fora: boolean) => void
}

/** O nosso cantinho em 3D. Este arquivo só é baixado quando precisa (carregamento preguiçoso). */
export default function Mundo({ foco, onFocar, onPista, nossoDia, pausado, onPronto, recentrar, onFora }: MundoProps) {
  // qualidade alta, que baixa sozinha se o aparelho começar a sofrer
  const [dpr, setDpr] = useState(dprInicial)
  const [qualidade, setQualidade] = useState<Qualidade>(() => (ehCelular() ? 'media' : 'alta'))

  return (
    <div className={`fixed inset-0 ${CLASSE_CANVAS}`}>
      <Canvas
        shadows="percentage"
        dpr={dpr}
        frameloop="never"
        camera={{ fov: 45, near: 0.2, far: 1200, position: [0, 30, 60] }}
        gl={GL_LEVE}
        onCreated={() => setTimeout(onPronto, 600)}
      >
        {/* o sol não se mexe: a sombra é desenhada uma vez só (quando a qualidade muda, de novo) */}
        <SombraCongelada chave={qualidade} />
        {/* prepara todos os shaders já no carregamento (senão dá uma travadinha quando algo aparece pela 1ª vez) */}
        <Preload all />
        <MedidorDebug />
        <LimiteFps ativo={!pausado} />
        <Desempenho setDpr={setDpr} onPiorar={() => setQualidade((q) => (q === 'alta' ? 'media' : 'baixa'))} />
        <Cena onFocar={onFocar} onPista={onPista} nossoDia={nossoDia} qualidade={qualidade} />
        <Controles foco={foco} recentrar={recentrar} onFora={onFora} />
        <ProjetorMarcadores />
      </Canvas>
      <Vinheta />
    </div>
  )
}
