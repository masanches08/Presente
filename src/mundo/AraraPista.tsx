import { Sparkles, useAnimations, useCursor, useGLTF } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AdditiveBlending, CanvasTexture, CatmullRomCurve3, Vector3, type Group } from 'three'
import { CHANCE_ARARA } from '../data/luademel'
import { desbloquear, jaDesbloqueado } from '../lib/desbloqueios'

// A arara que passa de vez em quando com uma cartinha amarrada no pezinho.
// Tocou nela: a cartinha solta, o segredo da lua de mel é desbloqueado.

const DURACAO = 42 // segundos de cada passada (devagar, pra dar pra tocar)
const ESPERA: [number, number] = [25, 60] // intervalo entre uma passada e outra (s)
const PRIMEIRA: [number, number] = [6, 14] // quando aparece a primeira vez depois de abrir o site (s)

// o caminho: chega de longe, dá umas voltas na frente da casa e do jardim e vai embora pro mar
const CAMINHO = new CatmullRomCurve3(
  [
    [-90, 30, 40],
    [-34, 15, 30],
    [-12, 11, 26],
    [0, 10, 28],
    [10, 10.5, 22],
    [8, 11.5, 12],
    [-4, 11, 14],
    [-6, 10, 24],
    [4, 9.5, 30],
    [20, 12, 26],
    [50, 18, 16],
    [110, 30, 0],
  ].map(([x, y, z]) => new Vector3(x, y, z)),
  false,
  'catmullrom',
  0.4,
)

const sorteio = ([a, b]: [number, number]) => a + Math.random() * (b - a)

/** Brilhinho dourado atrás da cartinha (pra chamar atenção sem pesar) */
function texBrilho() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,236,170,1)')
  g.addColorStop(0.35, 'rgba(255,214,120,0.45)')
  g.addColorStop(1, 'rgba(255,200,100,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new CanvasTexture(c)
}

/** A cartinha: envelope creme com selo de cera vermelho, pendurada num barbante */
function Cartinha({ pegou }: { pegou: boolean }) {
  const balanco = useRef<Group>(null)
  const brilho = useMemo(() => texBrilho(), [])
  useFrame(({ clock }) => {
    const g = balanco.current
    if (!g) return
    const t = clock.elapsedTime
    g.rotation.z = Math.sin(t * 2.6) * 0.25
    g.rotation.x = Math.sin(t * 1.9) * 0.12
  })
  if (pegou) return null
  return (
    <group ref={balanco} position={[0, -0.08, -0.05]}>
      {/* barbante */}
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.44, 4]} />
        <meshBasicMaterial color="#C9A06F" />
      </mesh>
      <group position={[0, -0.56, 0]}>
        <mesh>
          <boxGeometry args={[0.46, 0.32, 0.025]} />
          <meshStandardMaterial color="#FFF6E2" roughness={0.8} emissive="#FFF0CC" emissiveIntensity={0.35} />
        </mesh>
        {/* a aba do envelope (dos dois lados) */}
        {[1, -1].map((lado) => (
          <mesh key={lado} position={[0, 0.03, lado * 0.014]} rotation={[0, lado === 1 ? 0 : Math.PI, Math.PI]}>
            <circleGeometry args={[0.24, 3, Math.PI / 2]} />
            <meshStandardMaterial color="#F3E3C0" roughness={0.8} />
          </mesh>
        ))}
        {/* selo de cera */}
        {[1, -1].map((lado) => (
          <mesh key={'s' + lado} position={[0, -0.04, lado * 0.017]} rotation-y={lado === 1 ? 0 : Math.PI}>
            <circleGeometry args={[0.055, 16]} />
            <meshStandardMaterial color="#B0302A" emissive="#7A1612" emissiveIntensity={0.4} roughness={0.4} />
          </mesh>
        ))}
        <sprite scale={1.5}>
          <spriteMaterial map={brilho} transparent depthWrite={false} blending={AdditiveBlending} opacity={0.85} />
        </sprite>
        <Sparkles count={14} scale={1.3} size={4} speed={0.5} color="#FFE29A" />
      </group>
    </group>
  )
}

export function AraraPista({ onPegou }: { onPegou: () => void }) {
  // sorteia uma vez só, quando o site abre (e não volta depois de achada)
  const [ativa] = useState(() => !jaDesbloqueado('arara') && Math.random() < CHANCE_ARARA)
  if (!ativa) return null
  return <Arara onPegou={onPegou} />
}

function Arara({ onPegou }: { onPegou: () => void }) {
  const { scene, animations } = useGLTF('/models/Parrot.glb')
  const copia = useMemo(() => scene.clone(true), [scene])
  const grupo = useRef<Group>(null)
  const modelo = useRef<Group>(null)
  const { actions, names } = useAnimations(animations, modelo)
  const [pegou, setPegou] = useState(false)
  const [sobre, setSobre] = useState(false)
  useCursor(sobre && !pegou)

  // relógio da passada: começa escondida e aparece de vez em quando
  const passada = useRef({ inicio: -1, proxima: sorteio(PRIMEIRA), fuga: -1 })

  useEffect(() => {
    const a = actions[names[0]]
    a?.reset().play()
    if (a) a.timeScale = 0.8
  }, [actions, names])

  const ponto = useMemo(() => new Vector3(), [])
  const frente = useMemo(() => new Vector3(), [])

  const tela = useMemo(() => new Vector3(), [])
  const debug = useMemo(() => new URLSearchParams(window.location.search).has('debug'), [])

  useFrame(({ clock, camera, size }, dt) => {
    const g = grupo.current
    if (!g) return
    // (teste automático: onde a arara está na tela)
    if (debug) {
      tela.copy(g.position).project(camera)
      ;(window as unknown as { __arara?: unknown }).__arara = {
        visivel: g.visible && tela.z < 1,
        x: ((tela.x + 1) / 2) * size.width,
        y: ((1 - tela.y) / 2) * size.height,
      }
    }
    const t = clock.elapsedTime
    const p = passada.current
    if (p.inicio < 0) {
      g.visible = false
      if (t >= p.proxima && !pegou) p.inicio = t
      return
    }
    let u = (t - p.inicio) / DURACAO
    // depois de soltar a cartinha, vai embora mais rápido
    if (pegou) {
      if (p.fuga < 0) p.fuga = t
      u = Math.min(1, u + (t - p.fuga) * 0.06)
    }
    if (u >= 1) {
      g.visible = false
      p.inicio = -1
      p.proxima = pegou ? Infinity : t + sorteio(ESPERA)
      return
    }
    g.visible = true
    CAMINHO.getPointAt(u, ponto)
    CAMINHO.getTangentAt(u, frente)
    g.position.copy(ponto)
    g.position.y += Math.sin(t * 2.2) * 0.25 // sobe e desce de leve batendo as asas
    const alvoY = Math.atan2(frente.x, frente.z)
    let d = alvoY - g.rotation.y
    d = Math.atan2(Math.sin(d), Math.cos(d))
    g.rotation.y += d * Math.min(1, dt * 3)
    g.rotation.z = -d * 0.8 // inclina na curva
  })

  const tocar = (e: ThreeEvent<MouseEvent>) => {
    if (!grupo.current?.visible) return // escondida: deixa o toque passar pras outras coisas
    e.stopPropagation()
    if (pegou || e.delta > 12) return
    setPegou(true)
    desbloquear('arara')
    onPegou()
  }

  return (
    <group ref={grupo} visible={false}>
      <group ref={modelo} scale={0.03}>
        <primitive object={copia} />
      </group>
      <group scale={1.9}>
        <Cartinha pegou={pegou} />
      </group>
      {/* área de toque bem maior que a arara (ela está voando) */}
      <mesh
        position={[0, -0.6, 0]}
        onClick={tocar}
        onPointerOver={(e) => {
          if (!grupo.current?.visible) return
          e.stopPropagation()
          setSobre(true)
        }}
        onPointerOut={() => setSobre(false)}
      >
        <sphereGeometry args={[2.8, 10, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  )
}
