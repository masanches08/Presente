import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  TubeGeometry,
  LineCurve3,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { altura } from '../terreno'
import { criar } from '../texturas'
import { sorteador } from '../util'

// A quadra de futevôlei: na areia, do lado do casamento, de frente pro mar.
// Medidas oficiais: 18 x 9 m, rede a 2,20 m (a do futevôlei masculino).
export const QUADRA = { x: 31, z: -25, comp: 18, larg: 9, rede: 2.2 }

const Q = QUADRA
const chao = (x: number, z: number) => altura(x, z)

// ---------------- texturas ----------------

/** Malha da rede: quadradinhos de 10 cm (fundo transparente) */
const texRede = () =>
  criar('rede-ftv', 32, 32, (ctx) => {
    ctx.clearRect(0, 0, 32, 32)
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 3
    ctx.strokeRect(1.5, 1.5, 29, 29)
  })

/** Antena da rede: listrada de vermelho e branco */
const texAntena = () =>
  criar('antena-ftv', 8, 64, (ctx) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#FFFFFF' : '#E0322B'
      ctx.fillRect(0, i * 8, 8, 8)
    }
  })

/** Bola de futevôlei: gomos curvos amarelo, azul e verde */
const texBola = () =>
  criar(
    'bola-ftv',
    256,
    128,
    (ctx) => {
      ctx.fillStyle = '#FFD21F'
      ctx.fillRect(0, 0, 256, 128)
      const faixa = (y0: number, cor: string, fase: number) => {
        ctx.fillStyle = cor
        ctx.beginPath()
        for (let x = 0; x <= 256; x += 4) ctx.lineTo(x, y0 + Math.sin((x / 256) * Math.PI * 6 + fase) * 12)
        for (let x = 256; x >= 0; x -= 4) ctx.lineTo(x, y0 + 16 + Math.sin((x / 256) * Math.PI * 6 + fase + 0.6) * 12)
        ctx.closePath()
        ctx.fill()
      }
      faixa(18, '#1C4FB8', 0)
      faixa(56, '#2FA84F', 1.6)
      faixa(92, '#1C4FB8', 3.1)
      // costuras
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 1
      for (let x = 0; x < 256; x += 32) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + 10, 128)
        ctx.stroke()
      }
    },
    true,
  )

/** Toalha de praia listrada */
const texToalha = () =>
  criar('toalha-ftv', 128, 64, (ctx) => {
    const cores = ['#F26B3A', '#FFFFFF', '#2BB3C0', '#FFFFFF', '#FFC94A']
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = cores[i % cores.length]
      ctx.fillRect(i * 8, 0, 8, 64)
    }
  })

// ---------------- geometrias ----------------

/** Fita estendida na areia (acompanha o chão, que desce até o mar) */
function fita(x0: number, z0: number, x1: number, z1: number, larg = 0.07) {
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.5))
  const dx = x1 - x0
  const dz = z1 - z0
  const l = Math.hypot(dx, dz)
  const px = (-dz / l) * (larg / 2)
  const pz = (dx / l) * (larg / 2)
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const x = x0 + dx * t
    const z = z0 + dz * t
    const y = chao(x, z) + 0.018
    pos.push(x + px, y, z + pz, x - px, y, z - pz)
    if (i < n) {
      const a = i * 2
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

const tubo = (a: Vector3, b: Vector3, r: number) => new TubeGeometry(new LineCurve3(a, b), 1, r, 6)

export function QuadraFtv() {
  const x0 = Q.x - Q.comp / 2
  const x1 = Q.x + Q.comp / 2
  const z0 = Q.z - Q.larg / 2
  const z1 = Q.z + Q.larg / 2
  const yRede = chao(Q.x, Q.z)

  const mats = useMemo(
    () => ({
      fita: new MeshStandardMaterial({ color: '#1F5FD6', roughness: 0.55 }),
      metal: new MeshStandardMaterial({ color: '#D5DADF', metalness: 0.7, roughness: 0.3 }),
      espuma: new MeshStandardMaterial({ color: '#1F5FD6', roughness: 0.8 }),
      espumaAmarela: new MeshStandardMaterial({ color: '#FFD21F', roughness: 0.8 }),
      branco: new MeshStandardMaterial({ color: '#F7F7F2', roughness: 0.6 }),
      rede: new MeshStandardMaterial({ color: '#1B1B1B', map: texRede(), alphaTest: 0.35, side: DoubleSide, roughness: 0.9 }),
      antena: new MeshStandardMaterial({ map: texAntena(), roughness: 0.5 }),
      cabo: new MeshStandardMaterial({ color: '#E9E9E4', roughness: 0.7 }),
      bola: new MeshStandardMaterial({ map: texBola(), roughness: 0.45 }),
      toalha: new MeshStandardMaterial({ map: texToalha(), roughness: 1, side: DoubleSide }),
      chinelo: new MeshStandardMaterial({ color: '#2BB3C0', roughness: 0.7 }),
      chinelo2: new MeshStandardMaterial({ color: '#F26B3A', roughness: 0.7 }),
      tira: new MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.6 }),
      caixa: new MeshStandardMaterial({ color: '#2563C9', roughness: 0.4 }),
      pegada: new MeshStandardMaterial({ color: '#A88C5E', transparent: true, opacity: 0.26, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    }),
    [],
  )

  // as quatro fitas azuis + as estacas nos cantos
  const linhas = useMemo(() => {
    const partes = [fita(x0, z0, x1, z0), fita(x1, z0, x1, z1), fita(x1, z1, x0, z1), fita(x0, z1, x0, z0)]
    for (const [x, z] of [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ])
      partes.push(new CylinderGeometry(0.06, 0.06, 0.03, 10).translate(x, chao(x, z) + 0.02, z).deleteAttribute('uv'))
    return mergeGeometries(partes)!
  }, [x0, x1, z0, z1])

  // postes, rede, antenas e os cabos que seguram tudo
  const estrutura = useMemo(() => {
    const zPoste = Q.larg / 2 + 1
    const metal: BufferGeometry[] = []
    const espuma: BufferGeometry[] = []
    const amarela: BufferGeometry[] = []
    const branco: BufferGeometry[] = []
    const antena: BufferGeometry[] = []
    const cabo: BufferGeometry[] = []
    for (const lado of [-1, 1]) {
      const z = Q.z + lado * zPoste
      const y = chao(Q.x, z)
      metal.push(new CylinderGeometry(0.05, 0.05, 2.6, 12).translate(Q.x, y + 1.3, z))
      metal.push(new SphereGeometry(0.06, 10, 8).translate(Q.x, y + 2.6, z))
      // proteção de espuma (azul com a faixa amarela)
      espuma.push(new CylinderGeometry(0.13, 0.13, 1.6, 16).translate(Q.x, y + 0.8, z))
      amarela.push(new CylinderGeometry(0.135, 0.135, 0.22, 16).translate(Q.x, y + 1.3, z))
      espuma.push(new CylinderGeometry(0.135, 0.135, 0.22, 16).translate(Q.x, y + 0.2, z))
      // estaca e cabo de sustentação, pra fora da quadra
      const est = new Vector3(Q.x, chao(Q.x, z + lado * 1.6) + 0.05, z + lado * 1.6)
      cabo.push(tubo(new Vector3(Q.x, y + 2.5, z), est, 0.008))
      metal.push(new CylinderGeometry(0.02, 0.01, 0.25, 6).translate(est.x, est.y + 0.05, est.z))
      // antena em cima de cada linha lateral
      const za = Q.z + lado * (Q.larg / 2)
      antena.push(new CylinderGeometry(0.012, 0.012, 1.8, 8).translate(Q.x, yRede + Q.rede - 1 + 0.9, za))
      // cordinha da rede até o poste
      cabo.push(tubo(new Vector3(Q.x, yRede + Q.rede - 0.035, za), new Vector3(Q.x, y + Q.rede - 0.035, z), 0.006))
      cabo.push(tubo(new Vector3(Q.x, yRede + Q.rede - 0.98, za), new Vector3(Q.x, y + Q.rede - 0.98, z), 0.006))
      // faixa lateral branca da rede
      branco.push(new BoxGeometry(0.02, 1, 0.05).translate(Q.x, yRede + Q.rede - 0.5, za - lado * 0.025))
    }
    // faixas branca de cima e de baixo
    branco.push(new BoxGeometry(0.02, 0.07, Q.larg).translate(Q.x, yRede + Q.rede - 0.035, Q.z))
    branco.push(new BoxGeometry(0.015, 0.04, Q.larg).translate(Q.x, yRede + Q.rede - 0.98, Q.z))
    const rede = new PlaneGeometry(Q.larg, 0.93).rotateY(Math.PI / 2).translate(Q.x, yRede + Q.rede - 0.535, Q.z)
    const uv = rede.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (Q.larg / 0.1), uv.getY(i) * (0.93 / 0.1))
    return {
      metal: mergeGeometries(metal)!,
      espuma: mergeGeometries(espuma)!,
      amarela: mergeGeometries(amarela)!,
      branco: mergeGeometries(branco)!,
      antena: mergeGeometries(antena)!,
      cabo: mergeGeometries(cabo)!,
      rede,
    }
  }, [yRede])

  // marcas de pé na areia (mais perto da rede, onde o jogo acontece)
  const pegadas = useRef<InstancedMesh>(null)
  const N_PEGADAS = 260
  const geoPegada = useMemo(() => new CircleGeometry(0.055, 10).scale(1, 1.8, 1).rotateX(-Math.PI / 2), [])
  useLayoutEffect(() => {
    const m = pegadas.current
    if (!m) return
    const rand = sorteador(915)
    const o = new Object3D()
    for (let i = 0; i < N_PEGADAS; i++) {
      const perto = rand() < 0.6
      const x = perto ? Q.x + (rand() - 0.5) * 7 : x0 + 0.5 + rand() * (Q.comp - 1)
      const z = z0 + 0.3 + rand() * (Q.larg - 0.6)
      const giro = rand() * Math.PI * 2
      // pezinhos em par (esquerdo e direito)
      for (const lado of [0, 1]) {
        const k = i * 2 + lado
        if (k >= N_PEGADAS * 2) break
        const ox = Math.cos(giro) * 0.13 * (lado ? 1 : -1)
        const oz = -Math.sin(giro) * 0.13 * (lado ? 1 : -1)
        o.position.set(x + ox, chao(x + ox, z + oz) + 0.012, z + oz)
        o.rotation.set(0, giro, 0)
        const s = 0.85 + rand() * 0.35
        o.scale.set(s, 1, s)
        o.updateMatrix()
        m.setMatrixAt(k, o.matrix)
      }
    }
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [x0, z0])

  // bolas, toalha, chinelos e o isopor, largados do lado da quadra
  const bolas = useMemo(
    () =>
      [
        [Q.x - 3.4, Q.z + 1.6, 0.4],
        [Q.x + 0.35, Q.z + Q.larg / 2 + 1.25, 1.9],
      ].map(([x, z, g]) => ({ pos: [x, chao(x, z) + 0.105, z] as [number, number, number], giro: g })),
    [],
  )
  const zFora = z1 + 2.4
  const yToalha = chao(Q.x - 5, zFora) + 0.02
  const chinelos = useMemo(() => {
    const itens: { pos: [number, number, number]; giro: number; cor: 'chinelo' | 'chinelo2' }[] = []
    const pares: [number, number, number, 'chinelo' | 'chinelo2'][] = [
      [x0 - 0.9, Q.z - 1.2, 0.3, 'chinelo'],
      [x0 - 1.1, Q.z + 0.9, -0.5, 'chinelo2'],
      [Q.x - 2.6, zFora - 0.6, 1.2, 'chinelo'],
    ]
    for (const [x, z, g, cor] of pares)
      for (const lado of [-1, 1]) {
        const px = x + Math.cos(g) * 0.09 * lado
        const pz = z - Math.sin(g) * 0.09 * lado
        itens.push({ pos: [px, chao(px, pz) + 0.012, pz], giro: g + lado * 0.12, cor })
      }
    return itens
  }, [x0, zFora])
  const geoChinelo = useMemo(() => new CylinderGeometry(0.05, 0.045, 0.02, 14).scale(1, 1, 2.6), [])
  const geoTira = useMemo(() => new CylinderGeometry(0.006, 0.006, 0.12, 5).rotateZ(Math.PI / 2).translate(0, 0.03, -0.02), [])

  return (
    <group>
      <mesh geometry={linhas} material={mats.fita} receiveShadow />
      <mesh geometry={estrutura.metal} material={mats.metal} castShadow />
      <mesh geometry={estrutura.espuma} material={mats.espuma} castShadow />
      <mesh geometry={estrutura.amarela} material={mats.espumaAmarela} castShadow />
      <mesh geometry={estrutura.branco} material={mats.branco} castShadow />
      <mesh geometry={estrutura.antena} material={mats.antena} castShadow />
      <mesh geometry={estrutura.cabo} material={mats.cabo} />
      <mesh geometry={estrutura.rede} material={mats.rede} castShadow />
      <instancedMesh ref={pegadas} args={[geoPegada, mats.pegada, N_PEGADAS * 2]} renderOrder={1} />

      {bolas.map((b, i) => (
        <mesh key={i} position={b.pos} rotation={[0.4, b.giro, 0.2]} material={mats.bola} castShadow>
          <sphereGeometry args={[0.105, 32, 20]} />
        </mesh>
      ))}

      {/* toalha estendida com o isopor do lado */}
      <mesh position={[Q.x - 5, yToalha, zFora]} rotation={[-Math.PI / 2 + 0.01, 0, 0.12]} material={mats.toalha} receiveShadow>
        <planeGeometry args={[1.7, 0.85]} />
      </mesh>
      <group position={[Q.x - 3.6, chao(Q.x - 3.6, zFora + 0.3), zFora + 0.3]} rotation-y={0.3}>
        <mesh position-y={0.19} material={mats.caixa} castShadow>
          <boxGeometry args={[0.55, 0.36, 0.36]} />
        </mesh>
        <mesh position-y={0.39} material={mats.branco} castShadow>
          <boxGeometry args={[0.58, 0.06, 0.39]} />
        </mesh>
        <mesh position-y={0.44} material={mats.branco}>
          <boxGeometry args={[0.3, 0.03, 0.04]} />
        </mesh>
      </group>

      {chinelos.map((c, i) => (
        <group key={i} position={c.pos} rotation-y={c.giro}>
          <mesh geometry={geoChinelo} material={mats[c.cor]} castShadow />
          <mesh geometry={geoTira} material={mats.tira} />
        </group>
      ))}
    </group>
  )
}
