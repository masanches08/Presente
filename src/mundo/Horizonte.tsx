import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ExtrudeGeometry,
  DoubleSide,
  Float32BufferAttribute,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  RingGeometry,
  Shape,
  SphereGeometry,
  Vector3,
  type Group,
  type InstancedMesh,
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

/** Raio do corpo ao longo do comprimento (z: -1 = cauda, +1.08 = ponta do bico), com uma curva suave */
const PERFIL: [number, number][] = [
  [-1.0, 0.045],
  [-0.8, 0.075],
  [-0.55, 0.13],
  [-0.25, 0.22],
  [0.05, 0.285],
  [0.3, 0.29],
  [0.52, 0.25],
  [0.7, 0.2], // a testa redondinha (o "melão")
  [0.8, 0.15],
  [0.86, 0.085], // onde começa o bico
  [0.98, 0.07],
  [1.08, 0.035],
]
function raio(z: number) {
  for (let i = 0; i < PERFIL.length - 1; i++) {
    const [z0, r0] = PERFIL[i]
    const [z1, r1] = PERFIL[i + 1]
    if (z <= z1) {
      const u = (z - z0) / (z1 - z0)
      const e = u * u * (3 - 2 * u)
      return r0 + (r1 - r0) * e
    }
  }
  return PERFIL[PERFIL.length - 1][1]
}

const COR_COSTAS = new Color('#3E5466')
const COR_FLANCO = new Color('#7F95A6')
const COR_BARRIGA = new Color('#EEF3F6')

/** Pinta uma peça inteira de uma cor (pra juntar com o corpo, que tem cor por vértice) */
function pintar(g: BufferGeometry, cor: Color) {
  const n = g.attributes.position.count
  const c = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) c.set([cor.r, cor.g, cor.b], i * 3)
  g.setAttribute('color', new Float32BufferAttribute(c, 3))
  if (g.attributes.uv) g.deleteAttribute('uv')
  return g
}

/** Peça achatada desenhada de perfil, com as bordas arredondadas */
function peca(s: Shape, grossura: number) {
  const g = new ExtrudeGeometry(s, { depth: grossura, bevelEnabled: true, bevelThickness: grossura * 0.45, bevelSize: grossura * 0.5, bevelSegments: 2, curveSegments: 10 })
  g.translate(0, 0, -grossura / 2)
  return g
}

/** O golfinho (de frente pra +z), sem a cauda: corpo moldado, barbatanas e os olhos */
function geoGolfinho() {
  // corpo: anéis ao longo do comprimento; as costas mais altas e redondas, a barriga mais reta,
  // o pedúnculo (perto da cauda) achatado dos lados, e o bico um pouquinho mais baixo
  const anel = 20
  const fatias = 44
  const pos: number[] = []
  const cor: number[] = []
  const idx: number[] = []
  const c = new Color()
  for (let i = 0; i <= fatias; i++) {
    const z = -1 + (i / fatias) * 2.08
    const r = raio(z)
    const largura = z < -0.45 ? 0.62 + (z + 1) * 0.69 : 1
    const desce = z > 0.82 ? -(z - 0.82) * 0.35 : 0
    for (let j = 0; j <= anel; j++) {
      const a = (j / anel) * Math.PI * 2
      const sy = Math.sin(a)
      const x = Math.cos(a) * r * largura * 0.92
      const y = sy * r * (sy < 0 ? 0.82 : 1.04) + desce
      pos.push(x, y, z)
      // cores: costas escuras, flanco médio, barriga branca (com um degradê macio)
      const h = sy
      if (h > 0.25) c.copy(COR_FLANCO).lerp(COR_COSTAS, Math.min(1, (h - 0.25) / 0.45))
      else c.copy(COR_BARRIGA).lerp(COR_FLANCO, Math.min(1, Math.max(0, (h + 0.35) / 0.6)))
      // o bico um tiquinho mais claro embaixo, a cauda mais escura
      if (z < -0.6) c.lerp(COR_COSTAS, 0.35)
      cor.push(c.r, c.g, c.b)
    }
  }
  for (let i = 0; i < fatias; i++)
    for (let j = 0; j < anel; j++) {
      const a0 = i * (anel + 1) + j
      const a1 = a0 + anel + 1
      idx.push(a0, a1, a0 + 1, a0 + 1, a1, a1 + 1)
    }
  const corpo = new BufferGeometry()
  corpo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  corpo.setAttribute('color', new Float32BufferAttribute(cor, 3))
  corpo.setIndex(idx)
  corpo.computeVertexNormals()

  // barbatana das costas: alta e curvada pra trás (foice)
  const sDorsal = new Shape()
  sDorsal.moveTo(0.22, 0)
  sDorsal.bezierCurveTo(0.1, 0.12, 0.0, 0.26, -0.2, 0.36)
  sDorsal.bezierCurveTo(-0.14, 0.2, -0.16, 0.08, -0.24, 0)
  sDorsal.closePath()
  const dorsal = peca(sDorsal, 0.025)
  dorsal.rotateY(-Math.PI / 2)
  dorsal.translate(0, 0.27, -0.12)
  pintar(dorsal, COR_COSTAS)

  // nadadeiras do peito, curvas, pra baixo e pra trás
  const nadadeiras = [1, -1].map((l) => {
    const sn = new Shape()
    sn.moveTo(0, 0.06)
    sn.bezierCurveTo(0.12 * l, 0.05, 0.24 * l, -0.04, 0.3 * l, -0.16)
    sn.bezierCurveTo(0.18 * l, -0.1, 0.08 * l, -0.07, 0, -0.06)
    sn.closePath()
    const g = peca(sn, 0.018)
    g.rotateX(Math.PI / 2)
    g.rotateZ(-0.75 * l)
    g.translate(l * 0.21, -0.14, 0.42)
    return pintar(g, COR_FLANCO)
  })

  // os olhos
  const olhos = [1, -1].map((l) => {
    const g = new SphereGeometry(0.022, 8, 6)
    g.translate(l * 0.165, 0.02, 0.74)
    return pintar(g, new Color('#141A20'))
  })

  // (cada peça já tem o sombreamento dela: o corpo fica lisinho, sem recalcular depois de juntar)
  for (const x of [dorsal, ...nadadeiras, ...olhos]) x.computeVertexNormals()
  return mergeGeometries([corpo, dorsal, ...nadadeiras, ...olhos].map((x) => (x.index ? x.toNonIndexed() : x)))!
}

/** A cauda (as duas pontas, deitada), presa em z = 0 pra poder bater pra cima e pra baixo */
function geoCauda() {
  const sRabo = new Shape()
  sRabo.moveTo(0, 0.05)
  sRabo.bezierCurveTo(0.18, 0.04, 0.36, -0.06, 0.5, -0.24)
  sRabo.bezierCurveTo(0.34, -0.2, 0.16, -0.16, 0.06, -0.15)
  sRabo.quadraticCurveTo(0.02, -0.12, 0, -0.19)
  sRabo.quadraticCurveTo(-0.02, -0.12, -0.06, -0.15)
  sRabo.bezierCurveTo(-0.16, -0.16, -0.34, -0.2, -0.5, -0.24)
  sRabo.bezierCurveTo(-0.36, -0.06, -0.18, 0.04, 0, 0.05)
  const rabo = peca(sRabo, 0.022)
  rabo.rotateX(Math.PI / 2)
  return pintar(rabo, COR_COSTAS)
}

const GOLFINHOS = 3
const SALTOS = 3
const NO_AR = 1.1 // segundos no ar em cada salto
const CICLO = 1.8 // salto + mergulho
const ATRASO = 0.32 // um vai um pouquinho depois do outro
const PULO = 3.4 // distância de cada salto (m)
const ALTURA_PULO = 1.4
const SPLASH = 0.9
const GOTAS_POR = 14
const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('golfinhos')
const frente = new Vector3()
const GOTAS = GOLFINHOS * GOTAS_POR

function Golfinhos() {
  const corpos = useRef<(Group | null)[]>([])
  const respingos = useRef<(Mesh | null)[]>([])
  const geo = useMemo(() => geoGolfinho(), [])
  const cauda = useMemo(() => geoCauda(), [])
  const caudas = useRef<(Group | null)[]>([])
  const gotas = useRef<InstancedMesh>(null)
  const geoGota = useMemo(() => new SphereGeometry(0.045, 6, 4), [])
  const matGota = useMemo(() => new MeshBasicMaterial({ color: '#F4FBFF' }), [])
  // cada gotinha sai numa direção (sorteada uma vez)
  const dirGotas = useMemo(() => Array.from({ length: GOTAS }, () => [Math.random() - 0.5, 1.6 + Math.random() * 2.2, Math.random() - 0.5] as [number, number, number]), [])
  const o = useMemo(() => new Object3D(), [])
  const mat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.22, metalness: 0.08 }), [])
  const matRespingo = useMemo(
    () => Array.from({ length: GOLFINHOS }, () => new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, depthWrite: false, opacity: 0 })),
    [],
  )
  const anel = useMemo(() => new RingGeometry(0.55, 0.8, 24).rotateX(-Math.PI / 2), [])

  const grupo = useRef({ inicio: sorteio([4, 8]), x: 60, z: 0, rumo: 0, n: 2 })

  useFrame(({ clock, camera }) => {
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
      // (teste: com ?golfinhos no endereço, eles pulam logo ali na frente da câmera, de lado)
      if (DEBUG) {
        camera.getWorldDirection(frente)
        g.inicio = t + 0.5
        // começa à esquerda, pulando pra direita, passando pelo meio da tela
        const dir = Math.atan2(frente.x, frente.z) - Math.PI / 2
        g.x = camera.position.x + frente.x * 7 - Math.sin(dir) * 6
        g.z = camera.position.z + frente.z * 7 - Math.cos(dir) * 6
        g.rumo = dir
        g.n = 3
      }
      tl = t - g.inicio
    }
    // (no teste fica na altura dos olhos da câmera; normal: no nível do mar)
    const nivel = DEBUG ? camera.position.y - 2.2 : NIVEL_MAR
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
        d.position.set(lx + fx * s, nivel - 0.35 + ALTURA_PULO * 4 * u * (1 - u), lz + fz * s)
        const inclina = Math.atan2(ALTURA_PULO * 4 * (1 - 2 * u), PULO)
        // um rolinho de lado no meio do pulo (golfinho brincando)
        d.rotation.set(-inclina, g.rumo, Math.sin(u * Math.PI) * 0.25 * (k % 2 ? 1 : -1), 'YXZ')
      }
      // a cauda batendo pra cima e pra baixo
      const ca = caudas.current[k]
      if (ca) ca.rotation.x = Math.sin(t * 9 + k) * 0.35

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
      const gm = gotas.current
      if (idade < SPLASH) {
        r.visible = true
        r.position.set(lx + fx * onde, nivel + 0.03, lz + fz * onde)
        r.scale.setScalar(0.4 + idade * 2)
        m.opacity = (1 - idade / SPLASH) * 0.75
      } else r.visible = false
      // as gotinhas: espirram pra cima e caem de volta na água
      if (gm)
        for (let q = 0; q < GOTAS_POR; q++) {
          const gi = k * GOTAS_POR + q
          const [dx, dy, dz] = dirGotas[gi]
          const y = nivel + dy * idade - 4.9 * idade * idade
          if (idade < SPLASH && y > nivel - 0.05) {
            o.position.set(lx + fx * onde + dx * idade * 1.6, y, lz + fz * onde + dz * idade * 1.6)
            o.scale.setScalar(1 - idade / SPLASH)
          } else o.scale.setScalar(0)
          o.updateMatrix()
          gm.setMatrixAt(gi, o.matrix)
        }
    }
    if (gotas.current) gotas.current.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      {Array.from({ length: GOLFINHOS }, (_, k) => (
        <group key={k}>
          <group ref={(el) => void (corpos.current[k] = el)} visible={false}>
            <mesh geometry={geo} material={mat} />
            <group ref={(el) => void (caudas.current[k] = el)} position={[0, 0, -0.98]}>
              <mesh geometry={cauda} material={mat} />
            </group>
          </group>
          <mesh ref={(el) => void (respingos.current[k] = el)} geometry={anel} material={matRespingo[k]} visible={false} />
        </group>
      ))}
      <instancedMesh ref={gotas} args={[geoGota, matGota, GOTAS]} frustumCulled={false} />
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
