import { useAnimations, useCursor, useGLTF } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AdditiveBlending, CanvasTexture, CatmullRomCurve3, Vector3, type Camera, type Group, type Sprite, type SpriteMaterial } from 'three'
import { ARARA_SEMPRE, CHANCE_ARARA } from '../data/luademel'
import { desbloquear, jaDesbloqueado } from '../lib/desbloqueios'
import { altura } from './terreno'

// Revoada: de tempos em tempos um pássaro atravessa a tela, sempre na frente de onde a câmera está olhando
// (na vista geral, na casa, na praia…), e some do outro lado. Uns vêm, outros vão.
// Cada arara que passa tem uma chance (CHANCE_ARARA) de trazer a cartinha amarrada no pezinho.
// Tocou na arara da cartinha: o segredo da lua de mel é desbloqueado.

type Tipo = 'arara' | 'flamingo'
const MODELOS: Record<Tipo, { url: string; escala: number }> = {
  arara: { url: '/models/Parrot.glb', escala: 0.03 },
  flamingo: { url: '/models/Flamingo.glb', escala: 0.028 },
}

// cada "vaga" é um pássaro que fica indo e voltando
const VAGAS: { tipo: Tipo; primeira: [number, number]; espera: [number, number] }[] = [
  { tipo: 'arara', primeira: [2, 6], espera: [8, 18] },
  { tipo: 'arara', primeira: [9, 15], espera: [10, 22] },
  { tipo: 'arara', primeira: [16, 24], espera: [12, 26] },
  { tipo: 'flamingo', primeira: [5, 12], espera: [14, 30] },
]
const DURACAO = { normal: [13, 18] as [number, number], cartinha: [24, 28] as [number, number] }

const sorteio = ([a, b]: [number, number]) => a + Math.random() * (b - a)

// só uma cartinha no ar por vez
let cartinhaNoAr = false

/** Uma rota que cruza a tela de um lado pro outro, na frente da câmera, numa altura boa de ver */
function novaRota(camera: Camera) {
  const frente = new Vector3()
  camera.getWorldDirection(frente)
  frente.y = 0
  if (frente.lengthSq() < 1e-4) frente.set(0, 0, -1)
  frente.normalize()
  const direita = new Vector3(-frente.z, 0, frente.x)
  const lado = Math.random() < 0.5 ? 1 : -1
  const dist = sorteio([18, 30])
  const centro = camera.position.clone().addScaledVector(frente, dist)
  const alturaBase = camera.position.y + sorteio([-3, 2])
  const pontos = [
    [-62, 22, 7],
    [-26, 4, 1.5],
    [0, sorteio([-3, 3]), 0],
    [26, 4, 1.5],
    [62, 22, 6],
  ].map(([s, f, h]) => {
    const p = centro.clone().addScaledVector(direita, s * lado).addScaledVector(frente, f)
    p.y = Math.max(alturaBase + h, altura(p.x, p.z) + 5)
    return p
  })
  return new CatmullRomCurve3(pontos, false, 'catmullrom', 0.5)
}

/** O reflexinho de luz no papel */
function texBrilho() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new CanvasTexture(c)
}

/**
 * A cartinha: envelope de papel comum com selo de cera, pendurada num barbante.
 * Nada de brilho chamativo: só um reflexinho rápido de vez em quando.
 */
function Cartinha() {
  const balanco = useRef<Group>(null)
  const reflexo = useRef<Sprite>(null)
  const brilho = useMemo(() => texBrilho(), [])
  useFrame(({ clock }) => {
    const g = balanco.current
    if (!g) return
    const t = clock.elapsedTime
    g.rotation.z = Math.sin(t * 2.6) * 0.25
    g.rotation.x = Math.sin(t * 1.9) * 0.12
    // reflexo: aparece por ~0,3 s a cada 5 s
    const r = reflexo.current
    if (r) {
      const f = (t % 5) / 0.3
      const v = f < 1 ? Math.sin(f * Math.PI) : 0
      r.scale.setScalar(0.25 + v * 0.35)
      ;(r.material as SpriteMaterial).opacity = v * 0.8
    }
  })
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
          <meshStandardMaterial color="#EFE6D4" roughness={0.9} />
        </mesh>
        {/* a aba do envelope (dos dois lados) */}
        {[1, -1].map((l) => (
          <mesh key={l} position={[0, 0.03, l * 0.014]} rotation={[0, l === 1 ? 0 : Math.PI, Math.PI]}>
            <circleGeometry args={[0.24, 3, Math.PI / 2]} />
            <meshStandardMaterial color="#E4D8C2" roughness={0.9} />
          </mesh>
        ))}
        {/* selo de cera */}
        {[1, -1].map((l) => (
          <mesh key={'s' + l} position={[0, -0.04, l * 0.017]} rotation-y={l === 1 ? 0 : Math.PI}>
            <circleGeometry args={[0.055, 16]} />
            <meshStandardMaterial color="#9C2B25" roughness={0.5} />
          </mesh>
        ))}
        <sprite ref={reflexo} position={[0.14, 0.08, 0.03]} scale={0.25}>
          <spriteMaterial map={brilho} transparent depthWrite={false} blending={AdditiveBlending} opacity={0} />
        </sprite>
      </group>
    </group>
  )
}

function Passaro({ vaga, onPegou }: { vaga: (typeof VAGAS)[number]; onPegou: () => void }) {
  const m = MODELOS[vaga.tipo]
  const { scene, animations } = useGLTF(m.url)
  const copia = useMemo(() => scene.clone(true), [scene])
  const grupo = useRef<Group>(null)
  const modelo = useRef<Group>(null)
  const { actions, names } = useAnimations(animations, modelo)
  const [comCartinha, setComCartinha] = useState(false)
  const [sobre, setSobre] = useState(false)
  useCursor(sobre && comCartinha)

  const voo = useRef({ rota: null as CatmullRomCurve3 | null, inicio: 0, duracao: 15, proxima: sorteio(vaga.primeira), fuga: -1, cartinha: false })
  const ponto = useMemo(() => new Vector3(), [])
  const frente = useMemo(() => new Vector3(), [])
  const tela = useMemo(() => new Vector3(), [])
  const debug = useMemo(() => new URLSearchParams(window.location.search).has('debug'), [])

  useEffect(() => {
    const a = actions[names[0]]
    a?.reset().play()
    if (a) a.timeScale = 0.8 + Math.random() * 0.3
  }, [actions, names])

  // se a página sair, a cartinha volta a poder aparecer em outro pássaro
  useEffect(
    () => () => {
      if (voo.current.cartinha) cartinhaNoAr = false
    },
    [],
  )

  useFrame(({ clock, camera, size }, dt) => {
    const g = grupo.current
    if (!g) return
    const t = clock.elapsedTime
    const v = voo.current

    // parado esperando a próxima passada
    if (!v.rota) {
      g.visible = false
      if (t < v.proxima) return
      v.rota = novaRota(camera)
      v.inicio = t
      v.fuga = -1
      v.cartinha = vaga.tipo === 'arara' && !cartinhaNoAr && (ARARA_SEMPRE || !jaDesbloqueado('arara')) && Math.random() < CHANCE_ARARA
      if (v.cartinha) cartinhaNoAr = true
      v.duracao = sorteio(v.cartinha ? DURACAO.cartinha : DURACAO.normal)
      setComCartinha(v.cartinha)
      g.rotation.set(0, 0, 0)
    }

    if (v.fuga === -2) v.fuga = t
    let u = (t - v.inicio) / v.duracao
    if (v.fuga >= 0) u = Math.min(1, u + (t - v.fuga) * 0.05) // soltou a cartinha: vai embora mais rápido
    if (u >= 1) {
      g.visible = false
      v.rota = null
      if (v.cartinha) cartinhaNoAr = false
      v.cartinha = false
      setComCartinha(false)
      v.proxima = t + sorteio(vaga.espera)
      return
    }
    g.visible = true
    v.rota.getPointAt(u, ponto)
    v.rota.getTangentAt(u, frente)
    g.position.copy(ponto)
    g.position.y += Math.sin(t * 2.2) * 0.25
    const alvo = Math.atan2(frente.x, frente.z)
    let d = alvo - g.rotation.y
    d = Math.atan2(Math.sin(d), Math.cos(d))
    g.rotation.y += u < 0.02 ? d : d * Math.min(1, dt * 3)
    g.rotation.z = -d * 0.8

    // (teste automático: onde está a arara da cartinha na tela)
    if (debug && v.cartinha && v.fuga === -1) {
      tela.copy(g.position).project(camera)
      ;(window as unknown as { __arara?: unknown }).__arara = { visivel: tela.z < 1, x: ((tela.x + 1) / 2) * size.width, y: ((1 - tela.y) / 2) * size.height }
    }
  })

  const tocar = (e: ThreeEvent<MouseEvent>) => {
    const v = voo.current
    if (!grupo.current?.visible || !v.cartinha || v.fuga >= 0) return
    e.stopPropagation()
    if (e.delta > 12) return
    v.fuga = -2 // marcado; o horário certo é pego no próximo quadro
    setComCartinha(false)
    desbloquear('arara')
    onPegou()
  }

  return (
    <group ref={grupo} visible={false}>
      <group ref={modelo} scale={m.escala}>
        <primitive object={copia} />
      </group>
      {comCartinha && (
        <>
          <group scale={1.6}>
            <Cartinha />
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
        </>
      )}
    </group>
  )
}

export function Revoada({ onPegou }: { onPegou: () => void }) {
  return (
    <>
      {VAGAS.map((v, i) => (
        <Passaro key={i} vaga={v} onPegou={onPegou} />
      ))}
    </>
  )
}

for (const m of Object.values(MODELOS)) useGLTF.preload(m.url)
