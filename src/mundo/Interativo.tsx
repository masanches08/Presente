import { useCursor } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useState, type ReactNode } from 'react'
import type { PontoId } from './pontos'

interface Props {
  id: PontoId
  onFocar: (id: PontoId) => void
  children: ReactNode
}

/**
 * Deixa um objeto do mundo "tocável": ao tocar, a câmera voa até ele.
 * (Estrutura pronta pra, no futuro, ter interações mais legais em cada objeto.)
 */
export function Interativo({ id, onFocar, children }: Props) {
  const [sobre, setSobre] = useState(false)
  useCursor(sobre)

  const tocar = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 10) return // foi um arrasto pra girar, não um toque
    onFocar(id)
  }

  return (
    <group
      onClick={tocar}
      onPointerOver={(e) => {
        e.stopPropagation()
        setSobre(true)
      }}
      onPointerOut={() => setSobre(false)}
    >
      {children}
    </group>
  )
}
