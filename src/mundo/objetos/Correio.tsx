import { useFrame, type ThreeElements } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { COR } from '../cores'

type Props = ThreeElements['group']

/** Caixinha de correio terracota, com uma cartinha saindo e a bandeirinha levantada. */
export function Correio(props: Props) {
  const carta = useRef<Group>(null)

  // a cartinha sobe e desce devagar, como se estivesse chamando
  useFrame(({ clock }) => {
    if (carta.current) carta.current.position.y = 0.83 + Math.sin(clock.elapsedTime * 1.6) * 0.012
  })

  return (
    <group {...props}>
      {/* poste */}
      <mesh position-y={0.34}>
        <boxGeometry args={[0.07, 0.68, 0.07]} />
        <meshStandardMaterial color={COR.madeira} roughness={1} />
      </mesh>
      {/* caixa: corpo + tampa arredondada */}
      <group position-y={0.76}>
        <mesh>
          <boxGeometry args={[0.3, 0.16, 0.46]} />
          <meshStandardMaterial color={COR.terracota} roughness={0.6} />
        </mesh>
        <mesh position-y={0.08} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.15, 0.15, 0.46, 20, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={COR.terracota} roughness={0.6} side={2} />
        </mesh>
        {/* portinha da frente */}
        <mesh position={[0, 0.02, 0.232]}>
          <boxGeometry args={[0.28, 0.2, 0.01]} />
          <meshStandardMaterial color={COR.terracotaEscuro} roughness={0.6} />
        </mesh>
        {/* bandeirinha dourada */}
        <group position={[0.16, 0.02, -0.05]}>
          <mesh position={[0.012, 0.12, 0]}>
            <boxGeometry args={[0.015, 0.26, 0.02]} />
            <meshStandardMaterial color={COR.dourado} metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0.012, 0.22, 0.05]}>
            <boxGeometry args={[0.015, 0.07, 0.1]} />
            <meshStandardMaterial color={COR.dourado} metalness={0.6} roughness={0.35} />
          </mesh>
        </group>
      </group>
      {/* a cartinha, com selo de cera */}
      <group ref={carta} position={[0, 0.83, 0.2]} rotation-x={-0.25}>
        <mesh>
          <boxGeometry args={[0.2, 0.14, 0.006]} />
          <meshStandardMaterial color="#FBF3E4" roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.01, 0.005]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.022, 0.022, 0.006, 14]} />
          <meshStandardMaterial color="#B0452A" roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}
