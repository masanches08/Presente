import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  type Group,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { altura, areaLivre, caminhoX, ehGramado, fbm } from './terreno'
import { ESPECIES, texAsa, texFlor, texLavanda } from './texturas'
import { sorteador, type Vec3 } from './util'
import { aplicarVento } from './vento'

interface FlorPos {
  pos: Vec3
  alt: number
  tam: number
  especie: number
  giro: number
  incl: number
}

/** Onde nasce cada flor: em manchas de cor, como num campo de verdade. */
function espalharFlores(qtd: number): FlorPos[] {
  const rand = sorteador(77)
  const lista: FlorPos[] = []
  let tent = 0
  while (lista.length < qtd && tent < qtd * 12) {
    tent++
    const r = Math.pow(rand(), 0.8) * 40
    const a = rand() * Math.PI * 2
    const x = Math.cos(a) * r + 1
    const z = Math.sin(a) * r + 2
    if (!areaLivre(x, z) || ehGramado(x, z)) continue
    const mancha = fbm(x * 0.09 + 3, z * 0.09, 3)
    if (mancha < 0.52 && rand() < 0.85) continue
    // cada "canteiro" de ~5 m tem uma flor principal, com algumas outras misturadas
    const celula = Math.abs(Math.sin(Math.floor(x / 5) * 12.9898 + Math.floor(z / 5) * 78.233) * 43758.5453) % 1
    const especie = rand() < 0.72 ? Math.floor(celula * ESPECIES.length) : Math.floor(rand() * ESPECIES.length)
    const alt = 0.28 + rand() * 0.3
    lista.push({ pos: [x, altura(x, z), z], alt, tam: 0.12 + rand() * 0.09, especie, giro: rand() * 6.28, incl: 0.2 + rand() * 0.5 })
  }
  return lista
}

/** Caule fininho */
function criarCaule() {
  const g = new BufferGeometry()
  const w = 0.012
  g.setAttribute('position', new Float32BufferAttribute([-w, 0, 0, w, 0, 0, -w * 0.6, 0.5, 0, w * 0.6, 0.5, 0, 0, 1, 0], 3))
  g.setAttribute('normal', new Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3))
  g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4])
  return g
}

export function Flores({ quantidade }: { quantidade: number }) {
  const flores = useMemo(() => espalharFlores(quantidade), [quantidade])
  const caule = useMemo(() => criarCaule(), [])
  const cabeca = useMemo(() => {
    const p = new PlaneGeometry(1, 1)
    p.rotateX(-Math.PI / 2)
    return p
  }, [])

  const matCaule = useMemo(() => {
    const m = new MeshStandardMaterial({ color: '#3F8A2A', side: DoubleSide })
    aplicarVento(m, { altura: 1 })
    return m
  }, [])
  const matsCabeca = useMemo(
    () =>
      ESPECIES.map((e) => {
        const m = new MeshStandardMaterial({ map: texFlor(e), alphaTest: 0.45, side: DoubleSide, roughness: 0.55 })
        aplicarVento(m, { fixo: 0.85 })
        return m
      }),
    [],
  )

  const refCaules = useRef<InstancedMesh>(null)
  const refsCabeca = useRef<(InstancedMesh | null)[]>([])

  useLayoutEffect(() => {
    const o = new Object3D()
    const caules = refCaules.current
    if (!caules) return
    const contagem = ESPECIES.map(() => 0)
    flores.forEach((f, i) => {
      o.position.set(...f.pos)
      o.rotation.set(0, f.giro, 0)
      o.scale.set(1, f.alt, 1)
      o.updateMatrix()
      caules.setMatrixAt(i, o.matrix)

      const malha = refsCabeca.current[f.especie]
      if (!malha) return
      o.position.set(f.pos[0], f.pos[1] + f.alt, f.pos[2])
      o.rotation.set(f.incl, f.giro, 0)
      o.scale.setScalar(f.tam)
      o.updateMatrix()
      malha.setMatrixAt(contagem[f.especie]++, o.matrix)
    })
    caules.instanceMatrix.needsUpdate = true
    caules.computeBoundingSphere()
    refsCabeca.current.forEach((m, e) => {
      if (!m) return
      m.count = contagem[e]
      m.instanceMatrix.needsUpdate = true
      m.computeBoundingSphere()
    })
  }, [flores])

  return (
    <group>
      <instancedMesh ref={refCaules} args={[caule, matCaule, flores.length]} />
      {ESPECIES.map((e, i) => (
        <instancedMesh key={e} ref={(el) => void (refsCabeca.current[i] = el)} args={[cabeca, matsCabeca[i], flores.length]} />
      ))}
    </group>
  )
}

/** Lavanda plantada dos dois lados do caminho. */
export function Lavandas() {
  const ref = useRef<InstancedMesh>(null)
  const geo = useMemo(() => {
    // dois planos cruzados = parece cheio de qualquer ângulo
    const a = new PlaneGeometry(0.16, 0.62)
    a.translate(0, 0.31, 0)
    const b = a.clone()
    b.rotateY(Math.PI / 2)
    return mergeGeometries([a, b])!
  }, [])
  const mat = useMemo(() => {
    const m = new MeshStandardMaterial({ map: texLavanda(), alphaTest: 0.4, side: DoubleSide })
    aplicarVento(m, { altura: 0.62, forca: 0.8 })
    return m
  }, [])

  const itens = useMemo(() => {
    const rand = sorteador(5)
    const lista: { pos: Vec3; giro: number; s: number }[] = []
    for (let z = 1.6; z < 9.8; z += 0.55) {
      for (const lado of [-1, 1]) {
        for (let k = 0; k < 7; k++) {
          const x = caminhoX(z) + lado * (1.05 + rand() * 0.45)
          const zz = z + (rand() - 0.5) * 0.5
          lista.push({ pos: [x, altura(x, zz), zz], giro: rand() * 3, s: 0.7 + rand() * 0.5 })
        }
      }
    }
    return lista
  }, [])

  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    itens.forEach((it, i) => {
      o.position.set(...it.pos)
      o.rotation.set((Math.random() - 0.5) * 0.2, it.giro, 0)
      o.scale.setScalar(it.s)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [itens])

  return <instancedMesh ref={ref} args={[geo, mat, itens.length]} />
}

// ---------------- borboletas ----------------

const CORES_BORBOLETA = ['#FF8A1E', '#3FA7FF', '#FFD600', '#FF5FA2', '#FFFFFF']

/** Borboletas coloridas passeando pelo campo. */
export function Borboletas({ quantidade = 12 }: { quantidade?: number }) {
  const asa = useMemo(() => {
    const p = new PlaneGeometry(0.16, 0.16)
    p.translate(0.08, 0, 0) // gira pela "dobradiça" do corpo
    p.rotateX(-Math.PI / 2)
    return p
  }, [])
  const mats = useMemo(
    () => CORES_BORBOLETA.map((c) => new MeshStandardMaterial({ map: texAsa(c), alphaTest: 0.4, side: DoubleSide, emissive: new Color(c), emissiveIntensity: 0.15 })),
    [],
  )
  const dados = useMemo(() => {
    const rand = sorteador(11)
    return Array.from({ length: quantidade }, (_, i) => {
      const a = rand() * 6.28
      const r = 3 + rand() * 14
      return {
        cx: Math.cos(a) * r,
        cz: Math.sin(a) * r + 3,
        raio: 1 + rand() * 2.5,
        vel: 0.25 + rand() * 0.35,
        fase: rand() * 10,
        cor: i % CORES_BORBOLETA.length,
      }
    })
  }, [quantidade])
  const grupos = useRef<(Group | null)[]>([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    dados.forEach((d, i) => {
      const g = grupos.current[i]
      if (!g) return
      const u = t * d.vel + d.fase
      const x = d.cx + Math.sin(u) * d.raio + Math.sin(u * 2.3) * 0.4
      const z = d.cz + Math.sin(u * 0.7) * d.raio
      const y = altura(x, z) + 0.7 + Math.sin(u * 3.1) * 0.3 + Math.sin(u * 1.3) * 0.2
      const dx = Math.cos(u) * d.raio
      const dz = Math.cos(u * 0.7) * 0.7 * d.raio
      g.position.set(x, y, z)
      g.rotation.y = Math.atan2(dx, dz) + Math.PI / 2
      const bater = Math.sin(t * 18 + i) * 1.1
      const [esq, dir] = g.children
      esq.rotation.z = 0.2 + bater * 0.5
      dir.rotation.z = Math.PI - 0.2 - bater * 0.5
    })
  })

  return (
    <>
      {dados.map((d, i) => (
        <group key={i} ref={(el) => void (grupos.current[i] = el)}>
          <mesh geometry={asa} material={mats[d.cor]} />
          <mesh geometry={asa} material={mats[d.cor]} />
        </group>
      ))}
    </>
  )
}
