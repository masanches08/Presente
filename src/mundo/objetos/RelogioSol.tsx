import type { ThreeElements } from '@react-three/fiber'
import { useMemo } from 'react'
import { ExtrudeGeometry, Shape } from 'three'
import { COR } from '../cores'

type Props = ThreeElements['group']

/** Relógio de sol de pedra com ponteiro dourado: o nosso tempo. */
export function RelogioSol(props: Props) {
  const ponteiro = useMemo(() => {
    const s = new Shape()
    s.moveTo(-0.13, 0)
    s.lineTo(0.13, 0)
    s.lineTo(-0.13, 0.16)
    s.closePath()
    const g = new ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false })
    g.translate(0, 0, -0.006)
    return g
  }, [])

  return (
    <group {...props}>
      {/* chão de pedrinhas em volta */}
      <mesh position-y={0.01} receiveShadow>
        <cylinderGeometry args={[0.5, 0.52, 0.03, 20]} />
        <meshStandardMaterial color={COR.pedra} roughness={0.95} />
      </mesh>
      {/* pedestal */}
      <mesh position-y={0.06}>
        <cylinderGeometry args={[0.2, 0.22, 0.07, 16]} />
        <meshStandardMaterial color="#EDE4D3" />
      </mesh>
      <mesh position-y={0.3}>
        <cylinderGeometry args={[0.085, 0.11, 0.42, 12]} />
        <meshStandardMaterial color="#EDE4D3" />
      </mesh>
      <mesh position-y={0.53}>
        <cylinderGeometry args={[0.24, 0.2, 0.05, 24]} />
        <meshStandardMaterial color="#F2EADB" />
      </mesh>
      {/* 12 marquinhas douradas */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.19, 0.558, Math.sin(a) * 0.19]} rotation-y={-a}>
            <boxGeometry args={[i % 3 === 0 ? 0.05 : 0.03, 0.006, 0.01]} />
            <meshStandardMaterial color={COR.dourado} metalness={0.8} roughness={0.3} />
          </mesh>
        )
      })}
      <mesh geometry={ponteiro} position-y={0.555}>
        <meshStandardMaterial color={COR.dourado} metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  )
}
