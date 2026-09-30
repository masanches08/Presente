import { useLayoutEffect, useMemo, useRef } from 'react'
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import { altura, areaLivre, ehGramado, fbm } from './terreno'
import { sorteador } from './util'
import { aplicarVento } from './vento'

const NIVEIS = 3 // segmentos de cada folhinha (3 já fica curvinho e é mais leve)

/** Um tufo com 3 folhinhas de grama, curvadas, escuras na base e claras na ponta. */
export function criarTufo() {
  const pos: number[] = []
  const cor: number[] = []
  const nor: number[] = []
  const idx: number[] = []
  const base = new Color('#1F5A14')
  const meio = new Color('#4E9A2A')
  const ponta = new Color('#B5E061')
  const c = new Color()
  const folhas = [
    { ang: 0, alt: 1, curva: 0.18, dx: 0, dz: 0 },
    { ang: 2.1, alt: 0.8, curva: 0.26, dx: 0.05, dz: 0.03 },
    { ang: 4.2, alt: 0.9, curva: 0.22, dx: -0.04, dz: 0.04 },
  ]
  for (const f of folhas) {
    const inicio = pos.length / 3
    const cos = Math.cos(f.ang)
    const sin = Math.sin(f.ang)
    for (let i = 0; i <= NIVEIS; i++) {
      const t = i / NIVEIS
      const y = t * f.alt * 0.42
      const largura = 0.032 * (1 - t * 0.92)
      const frente = f.curva * t * t // inclina pra frente perto da ponta
      for (const lado of [-1, 1]) {
        const lx = lado * largura
        const lz = frente
        pos.push(f.dx + lx * cos - lz * sin, y, f.dz + lx * sin + lz * cos)
        nor.push(0, 1, 0) // luz "de chão": o gramado fica uniforme e vivo
        c.copy(base).lerp(meio, Math.min(1, t * 1.8)).lerp(ponta, Math.max(0, t - 0.45) * 1.8)
        cor.push(c.r, c.g, c.b)
      }
    }
    for (let i = 0; i < NIVEIS; i++) {
      const a = inicio + i * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3))
  g.setAttribute('color', new Float32BufferAttribute(cor, 3))
  g.setIndex(idx)
  return g
}

/** O gramado inteiro: milhares de tufos, mais densos perto da casa. */
export function Grama({ quantidade }: { quantidade: number }) {
  const ref = useRef<InstancedMesh>(null)
  const geo = useMemo(() => criarTufo(), [])
  const mat = useMemo(() => {
    const m = new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.8 })
    aplicarVento(m, { forca: 1, altura: 0.42 })
    return m
  }, [])

  useLayoutEffect(() => {
    const malha = ref.current
    if (!malha) return
    const rand = sorteador(2024)
    const o = new Object3D()
    const c = new Color()
    const tons = ['#FFFFFF', '#E9FFD6', '#FFF6C9', '#DDF5C0', '#F2FFE0']
    let i = 0
    let tentativas = 0
    while (i < quantidade && tentativas < quantidade * 8) {
      tentativas++
      // mais tufos perto do centro, mas cobrindo até longe
      const r = Math.pow(rand(), 0.75) * 46
      const a = rand() * Math.PI * 2
      const x = Math.cos(a) * r + 2
      const z = Math.sin(a) * r * 0.9 + 1
      if (!areaLivre(x, z)) continue
      // "falhas" naturais no gramado
      if (fbm(x * 0.15, z * 0.15, 2) < 0.28 && rand() < 0.7) continue
      o.position.set(x, altura(x, z) - 0.02, z)
      o.rotation.set((rand() - 0.5) * 0.25, rand() * Math.PI * 2, (rand() - 0.5) * 0.25)
      const s = 0.7 + rand() * 0.7
      // gramado aparado perto da casa: baixinho e uniforme
      const alto = ehGramado(x, z) ? 0.38 + rand() * 0.12 : 0.75 + fbm(x * 0.1, z * 0.1, 2) * 0.8
      o.scale.set(s, s * alto, s)
      o.updateMatrix()
      malha.setMatrixAt(i, o.matrix)
      malha.setColorAt(i, c.set(tons[Math.floor(rand() * tons.length)]))
      i++
    }
    malha.count = i
    malha.instanceMatrix.needsUpdate = true
    if (malha.instanceColor) malha.instanceColor.needsUpdate = true
    malha.computeBoundingSphere()
  }, [quantidade])

  return <instancedMesh key={quantidade} ref={ref} args={[geo, mat, quantidade]} receiveShadow />
}
