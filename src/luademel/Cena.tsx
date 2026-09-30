import { Cloud, Clouds, Environment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  Material,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  QuadraticBezierCurve3,
  RepeatWrapping,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type DirectionalLight,
  type Group,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { criarArranjos, materialRosas, type Arranjo } from '../mundo/arranjos'
import { Arbusto, Arvore, Cipreste, Coqueiro, criarFolhagem, matFolhas, type Tufo } from '../mundo/Arvore'
import { Obra } from '../mundo/obra'
import { Tedung } from '../mundo/objetos/Jukung'
import { criar, texPedra, urlNuvem } from '../mundo/texturas'
import { sorteador, type Vec3 } from '../mundo/util'
import { criarTufo } from '../mundo/Grama'
import { aplicarVento, vento } from '../mundo/vento'
import { AguaParada, MarTurquesa, SOL_TROPICAL } from './Agua'
import { CeuTropical } from './CeuTropical'
import { montarMesa } from './comida'
import { ESCALAS, materiaisLuaDeMel } from './materiais'
import { acessoriosBarco, bale, bangalo, candiBentar, cordilheira, estatua, geoBarco, meru, nagaCabeca, nagaCorpo, penhasco, por } from './pecas'
import { texCalcario, texFrangipani, texJato } from './texturas'

export type ZonaLDM = 'lagoa' | 'vilas' | 'templo' | 'palacio'
export type Qualidade = 'alta' | 'media'

/** Os quatro cenários ficam longe uns dos outros (a câmera "pisca" pra ir de um pro outro) */
export const CENTRO: Record<ZonaLDM, [number, number]> = {
  lagoa: [0, 0],
  vilas: [1200, 0],
  templo: [0, 1200],
  palacio: [1200, 1200],
}

const SEM_SOMBRA = new Set(['vidro', 'aguaPiscina', 'vela'])
type Mats = Record<string, Material>

function Pecas({ pecas, mats, sombra = true }: { pecas: Record<string, BufferGeometry>; mats: Mats; sombra?: boolean }) {
  return (
    <>
      {Object.entries(pecas).map(([n, g]) => (
        <mesh key={n} geometry={g} material={mats[n] ?? mats.branco} castShadow={sombra && !SEM_SOMBRA.has(n)} receiveShadow />
      ))}
    </>
  )
}

/** O reflexo na água parada: desenha tudo de novo, de cabeça pra baixo, embaixo da superfície */
function Espelho({ nivel, children }: { nivel: number; children: ReactNode }) {
  return (
    <>
      {children}
      <group position-y={2 * nivel} scale={[1, -1, 1]}>
        {children}
      </group>
    </>
  )
}

interface Item {
  pos: Vec3
  rot?: Vec3
  esc?: number | Vec3
  cor?: string
}

/** Várias cópias iguais de uma vez (bem leve) */
function Instancias({ geo, mat, itens, sombra = false }: { geo: BufferGeometry; mat: Material | Material[]; itens: Item[]; sombra?: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    const c = new Color()
    itens.forEach((it, i) => {
      o.position.set(...it.pos)
      o.rotation.set(...(it.rot ?? [0, 0, 0]))
      if (Array.isArray(it.esc)) o.scale.set(...it.esc)
      else o.scale.setScalar(it.esc ?? 1)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      if (it.cor) m.setColorAt(i, c.set(it.cor))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [itens])
  return <instancedMesh ref={ref} args={[geo, mat, itens.length]} castShadow={sombra} receiveShadow={sombra} />
}

function Flores({ arranjos }: { arranjos: Arranjo[] }) {
  const g = useMemo(() => (arranjos.length ? criarArranjos(arranjos, 9) : null), [arranjos])
  if (!g) return null
  return (
    <>
      <mesh geometry={g.folhas} material={matFolhas(4)} castShadow />
      <mesh geometry={g.rosas} material={materialRosas()} />
    </>
  )
}

const CORES_FLORES = ['#E8243A', '#FF5E8A', '#FFD23F', '#FF8A3D', '#B866E0', '#FFFFFF']
const matRocha = () => {
  const t = texCalcario().clone()
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(5, 1.6)
  t.anisotropy = 8
  t.needsUpdate = true
  const b = texPedra().clone()
  b.wrapS = b.wrapT = RepeatWrapping
  b.repeat.set(18, 8)
  b.needsUpdate = true
  return new MeshStandardMaterial({ vertexColors: true, map: t, roughness: 0.92, bumpMap: b, bumpScale: 1.4 })
}

/** Morros de floresta (cores por vértice, meio foscos) */
const matMorro = () => new MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false })

/**
 * Gramado de verdade: tufos de grama balançando, espalhados em retângulos
 * (menos onde tem "buracos", tipo o espelho d'água)
 */
function Grama({
  areas = [],
  circulos = [],
  buracos = [],
  quantidade,
  y = 0,
}: {
  areas?: [number, number, number, number][]
  circulos?: [number, number, number][]
  buracos?: [number, number, number, number][]
  quantidade: number
  y?: number
}) {
  const ref = useRef<InstancedMesh>(null)
  const geo = useMemo(() => criarTufo(), [])
  const mat = useMemo(() => {
    const m = new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.85 })
    aplicarVento(m, { forca: 0.8, altura: 0.42 })
    return m
  }, [])
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const rand = sorteador(quantidade)
    const o = new Object3D()
    const c = new Color()
    const tons = ['#FFFFFF', '#EEFFDD', '#F7FFE8', '#E2F5CC', '#FFF7D6']
    const total = areas.reduce((acc, [a, b, c2, d]) => acc + (b - a) * (d - c2), 0) + circulos.reduce((acc, [, , r]) => acc + Math.PI * r * r, 0)
    // cada área vira uma lista de pontos sorteados (retângulos e círculos)
    const sortear: [number, () => [number, number]][] = [
      ...areas.map(([x0, x1, z0, z1]) => [(x1 - x0) * (z1 - z0), () => [x0 + rand() * (x1 - x0), z0 + rand() * (z1 - z0)]] as [number, () => [number, number]]),
      ...circulos.map(([cx, cz, r]) => [
        Math.PI * r * r,
        () => {
          const a = rand() * Math.PI * 2
          const d = Math.sqrt(rand()) * r
          return [cx + Math.cos(a) * d, cz + Math.sin(a) * d]
        },
      ] as [number, () => [number, number]]),
    ]
    let i = 0
    for (const [area, ponto] of sortear) {
      const n = Math.round((quantidade * area) / total)
      for (let k = 0; k < n && i < quantidade; k++) {
        const [x, z] = ponto()
        if (buracos.some(([a, b, c2, d]) => x > a && x < b && z > c2 && z < d)) continue
        o.position.set(x, y, z)
        o.rotation.set(0, rand() * 6.28, 0)
        const s = 0.9 + rand() * 0.6
        o.scale.set(s, s * (0.55 + rand() * 0.35), s)
        o.updateMatrix()
        m.setMatrixAt(i, o.matrix)
        m.setColorAt(i, c.set(tons[i % tons.length]))
        i++
      }
    }
    m.count = i
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [areas, circulos, buracos, quantidade, y])
  return <instancedMesh ref={ref} args={[geo, mat, quantidade]} receiveShadow />
}

/** Material de escamas com a textura repetindo ao longo do corpo do naga */
function useMatNaga(mats: Mats, repeticoes: number) {
  return useMemo(() => {
    const m = (mats.escamas as MeshStandardMaterial).clone()
    if (m.map) {
      m.map = m.map.clone()
      m.map.repeat.set(repeticoes, 3)
      m.map.needsUpdate = true
    }
    return m
  }, [mats, repeticoes])
}

// ======================================================================
// 1. A LAGOA ENTRE PENHASCOS
// ======================================================================
const PENHASCOS: [number, number, number, number, number][] = [
  // [x, z, raio, altura, semente]
  [-56, -18, 26, 72, 1],
  [-74, -72, 34, 96, 2],
  [-48, -118, 30, 84, 3],
  [58, -10, 24, 66, 4],
  [76, -62, 36, 110, 5],
  [52, -118, 30, 88, 6],
  [-14, -172, 44, 94, 7],
  [30, -150, 26, 62, 8],
  [-165, -270, 56, 126, 9],
  [175, -250, 48, 104, 10],
  [10, -350, 66, 86, 11],
  [-66, 50, 22, 56, 12],
  [68, 58, 26, 64, 13],
  [-300, -120, 60, 90, 14],
  [320, -150, 70, 120, 15],
]
const BARCOS: [number, number, number][] = [
  [-9, 14, 0.4],
  [11, 20, 2.75],
  [-16, -6, 0.35],
  [-4, -32, -0.25],
  [19, -22, 2.7],
  [31, -2, 3.05],
  [6, -58, 1.3],
  [-24, -48, 0.9],
]

function Barcos({ lista, centro, mats }: { lista: [number, number, number][]; centro: [number, number]; mats: Mats }) {
  const casco = useMemo(() => geoBarco(), [])
  const matCasco = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: DoubleSide }), [])
  const acess = useMemo(() => {
    const o = new Obra()
    acessoriosBarco(o, [0, 0, 0], 0)
    return o.finalizar(ESCALAS)
  }, [])
  const refs = useRef<(Group | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((g, i) => {
      if (!g) return
      g.position.y = Math.sin(t * 0.9 + i * 1.7) * 0.07
      g.rotation.z = Math.sin(t * 0.7 + i) * 0.025
      g.rotation.x = Math.sin(t * 0.6 + i * 2) * 0.02
    })
  })
  return (
    <>
      {lista.map(([x, z, giro], i) => (
        <group key={i} position={[centro[0] + x, 0.22, centro[1] + z]} rotation-y={giro}>
          <group ref={(el) => void (refs.current[i] = el)}>
            <mesh geometry={casco} material={matCasco} castShadow receiveShadow />
            <Pecas pecas={acess} mats={mats} />
          </group>
        </group>
      ))}
    </>
  )
}

function Lagoa({ mats, q }: { mats: Mats; q: Qualidade }) {
  const [cx, cz] = CENTRO.lagoa
  const d = useMemo(() => {
    const geos: BufferGeometry[] = []
    const tufos: Tufo[] = []
    for (const [x, z, r, h, s] of PENHASCOS) {
      const p = penhasco(s, r, h)
      const off = new Vector3(cx + x, -3, cz + z)
      p.geo.translate(off.x, off.y, off.z)
      geos.push(p.geo)
      const longe = Math.hypot(x, z) > 200
      for (const t of p.tufos) if (!longe || t.centro.y > h * 0.8) tufos.push({ centro: t.centro.add(off), raio: t.raio * (longe ? 1.6 : 1) })
    }
    const o = new Obra()
    // prainha escondida lá no fundo da lagoa
    por(o, 'areia', new SphereGeometry(20, 32, 12).scale(1, 0.07, 0.7), [cx + 8, -0.4, cz - 132])
    return {
      rochas: mergeGeometries(geos)!,
      mata: criarFolhagem(tufos, q === 'alta' ? 12 : 8, 3, ['#16461A', '#2F7A26', '#7FC244'], 4.4),
      pecas: o.finalizar(ESCALAS),
    }
  }, [cx, cz, q])
  const rocha = useMemo(() => matRocha(), [])
  return (
    <group>
      <MarTurquesa
        centro={[cx, cz - 150]}
        tamanho={1100}
        ilhas={[
          [cx, cz - 60, 36],
          [cx + 8, cz - 132, 14, 1],
          [cx - 5, cz + 12, 18],
          [cx + 20, cz - 100, 20],
        ]}
        cores={{ raso: '#8CF5E4', medio: '#1FD0C6', fundo: '#0C73AE' }}
      />
      <mesh geometry={d.rochas} material={rocha} castShadow receiveShadow />
      <mesh geometry={d.mata} material={matFolhas(40)} castShadow />
      <Pecas pecas={d.pecas} mats={mats} />
      {[
        [2, -134, 9, 0.4],
        [12, -130, 8, -0.6],
        [18, -136, 10, 0.2],
        [-4, -128, 7.5, 2.4],
      ].map(([x, z, alt, g], i) => (
        <Coqueiro key={i} position={[cx + x, 0.6, cz + z]} rotation-y={g} altura={alt} curva={1.6} />
      ))}
      <Barcos lista={BARCOS} centro={[cx, cz]} mats={mats} />
    </group>
  )
}

// ======================================================================
// 2. OS BANGALÔS SOBRE O MAR (e o deck do jantar)
// ======================================================================
/** A mesinha de jantar sobre o mar (onde ficam as comidas típicas) */
export const DECK_JANTAR: Vec3 = [CENTRO.vilas[0] - 14, 1.2, CENTRO.vilas[1] + 30]

function Vilas({ mats }: { mats: Mats }) {
  const [cx, cz] = CENTRO.vilas
  const zP = cz - 10 // eixo da passarela
  const d = useMemo(() => {
    const o = new Obra()
    // passarela de madeira com guarda-corpo
    o.caixa('deck', [cx - 26, cx + 104], [1.4, 1.6], [zP - 1.3, zP + 1.3])
    for (let x = cx - 24; x <= cx + 104; x += 3.2) for (const dz of [-1.2, 1.2]) o.caixa('madeiraEscura', [x - 0.1, x + 0.1], [-1.5, 1.4], [zP + dz - 0.1, zP + dz + 0.1])
    for (const dz of [-1.25, 1.25]) o.caixa('madeira', [cx - 26, cx + 104], [2.35, 2.42], [zP + dz - 0.03, zP + dz + 0.03])
    for (let x = cx - 24; x <= cx + 104; x += 3.2) for (const dz of [-1.25, 1.25]) o.caixa('madeira', [x - 0.04, x + 0.04], [1.6, 2.42], [zP + dz - 0.04, zP + dz + 0.04])
    // os bangalôs, dos dois lados
    for (let i = 0; i < 8; i++) {
      const x = cx - 6 + i * 15
      bangalo(o, x, zP + 6.7, 0)
      bangalo(o, x, zP - 6.7, Math.PI)
    }
    // plataforma no fim da passarela, com um bale de palha
    o.caixa('deck', [cx + 100, cx + 112], [1.4, 1.6], [zP - 6, zP + 6])
    for (let x = cx + 100; x <= cx + 112; x += 3) for (const z of [zP - 5.5, zP + 5.5]) o.caixa('madeiraEscura', [x - 0.12, x + 0.12], [-1.5, 1.4], [z - 0.12, z + 0.12])
    bale(o, cx + 106, 1.3, zP, 6, 6, 'palha')

    // a ilha: areia branca, grama no meio e o lodge principal
    por(o, 'areia', new CylinderGeometry(33, 42, 1.4, 64), [cx - 60, -0.4, zP])
    por(o, 'grama', new CylinderGeometry(23, 25, 0.3, 48), [cx - 62, 0.4, zP - 2])
    bale(o, cx - 64, 0.5, zP - 4, 12, 10, 'palha')
    // banco de areia
    por(o, 'areia', new CylinderGeometry(9, 13, 1, 40), [cx + 130, -0.35, cz + 55])
    // passarela até o deck do jantar
    const [dx, , dz] = DECK_JANTAR
    const ini = new Vector3(cx - 33, 0.9, zP + 23.6)
    const fim = new Vector3(dx - 1.5, 1.0, dz - 2)
    const len = ini.distanceTo(fim)
    const ang = Math.atan2(fim.x - ini.x, fim.z - ini.z)
    for (let k = 0; k <= len; k += 0.5) {
      const p = ini.clone().lerp(fim, k / len)
      const g = new PlaneGeometry(1.8, 0.4).rotateX(-Math.PI / 2)
      g.rotateY(ang)
      g.translate(p.x, p.y + 0.05, p.z)
      o.add('deck', g)
      if (Math.round(k * 2) % 6 === 0)
        for (const lado of [-0.9, 0.9]) o.caixa('madeiraEscura', [p.x + Math.cos(ang) * lado - 0.08, p.x + Math.cos(ang) * lado + 0.08], [-1.5, 0.95], [p.z - Math.sin(ang) * lado - 0.08, p.z - Math.sin(ang) * lado + 0.08])
    }
    // o deck do jantar: octogonal, com tochas nos cantos
    por(o, 'deck', new CylinderGeometry(3.4, 3.4, 0.2, 8), [dx, 1.0, dz])
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8
      const px = dx + Math.cos(a) * 3.1
      const pz = dz + Math.sin(a) * 3.1
      o.caixa('madeiraEscura', [px - 0.1, px + 0.1], [-1.5, 1.0], [pz - 0.1, pz + 0.1])
      if (k % 2 === 0) {
        o.caixa('madeira', [px - 0.035, px + 0.035], [1.2, 2.6], [pz - 0.035, pz + 0.035])
        por(o, 'palha', new CylinderGeometry(0.12, 0.07, 0.25, 8), [px, 2.6, pz])
        por(o, 'vela', new ConeGeometry(0.09, 0.35, 8), [px, 2.85, pz])
      }
    }
    const flores = montarMesa(o, dx, 1.2, dz)
    return { pecas: o.finalizar(ESCALAS), flores }
  }, [cx, cz, zP])
  const matFrang = useMemo(() => new MeshStandardMaterial({ map: texFrangipani(), alphaTest: 0.4, side: DoubleSide, roughness: 0.6 }), [])
  const geoFrang = useMemo(() => new PlaneGeometry(0.09, 0.09).rotateX(-Math.PI / 2), [])
  const gramaIlha = useMemo<[number, number, number][]>(() => [[cx - 62, zP - 2, 22.5]], [cx, zP])
  // mato em volta do gramado (deixa o lodge "escondido" no verde) e umas árvores floridas
  const matoIlha = useMemo(() => {
    const rand = sorteador(33)
    return Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2 + rand() * 0.25
      const r = 17 + rand() * 4
      return [cx - 62 + Math.cos(a) * r, zP - 2 + Math.sin(a) * r, 3 + rand() * 4, 2 + rand() * 2, 1.2 + rand() * 1.2, 310 + i] as [number, number, number, number, number, number]
    }).filter(([x, z]) => Math.abs(z - zP) > 4 || x < cx - 62) // a passarela chega pelo leste
  }, [cx, zP])
  const arvoresIlha = useMemo<[number, number, number, number][]>(
    () => [
      [cx - 76, zP - 12, 9, 341],
      [cx - 80, zP + 6, 8, 342],
      [cx - 58, zP + 14, 7.5, 343],
      [cx - 50, zP - 16, 8.5, 344],
    ],
    [cx, zP],
  )
  const coqueiros = useMemo(() => {
    const rand = sorteador(21)
    return Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2 + rand() * 0.2
      const r = 27 + rand() * 6
      return { pos: [cx - 60 + Math.cos(a) * r, 0.25, zP + Math.sin(a) * r] as Vec3, alt: 7 + rand() * 4, giro: -a + Math.PI / 2 + (rand() - 0.5) }
    })
  }, [cx, zP])
  return (
    <group>
      <MarTurquesa
        centro={[cx, cz]}
        tamanho={1100}
        ilhas={[
          [cx - 60, zP, 38, 1],
          [cx + 130, cz + 55, 12, 1],
          [cx + 5, zP, 30],
          [cx + 75, zP, 30],
        ]}
        cores={{ raso: '#A6F7EA', medio: '#23C9D6', fundo: '#1473A8' }}
      />
      <Pecas pecas={d.pecas} mats={mats} />
      {coqueiros.map((c, i) => (
        <Coqueiro key={i} position={c.pos} rotation-y={c.giro} altura={c.alt} curva={1.3} />
      ))}
      {[0, 1.2, 2.5].map((a, i) => (
        <Coqueiro key={'b' + i} position={[cx + 130 + Math.cos(a) * 4, 0.1, cz + 55 + Math.sin(a) * 4]} rotation-y={a} altura={7 + i} curva={1.5} />
      ))}
      <Grama circulos={gramaIlha} quantidade={7000} y={0.53} />
      {matoIlha.map(([x, z, l, p, h, sem]) => (
        <Arbusto key={sem} semente={sem} largura={l} profundidade={p} alturaArbusto={h} position={[x, 0.52, z]} rotation-y={sem} />
      ))}
      {arvoresIlha.map(([x, z, h, sem]) => (
        <Arvore key={sem} semente={sem} altura={h} position={[x, 0.5, z]} cartoes={40} />
      ))}
      {d.flores.map(([x, y, z, g], i) => (
        <mesh key={i} geometry={geoFrang} material={matFrang} position={[x, y, z]} rotation-y={g} />
      ))}
    </group>
  )
}

// ======================================================================
// 3. O TEMPLO NO LAGO (com névoa, montanha e o reflexo na água)
// ======================================================================
const texNevoa = () =>
  criar(
    'nevoa',
    128,
    128,
    (ctx) => {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
      g.addColorStop(0, 'rgba(255,255,255,1)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 128, 128)
    },
    false,
  )

function Templo({ mats }: { mats: Mats }) {
  const [cx, cz] = CENTRO.templo
  const NIVEL = -0.25
  const d = useMemo(() => {
    const o = new Obra()
    const arranjos: Arranjo[] = []
    const rand = sorteador(77)
    const canteiro = (x: number, z: number, r: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand() * 0.2
        arranjos.push({ centro: new Vector3(x + Math.cos(a) * r, 0.7, z + Math.sin(a) * r), raio: 0.55 + rand() * 0.2, flores: 18, achatado: 0.7, cores: [CORES_FLORES[i % CORES_FLORES.length], CORES_FLORES[(i + 2) % CORES_FLORES.length], '#FFFFFF'] })
      }
    }
    // ilha principal: o meru de 11 andares
    const A = { x: cx - 12, z: cz - 30 }
    por(o, 'pedraVulc', new CylinderGeometry(9, 9.3, 0.6, 40), [A.x, 0.03, A.z])
    por(o, 'grama', new CylinderGeometry(8.7, 8.7, 0.1, 40), [A.x, 0.32, A.z])
    meru(o, A.x, 0.36, A.z, 11, 5.4)
    meru(o, A.x + 5.2, 0.36, A.z + 3.6, 1, 1.8)
    meru(o, A.x - 5.2, 0.36, A.z + 3.4, 1, 1.8)
    canteiro(A.x, A.z, 7.3, 14)
    // segunda ilha: meru de 3 andares
    const B = { x: cx + 12, z: cz - 44 }
    por(o, 'pedraVulc', new CylinderGeometry(6.2, 6.5, 0.6, 36), [B.x, 0.03, B.z])
    por(o, 'grama', new CylinderGeometry(5.9, 5.9, 0.1, 36), [B.x, 0.32, B.z])
    meru(o, B.x, 0.36, B.z, 3, 4.6)
    canteiro(B.x, B.z, 5, 10)
    // margem da esquerda: jardins, mais merus, um bale e o portal
    o.caixa('pedraVulc', [cx - 95, cx - 32], [-0.25, 0.3], [cz - 100, cz - 18])
    o.caixa('grama', [cx - 94, cx - 33], [0.3, 0.36], [cz - 99, cz - 19])
    meru(o, cx - 52, 0.36, cz - 62, 7, 4.6)
    meru(o, cx - 43, 0.36, cz - 84, 5, 3.8)
    meru(o, cx - 72, 0.36, cz - 78, 9, 5)
    bale(o, cx - 64, 0.36, cz - 42, 4.5, 3.5)
    candiBentar(o, cx - 46, 0.36, cz - 25, 0.3, 5.5)
    canteiro(cx - 52, cz - 62, 5, 10)
    canteiro(cx - 43, cz - 84, 4.2, 8)
    for (let i = 0; i < 16; i++) arranjos.push({ centro: new Vector3(cx - 36, 0.8, cz - 24 - i * 4.6), raio: 0.7, flores: 20, achatado: 0.7, cores: [CORES_FLORES[i % 6], '#FFFFFF', CORES_FLORES[(i + 3) % 6]] })
    return { pecas: o.finalizar(ESCALAS), arranjos }
  }, [cx, cz])

  // gramado da frente (onde a câmera fica), mureta de pedra e o naga na beira
  const chao = useMemo(() => {
    const o = new Obra()
    o.caixa('grama', [cx - 120, cx + 120], [-1, 0.3], [cz + 7, cz + 120])
    o.caixa('pedraVulc', [cx - 120, cx + 120], [-1.2, 0.36], [cz + 6.2, cz + 7.2])
    // balaústres só nas pontas: no meio a vista fica livre até a água
    for (let x = cx - 60; x < cx + 60; x += 1.6) if (x < cx - 24 || x > cx + 12) o.caixa('pedraVulc', [x - 0.1, x + 0.1], [0.36, 0.95], [cz + 6.5, cz + 6.9])
    for (const [a, b] of [[cx - 60, cx - 24], [cx + 12, cx + 60]]) o.caixa('pedraVulc', [a, b], [0.95, 1.08], [cz + 6.4, cz + 7.0])
    const pontos = [
      new Vector3(cx + 5.4, 1.35, cz + 8.3),
      new Vector3(cx + 6.4, 0.75, cz + 9.4),
      new Vector3(cx + 9, 0.62, cz + 9.9),
      new Vector3(cx + 13, 0.58, cz + 9.3),
      new Vector3(cx + 17, 0.52, cz + 10.4),
    ]
    nagaCabeca(o, new Vector3(cx + 5.0, 1.75, cz + 7.7), new Vector3(-0.35, 0.45, -1), 0.8)
    const corpo = nagaCorpo(pontos, 0.34)
    return { pecas: o.finalizar(ESCALAS), corpo: corpo.geo }
  }, [cx, cz])
  const matNaga = useMatNaga(mats, 40)

  // bambuzal da direita
  const bambu = useMemo(() => {
    const rand = sorteador(5)
    const hastes: BufferGeometry[] = []
    const tufos: Tufo[] = []
    for (let i = 0; i < 22; i++) {
      const x = cx + 11 + rand() * 6
      const z = cz + 12 + rand() * 5
      const h = 8 + rand() * 5
      const incl = new Vector3((rand() - 0.6) * 2.5, h, (rand() - 0.6) * 2)
      const g = new CylinderGeometry(0.07, 0.09, h, 7).translate(0, h / 2, 0)
      g.lookAt(incl)
      g.rotateX(Math.PI / 2)
      g.translate(x, 0.3, z)
      hastes.push(g)
      for (let k = 0; k < 4; k++) tufos.push({ centro: new Vector3(x + incl.x * (0.55 + k * 0.13), 0.3 + h * (0.55 + k * 0.12), z + incl.z * (0.55 + k * 0.13)), raio: 1.3 })
    }
    return { hastes: mergeGeometries(hastes)!, folhas: criarFolhagem(tufos, 18, 8, ['#4E7A1E', '#7FAE3A', '#C4DE6E'], 0.9) }
  }, [cx, cz])

  const nevoa = useMemo(() => new MeshBasicMaterial({ map: texNevoa(), transparent: true, opacity: 0.35, depthWrite: false, color: '#F4F8FA' }), [])
  const morro = useMemo(() => matMorro(), [])
  const serra = useMemo(
    () => ({
      fundo: cordilheira(cx - 700, cx + 700, cz - 240, cz - 620, NIVEL, 150, 3),
      lado: cordilheira(cx - 420, cx - 100, cz - 60, cz - 260, NIVEL, 70, 7),
    }),
    [cx, cz],
  )
  const areasGrama = useMemo<[number, number, number, number][]>(() => [[cx - 45, cx + 45, cz + 7.4, cz + 45]], [cx, cz])
  const gramaIlhas = useMemo<[number, number, number][]>(
    () => [
      [cx - 12, cz - 30, 8.4],
      [cx + 12, cz - 44, 5.6],
    ],
    [cx, cz],
  )
  const gramaMargem = useMemo<[number, number, number, number][]>(() => [[cx - 93, cx - 34, cz - 98, cz - 20]], [cx, cz])

  return (
    <group>
      {/* o fundo do lago é da cor do céu: a água mostra o reflexo por cima */}
      <mesh position={[cx, -200, cz - 250]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1600, 1600]} />
        <meshBasicMaterial color="#A9C9DF" fog={false} />
      </mesh>
      <Espelho nivel={NIVEL}>
        <Pecas pecas={d.pecas} mats={mats} />
        <Flores arranjos={d.arranjos} />
        <Grama circulos={gramaIlhas} quantidade={2600} y={0.37} />
        <Grama areas={gramaMargem} quantidade={5000} y={0.36} />
        {/* montanhas de floresta atrás do lago (começam na água: o reflexo fica certinho) */}
        <mesh geometry={serra.fundo} material={morro} />
        <mesh geometry={serra.lado} material={morro} />
        {[
          [-80, -30, 11, 401],
          [-92, -60, 12, 402],
          [-58, -96, 10, 403],
          [-30, -110, 9, 404],
        ].map(([x, z, alt, s]) => (
          <Arvore key={s} semente={s} altura={alt} position={[cx + x, 0.35, cz + z]} cartoes={50} />
        ))}
        {[
          [-40, -40, 8],
          [-88, -88, 9],
        ].map(([x, z, alt], i) => (
          <Coqueiro key={i} position={[cx + x, 0.35, cz + z]} altura={alt} curva={1.2} rotation-y={i * 2} />
        ))}
      </Espelho>
      <AguaParada pos={[cx, NIVEL, cz - 290]} larg={1000} prof={600} cor="#7FA9C4" opacidade={0.42} />
      <Pecas pecas={chao.pecas} mats={mats} />
      <mesh geometry={chao.corpo} material={matNaga} castShadow receiveShadow />
      <Grama areas={areasGrama} quantidade={9000} y={0.29} />
      <mesh geometry={bambu.hastes} castShadow>
        <meshStandardMaterial color="#A9BF55" roughness={0.6} />
      </mesh>
      <mesh geometry={bambu.folhas} material={matFolhas(12)} castShadow />
      {/* névoa da manhã sobre a água */}
      {[
        [-30, 1.2, -70, 90],
        [30, 1.8, -110, 120],
        [-80, 2.5, -140, 140],
        [60, 3, -200, 180],
      ].map(([x, y, z, s], i) => (
        <mesh key={i} material={nevoa} position={[cx + x, y, cz + z]} rotation-x={-Math.PI / 2} scale={[s, s * 0.5, 1]} renderOrder={3}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  )
}

// ======================================================================
// 4. O PALÁCIO DAS ÁGUAS (pedras octogonais, estátuas e fonte)
// ======================================================================
const LAGO = { x0: -22, x1: 22, z0: -27, z1: 6, nivel: -0.15 }

function Palacio({ mats }: { mats: Mats }) {
  const [cx, cz] = CENTRO.palacio
  const d = useMemo(() => {
    const o = new Obra()
    const L = LAGO
    // bordas do espelho d'água (pedra com balaústres)
    const borda = (x: [number, number], z: [number, number]) => o.caixa('pedraMusgo', [cx + x[0], cx + x[1]], [-0.2, 0.45], [cz + z[0], cz + z[1]])
    borda([L.x0 - 1, L.x1 + 1], [L.z0 - 1, L.z0])
    borda([L.x0 - 1, L.x0], [L.z0, L.z1 + 1])
    borda([L.x1, L.x1 + 1], [L.z0, L.z1 + 1])
    borda([L.x0 - 1, L.x1 + 1], [L.z1, L.z1 + 1])
    for (let x = L.x0; x <= L.x1; x += 1.1) o.caixa('pedraClara', [cx + x - 0.12, cx + x + 0.12], [0.45, 1.15], [cz + L.z0 - 0.7, cz + L.z0 - 0.3])
    o.caixa('pedraClara', [cx + L.x0 - 1, cx + L.x1 + 1], [1.15, 1.3], [cz + L.z0 - 0.8, cz + L.z0 - 0.2])
    // estátuas guardiãs em pedestais dentro da água
    const est = (x: number, z: number, giro: number, esc = 1) => {
      o.caixa('pedraMusgo', [cx + x - 0.5 * esc, cx + x + 0.5 * esc], [-0.2, 0.25], [cz + z - 0.5 * esc, cz + z + 0.5 * esc])
      estatua(o, cx + x, 0.25, cz + z, giro, esc)
    }
    for (const x of [-18, -13, -3.5, 3.5, 13, 18]) est(x, -2.2, 0)
    for (const x of [-16, -3.5, 3.5, 16]) est(x, -10.5, 0)
    for (const x of [-13, 13]) est(x, -18.5, 0)
    est(-19.5, 3.6, 0.5, 1.5)
    est(-15.5, 4.2, 0.2, 1.3)
    // a torre-fonte de 11 andares no fundo
    const T = { x: cx, z: cz - 22 }
    por(o, 'pedraMusgo', new CylinderGeometry(3.6, 3.8, 0.65, 32), [T.x, 0.12, T.z])
    let y = 0.4
    for (let i = 0; i < 11; i++) {
      const r = 2.3 * (1 - i * 0.075)
      por(o, i % 2 ? 'pedraVulc' : 'pedraMusgo', new CylinderGeometry(r * 0.85, r, 0.55, 8), [T.x, y, T.z])
      por(o, 'pedraVulc', new CylinderGeometry(r * 1.06, r * 1.06, 0.1, 8), [T.x, y + 0.5, T.z])
      y += 0.62
    }
    por(o, 'pedraVulc', new ConeGeometry(0.4, 1.2, 8), [T.x, y + 0.6, T.z])
    for (let k = 0; k < 4; k++) por(o, 'pedraVulc', new SphereGeometry(0.35, 10, 8), [T.x + Math.cos(k * 1.57) * 3.4, 0.45, T.z + Math.sin(k * 1.57) * 3.4])
    // pavilhão de telhas vermelhas e muros de tijolo no fundo
    bale(o, cx - 30, 0.3, cz - 38, 6, 5, 'telhaVermelha')
    o.caixa('tijolo', [cx - 50, cx + 50], [0.3, 1.6], [cz - 47, cz - 46.2])
    o.caixa('pedraVulc', [cx - 50, cx + 50], [1.6, 1.8], [cz - 47.1, cz - 46.1])
    candiBentar(o, cx + 26, 0.3, cz - 44, 0, 5)
    // o naga da direita, que joga água no lago
    const pontos = [
      new Vector3(cx + 23.4, 1.6, cz + 5),
      new Vector3(cx + 24.2, 0.9, cz + 7.5),
      new Vector3(cx + 25, 0.8, cz + 11),
      new Vector3(cx + 24, 0.7, cz + 15),
    ]
    const boca = nagaCabeca(o, new Vector3(cx + 23.2, 2.4, cz + 4.4), new Vector3(-0.85, 0.15, -0.5), 1.2)
    por(o, 'pedraMusgo', new CylinderGeometry(0.9, 1.1, 1.6, 12), [cx + 23.4, 0.3, cz + 4.9])
    const corpo = nagaCorpo(pontos, 0.45)
    // pedras octogonais (cada uma com a flor de lótus entalhada no topo)
    const pedras: Vec3[] = []
    const ocupado: [number, number][] = [
      [-18, -2.2],
      [-13, -2.2],
      [-3.5, -2.2],
      [3.5, -2.2],
      [13, -2.2],
      [18, -2.2],
      [-16, -10.5],
      [-3.5, -10.5],
      [3.5, -10.5],
      [16, -10.5],
      [-13, -18.5],
      [13, -18.5],
    ]
    const livre = (x: number, z: number) => !ocupado.some(([a, b]) => Math.hypot(a - x, b - z) < 1.3) && Math.hypot(x, z + 22) > 4.2
    for (const z of [2.2, -6.3, -14.6]) for (let x = L.x0 + 1; x <= L.x1 - 1; x += 1.75) if (livre(x, z)) pedras.push([cx + x, -0.04, cz + z])
    for (const x of [-8.5, 8.5]) for (let z = 4.5; z >= L.z0 + 2; z -= 1.75) if (livre(x, z) && ![2.2, -6.3, -14.6].some((r) => Math.abs(r - z) < 0.9)) pedras.push([cx + x, -0.04, cz + z])
    return { pecas: o.finalizar(ESCALAS), corpo: corpo.geo, boca, pedras }
  }, [cx, cz])

  const matNaga = useMatNaga(mats, 30)
  const morro = useMemo(() => matMorro(), [])
  const serra = useMemo(() => cordilheira(cx - 600, cx + 600, cz - 70, cz - 420, 0.1, 110, 11), [cx, cz])
  const areasGrama = useMemo<[number, number, number, number][]>(() => [[cx - 45, cx + 45, cz - 45, cz + 30]], [cx, cz])
  const buracosGrama = useMemo<[number, number, number, number][]>(
    () => [
      [cx + LAGO.x0 - 1.2, cx + LAGO.x1 + 1.2, cz + LAGO.z0 - 1.2, cz + LAGO.z1 + 1.2],
      [cx - 36, cx - 24, cz - 44, cz - 32],
    ],
    [cx, cz],
  )
  const geoPedra = useMemo(() => new CylinderGeometry(0.66, 0.7, 0.3, 8, 1).rotateY(Math.PI / 8), [])
  const matsPedra = useMemo(() => [mats.pedraMusgo, mats.pedraEntalhada, mats.pedraMusgo], [mats])
  const itensPedra = useMemo(() => d.pedras.map((p) => ({ pos: p })), [d])

  // o jato d'água saindo da boca do naga
  const jato = useMemo(() => {
    const a = d.boca
    const fim = new Vector3(cx + 16.8, LAGO.nivel, cz + 1.5)
    const meio = a.clone().lerp(fim, 0.35).add(new Vector3(0, 1.2, 0))
    const t = texJato().clone()
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(1, 6)
    t.needsUpdate = true
    return {
      geo: new TubeGeometry(new QuadraticBezierCurve3(a, meio, fim), 40, 0.07, 8),
      mat: new MeshStandardMaterial({ map: t, transparent: true, opacity: 0.8, emissive: '#BFEFFF', emissiveIntensity: 0.4, roughness: 0.1, depthWrite: false }),
      fim,
    }
  }, [d, cx, cz])
  // a torre-fonte também joga água pros quatro lados
  const jatosTorre = useMemo(() => {
    const T = new Vector3(cx, 3.2, cz - 22)
    return [0, 1, 2, 3].map((k) => {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4
      const ini = T.clone().add(new Vector3(Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6))
      const fim = new Vector3(cx + Math.cos(a) * 5.2, LAGO.nivel, cz - 22 + Math.sin(a) * 5.2)
      const meio = ini.clone().lerp(fim, 0.4).add(new Vector3(0, 0.9, 0))
      return new TubeGeometry(new QuadraticBezierCurve3(ini, meio, fim), 30, 0.035, 6)
    })
  }, [cx, cz])

  // respingos e peixinhos koi
  const respingos = useRef<InstancedMesh>(null)
  const kois = useRef<InstancedMesh>(null)
  const koiDados = useMemo(() => {
    const rand = sorteador(8)
    return Array.from({ length: 16 }, () => ({ x: (rand() - 0.5) * 36, z: -24 + rand() * 26, r: 1.5 + rand() * 3, v: 0.2 + rand() * 0.3, f: rand() * 6 }))
  }, [])
  useLayoutEffect(() => {
    const m = kois.current
    if (!m) return
    const c = new Color()
    const cores = ['#FF6A10', '#FF8A2A', '#E8401A', '#FFB347', '#FF7A1A']
    koiDados.forEach((_, i) => m.setColorAt(i, c.set(cores[i % cores.length])))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [koiDados])
  const aux = useMemo(() => new Object3D(), [])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    if (jato.mat.map) jato.mat.map.offset.y -= dt * 2.4
    const o = aux
    const r = respingos.current
    if (r) {
      for (let i = 0; i < 24; i++) {
        const ciclo = (t * 1.6 + i * 0.37) % 1
        const a = i * 2.39
        const alc = 0.3 + (i % 5) * 0.12
        o.position.set(jato.fim.x + Math.cos(a) * alc * ciclo, LAGO.nivel + Math.sin(ciclo * Math.PI) * (0.35 + (i % 3) * 0.15), jato.fim.z + Math.sin(a) * alc * ciclo)
        o.rotation.set(0, 0, 0)
        o.scale.setScalar(1 - ciclo * 0.6)
        o.updateMatrix()
        r.setMatrixAt(i, o.matrix)
      }
      r.instanceMatrix.needsUpdate = true
    }
    const k = kois.current
    if (k) {
      koiDados.forEach((p, i) => {
        const a = p.f + t * p.v
        o.position.set(cx + p.x + Math.cos(a) * p.r, LAGO.nivel - 0.42, cz + p.z + Math.sin(a) * p.r)
        o.rotation.set(0, -a, Math.sin(t * 6 + i) * 0.15)
        o.scale.set(0.3, 0.09, 0.12)
        o.updateMatrix()
        k.setMatrixAt(i, o.matrix)
      })
      k.instanceMatrix.needsUpdate = true
    }
  })

  // folhas de lótus boiando, algumas com flor
  const lotus = useMemo(() => {
    const rand = sorteador(31)
    const lista: Item[] = []
    for (let i = 0; i < 26; i++) lista.push({ pos: [cx + (rand() - 0.5) * 40, LAGO.nivel + 0.02, cz - 26 + rand() * 30], rot: [-Math.PI / 2, 0, rand() * 6], esc: 0.6 + rand() * 0.6 })
    return lista
  }, [cx, cz])
  const geoFolhaLotus = useMemo(() => new CircleGeometry(0.4, 18, 0.3, Math.PI * 1.85), [])
  const matFolhaLotus = useMemo(() => new MeshStandardMaterial({ color: '#4E8E2E', roughness: 0.6, side: DoubleSide }), [])
  const geoFlorLotus = useMemo(() => new SphereGeometry(0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), [])
  const matFlorLotus = useMemo(() => new MeshStandardMaterial({ color: '#F7A6C8', emissive: '#F58DB8', emissiveIntensity: 0.2 }), [])
  const florLotus = useMemo(() => lotus.filter((_, i) => i % 3 === 0).map((l) => ({ pos: [l.pos[0], l.pos[1] + 0.1, l.pos[2]] as Vec3, esc: [1, 0.7, 1] as Vec3 })), [lotus])

  const arvores = useMemo(() => {
    const arranjos: Arranjo[] = []
    // frangipanis floridos e arbustos de flor amarela
    for (const [x, z] of [
      [-30, -12],
      [-32, 4],
      [30, -20],
      [-26, -30],
    ])
      for (let k = 0; k < 10; k++) arranjos.push({ centro: new Vector3(cx + x + Math.cos(k) * 2.4, 5.2 + Math.sin(k * 2) * 1.2, cz + z + Math.sin(k) * 2.4), raio: 0.6, flores: 14, cores: ['#FFFFFF', '#FFF4C8', '#FFE08A'] })
    for (let k = 0; k < 14; k++) arranjos.push({ centro: new Vector3(cx + 27 + (k % 3) * 1.2, 1.1, cz - 4 + k * 1.3), raio: 0.7, flores: 18, cores: ['#FFD23F', '#FFC21A', '#FFFFFF'] })
    return arranjos
  }, [cx, cz])

  return (
    <group>
      {/* gramado em volta (com o "buraco" do espelho d'água) e montanhas */}
      {[
        [cx, cz - 170, 500, 280],
        [cx, cz + 150, 500, 286],
        [cx - 135, cz - 11, 224, 36],
        [cx + 135, cz - 11, 224, 36],
      ].map(([x, z, w, h], i) => (
        <mesh key={i} position={[x, 0.29, z]} rotation-x={-Math.PI / 2} receiveShadow material={mats.grama}>
          <planeGeometry args={[w, h]} />
        </mesh>
      ))}
      <mesh geometry={serra} material={morro} />
      <Grama areas={areasGrama} buracos={buracosGrama} quantidade={16000} y={0.29} />
      {jatosTorre.map((g, i) => (
        <mesh key={i} geometry={g} material={jato.mat} />
      ))}
      {/* fundo do lago */}
      <mesh position={[cx, -0.95, cz - 10.5]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[44, 33]} />
        <meshStandardMaterial color="#2E5C55" roughness={1} />
      </mesh>
      <Espelho nivel={LAGO.nivel}>
        <Pecas pecas={d.pecas} mats={mats} />
        <mesh geometry={d.corpo} material={matNaga} castShadow />
        <Instancias geo={geoPedra} mat={matsPedra} itens={itensPedra} sombra />
      </Espelho>
      <instancedMesh ref={kois} args={[undefined, undefined, koiDados.length]}>
        <sphereGeometry args={[1, 10, 6]} />
        <meshStandardMaterial roughness={0.4} />
      </instancedMesh>
      <AguaParada pos={[cx, LAGO.nivel, cz - 10.5]} larg={44} prof={33} cor="#4E9D97" opacidade={0.5} />
      <Instancias geo={geoFolhaLotus} mat={matFolhaLotus} itens={lotus} />
      <Instancias geo={geoFlorLotus} mat={matFlorLotus} itens={florLotus} />
      <mesh geometry={jato.geo} material={jato.mat} />
      <instancedMesh ref={respingos} args={[undefined, undefined, 24]}>
        <sphereGeometry args={[0.05, 6, 4]} />
        <meshStandardMaterial color="#FFFFFF" transparent opacity={0.8} />
      </instancedMesh>
      <Flores arranjos={arvores} />
      {[
        [-30, -12, 6.5, 501],
        [-32, 4, 6, 502],
        [30, -20, 7, 503],
        [-26, -30, 6.5, 504],
      ].map(([x, z, alt, s]) => (
        <Arvore key={s} semente={s} altura={alt} position={[cx + x, 0.3, cz + z]} cartoes={45} />
      ))}
      <Cipreste semente={520} altura={18} position={[cx + 6, 0.3, cz - 40]} />
      <Cipreste semente={521} altura={14} position={[cx - 12, 0.3, cz - 42]} />
      {[
        [-38, -20, 9],
        [36, -34, 10],
        [40, 2, 8.5],
        [-40, -40, 9.5],
      ].map(([x, z, alt], i) => (
        <Coqueiro key={i} position={[cx + x, 0.3, cz + z]} altura={alt} curva={1.2} rotation-y={i * 1.7} />
      ))}
      {[
        [27.5, -3, 301],
        [28.5, 6, 302],
        [28, 12, 303],
        [-27, 10, 304],
      ].map(([x, z, s]) => (
        <Arbusto key={s} semente={s} largura={3} profundidade={2.6} alturaArbusto={1.6} position={[cx + x, 0.3, cz + z]} />
      ))}
      <Tedung position={[cx - 3.5, 0.4, cz - 19]} />
      <Tedung position={[cx + 3.5, 0.4, cz - 19]} />
    </group>
  )
}

// ======================================================================

/** A névoa de cada cenário (mais densa na manhã do lago) */
const NEVOA: Record<ZonaLDM, [string, number, number]> = {
  lagoa: ['#D6EEF8', 220, 800],
  vilas: ['#D6EEF8', 220, 800],
  templo: ['#DCE8F0', 90, 1100],
  palacio: ['#D6EEF8', 140, 650],
}

function Sol({ foco, raio, qualidade }: { foco: Vec3; raio: number; qualidade: Qualidade }) {
  const ref = useRef<DirectionalLight>(null)
  useEffect(() => {
    const l = ref.current
    if (!l) return
    const alvo = new Vector3(...foco)
    l.position.copy(SOL_TROPICAL).multiplyScalar(160).add(alvo)
    l.target.position.copy(alvo)
    l.target.updateMatrixWorld()
    const c = l.shadow.camera
    c.left = c.bottom = -raio
    c.right = c.top = raio
    c.near = 40
    c.far = 400
    c.updateProjectionMatrix()
  }, [foco, raio])
  return <directionalLight ref={ref} intensity={3.4} color="#FFF3DE" castShadow shadow-mapSize={qualidade === 'alta' ? [2048, 2048] : [1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.05} />
}

function Nuvens({ poucas }: { poucas: boolean }) {
  const textura = useMemo(() => urlNuvem(), [])
  const lista = useMemo(() => {
    const rand = sorteador(12)
    const l: { pos: Vec3; seed: number }[] = []
    for (const [cx, cz] of Object.values(CENTRO))
      for (let i = 0; i < 7; i++) l.push({ pos: [cx + (rand() - 0.5) * 600, 70 + rand() * 50, cz - 160 - rand() * 300], seed: l.length + 1 })
    return l
  }, [])
  return (
    <Clouds material={MeshLambertMaterial} texture={textura} limit={poucas ? 200 : 400}>
      {lista.map((n) => (
        <Cloud key={n.seed} position={n.pos} seed={n.seed} segments={poucas ? 12 : 20} bounds={[60, 10, 12]} volume={40} growth={6} speed={0.05} opacity={0.95} color="#FFFFFF" />
      ))}
    </Clouds>
  )
}

export function CenaLuaDeMel({ zona, foco, raioSombra, qualidade }: { zona: ZonaLDM; foco: Vec3; raioSombra: number; qualidade: Qualidade }) {
  const mats = useMemo(() => materiaisLuaDeMel(), [])
  useFrame(({ clock }) => {
    vento.uTempo.value = clock.elapsedTime
  })
  return (
    <>
      <CeuTropical />
      <Environment resolution={64} frames={1} environmentIntensity={0.45}>
        <CeuTropical seguir={false} />
      </Environment>
      <fog key={zona} attach="fog" args={NEVOA[zona]} />
      <hemisphereLight args={['#CFE8FF', '#E8D9B0', 0.9]} />
      <Sol foco={foco} raio={raioSombra} qualidade={qualidade} />

      <Lagoa mats={mats} q={qualidade} />
      <Vilas mats={mats} />
      <Templo mats={mats} />
      <Palacio mats={mats} />
      <Suspense fallback={null}>
        <Nuvens poucas={qualidade !== 'alta'} />
      </Suspense>
    </>
  )
}
