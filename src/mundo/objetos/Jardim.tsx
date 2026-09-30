import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import { Arbusto, Arvore, Cipreste } from '../Arvore'
import { altura } from '../terreno'
import { texPedra } from '../texturas'
import { sorteador, type Vec3 } from '../util'

interface Item {
  pos: Vec3
  rot?: Vec3
  esc?: Vec3
  cor?: string
}

/** Coloca várias cópias numa InstancedMesh (1 desenho só pra placa de vídeo) */
function usePosicionar(ref: React.RefObject<InstancedMesh | null>, itens: Item[]) {
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

const noChao = (x: number, z: number, dy = 0): Vec3 => [x, altura(x, z) + dy, z]

/** Caminho reto de placas de concreto, com grama entre elas, até a porta */
export function Caminho({ de = 3.5, ate = 17.8 }: { de?: number; ate?: number }) {
  const ref = useRef<InstancedMesh>(null)
  const mat = useMemo(() => {
    const t = texPedra().clone()
    t.repeat.set(0.6, 0.3)
    t.needsUpdate = true
    return new MeshStandardMaterial({ color: '#ECE7DE', map: t, roughness: 0.85 })
  }, [])
  const itens = useMemo(() => {
    const lista: Item[] = []
    for (let z = de; z < ate; z += 0.72) lista.push({ pos: noChao(0, z, 0.02) })
    return lista
  }, [de, ate])
  usePosicionar(ref, itens)
  return (
    <instancedMesh ref={ref} args={[undefined, mat, itens.length]} receiveShadow>
      <boxGeometry args={[1.35, 0.07, 0.5]} />
    </instancedMesh>
  )
}

/** Balizadores (postinhos de luz baixos) ao longo do caminho */
export function Balizadores({ zs = [6.5, 10.5, 14.5] }: { zs?: number[] }) {
  const refCorpo = useRef<InstancedMesh>(null)
  const refLuz = useRef<InstancedMesh>(null)
  const itens = useMemo(() => zs.flatMap((z) => [-1.15, 1.15].map((x) => ({ pos: noChao(x, z) }))), [zs])
  const luzes = useMemo(() => itens.map((i) => ({ pos: [i.pos[0], i.pos[1] + 0.52, i.pos[2]] as Vec3 })), [itens])
  const corpos = useMemo(() => itens.map((i) => ({ pos: [i.pos[0], i.pos[1] + 0.3, i.pos[2]] as Vec3 })), [itens])
  usePosicionar(refCorpo, corpos)
  usePosicionar(refLuz, luzes)
  return (
    <>
      <instancedMesh ref={refCorpo} args={[undefined, undefined, corpos.length]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.6, 10]} />
        <meshStandardMaterial color="#26282B" roughness={0.4} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={refLuz} args={[undefined, undefined, luzes.length]}>
        <cylinderGeometry args={[0.075, 0.075, 0.08, 10]} />
        <meshStandardMaterial color="#FFF1D6" emissive="#FFB45A" emissiveIntensity={3} />
      </instancedMesh>
    </>
  )
}

/** Canteiros da frente: terra escura, cerca-viva, ciprestes, arbustos floridos e capim */
export function Canteiros() {
  const refFlores = useRef<InstancedMesh>(null)
  const refCapim = useRef<InstancedMesh>(null)
  const flores = useMemo(() => {
    const rand = sorteador(71)
    const lista: Item[] = []
    const cores = ['#FF5E8A', '#E8285A', '#FFFFFF', '#FF8FB0']
    for (const lado of [-1, 1])
      for (const [cx, cz] of [
        [6.1, 1.6],
        [2.95, 2.55],
      ])
        for (let i = 0; i < 26; i++) {
          const a = rand() * 6.28
          const r = Math.sqrt(rand()) * 0.5
          const x = lado * cx + Math.cos(a) * r
          const z = cz + Math.sin(a) * r
          lista.push({ pos: noChao(x, z, 0.5 + rand() * 0.45), esc: [1, 1, 1], cor: cores[i % cores.length] })
        }
    return lista
  }, [])
  const capim = useMemo(() => {
    const rand = sorteador(72)
    const lista: Item[] = []
    for (const lado of [-1, 1])
      for (const [cx, cz] of [
        [4.0, 1.0],
        [5.6, 2.6],
      ])
        for (let i = 0; i < 14; i++) {
          const x = lado * cx + (rand() - 0.5) * 0.4
          const z = cz + (rand() - 0.5) * 0.4
          lista.push({ pos: noChao(x, z), rot: [(rand() - 0.5) * 0.6, rand() * 6, (rand() - 0.5) * 0.6], esc: [0.03, 0.8 + rand() * 0.3, 0.012] })
        }
    return lista
  }, [])
  usePosicionar(refFlores, flores)
  usePosicionar(refCapim, capim)

  return (
    <group>
      {/* terra escura dos canteiros */}
      {[-1, 1].map((lado) => (
        <mesh key={lado} position={noChao(lado * 4.75, 1.8, 0.02)} receiveShadow>
          <boxGeometry args={[4.1, 0.05, 2.4]} />
          <meshStandardMaterial color="#3A2A1F" roughness={1} />
        </mesh>
      ))}
      {[-1, 1].map((lado) => (
        <group key={lado}>
          <Arbusto semente={80 + lado} largura={3.6} profundidade={0.6} alturaArbusto={0.6} position={noChao(lado * 4.75, 2.65)} />
          <Cipreste semente={90 + lado} altura={2.4} position={noChao(lado * 3.25, 1.2)} />
          <Arbusto semente={95 + lado} largura={1.0} profundidade={1.0} alturaArbusto={0.95} position={noChao(lado * 6.1, 1.6)} />
          <Arbusto semente={97 + lado} largura={0.7} profundidade={0.7} alturaArbusto={0.7} position={noChao(lado * 2.95, 2.55)} />
          <Arvore semente={50 + lado} altura={4.8} cartoes={45} position={noChao(lado * 8.6, 3.2)} />
        </group>
      ))}
      <instancedMesh ref={refFlores} args={[undefined, undefined, flores.length]}>
        <icosahedronGeometry args={[0.05, 1]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={refCapim} args={[undefined, undefined, capim.length]}>
        <coneGeometry args={[1, 1, 3]} />
        <meshStandardMaterial color="#9DB86A" roughness={0.9} />
      </instancedMesh>
    </group>
  )
}
