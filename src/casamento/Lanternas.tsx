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
  Object3D,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type InstancedMesh,
  type PerspectiveCamera,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PIER } from './montar'

// Lanternas de papel que sobem do gazebo no fim do píer.
// Na parada do píer: SEGURAR o dedo acende uma lanterna bem na frente da câmera (ela vai do apagado
// até a chama forte, tremendo) e ARRASTAR PRA CIMA solta — quanto mais rápido o arrasto, mais rápido
// ela sobe. Soltou antes de acender: ela apaga. Depois a brisa leva as lanternas pro mar, devagar.
// Ao chegar no píer, algumas sobem sozinhas; na visão livre, tocar no gazebo solta uma.

const MAX = 60
/** O gazebo no fim do píer */
const GAZEBO = new Vector3(PIER.x, PIER.y, PIER.z1 - 4)
/** Quanto tempo segurando pra acender (s) */
const ACENDER = 1.3

interface Lanterna {
  pos: Vector3
  vel: Vector3
  vida: number
  espera: number
  fase: number
  luz: number
  /** na mão (a do dedo) / apagando (soltou antes de acender) */
  presa: boolean
  apagando: number
}

export function Lanternas({ soltar, gesto }: { soltar: number; gesto: boolean }) {
  const { gl, camera } = useThree()
  const corpo = useRef<InstancedMesh>(null)
  const [sobre, setSobre] = useState(false)
  useCursor(sobre)

  const geo = useMemo(() => {
    // papel em volta (aberto embaixo, mais largo em cima, com o topo fechadinho), em gomos:
    // um gomo mais claro, outro mais escuro (as dobras do papel), e mais claro perto da chama
    const lados = 16
    const g = new CylinderGeometry(0.36, 0.25, 0.8, lados, 4, true)
    const pos = g.attributes.position
    const cores = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getY(i) + 0.4) / 0.8 // 0 embaixo, 1 em cima
      const coluna = i % (lados + 1)
      const dobra = coluna % 2 ? 0.8 : 1
      // o topo arredonda um pouco pra dentro (como papel esticado)
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
  // o aro de bambu embaixo e a chama acesa lá dentro (mesmas posições das lanternas)
  const geoAro = useMemo(() => new TorusGeometry(0.25, 0.018, 6, 20).rotateX(Math.PI / 2).translate(0, -0.4, 0), [])
  const geoChama = useMemo(() => new SphereGeometry(0.07, 10, 8).scale(1, 1.5, 1).translate(0, -0.33, 0), [])
  const matAro = useMemo(() => new MeshBasicMaterial({ color: '#3B2414' }), [])
  const matChama = useMemo(() => new MeshBasicMaterial({ color: new Color(3, 2.2, 1.1), toneMapped: false }), [])
  const aro = useRef<InstancedMesh>(null)
  const chama = useRef<InstancedMesh>(null)
  const mat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, toneMapped: false }), [])

  // o brilho em volta de cada lanterna (um pontinho de luz macio)
  const brilho = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(MAX * 3), 3))
    g.setAttribute('tam', new BufferAttribute(new Float32Array(MAX), 1))
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
  // o dedo: onde está (na tela) e o histórico recente (pra medir a velocidade do arrasto)
  const dedo = useRef({ ativo: false, ndc: new Vector2(), hist: [] as { y: number; t: number }[] })

  const nova = (pos: Vector3, espera = 0, luz = 1): Lanterna | null => {
    if (s.lista.length >= MAX) return null
    const l: Lanterna = { pos: pos.clone(), vel: new Vector3(0, 0.15, 0), vida: 0, espera, fase: Math.random() * 10, luz, presa: false, apagando: 0 }
    s.lista.push(l)
    return l
  }
  /** Lanternas acesas saindo do gazebo (chegada na parada / toque no gazebo) */
  const doGazebo = (n: number) => {
    for (let k = 0; k < n; k++) nova(GAZEBO.clone().add(new Vector3((Math.random() - 0.5) * 2.4, 1.4 + Math.random() * 0.4, (Math.random() - 0.5) * 2.4)), k * 0.45 + Math.random() * 0.2)
  }
  useEffect(() => {
    if (soltar) doGazebo(4)
  }, [soltar]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Onde a lanterna da mão fica: na frente da câmera, embaixo do dedo */
  const naFrente = (ndc: Vector2, alvo: Vector3) => {
    const dir = new Vector3(ndc.x, ndc.y, 0.5).unproject(camera).sub(camera.position).normalize()
    return alvo.copy(camera.position).addScaledVector(dir, 3.6)
  }

  // o gesto: segurar acende, arrastar pra cima solta
  useEffect(() => {
    if (!gesto) return
    const el = gl.domElement
    const d = dedo.current
    let presa: Lanterna | null = null
    const ler = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      d.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      d.hist.push({ y: e.clientY, t: performance.now() })
      if (d.hist.length > 8) d.hist.shift()
    }
    const desce = (e: PointerEvent) => {
      d.ativo = true
      d.hist = []
      ler(e)
      presa = nova(naFrente(d.ndc, new Vector3()), 0, 0)
      if (presa) presa.presa = true
    }
    const move = (e: PointerEvent) => d.ativo && ler(e)
    const sobe = () => {
      if (!d.ativo) return
      d.ativo = false
      const l = presa
      presa = null
      if (!l) return
      l.presa = false
      if (l.luz < 0.6) {
        l.apagando = 0.001 // soltou antes de acender: apaga
        return
      }
      // velocidade do arrasto pra cima (px/s) nos últimos instantes → impulso
      const h = d.hist
      let v = 0
      if (h.length > 1) {
        const a = h[0]
        const b = h[h.length - 1]
        v = Math.max(0, (a.y - b.y) / Math.max(0.016, (b.t - a.t) / 1000))
      }
      // (sai pela frente do gazebo, pro mar, e vai subindo)
      const forca = Math.min(1, v / 1400)
      l.vel.set(0, 0.35 + 0.5 * forca, -(1.0 + 1.6 * forca))
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
      if (presa) presa.apagando = 0.001
    }
  }, [gesto, gl, camera]) // eslint-disable-line react-hooks/exhaustive-deps

  const alvo = useMemo(() => new Vector3(), [])
  useFrame(({ clock, size }, dtBruto) => {
    const dt = Math.min(0.05, dtBruto)
    const m = corpo.current
    if (!m) return
    matBrilho.uniforms.escala.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan(((camera as PerspectiveCamera).fov * Math.PI) / 360))
    const t = clock.elapsedTime
    for (const l of s.lista) {
      if (l.espera > 0) {
        l.espera -= dt
        continue
      }
      l.vida += dt
      if (l.presa) {
        // na mão: segue o dedo e vai acendendo
        l.luz = Math.min(1, l.luz + dt / ACENDER)
        naFrente(dedo.current.ndc, alvo)
        l.pos.lerp(alvo, Math.min(1, dt * 12))
        continue
      }
      if (l.apagando > 0) {
        l.apagando += dt
        l.luz = Math.max(0, l.luz - dt * 2.5)
        l.pos.y -= dt * 0.3
        continue
      }
      // sobe (perdendo o impulso do arrasto aos poucos), a brisa leva pro mar e um vaivém de lado
      const v = l.vel
      v.y += (0.7 - v.y) * dt * 0.35
      v.x = Math.sin(t * 0.4 + l.fase) * 0.25 - 0.08
      v.z += (-0.35 + Math.cos(t * 0.33 + l.fase) * 0.12 - v.z) * dt * 0.5
      l.pos.addScaledVector(v, dt)
    }
    // as que já foram embora (ou apagaram) saem da lista
    s.lista = s.lista.filter((l) => l.vida < 70 && l.apagando < 0.6)
    const bp = brilho.attributes.position as BufferAttribute
    const bt = brilho.attributes.tam as BufferAttribute
    for (let i = 0; i < MAX; i++) {
      const l = s.lista[i]
      const vivo = l && l.espera <= 0
      const fim = vivo ? Math.max(0, 1 - Math.max(0, l.vida - 50) / 20) : 0
      if (vivo) {
        const f = l.fase
        const chama = l.luz * (0.9 + Math.sin(t * 13 + f * 3) * 0.06 + Math.sin(t * 29 + f) * 0.04)
        s.o.position.copy(l.pos)
        s.o.rotation.set(Math.sin(t * 1.3 + f) * 0.08, t * 0.2 + f, Math.cos(t * 1.1 + f) * 0.08)
        s.o.scale.setScalar(fim)
        // apagada é papel creme; acendendo, vai ficando laranja e brilhante
        s.c.setRGB(0.5 + 0.5 * chama, 0.46 + 0.54 * chama, 0.42 + 0.58 * chama)
        m.setColorAt(i, s.c)
        bp.setXYZ(i, l.pos.x, l.pos.y - 0.18, l.pos.z)
        bt.setX(i, 2.8 * chama * fim)
      } else {
        s.o.scale.setScalar(0)
        bt.setX(i, 0)
      }
      s.o.updateMatrix()
      m.setMatrixAt(i, s.o.matrix)
      aro.current?.setMatrixAt(i, s.o.matrix)
      // a chama só aparece acesa (encolhe com a luz)
      if (chama.current) {
        const luz = vivo ? l.luz : 0
        s.o.scale.multiplyScalar(Math.max(0.001, luz))
        s.o.updateMatrix()
        chama.current.setMatrixAt(i, s.o.matrix)
      }
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    if (aro.current) aro.current.instanceMatrix.needsUpdate = true
    if (chama.current) chama.current.instanceMatrix.needsUpdate = true
    bp.needsUpdate = true
    bt.needsUpdate = true
  })

  // (cria as cores por lanterna logo de cara)
  useEffect(() => {
    const m = corpo.current
    if (!m) return
    for (let i = 0; i < MAX; i++) m.setColorAt(i, s.c.setRGB(1, 1, 1))
  }, [s])

  const tocarGazebo = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 12 || gesto) return
    doGazebo(1)
  }

  return (
    <>
      <instancedMesh ref={corpo} args={[geo, mat, MAX]} frustumCulled={false} />
      <instancedMesh ref={aro} args={[geoAro, matAro, MAX]} frustumCulled={false} />
      <instancedMesh ref={chama} args={[geoChama, matChama, MAX]} frustumCulled={false} />
      <points geometry={brilho} material={matBrilho} frustumCulled={false} />
      {/* área de toque do gazebo (visão livre: solta uma lanterna) */}
      <mesh position={[GAZEBO.x, GAZEBO.y + 2, GAZEBO.z]} onClick={tocarGazebo} onPointerOver={() => setSobre(true)} onPointerOut={() => setSobre(false)}>
        <cylinderGeometry args={[3, 3, 4.4, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </>
  )
}
