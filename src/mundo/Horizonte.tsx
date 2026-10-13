import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  DoubleSide,
  Float32BufferAttribute,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  Shape,
  SphereGeometry,
  type Group,
  type Mesh,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { COR } from './cores'
import { NIVEL_MAR } from './terreno'

// O mar ganhando vida: dois veleiros passeando devagar
// e, de vez em quando, golfinhos pulando perto da praia.
// É um enfeite à parte: pra tirar, é só apagar este arquivo e a linha <Horizonte /> em Cena.tsx.

const sorteio = ([a, b]: [number, number]) => a + Math.random() * (b - a)

// ---------------- veleiros ----------------

function geoCascoVeleiro() {
  const g = new BoxGeometry(1.3, 0.55, 4.2, 1, 1, 8)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    if (z > 0) x *= 1 - Math.pow(z / 2.1, 1.6) * 0.92 // proa fininha
    else x *= 1 - Math.pow(-z / 2.1, 3) * 0.25 // popa reta
    if (y < 0) x *= 0.55 // fundo do casco estreito
    p.setXYZ(i, x, y + (z > 0 ? Math.pow(z / 2.1, 2) * 0.2 : 0), z)
  }
  g.computeVertexNormals()
  return g
}

/** Vela triangular (no plano yz, a partir do mastro) */
function geoVela(a: [number, number, number], b: [number, number, number], c: [number, number, number]) {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute([...a, ...b, ...c], 3))
  g.computeVertexNormals()
  return g
}

interface Rota {
  centro: [number, number]
  raio: [number, number]
  vel: number
  fase: number
  vela: string
}

const VELEIROS: Rota[] = [
  { centro: [122, 5], raio: [18, 60], vel: 0.032, fase: 0.6, vela: '#FBF6EC' },
  { centro: [82, 30], raio: [12, 35], vel: -0.045, fase: 2.4, vela: '#F6D2B8' },
]

function Veleiro({ rota }: { rota: Rota }) {
  const ref = useRef<Group>(null)
  const geo = useMemo(
    () => ({
      casco: geoCascoVeleiro(),
      vela: geoVela([0, 0.75, -0.15], [0, 6.2, 0], [0, 0.75, -2.0]),
      bujarrona: geoVela([0, 5.6, 0.12], [0, 0.75, 0.12], [0, 0.75, 2.0]),
    }),
    [],
  )
  const mat = useMemo(
    () => ({
      casco: new MeshStandardMaterial({ color: COR.branco, roughness: 0.5 }),
      faixa: new MeshStandardMaterial({ color: '#2F6FB8', roughness: 0.5 }),
      mastro: new MeshStandardMaterial({ color: '#B8B2A6', roughness: 0.4, metalness: 0.4 }),
      vela: new MeshStandardMaterial({ color: rota.vela, roughness: 0.9, side: DoubleSide }),
    }),
    [rota.vela],
  )

  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    const t = clock.elapsedTime
    const a = rota.fase + t * rota.vel
    const [cx, cz] = rota.centro
    const [rx, rz] = rota.raio
    g.position.set(cx + Math.cos(a) * rx, NIVEL_MAR + 0.12 + Math.sin(t * 1.1 + rota.fase) * 0.06, cz + Math.sin(a) * rz)
    // aponta pra onde está indo (o barco olha pra +z)
    const dx = -Math.sin(a) * rx * rota.vel
    const dz = Math.cos(a) * rz * rota.vel
    g.rotation.set(Math.sin(t * 0.8 + rota.fase) * 0.03, Math.atan2(dx, dz), 0.07 + Math.sin(t * 0.9) * 0.04, 'YXZ')
  })

  return (
    <group ref={ref}>
      <mesh geometry={geo.casco} material={mat.casco} />
      <mesh position={[0, 0.05, 0]} scale={[1.01, 0.18, 0.98]} geometry={geo.casco} material={mat.faixa} />
      <mesh position={[0, 3.4, 0]} material={mat.mastro}>
        <cylinderGeometry args={[0.05, 0.06, 6.0, 6]} />
      </mesh>
      <mesh geometry={geo.vela} material={mat.vela} />
      <mesh geometry={geo.bujarrona} material={mat.vela} />
    </group>
  )
}

// ---------------- golfinhos ----------------

function geoGolfinho() {
  const corpo = new SphereGeometry(1, 16, 10)
  corpo.scale(0.3, 0.3, 1)
  const p = corpo.attributes.position
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i)
    let f = 1
    if (z < 0) f = Math.max(0.22, 1 + z * 0.7) // afina até o rabo
    if (z > 0.55) f = 1 - (z - 0.55) * 1.1 // a cabeça arredondada
    p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, z)
  }
  corpo.computeVertexNormals() // (antes de juntar as peças: assim o corpo fica lisinho)

  // o bico curtinho
  const bico = new CylinderGeometry(0.05, 0.075, 0.26, 10)
  bico.rotateX(Math.PI / 2)
  bico.translate(0, -0.05, 1.05)

  // peças achatadas desenhadas de perfil (x = pra frente, y = pra cima) e viradas no lugar
  const peca = (s: Shape, grossura: number) => {
    const g = new ExtrudeGeometry(s, { depth: grossura, bevelEnabled: false, curveSegments: 6 })
    g.translate(0, 0, -grossura / 2)
    return g
  }
  // barbatana das costas: curvada pra trás
  const sDorsal = new Shape()
  sDorsal.moveTo(0.16, 0)
  sDorsal.quadraticCurveTo(0.02, 0.1, -0.16, 0.3)
  sDorsal.quadraticCurveTo(-0.1, 0.12, -0.22, 0)
  sDorsal.closePath()
  const dorsal = peca(sDorsal, 0.04)
  dorsal.rotateY(-Math.PI / 2)
  dorsal.translate(0, 0.24, -0.05)

  // rabo: duas pontas, deitado (visto de cima: x = pro lado, y = pra frente)
  const sRabo = new Shape()
  sRabo.moveTo(0, 0.1)
  sRabo.quadraticCurveTo(0.2, 0.02, 0.46, -0.2)
  sRabo.quadraticCurveTo(0.24, -0.16, 0.1, -0.1)
  sRabo.quadraticCurveTo(0.02, -0.12, 0, -0.17)
  sRabo.quadraticCurveTo(-0.02, -0.12, -0.1, -0.1)
  sRabo.quadraticCurveTo(-0.24, -0.16, -0.46, -0.2)
  sRabo.quadraticCurveTo(-0.2, 0.02, 0, 0.1)
  const rabo = peca(sRabo, 0.035)
  rabo.rotateX(Math.PI / 2)
  rabo.translate(0, 0, -0.98)

  // nadadeiras do peito, uma de cada lado, pra baixo e pra trás
  const nadadeiras = [1, -1].map((l) => {
    const s = new Shape()
    s.moveTo(0, 0.07)
    s.quadraticCurveTo(0.18 * l, 0.04, 0.3 * l, -0.12)
    s.quadraticCurveTo(0.12 * l, -0.06, 0, -0.07)
    s.closePath()
    const g = peca(s, 0.025)
    g.rotateX(Math.PI / 2)
    g.rotateZ(-0.6 * l)
    g.translate(l * 0.2, -0.12, 0.38)
    return g
  })

  const g = mergeGeometries([corpo, bico, dorsal, rabo, ...nadadeiras].map((x) => (x.index ? x.toNonIndexed() : x)))
  // costas cinza-azuladas, barriga clarinha
  const pos = g.attributes.position
  const cores = new Float32Array(pos.count * 3)
  const topo = new Color('#5F7586')
  const barriga = new Color('#DCE4EA')
  const c = new Color()
  for (let i = 0; i < pos.count; i++) {
    c.copy(barriga).lerp(topo, Math.min(1, Math.max(0, (pos.getY(i) + 0.08) * 4)))
    cores.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new Float32BufferAttribute(cores, 3))
  return g
}

const GOLFINHOS = 3
const SALTOS = 3
const NO_AR = 1.1 // segundos no ar em cada salto
const CICLO = 1.8 // salto + mergulho
const ATRASO = 0.32 // um vai um pouquinho depois do outro
const PULO = 3.4 // distância de cada salto (m)
const ALTURA_PULO = 1.4
const SPLASH = 0.9

function Golfinhos() {
  const corpos = useRef<(Group | null)[]>([])
  const respingos = useRef<(Mesh | null)[]>([])
  const geo = useMemo(() => geoGolfinho(), [])
  const mat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.05 }), [])
  const matRespingo = useMemo(
    () => Array.from({ length: GOLFINHOS }, () => new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, depthWrite: false, opacity: 0 })),
    [],
  )
  const anel = useMemo(() => new RingGeometry(0.55, 0.8, 24).rotateX(-Math.PI / 2), [])

  const grupo = useRef({ inicio: sorteio([4, 8]), x: 60, z: 0, rumo: 0, n: 2 })

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const g = grupo.current
    let tl = t - g.inicio
    const fim = (g.n - 1) * ATRASO + (SALTOS - 1) * CICLO + NO_AR + SPLASH
    if (tl > fim) {
      // a próxima turminha aparece em outro lugar
      g.inicio = t + sorteio([9, 18])
      g.x = sorteio([56, 72])
      g.z = sorteio([-28, 32])
      g.rumo = (Math.random() < 0.5 ? 0 : Math.PI) + sorteio([-0.6, 0.6]) // nadando ao longo da praia
      g.n = Math.random() < 0.4 ? 3 : 2
      tl = t - g.inicio
    }
    const fx = Math.sin(g.rumo)
    const fz = Math.cos(g.rumo)

    for (let k = 0; k < GOLFINHOS; k++) {
      const d = corpos.current[k]
      const r = respingos.current[k]
      if (!d || !r) continue
      const tk = tl - k * ATRASO
      // cada um um pouquinho pro lado
      const lx = g.x + fz * (k - 1) * 1.3 - fx * k * 0.8
      const lz = g.z - fx * (k - 1) * 1.3 - fz * k * 0.8
      const ativo = k < g.n && tk >= 0

      // no ar?
      const j = Math.floor(tk / CICLO)
      const u = (tk - j * CICLO) / NO_AR
      const noAr = ativo && j < SALTOS && u <= 1
      d.visible = noAr
      if (noAr) {
        const s = j * (PULO + 2) + u * PULO
        d.position.set(lx + fx * s, NIVEL_MAR - 0.35 + ALTURA_PULO * 4 * u * (1 - u), lz + fz * s)
        const inclina = Math.atan2(ALTURA_PULO * 4 * (1 - 2 * u), PULO)
        d.rotation.set(-inclina, g.rumo, 0, 'YXZ')
      }

      // respingo: o último "pluft" (saindo ou entrando na água)
      let idade = Infinity
      let onde = 0
      if (ativo) {
        for (let jj = 0; jj < SALTOS; jj++) {
          for (const [ev, uu] of [
            [jj * CICLO, 0],
            [jj * CICLO + NO_AR, 1],
          ]) {
            const a = tk - ev
            if (a >= 0 && a < idade) {
              idade = a
              onde = jj * (PULO + 2) + uu * PULO
            }
          }
        }
      }
      const m = matRespingo[k]
      if (idade < SPLASH) {
        r.visible = true
        r.position.set(lx + fx * onde, NIVEL_MAR + 0.03, lz + fz * onde)
        r.scale.setScalar(0.4 + idade * 2)
        m.opacity = (1 - idade / SPLASH) * 0.75
      } else r.visible = false
    }
  })

  return (
    <>
      {Array.from({ length: GOLFINHOS }, (_, k) => (
        <group key={k}>
          <group ref={(el) => void (corpos.current[k] = el)} visible={false}>
            <mesh geometry={geo} material={mat} />
          </group>
          <mesh ref={(el) => void (respingos.current[k] = el)} geometry={anel} material={matRespingo[k]} visible={false} />
        </group>
      ))}
    </>
  )
}

/** Tudo do horizonte junto */
export function Horizonte() {
  return (
    <>
      {VELEIROS.map((r, i) => (
        <Veleiro key={i} rota={r} />
      ))}
      <Golfinhos />
    </>
  )
}
