import { useCursor } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type Group,
  type InstancedMesh,
  type PerspectiveCamera,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PIER } from './montar'

// Lanternas de papel (as do céu).
// No píer: uma lanterna espera em cima de uma mesinha na beira do deck, de frente pro mar.
// Enquanto o dedo SEGURA (em qualquer lugar da tela), ela vai acendendo — a chama cresce, o papel brilha;
// acesa de tudo, ela "enche", tremelica e sobe sozinha pro céu; logo aparece outra na mesinha.
// Soltou antes: ela vai apagando devagar. Ao chegar no píer, algumas sobem sozinhas da beira do deck;
// na visão livre, tocar no gazebo solta uma.
// Na noite dos fogos: lanternas sobem do mar durante o show (longe da câmera, pra não tampar o céu).

const MAX = 60
/** A plataforma do fim do píer, na frente do gazebo (o céu ali é aberto) */
const BEIRA_DECK = new Vector3(PIER.x, PIER.y, PIER.z1 - 7.3)
/** A mesinha com a lanterna que acende */
const MESA = BEIRA_DECK.clone()
const ALTURA_MESA = 0.92
/** Quanto tempo segurando pra acender de tudo (s) */
const ACENDER = 1.8

interface Lanterna {
  pos: Vector3
  vel: Vector3
  vida: number
  espera: number
  fase: number
  luz: number
}

interface Props {
  /** cada vez que muda, sobem algumas da beira do deck (chegada no píer / toque no gazebo) */
  soltar: number
  /** a parada do píer está na tela: o dedo acende a lanterna da mesinha */
  gesto: boolean
  /** a noite dos fogos: lanternas sobem da beira do mar */
  noite: boolean
}

export function Lanternas({ soltar, gesto, noite }: Props) {
  const { gl, camera } = useThree()
  const corpo = useRef<InstancedMesh>(null)
  const aro = useRef<InstancedMesh>(null)
  const chama = useRef<InstancedMesh>(null)
  const daMesa = useRef<Group>(null)
  const [sobre, setSobre] = useState(false)
  useCursor(sobre)

  // ---------- a lanterna: papel em gomos (mais largo em cima), tampinha, aro de bambu e a chama ----------
  const geo = useMemo(() => {
    const lados = 16
    const g = new CylinderGeometry(0.36, 0.25, 0.8, lados, 4, true)
    const pos = g.attributes.position
    const cores = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getY(i) + 0.4) / 0.8 // 0 embaixo, 1 em cima
      const dobra = (i % (lados + 1)) % 2 ? 0.82 : 1
      if (t > 0.99) {
        pos.setX(i, pos.getX(i) * 0.78)
        pos.setZ(i, pos.getZ(i) * 0.78)
      }
      const k = (1.35 - t * 0.6) * dobra
      cores.set([1.5 * k, 0.72 * k, 0.28 * k], i * 3)
    }
    g.setAttribute('color', new BufferAttribute(cores, 3))
    const tampa = new CylinderGeometry(0.28, 0.28, 0.01, lados)
    tampa.translate(0, 0.4, 0)
    const ct = new Float32Array(tampa.attributes.position.count * 3)
    for (let i = 0; i < ct.length; i += 3) ct.set([0.75, 0.38, 0.15], i)
    tampa.setAttribute('color', new BufferAttribute(ct, 3))
    return mergeGeometries([g.toNonIndexed(), tampa.toNonIndexed()])!
  }, [])
  const mat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, toneMapped: false }), [])
  const geoAro = useMemo(() => new TorusGeometry(0.25, 0.018, 6, 20).rotateX(Math.PI / 2).translate(0, -0.4, 0), [])
  const geoChama = useMemo(() => new SphereGeometry(0.07, 10, 8).scale(1, 1.6, 1).translate(0, -0.32, 0), [])
  const matAro = useMemo(() => new MeshBasicMaterial({ color: '#3B2414' }), [])
  const matChama = useMemo(() => new MeshBasicMaterial({ color: new Color(3, 2.2, 1.1), toneMapped: false }), [])
  const matMadeira = useMemo(() => new MeshStandardMaterial({ color: '#9A6A45', roughness: 0.7 }), [])

  // o brilho em volta de cada lanterna (um pontinho de luz macio)
  const brilho = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array((MAX + 1) * 3), 3))
    g.setAttribute('tam', new BufferAttribute(new Float32Array(MAX + 1), 1))
    return g
  }, [])
  const matBrilho = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { escala: { value: 700 } },
        vertexShader: /* glsl */ `
          attribute float tam;
          uniform float escala;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = tam * escala / max(1.0, -mv.z);
          }
        `,
        fragmentShader: /* glsl */ `
          void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            float a = 1.0 - smoothstep(0.0, 1.0, d);
            gl_FragColor = vec4(vec3(1.0, 0.62, 0.28) * a * a * 0.55, 1.0);
          }
        `,
      }),
    [],
  )

  const s = useMemo(() => ({ lista: [] as Lanterna[], o: new Object3D(), c: new Color() }), [])
  // a da mesinha: quanto já acendeu, se o dedo está segurando, e a que aparece de novo depois que uma sobe
  const mesa = useRef({ luz: 0, segurando: false, aparece: 1, tremor: 0 })

  const nova = (pos: Vector3, espera = 0, vel = new Vector3(0, 0.15, -0.2)) => {
    if (s.lista.length >= MAX) return
    s.lista.push({ pos: pos.clone(), vel, vida: 0, espera, fase: Math.random() * 10, luz: 1 })
  }
  /** Algumas sobem da beira do deck (na frente do gazebo, onde o céu é aberto) */
  const daBeira = (n: number) => {
    for (let k = 0; k < n; k++) nova(BEIRA_DECK.clone().add(new Vector3((Math.random() - 0.5) * 6, 0.5, (Math.random() - 0.5) * 1.2)), k * 0.6 + Math.random() * 0.3)
  }
  useEffect(() => {
    if (soltar) daBeira(3)
  }, [soltar]) // eslint-disable-line react-hooks/exhaustive-deps

  // a noite dos fogos: uma fileira de lanternas saindo da beira do mar, aos pouquinhos
  useEffect(() => {
    if (!noite) return
    for (let k = 0; k < 16; k++) nova(new Vector3(-20 + Math.random() * 40, 0.6, -28 - Math.random() * 8), 9 + k * 1.1 + Math.random() * 0.6, new Vector3(0, 0.2, -0.3))
  }, [noite]) // eslint-disable-line react-hooks/exhaustive-deps

  // o dedo: segurar acende a da mesinha (só isso: toque rápido só dá uma acesinha)
  useEffect(() => {
    if (!gesto) return
    const el = gl.domElement
    const m = mesa.current
    const desce = () => (m.segurando = true)
    const sobe = () => (m.segurando = false)
    el.addEventListener('pointerdown', desce)
    window.addEventListener('pointerup', sobe)
    window.addEventListener('pointercancel', sobe)
    return () => {
      m.segurando = false
      el.removeEventListener('pointerdown', desce)
      window.removeEventListener('pointerup', sobe)
      window.removeEventListener('pointercancel', sobe)
    }
  }, [gesto, gl])

  useFrame(({ clock, size }, dtBruto) => {
    const dt = Math.min(0.05, dtBruto)
    const t = clock.elapsedTime
    matBrilho.uniforms.escala.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan(((camera as PerspectiveCamera).fov * Math.PI) / 360))
    const bp = brilho.attributes.position as BufferAttribute
    const bt = brilho.attributes.tam as BufferAttribute

    // ---- a da mesinha ----
    const m = mesa.current
    m.aparece = Math.min(1, m.aparece + dt * 0.8)
    if (m.aparece >= 1) m.luz = m.segurando ? Math.min(1, m.luz + dt / ACENDER) : Math.max(0, m.luz - dt * 0.35)
    // quase acesa: enche e tremelica
    m.tremor = m.luz > 0.8 ? (m.luz - 0.8) / 0.2 : 0
    const g = daMesa.current
    const yLanterna = MESA.y + ALTURA_MESA + 0.42
    if (g) {
      g.position.set(MESA.x, yLanterna + m.tremor * (0.06 + Math.sin(t * 9) * 0.02), MESA.z)
      g.rotation.set(Math.sin(t * 13) * 0.03 * m.tremor, t * 0.15, Math.cos(t * 11) * 0.03 * m.tremor)
      g.scale.setScalar(Math.max(0.001, m.aparece) * (1 + m.tremor * 0.04))
    }
    if (m.luz >= 1) {
      // acesa de tudo: sobe! (e outra aparece na mesinha)
      nova(new Vector3(MESA.x, yLanterna + 0.06, MESA.z), 0, new Vector3(0, 0.25, -0.12))
      m.luz = 0
      m.aparece = -0.6 // (um tempinho antes de a próxima aparecer)
    }
    const chamaMesa = gesto || m.luz > 0 ? m.luz * (0.9 + Math.sin(t * 13) * 0.06 + Math.sin(t * 29) * 0.04) : 0
    bp.setXYZ(MAX, MESA.x, yLanterna - 0.18, MESA.z)
    bt.setX(MAX, 3.2 * chamaMesa * Math.max(0, m.aparece))
    const pai = g?.children
    if (pai) {
      ;(pai[0] as unknown as { material: MeshBasicMaterial }).material.color.setRGB(0.5 + 0.5 * chamaMesa, 0.46 + 0.54 * chamaMesa, 0.42 + 0.58 * chamaMesa)
      pai[2].scale.setScalar(Math.max(0.001, chamaMesa))
    }

    // ---- as que estão no ar ----
    for (const l of s.lista) {
      if (l.espera > 0) {
        l.espera -= dt
        continue
      }
      l.vida += dt
      // sobe ganhando força aos poucos, a brisa leva pro mar e um vaivém de lado
      const v = l.vel
      v.y += (0.7 - v.y) * dt * 0.3
      v.x = Math.sin(t * 0.4 + l.fase) * 0.22 - 0.06
      v.z += (-0.35 + Math.cos(t * 0.33 + l.fase) * 0.12 - v.z) * dt * 0.4
      l.pos.addScaledVector(v, dt)
    }
    s.lista = s.lista.filter((l) => l.vida < 75)
    const mc = corpo.current
    if (!mc) return
    for (let i = 0; i < MAX; i++) {
      const l = s.lista[i]
      const vivo = !!l && l.espera <= 0
      if (vivo) {
        const f = l.fase
        const fim = Math.max(0, 1 - Math.max(0, l.vida - 55) / 20)
        const luz = 0.9 + Math.sin(t * 13 + f * 3) * 0.06 + Math.sin(t * 29 + f) * 0.04
        s.o.position.copy(l.pos)
        s.o.rotation.set(Math.sin(t * 1.3 + f) * 0.08, t * 0.2 + f, Math.cos(t * 1.1 + f) * 0.08)
        s.o.scale.setScalar(fim)
        bp.setXYZ(i, l.pos.x, l.pos.y - 0.18, l.pos.z)
        bt.setX(i, 2.8 * luz * fim)
      } else {
        s.o.scale.setScalar(0)
        bt.setX(i, 0)
      }
      s.o.updateMatrix()
      mc.setMatrixAt(i, s.o.matrix)
      aro.current?.setMatrixAt(i, s.o.matrix)
      chama.current?.setMatrixAt(i, s.o.matrix)
    }
    mc.instanceMatrix.needsUpdate = true
    if (aro.current) aro.current.instanceMatrix.needsUpdate = true
    if (chama.current) chama.current.instanceMatrix.needsUpdate = true
    bp.needsUpdate = true
    bt.needsUpdate = true
  })

  const tocarGazebo = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 12 || gesto) return
    daBeira(1)
  }
  // (a lanterna da mesinha tem material próprio: a cor dela muda conforme acende)
  const matMesa = useMemo(() => mat.clone(), [mat])

  return (
    <>
      <instancedMesh ref={corpo} args={[geo, mat, MAX]} frustumCulled={false} />
      <instancedMesh ref={aro} args={[geoAro, matAro, MAX]} frustumCulled={false} />
      <instancedMesh ref={chama} args={[geoChama, matChama, MAX]} frustumCulled={false} />
      <points geometry={brilho} material={matBrilho} frustumCulled={false} />
      {/* a mesinha redonda de madeira na beira do deck */}
      <group position={[MESA.x, MESA.y, MESA.z]}>
        <mesh position-y={ALTURA_MESA} material={matMadeira}>
          <cylinderGeometry args={[0.38, 0.38, 0.05, 24]} />
        </mesh>
        <mesh position-y={ALTURA_MESA / 2} material={matMadeira}>
          <cylinderGeometry args={[0.05, 0.07, ALTURA_MESA, 10]} />
        </mesh>
        <mesh position-y={0.03} material={matMadeira}>
          <cylinderGeometry args={[0.25, 0.28, 0.06, 18]} />
        </mesh>
      </group>
      {/* a lanterna da mesinha (papel, aro, chama) */}
      <group ref={daMesa}>
        <mesh geometry={geo} material={matMesa} />
        <mesh geometry={geoAro} material={matAro} />
        <mesh geometry={geoChama} material={matChama} />
      </group>
      {/* área de toque do gazebo (visão livre: solta uma lanterna) */}
      <mesh position={[PIER.x, PIER.y + 2, PIER.z1 - 4]} onClick={tocarGazebo} onPointerOver={() => setSobre(true)} onPointerOut={() => setSobre(false)}>
        <cylinderGeometry args={[3, 3, 4.4, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </>
  )
}
