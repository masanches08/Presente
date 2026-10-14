import { useCursor } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import {
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  CylinderGeometry,
  LatheGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  QuadraticBezierCurve3,
  Quaternion,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type Group,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { alturaAreia } from './Ambiente'
import { TOURO } from './montar'

// O touro mecânico numa arena inflável vermelha e creme, atrás da tenda da festa.
// Está sempre funcionando, como um de verdade: faz uma sequência de manobras (balanço, giros,
// coice, empinada, "serrote", chacoalhada, pausa), escolhidas conforme a velocidade, e o corpo segue
// cada manobra com molas (embala, passa um pouquinho e volta). O rabo balança atrasado.
// Tocar nele (ou no controle, ou no botão do painel) muda a velocidade:
// devagar → médio → rápido → rodeio! → devagar.
// Sem sombra própria (a sombra da cena é congelada pra ficar leve): uma sombrinha fixa no chão.

export const NIVEIS = ['devagar', 'médio', 'rápido', 'rodeio!'] as const
const LAMPADA = ['#58E07A', '#FFD34A', '#FF9A3C', '#FF3B30']

// ---------------- o movimento ----------------

type Alvo = { yawV: number; pitch: number; roll: number; sobe: number }
type Manobra = (u: number, A: number) => Alvo
const forma = (u: number) => Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), 0.6)
const MANOBRAS: Record<string, Manobra> = {
  balanco: (u, A) => ({ yawV: 0.7 * A * Math.sin(u * Math.PI * 2), pitch: 0.12 * A * Math.sin(u * Math.PI * 4), roll: 0.07 * A * Math.sin(u * Math.PI * 2 + 1), sobe: 0.02 * A * Math.sin(u * Math.PI * 4) }),
  giroE: (u, A) => ({ yawV: 2.8 * A * forma(u), pitch: 0.1 * A * Math.sin(u * Math.PI * 8), roll: -0.12 * A * forma(u), sobe: 0 }),
  giroD: (u, A) => ({ yawV: -2.8 * A * forma(u), pitch: 0.1 * A * Math.sin(u * Math.PI * 8), roll: 0.12 * A * forma(u), sobe: 0 }),
  coice: (u, A) => ({ yawV: 0.4 * A * Math.sin(u * Math.PI), pitch: -0.46 * A * forma(u), roll: 0.05 * A * Math.sin(u * 9), sobe: 0.09 * A * forma(u) }),
  empina: (u, A) => ({ yawV: 0, pitch: 0.4 * A * forma(u), roll: 0, sobe: 0.06 * A * forma(u) }),
  serrote: (u, A) => ({ yawV: 0.5 * A * Math.sin(u * Math.PI * 2), pitch: 0.34 * A * Math.sin(u * Math.PI * 6), roll: 0.05 * A * Math.sin(u * Math.PI * 3), sobe: 0.05 * A * Math.abs(Math.sin(u * Math.PI * 6)) }),
  chacoalha: (u, A) => ({ yawV: 0.9 * A * Math.sin(u * Math.PI * 4), pitch: 0.06 * A * Math.sin(u * Math.PI * 10), roll: 0.22 * A * Math.sin(u * Math.PI * 8), sobe: 0.02 * A }),
  pausa: () => ({ yawV: 0, pitch: 0, roll: 0, sobe: 0 }),
}
/** Cada velocidade: a força das manobras, o ritmo e quais manobras ele faz (com o "peso" de cada) */
const NIVEL: { A: number; ritmo: number; pesos: Record<string, number> }[] = [
  { A: 0.45, ritmo: 0.8, pesos: { balanco: 4, giroE: 1, giroD: 1, pausa: 1 } },
  { A: 0.72, ritmo: 1.0, pesos: { balanco: 2, giroE: 2, giroD: 2, coice: 1, empina: 1, pausa: 1 } },
  { A: 0.98, ritmo: 1.15, pesos: { giroE: 2, giroD: 2, coice: 2, empina: 2, serrote: 1, chacoalha: 1, pausa: 0.5 } },
  { A: 1.25, ritmo: 1.35, pesos: { giroE: 2, giroD: 2, coice: 3, empina: 2, serrote: 2, chacoalha: 2 } },
]
function sortearManobra(pesos: Record<string, number>, antes: string) {
  const lista = Object.entries(pesos).filter(([k]) => k !== antes || k === 'balanco')
  const total = lista.reduce((t, [, p]) => t + p, 0)
  let r = Math.random() * total
  for (const [k, p] of lista) if ((r -= p) <= 0) return k
  return lista[0][0]
}
/** Mola: chega no alvo com embalo (passa um pouquinho e volta) */
function mola(s: { x: number; v: number }, alvo: number, k: number, amort: number, dt: number) {
  const a = k * (alvo - s.x) - 2 * Math.sqrt(k) * amort * s.v
  s.v += a * dt
  s.x += s.v * dt
}

// ---------------- o modelo ----------------

type Pecas = Record<string, BufferGeometry[]>
const juntar = (p: Pecas) => Object.fromEntries(Object.entries(p).map(([k, l]) => [k, mergeGeometries(l)!]))
const por = (p: Pecas, m: string, g: BufferGeometry) => (p[m] ??= []).push(g)

/** Cilindro (ou cone) indo de `a` até `b` */
function entre(a: Vector3, b: Vector3, rA: number, rB: number, seg = 14) {
  const d = new Vector3().subVectors(b, a)
  const g = new CylinderGeometry(rB, rA, d.length(), seg)
  g.translate(0, d.length() / 2, 0)
  g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize()))
  g.translate(a.x, a.y, a.z)
  return g
}
/** Um tubo curvo que vai afinando (chifre, rabo) */
function tuboFino(curva: QuadraticBezierCurve3, raio: number, ponta: number, seg = 16) {
  const g = new TubeGeometry(curva, seg, raio, 8)
  const p = g.attributes.position
  const c = new Vector3()
  const v = new Vector3()
  for (let j = 0; j <= seg; j++) {
    curva.getPointAt(j / seg, c)
    for (let k = 0; k <= 8; k++) {
      const i = j * 9 + k
      v.fromBufferAttribute(p, i).sub(c).multiplyScalar(1 - (1 - ponta) * (j / seg))
      p.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z)
    }
  }
  g.computeVertexNormals()
  return g
}
const esfera = (r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
  const g = new SphereGeometry(r, 22, 16)
  g.scale(sx, sy, sz)
  g.translate(x, y, z)
  return g
}

/** O touro (de frente pra +x), com o centro do corpo na origem */
function montarTouro() {
  const p: Pecas = {}
  // corpo: tronco comprido, cupim (o "morro" do pescoço) e a anca arredondada
  const tronco = new CapsuleGeometry(0.36, 1.0, 8, 18)
  tronco.rotateZ(Math.PI / 2)
  tronco.scale(1, 1, 0.86)
  por(p, 'couro', tronco)
  por(p, 'couro', esfera(0.34, 0.42, 0.12, 0, 1.15, 0.92, 0.9))
  por(p, 'couro', esfera(0.35, -0.48, 0.05, 0, 1, 0.95, 0.88))
  // pescoço e cabeça (baixinha, como touro bravo)
  por(p, 'couro', entre(new Vector3(0.68, 0.06, 0), new Vector3(1.0, -0.08, 0), 0.28, 0.23, 18))
  por(p, 'couro', esfera(0.24, 1.06, -0.12, 0, 1.25, 0.95, 0.92))
  por(p, 'focinho', esfera(0.16, 1.3, -0.22, 0, 1.0, 0.82, 1.15))
  for (const l of [-1, 1]) {
    por(p, 'escuro', esfera(0.026, 1.445, -0.2, l * 0.055))
    por(p, 'escuro', esfera(0.034, 1.16, -0.03, l * 0.19))
    // orelhas
    por(p, 'couro', entre(new Vector3(1.0, 0.04, l * 0.17), new Vector3(1.06, 0.07, l * 0.34), 0.065, 0.015, 10))
    // chifres curvos, afinando até a ponta (que é escurinha)
    const chifre = new QuadraticBezierCurve3(new Vector3(1.0, 0.1, l * 0.14), new Vector3(0.97, 0.16, l * 0.5), new Vector3(1.14, 0.38, l * 0.6))
    por(p, 'chifre', tuboFino(chifre, 0.05, 0.28))
    por(p, 'escuro', esfera(0.016, 1.14, 0.38, l * 0.6))
  }
  // manta acolchoada no lombo (onde senta), com a alça de corda e a cinta
  const manta = new SphereGeometry(0.375, 26, 12, 0, Math.PI * 2, 0, 0.62)
  manta.scale(1.35, 1, 1.05)
  por(p, 'manta', manta)
  const alca = new TorusGeometry(0.1, 0.02, 8, 20)
  alca.translate(0.3, 0.45, 0)
  por(p, 'corda', alca)
  const cinta = new TorusGeometry(0.372, 0.018, 8, 40)
  cinta.rotateY(Math.PI / 2)
  cinta.scale(1, 1, 0.88)
  cinta.translate(0.3, 0, 0)
  por(p, 'corda', cinta)
  // costuras do couro (estofado de verdade tem)
  for (const x of [-0.32, 0.62]) {
    const c = new TorusGeometry(0.362, 0.008, 6, 40)
    c.rotateY(Math.PI / 2)
    c.scale(1, 1, 0.87)
    c.translate(x, 0, 0)
    por(p, 'escuro', c)
  }
  return juntar(p)
}

/** O rabo com o tufo na ponta (balança em volta da base) */
function montarRabo() {
  const p: Pecas = {}
  por(p, 'couro', tuboFino(new QuadraticBezierCurve3(new Vector3(0, 0, 0), new Vector3(-0.2, -0.14, 0), new Vector3(-0.14, -0.56, 0)), 0.03, 0.6, 12))
  por(p, 'escuro', esfera(0.07, -0.14, -0.6, 0, 0.8, 1.4, 0.8))
  return juntar(p)
}

/** A arena inflável (chão acolchoado, gomos em volta, postes com bola em cima) e o pedestal */
function montarArena() {
  const p: Pecas = {}
  const R = 3.55
  const chao = new CylinderGeometry(3.35, 3.4, 0.62, 48)
  chao.translate(0, 0.05, 0)
  por(p, 'chao', chao)
  // gomos infláveis em volta, alternando as duas cores
  const n = 24
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2
    const g = new CapsuleGeometry(0.26, 0.3, 4, 14)
    g.translate(Math.cos(a) * R, 0.52, Math.sin(a) * R)
    por(p, k % 2 ? 'inflavelB' : 'inflavelA', g)
  }
  const cima = new TorusGeometry(R, 0.23, 10, 72)
  cima.rotateX(Math.PI / 2)
  cima.translate(0, 0.9, 0)
  por(p, 'inflavelA', cima)
  const baixo = new TorusGeometry(R, 0.3, 10, 72)
  baixo.rotateX(Math.PI / 2)
  baixo.translate(0, 0.16, 0)
  por(p, 'inflavelB', baixo)
  // os quatro postes infláveis com a bola em cima (nos lados: nenhum fica entre a câmera e o touro)
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2
    const x = Math.cos(a) * R
    const z = Math.sin(a) * R
    const poste = new CapsuleGeometry(0.32, 0.9, 4, 16)
    poste.translate(x, 0.8, z)
    por(p, 'inflavelA', poste)
    por(p, 'inflavelB', esfera(0.31, x, 1.72, z))
    // estrelinha dourada em cima de cada bola
    por(p, 'ouro', esfera(0.07, x, 2.07, z))
  }
  // pedestal: base acolchoada + coluna de metal
  por(p, 'escuro', new CylinderGeometry(0.32, 0.5, 0.42, 24).translate(0, 0.56, 0))
  por(p, 'metal', new CylinderGeometry(0.1, 0.1, 0.5, 14).translate(0, 0.98, 0))
  return juntar(p)
}

/** Feno: palhinhas amarelas em várias direções */
function texFeno() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#C9A24E'
  g.fillRect(0, 0, 128, 128)
  for (let i = 0; i < 700; i++) {
    const x = Math.random() * 128
    const y = Math.random() * 128
    const a = (Math.random() - 0.5) * 0.9
    const l = 6 + Math.random() * 14
    g.strokeStyle = `hsl(${40 + Math.random() * 12}, ${55 + Math.random() * 25}%, ${48 + Math.random() * 28}%)`
    g.lineWidth = 0.8 + Math.random()
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
    g.stroke()
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  return t
}

/** Grãozinho de couro (um relevo bem fininho, pro estofado não parecer plástico liso) */
function texCouro() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const img = g.createImageData(128, 128)
  for (let i = 0; i < 128 * 128; i++) {
    const v = 150 + Math.random() * 70
    img.data.set([v, v, v, 255], i * 4)
  }
  g.putImageData(img, 0, 0)
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(3, 3)
  return t
}

/** Chapéu de cowboy (aba levantada dos lados + copa com vinco) */
function geoChapeu() {
  const aba = new LatheGeometry([new Vector2(0.16, 0.02), new Vector2(0.26, 0.0), new Vector2(0.33, 0.015), new Vector2(0.37, 0.05), new Vector2(0.385, 0.075)], 40)
  aba.scale(1, 1, 0.82)
  const copa = new LatheGeometry([new Vector2(0.0, 0.2), new Vector2(0.09, 0.215), new Vector2(0.155, 0.19), new Vector2(0.175, 0.1), new Vector2(0.17, 0.0)], 32)
  copa.scale(1, 1, 0.85)
  return mergeGeometries([aba.toNonIndexed(), copa.toNonIndexed()])!
}

export function TouroMecanico({ nivel, onTocar }: { nivel: number; onTocar: () => void }) {
  const touro = useMemo(() => montarTouro(), [])
  const rabo = useMemo(() => montarRabo(), [])
  const arena = useMemo(() => montarArena(), [])
  const chapeu = useMemo(() => geoChapeu(), [])
  const feno = useMemo(() => new RoundedBoxGeometry(1.1, 0.48, 0.58, 2, 0.06), [])
  const mats = useMemo(() => {
    const grao = texCouro()
    const couro = (cor: string, rough = 0.42) => new MeshStandardMaterial({ color: cor, roughness: rough, bumpMap: grao, bumpScale: 0.35 })
    const vinil = (cor: string) => new MeshStandardMaterial({ color: cor, roughness: 0.32, metalness: 0.02 })
    return {
      couro: couro('#4A2C1C'),
      focinho: couro('#6E4A33', 0.5),
      manta: couro('#B8432C', 0.55),
      chifre: new MeshStandardMaterial({ color: '#EFE4CC', roughness: 0.3 }),
      escuro: new MeshStandardMaterial({ color: '#16110E', roughness: 0.25 }),
      corda: new MeshStandardMaterial({ color: '#C9A06F', roughness: 0.85 }),
      metal: new MeshStandardMaterial({ color: '#8D9097', roughness: 0.35, metalness: 0.8 }),
      ouro: new MeshStandardMaterial({ color: '#E3BE6E', roughness: 0.3, metalness: 0.85 }),
      chao: vinil('#3D6E7E'),
      inflavelA: vinil('#C2412F'),
      inflavelB: vinil('#F3EADB'),
      feno: new MeshStandardMaterial({ color: '#FFFFFF', map: texFeno(), roughness: 1 }),
      chapeu: couro('#7A4E2D', 0.7),
      sombra: new MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.28, depthWrite: false }),
    }
  }, [])

  const giro = useRef<Group>(null)
  const corpo = useRef<Group>(null)
  const raboRef = useRef<Group>(null)
  const lampada = useRef<MeshBasicMaterial>(null)
  const e = useRef({
    manobra: 'balanco',
    t: 0,
    dur: 2,
    yaw: 0,
    yawV: 0,
    pitch: { x: 0, v: 0 },
    roll: { x: 0, v: 0 },
    sobe: { x: 0, v: 0 },
    raboY: { x: 0, v: 0 },
    raboZ: { x: 0, v: 0 },
  })
  const [sobre, setSobre] = useState(false)
  useCursor(sobre)

  useFrame(({ clock }, dtBruto) => {
    const dt = Math.min(0.04, dtBruto)
    const s = e.current
    const cfg = NIVEL[nivel] ?? NIVEL[0]
    // a sequência de manobras
    s.t += dt * cfg.ritmo
    if (s.t >= s.dur) {
      s.manobra = sortearManobra(cfg.pesos, s.manobra)
      s.t = 0
      s.dur = 1 + Math.random() * 1.2
    }
    const alvo = MANOBRAS[s.manobra](s.t / s.dur, cfg.A)
    // o corpo segue a manobra com molas (o giro acelera e freia com um tempinho)
    const k = 55 * cfg.ritmo * cfg.ritmo
    s.yawV += (alvo.yawV - s.yawV) * Math.min(1, dt * 4 * cfg.ritmo)
    s.yaw += s.yawV * dt
    mola(s.pitch, alvo.pitch, k, 0.45, dt)
    mola(s.roll, alvo.roll, k, 0.45, dt)
    mola(s.sobe, alvo.sobe, k, 0.5, dt)
    // o rabo vai atrasado, frouxo
    mola(s.raboY, -s.yawV * 0.28, 30, 0.22, dt)
    mola(s.raboZ, -s.pitch.v * 0.12 + 0.05, 30, 0.22, dt)
    if (giro.current) giro.current.rotation.y = s.yaw
    if (corpo.current) {
      corpo.current.rotation.z = s.pitch.x
      corpo.current.rotation.x = s.roll.x
      corpo.current.position.y = 0.3 + s.sobe.x
    }
    if (raboRef.current) raboRef.current.rotation.set(0, s.raboY.x, s.raboZ.x)
    // a lampadinha do controle: a cor da velocidade (no rodeio, piscando)
    if (lampada.current) {
      lampada.current.color.set(LAMPADA[nivel] ?? LAMPADA[0])
      lampada.current.color.multiplyScalar(nivel === 3 ? (Math.sin(clock.elapsedTime * 14) > 0 ? 2.2 : 0.4) : 1.8)
    }
  })

  const tocar = (ev: ThreeEvent<MouseEvent>) => {
    ev.stopPropagation()
    if (ev.delta > 12) return
    onTocar()
  }
  const entrou = (ev: ThreeEvent<PointerEvent>) => {
    ev.stopPropagation()
    setSobre(true)
  }

  const y0 = alturaAreia(TOURO.x, TOURO.z) - 0.05
  return (
    <group position={[TOURO.x, y0, TOURO.z]}>
      {Object.entries(arena).map(([m, g]) => (
        <mesh key={m} geometry={g} material={mats[m as keyof typeof mats]} castShadow receiveShadow />
      ))}
      {/* sombrinha parada embaixo do touro */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.37} material={mats.sombra}>
        <circleGeometry args={[1.25, 32]} />
      </mesh>
      {/* o touro: gira em cima da coluna e faz as manobras */}
      <group ref={giro} position-y={1.02}>
        <mesh position-y={0.02} material={mats.metal}>
          <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
        </mesh>
        <group ref={corpo} position-y={0.3} scale={1.2}>
          {Object.entries(touro).map(([m, g]) => (
            <mesh key={m} geometry={g} material={mats[m as keyof typeof mats]} />
          ))}
          <group ref={raboRef} position={[-0.84, 0.1, 0]}>
            {Object.entries(rabo).map(([m, g]) => (
              <mesh key={m} geometry={g} material={mats[m as keyof typeof mats]} />
            ))}
          </group>
          {/* área de toque (maior que o touro, pra acertar fácil mesmo com ele pulando) */}
          <mesh onClick={tocar} onPointerOver={entrou} onPointerOut={() => setSobre(false)}>
            <sphereGeometry args={[1.25, 10, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
        </group>
      </group>
      {/* o controle do lado de fora, de frente pro touro */}
      <group position={[-4.3, 0, -1.6]} rotation-y={-0.35} onClick={tocar} onPointerOver={entrou} onPointerOut={() => setSobre(false)}>
        <mesh position-y={0.55} material={mats.metal}>
          <cylinderGeometry args={[0.04, 0.05, 1.1, 10]} />
        </mesh>
        <mesh position-y={1.18} material={mats.escuro}>
          <boxGeometry args={[0.36, 0.26, 0.16]} />
        </mesh>
        {['#2ECC71', '#F1C40F', '#E74C3C'].map((c, k) => (
          <mesh key={c} position={[-0.09 + k * 0.09, 1.16, -0.085]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.032, 0.032, 0.03, 14]} />
            <meshBasicMaterial color={c} />
          </mesh>
        ))}
        <mesh position-y={1.38}>
          <sphereGeometry args={[0.07, 14, 10]} />
          <meshBasicMaterial ref={lampada} color="#58E07A" toneMapped={false} />
        </mesh>
        <mesh position-y={0.75}>
          <boxGeometry args={[0.7, 1.5, 0.7]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      </group>
      {/* fardos de feno em volta, e um chapéu de cowboy esperando o próximo peão */}
      {(
        [
          [-4.6, 0.6, 0.3],
          [-4.5, 1.9, -0.25],
          [3.9, -3.3, 0.8],
          [4.6, 2.2, 1.9],
        ] as [number, number, number][]
      ).map(([x, z, g], k) => (
        <mesh key={k} geometry={feno} material={mats.feno} position={[x, 0.29, z]} rotation-y={g} castShadow receiveShadow />
      ))}
      <mesh geometry={chapeu} material={mats.chapeu} position={[-4.6, 0.53, 0.6]} rotation={[0.08, 0.6, -0.05]} castShadow />
    </group>
  )
}
