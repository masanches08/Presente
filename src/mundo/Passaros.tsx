import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { useBaterAsas } from './batida'

// Pássaros que ficam voando em círculo lá no alto (as araras que vêm e vão estão em Revoada.tsx)
// Modelos animados oficiais do three.js (licença MIT), em public/models/
const MODELOS = {
  flamingo: '/models/Flamingo.glb',
  cegonha: '/models/Stork.glb',
  papagaio: '/models/Parrot.glb',
} as const

interface Voo {
  modelo: keyof typeof MODELOS
  raio: number
  altura: number
  vel: number
  fase: number
  centro: [number, number]
  escala: number
}

const VOOS: Voo[] = [
  { modelo: 'flamingo', raio: 34, altura: 16, vel: 0.05, fase: 0, centro: [10, 0], escala: 0.02 },
  { modelo: 'flamingo', raio: 36, altura: 17.5, vel: 0.05, fase: 0.12, centro: [10, 0], escala: 0.019 },
  { modelo: 'cegonha', raio: 48, altura: 22, vel: -0.035, fase: 2, centro: [0, -10], escala: 0.018 },
]

function Passaro({ voo }: { voo: Voo }) {
  const { scene, animations } = useGLTF(MODELOS[voo.modelo])
  const copia = useMemo(() => scene.clone(true), [scene])
  const grupo = useRef<Group>(null)
  useBaterAsas(copia, animations, 0.95)

  useFrame(({ clock }) => {
    const g = grupo.current
    if (!g) return
    const a = voo.fase + clock.elapsedTime * voo.vel
    g.position.set(voo.centro[0] + Math.cos(a) * voo.raio, voo.altura + Math.sin(a * 3) * 1.2, voo.centro[1] + Math.sin(a) * voo.raio)
    // olha pra frente na trajetória (o modelo aponta pra +z)
    const dir = Math.sign(voo.vel)
    g.rotation.y = Math.atan2(-Math.sin(a) * dir, Math.cos(a) * dir)
    g.rotation.z = -0.25 * dir // inclinadinho na curva
  })

  return (
    <group ref={grupo} scale={voo.escala}>
      <primitive object={copia} />
    </group>
  )
}

export function Passaros() {
  return (
    <>
      {VOOS.map((v, i) => (
        <Passaro key={i} voo={v} />
      ))}
    </>
  )
}

for (const url of Object.values(MODELOS)) useGLTF.preload(url)
