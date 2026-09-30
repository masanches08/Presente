import { Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Mesh } from 'three'
import { altura } from './terreno'
import { sorteador } from './util'

/** Brilhinhos dourados flutuando sobre o campo (pólen / vaga-lumes). */
export function Vagalumes({ muitos = false }: { muitos?: boolean }) {
  return (
    <Sparkles
      count={muitos ? 160 : 90}
      scale={[36, 5, 30]}
      position={[1, 2.2, 2]}
      size={muitos ? 7 : 5}
      speed={0.3}
      color="#FFE29A"
      opacity={0.85}
    />
  )
}

/** Lanternas de papel subindo do campo: só no nosso dia 24. */
export function Lanternas() {
  const lanternas = useMemo(() => {
    const rand = sorteador(24)
    return Array.from({ length: 34 }, () => {
      const x = (rand() - 0.5) * 30
      const z = (rand() - 0.3) * 26
      return { x, z, chao: altura(x, z), vel: 0.5 + rand() * 0.5, fase: rand() * 30, balanco: rand() * 6 }
    })
  }, [])
  const refs = useRef<(Mesh | null)[]>([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    lanternas.forEach((l, i) => {
      const m = refs.current[i]
      if (!m) return
      const subida = (t * l.vel + l.fase) % 30
      m.position.set(l.x + Math.sin(t * 0.4 + l.balanco) * 0.6, l.chao + 0.6 + subida, l.z + Math.cos(t * 0.3 + l.balanco) * 0.6)
      m.scale.setScalar(Math.min(1, subida * 0.6) * Math.min(1, (30 - subida) * 0.3))
    })
  })

  return (
    <>
      {lanternas.map((_, i) => (
        <mesh key={i} ref={(el) => void (refs.current[i] = el)}>
          <cylinderGeometry args={[0.22, 0.17, 0.42, 10]} />
          <meshStandardMaterial color="#FFD9A0" emissive="#FF9D4D" emissiveIntensity={2.6} />
        </mesh>
      ))}
    </>
  )
}
