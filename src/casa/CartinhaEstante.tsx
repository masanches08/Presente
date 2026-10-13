import { Sparkles, useCursor } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import { AdditiveBlending, CanvasTexture, Quaternion, Vector3, type Group, type Sprite, type SpriteMaterial } from 'three'
import { ESTANTE_SEMPRE } from '../data/luademel'
import { useDesbloqueios } from '../lib/desbloqueios'
import { Y1 } from './construcao'

// Segredo 2 da lua de mel: um envelopinho escondido na estante do mezanino,
// na 2ª prateleira de cima, entre o 2º e o 3º grupo de livros (a estante fica em decoracao.ts).
// Tocou nele: ele sai do vão, sobe girando com um pozinho dourado e voa até a tela.
// Aí quem continua é o CartinhaHotel (o selo de cera que ela tem que segurar até quebrar).

const ESTANTE = { x: -2.0, y: Y1, z: -4.77 }
/** no vão: x = -0.42 (local), em cima da 2ª prateleira de cima (y = 1.41), rente à frente dos livros */
const NO_VAO = new Vector3(ESTANTE.x - 0.42, ESTANTE.y + 1.41 + 0.072, ESTANTE.z + 0.1)
const LARGURA = 0.1
const ALTURA = 0.14
const R_ABA = LARGURA / Math.sqrt(3) // triângulo da aba com a largura do envelope

const SAINDO = 0.55 // s: escorrega pra fora do vão
const VOANDO = 1.25 // s: sobe girando e vem pra tela

/** O reflexinho de luz no papel */
function texBrilho() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,248,225,1)')
  g.addColorStop(0.3, 'rgba(255,240,200,0.35)')
  g.addColorStop(1, 'rgba(255,240,200,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new CanvasTexture(c)
}

const suave = (t: number) => t * t * (3 - 2 * t)

/** O envelope em si (de frente pra +z, com a aba e o selo virados pra fora) */
function Envelope() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[LARGURA, ALTURA, 0.005]} />
        <meshStandardMaterial color="#F1E8D6" roughness={0.85} />
      </mesh>
      {/* a aba (triângulo apontando pra baixo) */}
      <mesh position={[0, ALTURA / 2 - R_ABA / 2, 0.0028]} rotation-z={Math.PI}>
        <circleGeometry args={[R_ABA, 3, Math.PI / 2]} />
        <meshStandardMaterial color="#E3D5BC" roughness={0.85} />
      </mesh>
      {/* fio dourado na borda da aba */}
      <mesh position={[0, ALTURA / 2 - 0.004, 0.0029]}>
        <boxGeometry args={[LARGURA * 0.96, 0.002, 0.0005]} />
        <meshStandardMaterial color="#C9A86A" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* selo de cera, na ponta da aba */}
      <mesh position={[0, ALTURA / 2 - R_ABA * 1.5 + 0.006, 0.0045]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.014, 0.0155, 0.004, 18]} />
        <meshStandardMaterial color="#8E2420" roughness={0.45} />
      </mesh>
    </group>
  )
}

export function CartinhaEstante({ oculto, onPegou }: { oculto: boolean; onPegou: () => void }) {
  const achou = useDesbloqueios().includes('hotel')
  const grupo = useRef<Group>(null)
  const reflexo = useRef<Sprite>(null)
  const brilho = useMemo(() => texBrilho(), [])
  const [sobre, setSobre] = useState(false)
  const [voando, setVoando] = useState(false)
  const [foi, setFoi] = useState(false)
  useCursor(sobre && !voando)

  const voo = useRef({ inicio: -1, de: new Vector3(), q0: new Quaternion() })
  const tmp = useMemo(() => ({ alvo: new Vector3(), frente: new Vector3(), q: new Quaternion() }), [])

  useFrame(({ clock, camera }) => {
    const g = grupo.current
    if (!g) return
    const t = clock.elapsedTime

    if (!voando) {
      // parado no vão, encostadinho nos livros; de vez em quando "respira" com o vento da janela
      const sopro = Math.max(0, Math.sin(t * 1.1)) ** 12
      g.position.copy(NO_VAO)
      g.rotation.set(-0.12 + sopro * 0.05, 0.08, -0.06 + Math.sin(t * 7) * sopro * 0.03)
      // o reflexo no papel: um brilho rapidinho a cada 6 s
      const r = reflexo.current
      if (r) {
        const f = (t % 6) / 0.35
        const v = f < 1 ? Math.sin(f * Math.PI) : 0
        r.scale.setScalar(0.04 + v * 0.07)
        ;(r.material as SpriteMaterial).opacity = v * 0.9
      }
      return
    }

    const v = voo.current
    if (v.inicio < 0) {
      v.inicio = t
      v.de.copy(g.position)
      v.q0.copy(g.quaternion)
    }
    const dt = t - v.inicio
    if (dt < SAINDO) {
      // 1) escorrega pra fora do vão, inclinando pra frente
      const u = suave(dt / SAINDO)
      g.position.set(NO_VAO.x, NO_VAO.y + u * 0.03, NO_VAO.z + u * 0.16)
      g.rotation.set(-0.12 + u * 0.3, 0.08, -0.06 + u * 0.1)
      return
    }
    // 2) sobe girando e voa até ficar bem na frente da câmera
    const u = Math.min(1, (dt - SAINDO) / VOANDO)
    const e = suave(u)
    camera.getWorldDirection(tmp.frente)
    tmp.alvo.copy(camera.position).addScaledVector(tmp.frente, 0.32)
    const saida = tmp.frente.set(NO_VAO.x, NO_VAO.y + 0.03, NO_VAO.z + 0.16)
    g.position.lerpVectors(saida, tmp.alvo, e)
    g.position.y += Math.sin(u * Math.PI) * 0.35 // um arco pra cima
    // gira duas voltas e chega virado pra ela
    tmp.q.copy(camera.quaternion)
    g.quaternion.copy(tmp.q)
    g.rotateY((1 - e) * Math.PI * 4)
    g.rotateZ(Math.sin(u * Math.PI) * 0.4)
    if (u >= 1 && !foi) {
      setFoi(true)
      onPegou()
    }
  })

  if ((achou && !ESTANTE_SEMPRE && !voando) || foi) return null

  const tocar = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 10 || voando) return // foi um arrasto pra girar, não um toque
    setVoando(true)
    setSobre(false)
  }

  return (
    <group ref={grupo} position={NO_VAO} visible={!oculto}>
      <Envelope />
      <sprite ref={reflexo} position={[0.025, 0.035, 0.006]} scale={0.04}>
        <spriteMaterial map={brilho} transparent depthWrite={false} blending={AdditiveBlending} opacity={0} />
      </sprite>
      {/* pozinho dourado enquanto ele voa */}
      {voando && <Sparkles count={26} scale={[0.3, 0.3, 0.3]} size={2.2} speed={0.6} color="#F3D28C" opacity={0.9} />}
      {/* área de toque um pouco maior que o envelope (ele é pequenininho) */}
      {!oculto && (
        <mesh
          position={[0, 0, 0.03]}
          onClick={tocar}
          onPointerOver={(e) => {
            e.stopPropagation()
            setSobre(true)
          }}
          onPointerOut={() => setSobre(false)}
        >
          <boxGeometry args={[0.13, 0.2, 0.08]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      )}
    </group>
  )
}
