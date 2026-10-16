import { Billboard, Sparkles, useCursor } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import { AdditiveBlending, CanvasTexture, CatmullRomCurve3, DoubleSide, Shape, ShapeGeometry, SRGBColorSpace, TubeGeometry, Vector3, type Mesh, type MeshBasicMaterial } from 'three'
import { texVestidoBorrado } from '../atelie/texturas'
import { PIER } from './montar'

// O vestido "borrado" no fim do píer, logo atrás do gazebo: só um vulto branco brilhando num pedestal,
// na frente de um painel em arco
// (ninguém sabe qual é). Tocar nele abre o Ateliê da noiva.

/** Logo atrás do gazebo, na beira do deck, à esquerda (aparece entre as colunas sem tampar o pôr do sol) */
export const VESTIDO_PIER = { x: PIER.x - 2.1, y: PIER.y, z: PIER.z1 - 7.0 }
/** virado pra quem chega no gazebo */
const GIRO = Math.atan2(2.1, 5.8)

/** O painel em arco atrás do vestido (rosa antigo: o vulto branco aparece contra ele, e não contra o céu claro) */
function painelArco() {
  const L = 0.78
  const H = 2.05
  const f = new Shape()
  f.moveTo(-L, 0)
  f.lineTo(-L, H)
  f.absarc(0, H, L, Math.PI, 0, true)
  f.lineTo(L, 0)
  f.closePath()
  const painel = new ShapeGeometry(f, 40)
  const borda: Vector3[] = []
  for (let k = 0; k <= 40; k++) {
    const a = Math.PI - (k / 40) * Math.PI
    borda.push(new Vector3(Math.cos(a) * (L + 0.03), H + Math.sin(a) * (L + 0.03), 0.02))
  }
  const moldura = new TubeGeometry(new CatmullRomCurve3([new Vector3(-L - 0.03, 0, 0.02), ...borda, new Vector3(L + 0.03, 0, 0.02)]), 80, 0.03, 8)
  return { painel, moldura }
}

let brilho: CanvasTexture | null = null
function texBrilho() {
  if (brilho) return brilho
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, 'rgba(255,236,200,0.9)')
  gr.addColorStop(0.35, 'rgba(255,224,170,0.35)')
  gr.addColorStop(1, 'rgba(255,224,170,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 128, 128)
  brilho = new CanvasTexture(c)
  brilho.colorSpace = SRGBColorSpace
  return brilho
}

export function VestidoBorrado({ onAbrir }: { onAbrir: () => void }) {
  const tex = useMemo(() => texVestidoBorrado(), [])
  const arco = useMemo(() => painelArco(), [])
  const aura = useRef<Mesh>(null)
  const vulto = useRef<Mesh>(null)
  const [sobre, setSobre] = useState(false)
  useCursor(sobre)
  // respira devagarinho (o brilho pulsa e o vulto "flutua" um tiquinho)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (aura.current) {
      const m = aura.current.material as MeshBasicMaterial
      m.opacity = 0.3 + 0.14 * Math.sin(t * 1.6)
      aura.current.scale.setScalar(1 + 0.06 * Math.sin(t * 1.6))
    }
    if (vulto.current) vulto.current.position.y = 0.12 + 0.82 + 0.015 * Math.sin(t * 1.1)
  })
  const tocar = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onAbrir()
  }
  const { x, y, z } = VESTIDO_PIER
  return (
    <group position={[x, y, z]}>
      {/* o cantinho: painel em arco com moldura dourada e um tapetinho redondo */}
      <group rotation={[0, GIRO, 0]} position={[0, 0, 0]}>
        <mesh geometry={arco.painel} position={[0, 0, -0.62]}>
          <meshStandardMaterial color="#E7C4BD" roughness={0.9} side={DoubleSide} />
        </mesh>
        <mesh geometry={arco.moldura} position={[0, 0, -0.62]}>
          <meshStandardMaterial color="#D8B77A" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, -0.05]}>
          <circleGeometry args={[0.85, 48]} />
          <meshStandardMaterial color="#F4EBE1" roughness={0.95} />
        </mesh>
      </group>
      {/* pedestal redondo branco, com friso dourado */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.42, 0.46, 0.12, 40]} />
        <meshStandardMaterial color="#FBF8F3" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.115, 0]}>
        <torusGeometry args={[0.425, 0.012, 8, 48]} />
        <meshStandardMaterial color="#D8B77A" metalness={0.8} roughness={0.3} />
      </mesh>
      <Billboard lockX lockZ>
        <mesh ref={aura} position={[0, 1.0, -0.05]}>
          <planeGeometry args={[2.2, 2.6]} />
          <meshBasicMaterial map={texBrilho()} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh ref={vulto} position={[0, 0.94, 0]}>
          <planeGeometry args={[1.12, 1.68]} />
          <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      </Billboard>
      <Sparkles count={22} scale={[1.3, 1.9, 1.3]} position={[0, 1.0, 0]} size={3} speed={0.35} opacity={0.9} color="#FFE2A8" />
      {/* área de toque (bem maior que o vulto: fácil de acertar com o dedo) */}
      <mesh position={[0, 0.95, 0]} onClick={tocar} onPointerOver={() => setSobre(true)} onPointerOut={() => setSobre(false)}>
        <cylinderGeometry args={[0.75, 0.75, 2.0, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
