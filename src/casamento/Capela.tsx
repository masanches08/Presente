import { useCursor } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Color, CylinderGeometry, DoubleSide, LatheGeometry, MeshStandardMaterial, Object3D, Shape, ShapeGeometry, Vector2, type Group, type InstancedMesh, type Mesh } from 'three'
import { alturaAreia } from './Ambiente'
import { CAPELA } from './montar'

// O sino do campanário da capela de vidro (a capela em si fica em montar.ts), com a corda pendurada.
// Na parada da capela: arrastar o dedo pra baixo PUXA a corda (a corda balança e a borla brilha, chamando o dedo) (o sino vai inclinando junto) e soltar
// faz o sino badalar — quanto mais forte o puxão, mais ele balança e mais pétalas caem.
// Na visão livre: tocar no sino também faz ele badalar.
// As pétalas caem rodopiando em volta da porta e dentro da capela, e ficam um tempinho no chão.

const N = 320
const CORES = ['#FFFFFF', '#FBE3DD', '#F2B9B4', '#D9C7EE', '#FFF1EA']
const CORDA = 3.0 // comprimento da corda (m)

interface Props {
  /** Cada vez que muda, o sino badala (toque no sino na visão livre) */
  toques: number
  onTocar: () => void
  /** A parada da capela está na tela: o dedo puxa a corda */
  gesto: boolean
  /** Avisa cada badalada (com a força dela) — é o que solta a cartinha escondida no sino */
  onBadalou?: (forca: number) => void
}

export function SinoCapela({ toques, onTocar, gesto, onBadalou }: Props) {
  const { gl, size } = useThree()
  const y0 = alturaAreia(CAPELA.x, CAPELA.z) + 0.38
  // onde o sino fica pendurado (na travessa do campanário, na frente do oitão)
  const pivo = useMemo(() => [CAPELA.x, y0 + 5.3 + 0.84, CAPELA.z + 5.1] as [number, number, number], [y0])
  const sino = useRef<Group>(null)
  const corda = useRef<Mesh>(null)
  const borla = useRef<Group>(null)
  const cordaGrupo = useRef<Group>(null)
  const petalas = useRef<InstancedMesh>(null)
  const balanco = useRef({ x: 0, v: 0 })
  // quanto a corda está puxada (0..1) e a "mola" dela quando solta
  const puxa = useRef({ alvo: 0, x: 0, v: 0, segurando: false, inicioY: 0 })
  const [sobre, setSobre] = useState(false)
  useCursor(sobre)

  const geo = useMemo(
    () =>
      new LatheGeometry(
        [new Vector2(0.0, 0.02), new Vector2(0.05, 0.0), new Vector2(0.09, -0.06), new Vector2(0.11, -0.18), new Vector2(0.13, -0.27), new Vector2(0.17, -0.31), new Vector2(0.0, -0.31)],
        24,
      ),
    [],
  )
  // a corda: presa em cima, estica pra baixo
  const geoCorda = useMemo(() => new CylinderGeometry(0.03, 0.03, CORDA, 8).translate(0, -CORDA / 2, 0), [])
  const bronze = useMemo(() => new MeshStandardMaterial({ color: '#C9A24A', metalness: 0.85, roughness: 0.3 }), [])
  const matCorda = useMemo(() => new MeshStandardMaterial({ color: '#E8D2B0', roughness: 0.9 }), [])
  // a borla brilha de levinho, chamando o dedo (sem precisar de aviso nenhum)
  const matBorla = useMemo(() => new MeshStandardMaterial({ color: '#B8432C', roughness: 0.8, emissive: '#FFB347', emissiveIntensity: 0.3 }), [])
  // pétala de rosa: arredondada em cima, afinando embaixo (e meio curvinha)
  const geoPetala = useMemo(() => {
    const f = new Shape()
    f.moveTo(0, -0.03)
    f.bezierCurveTo(0.03, -0.02, 0.035, 0.02, 0.018, 0.034)
    f.bezierCurveTo(0.008, 0.042, -0.008, 0.042, -0.018, 0.034)
    f.bezierCurveTo(-0.035, 0.02, -0.03, -0.02, 0, -0.03)
    const g = new ShapeGeometry(f, 6)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getX(i) * pos.getX(i) * 9)
    g.computeVertexNormals()
    return g
  }, [])
  const matPetala = useMemo(() => new MeshStandardMaterial({ side: DoubleSide, roughness: 0.6 }), [])

  // as pétalas: onde estão, como caem e quanto tempo ficam no chão
  const p = useMemo(
    () => ({
      pos: new Float32Array(N * 3),
      vel: new Float32Array(N * 3),
      giro: new Float32Array(N * 3),
      vida: new Float32Array(N).fill(-1),
      chao: new Float32Array(N),
      proxima: 0,
      o: new Object3D(),
    }),
    [],
  )
  useEffect(() => {
    const m = petalas.current
    if (!m) return
    const c = new Color()
    p.o.scale.setScalar(0)
    p.o.updateMatrix()
    for (let i = 0; i < N; i++) {
      m.setColorAt(i, c.set(CORES[i % CORES.length]))
      m.setMatrixAt(i, p.o.matrix)
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.instanceMatrix.needsUpdate = true
  }, [p])

  /** O sino badala com uma força (0..1): balança e solta pétalas (mais força, mais pétalas) */
  const badalar = (forca: number) => {
    onBadalou?.(forca)
    balanco.current.v += 2 + 4.5 * forca
    const n = Math.round(N * (0.3 + 0.7 * forca))
    for (let k = 0; k < n; k++) {
      const i = p.proxima
      p.proxima = (p.proxima + 1) % N
      // metade cai na frente da porta (onde a câmera está olhando), metade dentro da capela
      const fora = k % 2 === 0
      const x = CAPELA.x + (Math.random() - 0.5) * (fora ? 5.5 : 5.6)
      const z = CAPELA.z + (fora ? 5.4 + Math.random() * 3.4 : -4.4 + Math.random() * 7)
      const y = fora ? y0 + 3.5 + Math.random() * 3 : y0 + 3.0 + Math.random() * 1.6
      p.pos.set([x, y, z], i * 3)
      p.vel.set([(Math.random() - 0.5) * 0.4, -(0.45 + Math.random() * 0.35), (Math.random() - 0.5) * 0.4], i * 3)
      p.giro.set([Math.random() * 6, Math.random() * 6, Math.random() * 6], i * 3)
      p.vida[i] = -Math.random() * 0.9 // (umas começam um tiquinho depois das outras)
      p.chao[i] = (fora ? alturaAreia(x, z) : y0) + 0.012
    }
  }

  // toque no sino (visão livre)
  useEffect(() => {
    if (toques) badalar(0.75)
  }, [toques]) // eslint-disable-line react-hooks/exhaustive-deps

  // o dedo puxa a corda (arrastar pra baixo) e solta
  useEffect(() => {
    if (!gesto) return
    const el = gl.domElement
    const pz = puxa.current
    const desce = (e: PointerEvent) => {
      pz.segurando = true
      pz.inicioY = e.clientY
      pz.alvo = 0
    }
    const move = (e: PointerEvent) => {
      if (!pz.segurando) return
      pz.alvo = Math.min(1, Math.max(0, (e.clientY - pz.inicioY) / (size.height * 0.28)))
    }
    const sobe = () => {
      if (!pz.segurando) return
      pz.segurando = false
      if (pz.x > 0.1) badalar(pz.x)
      pz.alvo = 0
    }
    el.addEventListener('pointerdown', desce)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', sobe)
    window.addEventListener('pointercancel', sobe)
    return () => {
      el.removeEventListener('pointerdown', desce)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', sobe)
      window.removeEventListener('pointercancel', sobe)
    }
  }, [gesto, gl, size.height]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock }, dtBruto) => {
    const dt = Math.min(0.05, dtBruto)
    // a corda: segue o dedo enquanto puxa; solta, volta pra cima dando uns pulinhos
    const pz = puxa.current
    const b0 = balanco.current.x
    if (pz.segurando) {
      pz.x += (pz.alvo - pz.x) * Math.min(1, dt * 18)
      pz.v = 0
    } else {
      pz.v += (-90 * pz.x - 7 * pz.v) * dt
      pz.x += pz.v * dt
    }
    // parada, a corda fica balançando de leve e a borla pisca dourada: dá vontade de puxar
    if (cordaGrupo.current) cordaGrupo.current.rotation.z = pz.segurando ? 0 : Math.sin(clock.elapsedTime * 1.4) * 0.035 + b0 * 0.15
    matBorla.emissiveIntensity = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.6))
    const estica = 1 + Math.max(-0.05, pz.x) * 0.35
    if (corda.current) corda.current.scale.y = estica
    if (borla.current) borla.current.position.y = -CORDA * estica
    // o sino: inclina enquanto a corda é puxada; solto, é um pêndulo que demora pra parar
    const b = balanco.current
    b.v += (-14 * b.x - 0.35 * b.v) * dt
    b.x += b.v * dt
    if (sino.current) sino.current.rotation.z = b.x - (pz.segurando ? pz.x * 0.7 : 0)
    // as pétalas: caem rodopiando, com um vaivém, e depois de um tempo no chão somem
    const m = petalas.current
    if (!m) return
    const t = clock.elapsedTime
    let mexeu = false
    for (let i = 0; i < N; i++) {
      if (p.vida[i] === -1) continue
      mexeu = true
      p.vida[i] += dt
      const j = i * 3
      if (p.vida[i] < 0) {
        p.o.scale.setScalar(0)
      } else if (p.pos[j + 1] > p.chao[i]) {
        p.pos[j] += (p.vel[j] + Math.sin(t * 2.3 + i) * 0.35) * dt
        p.pos[j + 1] += p.vel[j + 1] * dt
        p.pos[j + 2] += (p.vel[j + 2] + Math.cos(t * 1.9 + i * 0.7) * 0.35) * dt
        p.giro[j] += dt * 3.1
        p.giro[j + 1] += dt * 2.2
        p.o.scale.setScalar(1)
      } else {
        // no chão: deitada, e some aos poucos depois de uns 10 s
        p.pos[j + 1] = p.chao[i]
        p.giro[j] = -Math.PI / 2
        p.giro[j + 1] = 0
        const resto = Math.max(0, 1 - Math.max(0, p.vida[i] - 11) / 2)
        p.o.scale.setScalar(resto)
        if (resto === 0) p.vida[i] = -1
      }
      p.o.position.set(p.pos[j], p.pos[j + 1], p.pos[j + 2])
      p.o.rotation.set(p.giro[j], p.giro[j + 1], p.giro[j + 2])
      p.o.updateMatrix()
      m.setMatrixAt(i, p.o.matrix)
    }
    if (mexeu) m.instanceMatrix.needsUpdate = true
  })

  const tocar = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 12 || gesto) return // (na parada da capela quem toca o sino é a corda)
    onTocar()
  }

  return (
    <>
      <group ref={sino} position={pivo} scale={1.7}>
        <mesh geometry={geo} material={bronze} />
        <mesh position-y={-0.3} material={bronze}>
          <sphereGeometry args={[0.04, 10, 8]} />
        </mesh>
        {/* área de toque bem maior que o sininho */}
        <mesh position-y={-0.15} onClick={tocar} onPointerOver={() => setSobre(true)} onPointerOut={() => setSobre(false)}>
          <sphereGeometry args={[0.7, 10, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      </group>
      {/* a corda do sino, descendo na frente da porta, com a borla vermelha na ponta */}
      <group ref={cordaGrupo} position={[pivo[0] + 0.08, pivo[1] - 0.45, pivo[2] + 0.16]}>
        <mesh ref={corda} geometry={geoCorda} material={matCorda} />
        <group ref={borla} position-y={-CORDA}>
          <mesh material={matBorla} position-y={-0.08}>
            <sphereGeometry args={[0.08, 12, 10]} />
          </mesh>
          <mesh material={matBorla} position-y={-0.3}>
            <coneGeometry args={[0.12, 0.38, 12]} />
          </mesh>
        </group>
      </group>
      <instancedMesh ref={petalas} args={[geoPetala, matPetala, N]} frustumCulled={false} />
    </>
  )
}
