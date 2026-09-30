import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  CylinderGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  TubeGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CONFIG } from '../../config'
import { criarArranjos, criarPampas, materialPampas, materialRosas, type Arranjo } from '../arranjos'
import { Coqueiro, matFolhas } from '../Arvore'
import { criarTufo } from '../Grama'
import { altura } from '../terreno'
import { texJuta, texMadeira, texPlaca } from '../texturas'
import { sorteador, type Vec3 } from '../util'
import { aplicarVento } from '../vento'

// ---------------- onde fica cada coisa (no mundo) ----------------
const ARCO = { x: 37.2, z: 0 } // o altar, de costas pro mar
const FILEIRAS = 8
const MESAS: [number, number][] = [
  [25.5, 10.5],
  [29.5, 10.5],
  [33.5, 10.5],
  [25.5, 15.8],
  [29.5, 15.8],
  [33.5, 15.8],
]
const NOIVOS = { x: 36.6, z: 13.1 } // mesa dos noivos
const POSTES_LUZ: [number, number][] = [
  [23.0, 7.6],
  [30.1, 7.6],
  [37.4, 7.6],
  [23.0, 18.8],
  [30.1, 18.8],
  [37.4, 18.8],
]
const COQUEIROS: [number, number, number, number][] = [
  [21.5, -14, 7.5, 0.3],
  [20.6, -9.0, 6.8, -0.4],
  [20.2, 10.4, 7.8, 0.6],
  [22.2, 21, 7, -0.2],
  [40.2, -6.8, 8.2, 2.9],
  [40.6, 6.9, 7.2, 3.4],
  [39.4, 21.2, 7.6, 2.6],
  [40.8, -15, 6.9, 3.1],
]

const chao = (x: number, z: number) => altura(x, z)
const v3 = (x: number, dy: number, z: number) => new Vector3(x, chao(x, z) + dy, z)

// ---------------- geometrias ----------------

/** Cadeira "cross-back" de madeira natural (sem a almofada). Frente pra -z. */
function geoCadeira() {
  const p: BufferGeometry[] = []
  const add = (w: number, h: number, d: number, x: number, y: number, z: number, rz = 0) => {
    const b = new BoxGeometry(w, h, d)
    if (rz) b.rotateZ(rz)
    b.translate(x, y, z)
    p.push(b)
  }
  add(0.44, 0.05, 0.42, 0, 0.45, 0)
  for (const x of [-0.19, 0.19]) {
    add(0.04, 0.45, 0.04, x, 0.225, -0.18)
    add(0.04, 0.95, 0.04, x, 0.475, 0.19)
  }
  add(0.36, 0.03, 0.03, 0, 0.18, -0.18)
  add(0.42, 0.06, 0.04, 0, 0.92, 0.19)
  add(0.03, 0.52, 0.025, 0, 0.68, 0.19, 0.66)
  add(0.03, 0.52, 0.025, 0, 0.68, 0.19, -0.66)
  return mergeGeometries(p)!
}

/** Lanterna de chão: estrutura preta (4 colunas + base + teto com argola) */
function geoLanterna() {
  const p: BufferGeometry[] = []
  const add = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const b = new BoxGeometry(w, h, d)
    b.translate(x, y, z)
    p.push(b)
  }
  add(0.3, 0.04, 0.3, 0, 0.02, 0)
  add(0.32, 0.05, 0.32, 0, 0.55, 0)
  for (const x of [-0.13, 0.13]) for (const z of [-0.13, 0.13]) add(0.025, 0.52, 0.025, x, 0.28, z)
  const argola = new CylinderGeometry(0.06, 0.1, 0.1, 4)
  argola.translate(0, 0.62, 0)
  p.push(argola.toNonIndexed() as BufferGeometry)
  return mergeGeometries(p.map((g) => (g.index ? g.toNonIndexed() : g)))!
}

/** Tapete que acompanha a areia (ela é levemente inclinada) */
function geoTapete(x0: number, x1: number, z: number, largura: number) {
  const g = new PlaneGeometry(x1 - x0, largura, 24, 2)
  g.rotateX(-Math.PI / 2)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + (x0 + x1) / 2
    const zz = pos.getZ(i) + z
    pos.setXYZ(i, x, chao(x, zz) + 0.025, zz)
  }
  g.computeVertexNormals()
  return g
}

/** Fio de luzinhas caído entre dois postes (catenária) */
function fio(a: Vector3, b: Vector3, queda: number) {
  const pts: Vector3[] = []
  for (let i = 0; i <= 16; i++) {
    const t = i / 16
    pts.push(a.clone().lerp(b, t).add(new Vector3(0, -queda * 4 * t * (1 - t), 0)))
  }
  return new CatmullRomCurve3(pts)
}

// ---------------- componente ----------------

interface Inst {
  pos: Vec3
  rot?: Vec3
  esc?: Vec3
  cor?: string
}

function usePosicionar(ref: React.RefObject<InstancedMesh | null>, itens: Inst[]) {
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    const c = new Color()
    itens.forEach((it, i) => {
      o.position.set(...it.pos)
      o.rotation.set(...(it.rot ?? [0, 0, 0]))
      o.scale.set(...(it.esc ?? [1, 1, 1]))
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      if (it.cor) m.setColorAt(i, c.set(it.cor))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [ref, itens])
}

/** Tecido de voil preso no alto do arco, balançando com a brisa do mar */
function Voil({ x, z, lado }: { x: number; z: number; lado: number }) {
  const H = 2.75
  const geo = useMemo(() => {
    const g = new PlaneGeometry(0.7, H, 3, 16)
    g.translate(0, -H / 2, 0)
    return g
  }, [])
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = base[i * 3 + 1]
      const solto = Math.max(0, -y / H)
      // franzido no alto, amarrado no meio da coluna e soltinho embaixo
      const amarra = 1 - Math.exp(-Math.pow((solto - 0.62) * 5, 2)) * 0.75
      pos.setX(i, base[i * 3] * (0.35 + 0.65 * solto) * amarra + Math.sin(t * 1.3 + y * 2 + z) * 0.08 * solto * solto)
      pos.setZ(i, base[i * 3 + 2] + Math.sin(t * 1.6 + y * 2.4 + x) * 0.12 * solto * solto)
    }
    pos.needsUpdate = true
  })
  return (
    <mesh geometry={geo} position={[x, chao(x, z) + H + 0.05, z]} rotation-y={Math.PI / 2 + lado * 0.15} userData={{ semSombra: true }}>
      <meshStandardMaterial color="#FFFFFF" emissive="#FFF6EE" emissiveIntensity={0.3} transparent opacity={0.55} side={2} depthWrite={false} />
    </mesh>
  )
}

export function Casamento({ qualidade = 'alta' }: { qualidade?: 'alta' | 'media' | 'baixa' }) {
  const cadeira = useMemo(() => geoCadeira(), [])
  const lanterna = useMemo(() => geoLanterna(), [])
  const tufo = useMemo(() => criarTufo(), [])

  const materiais = useMemo(() => {
    const madeira = texMadeira().clone()
    madeira.repeat.set(0.5, 0.5)
    madeira.needsUpdate = true
    const juta = texJuta().clone()
    juta.repeat.set(1, 6)
    juta.needsUpdate = true
    const capim = new MeshStandardMaterial({ color: '#B9B470', side: 2, roughness: 0.9 })
    aplicarVento(capim, { altura: 0.42, forca: 1.4 })
    return {
      madeira: new MeshStandardMaterial({ color: '#D9AE7C', map: madeira, roughness: 0.65 }),
      almofada: new MeshStandardMaterial({ color: '#FFF6EA', roughness: 0.9, envMapIntensity: 0.3 }),
      toalha: new MeshStandardMaterial({ color: '#FFFBF4', roughness: 0.8, envMapIntensity: 0.35 }),
      juta: new MeshStandardMaterial({ map: juta, color: '#F2DDB6', roughness: 1 }),
      preto: new MeshStandardMaterial({ color: '#1E1F21', roughness: 0.5, metalness: 0.4 }),
      vidro: new MeshStandardMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false }),
      vela: new MeshStandardMaterial({ color: '#FFF3DC', emissive: '#FFA548', emissiveIntensity: 2.8 }),
      lampada: new MeshStandardMaterial({ color: '#FFF4DC', emissive: '#FFC069', emissiveIntensity: 4 }),
      prato: new MeshStandardMaterial({ color: '#FBFAF7', roughness: 0.3 }),
      tecido: new MeshStandardMaterial({ color: '#EFE6D8', roughness: 0.95 }),
      capim,
      bambu: new MeshStandardMaterial({ color: '#E3C99A', roughness: 0.6 }),
    }
  }, [])

  // ------------ tudo calculado uma vez ------------
  const dados = useMemo(() => {
    const rand = sorteador(2412)
    const cadeiras: Inst[] = []
    const almofadas: Inst[] = []
    const addCadeira = (x: number, z: number, giro: number) => {
      const y = chao(x, z)
      cadeiras.push({ pos: [x, y, z], rot: [0, giro, 0] })
      almofadas.push({ pos: [x, y + 0.49, z], rot: [0, giro, 0] })
    }
    // cerimônia: convidados olhando pro mar (+x)
    for (let r = 0; r < FILEIRAS; r++) {
      const x = 34.8 - r * 1.0
      for (let c = 0; c < 6; c++) for (const lado of [-1, 1]) addCadeira(x, lado * (1.15 + c * 0.58), -Math.PI / 2)
    }
    // recepção: 8 cadeiras em volta de cada mesa
    for (const [cx, cz] of MESAS)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2
        addCadeira(cx + Math.cos(a) * 1.28, cz + Math.sin(a) * 1.28, Math.atan2(Math.cos(a), Math.sin(a)))
      }
    // noivos (de costas pro mar, olhando os convidados)
    for (const dz of [-0.4, 0.4]) addCadeira(NOIVOS.x + 0.6, NOIVOS.z + dz, Math.PI / 2)

    // mesas, pratos, taças
    const mesas: Inst[] = MESAS.map(([x, z]) => ({ pos: [x, chao(x, z) + 0.385, z] })) // toalha até o chão
    const pratos: Inst[] = []
    const tacas: Inst[] = []
    const velas: Inst[] = []
    const copos: Inst[] = [] // vidrinhos das velas
    for (const [cx, cz] of MESAS) {
      const y = chao(cx, cz) + 0.77
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2
        pratos.push({ pos: [cx + Math.cos(a) * 0.62, y + 0.012, cz + Math.sin(a) * 0.62] })
        tacas.push({ pos: [cx + Math.cos(a + 0.28) * 0.58, y + 0.09, cz + Math.sin(a + 0.28) * 0.58] })
      }
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2
        velas.push({ pos: [cx + Math.cos(a) * 0.32, y + 0.06, cz + Math.sin(a) * 0.32], esc: [1, 0.8 + i * 0.3, 1] })
      }
    }

    // arco: 4 colunas + moldura em cima (bambu claro)
    const partesArco: BufferGeometry[] = []
    const yArco = chao(ARCO.x, ARCO.z)
    const H = 2.8
    const cols: [number, number][] = [
      [ARCO.x - 0.7, -1.4],
      [ARCO.x - 0.7, 1.4],
      [ARCO.x + 0.7, -1.4],
      [ARCO.x + 0.7, 1.4],
    ]
    for (const [x, z] of cols) {
      const c = new CylinderGeometry(0.06, 0.07, H + 0.3, 8)
      c.translate(x, yArco + (H + 0.3) / 2 - 0.3, z)
      partesArco.push(c)
    }
    for (const x of [ARCO.x - 0.7, ARCO.x + 0.7]) {
      const b = new CylinderGeometry(0.055, 0.055, 3.2, 8)
      b.rotateX(Math.PI / 2)
      b.translate(x, yArco + H, 0)
      partesArco.push(b)
    }
    for (const z of [-1.4, 1.4]) {
      const b = new CylinderGeometry(0.055, 0.055, 1.8, 8)
      b.rotateZ(Math.PI / 2)
      b.translate(ARCO.x, yArco + H, z)
      partesArco.push(b)
    }
    const arco = mergeGeometries(partesArco)!

    // lanternas no corredor e velas perto do altar
    const lanternas: Inst[] = []
    const vidrosLanterna: Inst[] = []
    for (let r = 1; r < FILEIRAS; r += 2)
      for (const lado of [-1, 1]) {
        const x = 34.8 - r * 1.0
        const z = lado * 0.88
        const y = chao(x, z)
        lanternas.push({ pos: [x, y, z], rot: [0, rand(), 0] })
        vidrosLanterna.push({ pos: [x, y + 0.28, z], esc: [0.26, 0.5, 0.26] })
        velas.push({ pos: [x, y + 0.14, z], esc: [1.4, 2.2, 1.4] })
      }
    for (let i = 0; i < 14; i++) {
      const a = rand() * Math.PI - Math.PI / 2
      const r = 1.2 + rand() * 0.7
      const x = ARCO.x - 0.4 + Math.cos(a + Math.PI) * r * 0.5
      const z = Math.sin(a) * (1.9 + rand() * 0.5)
      const y = chao(x, z)
      const alt = 0.8 + rand() * 1.6
      velas.push({ pos: [x, y + 0.05 * alt, z], esc: [1.2, alt, 1.2] })
      copos.push({ pos: [x, y + 0.13 * alt, z], esc: [0.12, 0.26 * alt, 0.12] })
    }

    // luzinhas: postes, fios e lâmpadas
    const postes: Inst[] = POSTES_LUZ.map(([x, z]) => ({ pos: [x, chao(x, z) + 2.1, z] }))
    const topo = (i: number) => {
      const [x, z] = POSTES_LUZ[i]
      return new Vector3(x, chao(x, z) + 4.1, z)
    }
    const ligacoes: [number, number][] = [
      [0, 1],
      [1, 2],
      [3, 4],
      [4, 5],
      [0, 4],
      [1, 3],
      [1, 5],
      [2, 4],
    ]
    const fios: BufferGeometry[] = []
    const lampadas: Inst[] = []
    for (const [a, b] of ligacoes) {
      const curva = fio(topo(a), topo(b), 0.9)
      fios.push(new TubeGeometry(curva, 24, 0.012, 3))
      const n = Math.floor(curva.getLength() / 0.55)
      for (let i = 1; i < n; i++) {
        const p = curva.getPoint(i / n)
        lampadas.push({ pos: [p.x, p.y - 0.07, p.z] })
      }
    }
    // um fio de luzinhas também sobre o lounge
    const lounge1 = new Vector3(21.3, chao(21.3, -13.8) + 4.4, -13.8)
    const lounge2 = new Vector3(30.2, chao(30.2, -6) + 3.8, -6)
    const cl = fio(lounge1, lounge2, 0.8)
    fios.push(new TubeGeometry(cl, 24, 0.012, 3))
    for (let i = 1; i < 18; i++) {
      const p = cl.getPoint(i / 18)
      lampadas.push({ pos: [p.x, p.y - 0.07, p.z] })
    }
    postes.push({ pos: [30.2, chao(30.2, -6) + 1.9, -6], esc: [1, 0.93, 1] })

    // pétalas pelo corredor
    const petalas: Inst[] = []
    const coresPetala = ['#F4B4AA', '#FFFFFF', '#F8D0C6', '#E88C88']
    for (let i = 0; i < 220; i++) {
      const lado = rand() < 0.5 ? -1 : 1
      const x = 27.2 + rand() * 9.4
      const z = lado * (0.3 + rand() * 0.45)
      petalas.push({ pos: [x, chao(x, z) + 0.03, z], rot: [-Math.PI / 2, 0, rand() * 6], cor: coresPetala[i % 4] })
    }

    // capim de duna em moitas
    const capim: Inst[] = []
    const moitas: [number, number, number][] = [
      [26.2, -5.2, 10],
      [29.5, -5.4, 8],
      [33.1, -5.1, 10],
      [26.0, 5.2, 10],
      [30.5, 5.3, 8],
      [34.0, 5.0, 10],
      [38.8, -3.4, 14],
      [38.8, 3.4, 14],
      [22.5, -1, 16],
      [21.8, 12, 14],
      [22.4, -10.5, 14],
      [35.8, -12.5, 12],
      [39.6, 13.5, 12],
      [24.5, 20.5, 12],
      [18.5, 2.5, 14],
      [19.3, -8.5, 12],
    ]
    for (const [cx, cz, n] of moitas)
      for (let i = 0; i < n; i++) {
        const a = rand() * 6.28
        const r = Math.sqrt(rand()) * 0.9
        const x = cx + Math.cos(a) * r
        const z = cz + Math.sin(a) * r
        const s = 1.6 + rand() * 1.2
        capim.push({ pos: [x, chao(x, z), z], rot: [(rand() - 0.5) * 0.3, rand() * 6, 0], esc: [s * 0.6, s * 1.35, s * 0.6] })
      }

    // arranjos de rosas
    const arranjos: Arranjo[] = [
      // cantos de cima do arco (bem cheios, caindo pela coluna)
      { centro: v3(ARCO.x - 0.72, 2.85, -1.35), raio: 0.62, flores: 90 },
      { centro: v3(ARCO.x - 0.72, 2.25, -1.45), raio: 0.4, flores: 40 },
      { centro: v3(ARCO.x - 0.72, 2.9, 0.9), raio: 0.45, flores: 45 },
      { centro: v3(ARCO.x - 0.72, 2.85, 1.35), raio: 0.62, flores: 90 },
      { centro: v3(ARCO.x - 0.72, 2.2, 1.45), raio: 0.4, flores: 40 },
      // pé das colunas
      { centro: v3(ARCO.x - 0.9, 0.35, -1.55), raio: 0.55, flores: 60, achatado: 0.7 },
      { centro: v3(ARCO.x - 0.9, 0.35, 1.55), raio: 0.55, flores: 60, achatado: 0.7 },
      // mesa dos noivos: guirlanda na frente
      ...[-1.0, -0.5, 0, 0.5, 1.0].map((dz) => ({ centro: v3(NOIVOS.x - 0.45, 0.78, NOIVOS.z + dz), raio: 0.28, flores: 18 })),
      // bar
      { centro: v3(33.3, 1.25, -10.9), raio: 0.35, flores: 26 },
    ]
    // arranjinhos nas pontas das fileiras (lado do corredor)
    for (let r = 0; r < FILEIRAS; r += 2) for (const lado of [-1, 1]) arranjos.push({ centro: v3(34.8 - r * 1.0, 0.22, lado * 0.82), raio: 0.2, flores: 12, achatado: 0.7 })
    // centros de mesa baixos
    for (const [cx, cz] of MESAS) arranjos.push({ centro: v3(cx, 0.9, cz), raio: 0.3, flores: 26, achatado: 0.55 })
    const flores = criarArranjos(arranjos, 5)

    // capim-dos-pampas em vasos
    const pampaBases: [number, number][] = [
      [ARCO.x - 1.05, -2.0],
      [ARCO.x - 1.05, 2.0],
      [24.2, -8.4],
      [28.9, -12.7],
      [34.8, -11.8],
    ]
    const vasos: Inst[] = pampaBases.map(([x, z]) => ({ pos: [x, chao(x, z) + 0.3, z] }))
    const pampas = criarPampas(
      pampaBases.flatMap(([x, z]) =>
        Array.from({ length: 7 }, (_, i) => ({ base: v3(x, 0.55, z), altura: 1.1 + (i % 3) * 0.2, giro: i * 0.9, incl: (i - 3) * 0.12 })),
      ),
    )

    return { cadeiras, almofadas, mesas, pratos, tacas, velas, copos, arco, lanternas, vidrosLanterna, postes, fios: mergeGeometries(fios)!, lampadas, petalas, capim, flores, vasos, pampas }
  }, [])

  // tapetes e móveis do lounge
  const tapeteCorredor = useMemo(() => geoTapete(26.8, 36.9, 0, 1.3), [])
  const tapeteArco = useMemo(() => {
    const g = new CircleGeometry(1.9, 32)
    g.rotateX(-Math.PI / 2)
    g.translate(ARCO.x, chao(ARCO.x, 0) + 0.03, 0)
    return g
  }, [])
  const lounge = useMemo(() => {
    const tecido: BufferGeometry[] = []
    const madeira: BufferGeometry[] = []
    const caixa = (lista: BufferGeometry[], w: number, h: number, d: number, x: number, dy: number, z: number, giro = 0) => {
      const b = new BoxGeometry(w, h, d)
      b.rotateY(giro)
      b.translate(x, chao(x, z) + dy, z)
      lista.push(b)
    }
    // sofá encostado (frente +x) e outro (frente +z): base, assento, encosto e braços
    const sofa = (x: number, z: number, giro: number) => {
      const c = Math.cos(giro)
      const s = Math.sin(giro)
      const local = (lx: number, lz: number): [number, number] => [x + lx * c + lz * s, z - lx * s + lz * c]
      const peca = (w: number, h: number, d: number, lx: number, dy: number, lz: number) => {
        const [wx, wz] = local(lx, lz)
        caixa(tecido, w, h, d, wx, dy, wz, giro)
      }
      peca(2.3, 0.28, 0.9, 0, 0.2, 0)
      peca(2.1, 0.16, 0.72, 0, 0.42, 0.05)
      peca(2.3, 0.5, 0.22, 0, 0.55, -0.36)
      for (const lx of [-1.08, 1.08]) peca(0.18, 0.45, 0.9, lx, 0.45, 0)
    }
    sofa(24.9, -10.4, Math.PI / 2)
    sofa(26.7, -12.4, 0)
    sofa(28.6, -10.4, -Math.PI / 2)
    // mesinha de centro e bar de madeira
    const mesa = new CylinderGeometry(0.55, 0.5, 0.4, 20)
    mesa.translate(26.8, chao(26.8, -10.4) + 0.2, -10.4)
    madeira.push(mesa)
    caixa(madeira, 0.7, 1.1, 3.0, 33.6, 0.55, -10.9)
    caixa(madeira, 0.9, 0.06, 3.2, 33.55, 1.12, -10.9)
    // cavalete da placa de boas-vindas
    const placaX = 25.2
    const placaZ = -2.6
    for (const dz of [-0.35, 0.35]) caixa(madeira, 0.05, 1.8, 0.05, placaX + 0.1, 0.9, placaZ + dz)
    caixa(madeira, 0.05, 1.6, 0.05, placaX + 0.45, 0.8, placaZ)
    return { tecido: mergeGeometries(tecido)!, madeira: mergeGeometries(madeira)!, placaX, placaZ }
  }, [])
  const almofadasLounge = useMemo<Inst[]>(() => {
    const cores = ['#C8643B', '#9CAF88', '#F4EDE2', '#C9A86A', '#E8B4A0']
    const lista: Inst[] = []
    const add = (x: number, z: number, giro: number, i: number) => lista.push({ pos: [x, chao(x, z) + 0.72, z], rot: [0.2, giro, 0], esc: [0.45, 0.4, 0.14], cor: cores[i % cores.length] })
    ;[-0.7, 0, 0.7].forEach((d, i) => add(25.15, -10.4 + d, Math.PI / 2, i))
    ;[-0.7, 0, 0.7].forEach((d, i) => add(26.7 + d, -12.15, 0, i + 2))
    ;[-0.7, 0, 0.7].forEach((d, i) => add(28.35, -10.4 + d, -Math.PI / 2, i + 1))
    return lista
  }, [])

  const placa = useMemo(() => texPlaca(['Bem-vindos', `${CONFIG.iniciais.pai} & ${CONFIG.iniciais.mae}`, 'ao nosso casamento']), [])

  // refs das instâncias
  const r = {
    cadeiras: useRef<InstancedMesh>(null),
    almofadas: useRef<InstancedMesh>(null),
    mesas: useRef<InstancedMesh>(null),
    pratos: useRef<InstancedMesh>(null),
    tacas: useRef<InstancedMesh>(null),
    velas: useRef<InstancedMesh>(null),
    copos: useRef<InstancedMesh>(null),
    lanternas: useRef<InstancedMesh>(null),
    vidrosLanterna: useRef<InstancedMesh>(null),
    postes: useRef<InstancedMesh>(null),
    lampadas: useRef<InstancedMesh>(null),
    petalas: useRef<InstancedMesh>(null),
    capim: useRef<InstancedMesh>(null),
    vasos: useRef<InstancedMesh>(null),
    almofadasLounge: useRef<InstancedMesh>(null),
  }
  usePosicionar(r.cadeiras, dados.cadeiras)
  usePosicionar(r.almofadas, dados.almofadas)
  usePosicionar(r.mesas, dados.mesas)
  usePosicionar(r.pratos, dados.pratos)
  usePosicionar(r.tacas, dados.tacas)
  usePosicionar(r.velas, dados.velas)
  usePosicionar(r.copos, dados.copos)
  usePosicionar(r.lanternas, dados.lanternas)
  usePosicionar(r.vidrosLanterna, dados.vidrosLanterna)
  usePosicionar(r.postes, dados.postes)
  usePosicionar(r.lampadas, dados.lampadas)
  usePosicionar(r.petalas, dados.petalas)
  usePosicionar(r.capim, dados.capim)
  usePosicionar(r.vasos, dados.vasos)
  usePosicionar(r.almofadasLounge, almofadasLounge)

  const m = materiais
  const n = (lista: unknown[]) => lista.length

  return (
    <group>
      {/* ------- cerimônia ------- */}
      <mesh geometry={tapeteCorredor} material={m.juta} receiveShadow />
      <mesh geometry={tapeteArco} material={m.juta} receiveShadow />
      <mesh geometry={dados.arco} material={m.bambu} castShadow />
      <Voil x={ARCO.x - 0.72} z={-1.4} lado={-1} />
      <Voil x={ARCO.x - 0.72} z={1.4} lado={1} />
      {qualidade !== 'baixa' && (
        <>
          <Voil x={ARCO.x + 0.72} z={-1.4} lado={-1} />
          <Voil x={ARCO.x + 0.72} z={1.4} lado={1} />
        </>
      )}
      <mesh geometry={dados.flores.folhas} material={matFolhas(3)} castShadow />
      <mesh geometry={dados.flores.rosas} material={materialRosas()} />
      <mesh geometry={dados.pampas} material={materialPampas()} />
      <instancedMesh ref={r.vasos} args={[undefined, m.preto, n(dados.vasos)]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.6, 12]} />
      </instancedMesh>

      <instancedMesh ref={r.cadeiras} args={[cadeira, m.madeira, n(dados.cadeiras)]} castShadow receiveShadow />
      <instancedMesh ref={r.almofadas} args={[undefined, m.almofada, n(dados.almofadas)]}>
        <boxGeometry args={[0.4, 0.06, 0.38]} />
      </instancedMesh>
      <instancedMesh ref={r.petalas} args={[undefined, undefined, n(dados.petalas)]}>
        <circleGeometry args={[0.035, 6]} />
        <meshStandardMaterial side={2} roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={r.lanternas} args={[lanterna, m.preto, n(dados.lanternas)]} castShadow />
      <instancedMesh ref={r.vidrosLanterna} args={[undefined, m.vidro, n(dados.vidrosLanterna)]}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <instancedMesh ref={r.velas} args={[undefined, m.vela, n(dados.velas)]}>
        <cylinderGeometry args={[0.035, 0.035, 0.1, 10]} />
      </instancedMesh>
      <instancedMesh ref={r.copos} args={[undefined, m.vidro, n(dados.copos)]}>
        <cylinderGeometry args={[1, 1, 1, 12, 1, true]} />
      </instancedMesh>

      {/* ------- recepção ------- */}
      <instancedMesh ref={r.mesas} args={[undefined, m.toalha, n(dados.mesas)]} castShadow receiveShadow>
        <cylinderGeometry args={[0.95, 1.02, 0.77, 28]} />
      </instancedMesh>
      <instancedMesh ref={r.pratos} args={[undefined, m.prato, n(dados.pratos)]}>
        <cylinderGeometry args={[0.13, 0.11, 0.02, 16]} />
      </instancedMesh>
      <instancedMesh ref={r.tacas} args={[undefined, m.vidro, n(dados.tacas)]}>
        <cylinderGeometry args={[0.04, 0.025, 0.18, 10]} />
      </instancedMesh>
      {/* mesa dos noivos */}
      <mesh position={[NOIVOS.x, chao(NOIVOS.x, NOIVOS.z) + 0.385, NOIVOS.z]} material={m.toalha} castShadow receiveShadow>
        <boxGeometry args={[0.85, 0.77, 2.4]} />
      </mesh>

      {/* luzinhas */}
      <instancedMesh ref={r.postes} args={[undefined, m.madeira, n(dados.postes)]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 4.2, 8]} />
      </instancedMesh>
      <mesh geometry={dados.fios} material={m.preto} />
      <instancedMesh ref={r.lampadas} args={[undefined, m.lampada, n(dados.lampadas)]}>
        <sphereGeometry args={[0.05, 8, 6]} />
      </instancedMesh>

      {/* ------- lounge, bar e placa ------- */}
      <mesh geometry={lounge.tecido} material={m.tecido} castShadow receiveShadow />
      <mesh geometry={lounge.madeira} material={m.madeira} castShadow receiveShadow />
      <instancedMesh ref={r.almofadasLounge} args={[undefined, undefined, almofadasLounge.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <mesh position={[26.8, chao(26.8, -10.4) + 0.02, -10.4]} rotation-x={-Math.PI / 2} material={m.juta} receiveShadow>
        <planeGeometry args={[4.2, 3.4]} />
      </mesh>
      <mesh position={[lounge.placaX, chao(lounge.placaX, lounge.placaZ) + 1.25, lounge.placaZ]} rotation={[0, -Math.PI / 2, -0.12]}>
        <planeGeometry args={[0.9, 1.23]} />
        <meshStandardMaterial map={placa} roughness={0.7} />
      </mesh>

      {/* ------- natureza da praia ------- */}
      <instancedMesh ref={r.capim} args={[tufo, m.capim, n(dados.capim)]} />
      {COQUEIROS.map(([x, z, alt, giro]) => (
        <Coqueiro key={`${x}${z}`} position={[x, chao(x, z), z]} rotation-y={giro} altura={alt} curva={1.3} />
      ))}
    </group>
  )
}
