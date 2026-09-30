import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  InstancedMesh,
  LineCurve3,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  TubeGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { texReal } from '../../lib/texturasReais'
import { altura } from '../terreno'
import { criar } from '../texturas'
import { sorteador } from '../util'

// A quadra de futevôlei: cara de escolinha de praia brasileira, do lado do casamento, de frente pro mar.
// Medidas oficiais: 18 x 9 m, rede a 2,20 m.
export const QUADRA = { x: 31, z: -25, comp: 18, larg: 9, rede: 2.2 }

const Q = QUADRA
const chao = (x: number, z: number) => altura(x, z)
// a tenda fica no fundo, atrás da rede (aparece junto com o mar)
const TENDA = { x: 34.2, z: -34.2, lado: 3 }

// ---------------- texturas ----------------

/** Malha da rede: quadradinhos de 10 cm (fundo transparente) */
const texRede = () =>
  criar('rede-ftv', 32, 32, (ctx) => {
    ctx.clearRect(0, 0, 32, 32)
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 3
    ctx.strokeRect(1.5, 1.5, 29, 29)
  })

/** Bola de futevôlei (tipo a oficial): gomos curvos amarelo, azul e verde, com costuras */
const texBola = () =>
  criar(
    'bola-ftv-2',
    512,
    256,
    (ctx) => {
      ctx.fillStyle = '#FFD500'
      ctx.fillRect(0, 0, 512, 256)
      // três "hélices" de cada cor girando em volta da bola
      const gomo = (fase: number, cor: string) => {
        ctx.fillStyle = cor
        ctx.beginPath()
        for (let x = 0; x <= 512; x += 4) ctx.lineTo(x, 128 + Math.sin((x / 512) * Math.PI * 6 + fase) * 78)
        for (let x = 512; x >= 0; x -= 4) ctx.lineTo(x, 128 + Math.sin((x / 512) * Math.PI * 6 + fase + 0.55) * 78)
        ctx.closePath()
        ctx.fill()
      }
      gomo(0, '#1C4FB0')
      gomo(Math.PI, '#1FA64A')
      gomo(Math.PI / 2, '#1C4FB0')
      gomo((Math.PI * 3) / 2, '#1FA64A')
      // costuras escuras entre os gomos
      ctx.strokeStyle = 'rgba(20,20,30,0.45)'
      ctx.lineWidth = 2
      for (const fase of [0, 0.55, Math.PI / 2, Math.PI / 2 + 0.55, Math.PI, Math.PI + 0.55]) {
        ctx.beginPath()
        for (let x = 0; x <= 512; x += 4) ctx.lineTo(x, 128 + Math.sin((x / 512) * Math.PI * 6 + fase) * 78)
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

/** Lona das cadeiras de praia: listras verde, amarelo e branco */
const texLona = () =>
  criar('lona-ftv', 64, 64, (ctx) => {
    const cores = ['#1FA64A', '#FFFFFF', '#FFD500', '#FFFFFF']
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = cores[i % cores.length]
      ctx.fillRect(i * 8, 0, 8, 64)
    }
  })

/** Bandeira do Brasil */
const texBrasil = () =>
  criar(
    'bandeira-brasil',
    200,
    140,
    (ctx) => {
      ctx.fillStyle = '#009C3B'
      ctx.fillRect(0, 0, 200, 140)
      ctx.fillStyle = '#FFDF00'
      ctx.beginPath()
      ctx.moveTo(100, 12)
      ctx.lineTo(186, 70)
      ctx.lineTo(100, 128)
      ctx.lineTo(14, 70)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#002776'
      ctx.beginPath()
      ctx.arc(100, 70, 35, 0, Math.PI * 2)
      ctx.fill()
      // a faixa branca e as estrelinhas
      ctx.save()
      ctx.beginPath()
      ctx.arc(100, 70, 35, 0, Math.PI * 2)
      ctx.clip()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.arc(92, 140, 80, Math.PI * 1.15, Math.PI * 1.85)
      ctx.stroke()
      ctx.fillStyle = '#FFFFFF'
      for (const [x, y] of [
        [88, 88],
        [104, 92],
        [116, 84],
        [96, 100],
        [110, 102],
        [122, 96],
        [84, 78],
      ]) {
        ctx.beginPath()
        ctx.arc(x, y, 1.6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    },
    false,
  )

/** Bandeira de praia (tipo "pena"), escrito FUTEVÔLEI na vertical */
const texBandeiraFtv = () =>
  criar(
    'bandeira-ftv',
    128,
    512,
    (ctx) => {
      ctx.clearRect(0, 0, 128, 512)
      // formato de pena: reto do lado do mastro, curvado em cima
      const forma = () => {
        ctx.beginPath()
        ctx.moveTo(6, 510)
        ctx.lineTo(6, 44)
        ctx.quadraticCurveTo(8, 4, 62, 8)
        ctx.quadraticCurveTo(124, 16, 122, 140)
        ctx.lineTo(104, 510)
        ctx.closePath()
      }
      const g = ctx.createLinearGradient(0, 0, 0, 512)
      g.addColorStop(0, '#1FA64A')
      g.addColorStop(1, '#127A35')
      ctx.fillStyle = g
      forma()
      ctx.fill()
      ctx.save()
      forma()
      ctx.clip()
      // faixa amarela e azul do lado do mastro
      ctx.fillStyle = '#FFD500'
      ctx.fillRect(6, 0, 16, 512)
      ctx.fillStyle = '#1C4FB0'
      ctx.fillRect(22, 0, 6, 512)
      // o nome, de baixo pra cima
      ctx.translate(76, 470)
      ctx.rotate(-Math.PI / 2)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '900 60px Inter, Arial Black, Arial, sans-serif'
      ctx.textBaseline = 'middle'
      ctx.fillText('FUTEVÔLEI', 0, 0, 400)
      ctx.restore()
    },
    false,
  )

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

/** Cadeira de praia de lona (frente pra +z) */
function cadeiraPraia(x: number, z: number, giro: number) {
  const y = chao(x, z)
  const madeira: BufferGeometry[] = []
  const lona: BufferGeometry[] = []
  const por = (g: BufferGeometry) => g.rotateY(giro).translate(x, y, z)
  for (const lado of [-0.26, 0.26]) {
    madeira.push(por(new BoxGeometry(0.03, 0.03, 0.62).rotateX(-0.5).translate(lado, 0.2, 0.02)))
    madeira.push(por(new BoxGeometry(0.03, 0.03, 0.72).rotateX(0.95).translate(lado, 0.4, -0.2)))
    madeira.push(por(new BoxGeometry(0.03, 0.03, 0.4).translate(lado, 0.34, 0.08)))
  }
  lona.push(por(new PlaneGeometry(0.5, 0.42).rotateX(-Math.PI / 2 - 0.22).translate(0, 0.24, 0.1)))
  lona.push(por(new PlaneGeometry(0.5, 0.58).rotateX(-0.5).translate(0, 0.5, -0.22)))
  return { madeira, lona }
}

export function QuadraFtv() {
  const x0 = Q.x - Q.comp / 2
  const x1 = Q.x + Q.comp / 2
  const z0 = Q.z - Q.larg / 2
  const z1 = Q.z + Q.larg / 2
  const yRede = chao(Q.x, Q.z)

  const mats = useMemo(
    () => ({
      fita: new MeshStandardMaterial({ color: '#FFC400', roughness: 0.55 }),
      eucalipto: new MeshStandardMaterial({ color: '#E0B585', map: texReal('oak_veneer_01', 'diff'), roughness: 0.8 }),
      metal: new MeshStandardMaterial({ color: '#D5DADF', metalness: 0.7, roughness: 0.3 }),
      faixa: new MeshStandardMaterial({ color: '#1C4FB0', roughness: 0.6 }),
      rede: new MeshStandardMaterial({ color: '#1B1B1B', map: texRede(), alphaTest: 0.35, side: DoubleSide, roughness: 0.9 }),
      cabo: new MeshStandardMaterial({ color: '#E9E9E4', roughness: 0.7 }),
      bola: new MeshStandardMaterial({ map: texBola(), roughness: 0.4 }),
      toalha: new MeshStandardMaterial({ map: texToalha(), roughness: 1, side: DoubleSide }),
      lona: new MeshStandardMaterial({ map: texLona(), roughness: 0.9, side: DoubleSide }),
      tenda: new MeshStandardMaterial({ color: '#F6F4EE', roughness: 0.85, side: DoubleSide }),
      tendaVerde: new MeshStandardMaterial({ color: '#1FA64A', roughness: 0.8 }),
      brasil: new MeshStandardMaterial({ map: texBrasil(), roughness: 0.9, side: DoubleSide }),
      bandeira: new MeshStandardMaterial({ map: texBandeiraFtv(), alphaTest: 0.5, roughness: 0.85, side: DoubleSide }),
      chinelo: new MeshStandardMaterial({ color: '#2BB3C0', roughness: 0.7 }),
      chinelo2: new MeshStandardMaterial({ color: '#F26B3A', roughness: 0.7 }),
      branco: new MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.6 }),
      caixa: new MeshStandardMaterial({ color: '#2563C9', roughness: 0.4 }),
      coco: new MeshStandardMaterial({ color: '#6FA23A', roughness: 0.6 }),
      sacola: new MeshStandardMaterial({ color: '#F2F2F2', map: texRede(), alphaTest: 0.35, side: DoubleSide, roughness: 0.9 }),
      pegada: new MeshStandardMaterial({ color: '#A88C5E', transparent: true, opacity: 0.26, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    }),
    [],
  )

  // as quatro fitas amarelas + as estacas nos cantos
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

  // postes de eucalipto, rede com a faixa azul e os cabos (sem antena: não é vôlei!)
  const estrutura = useMemo(() => {
    const zPoste = Q.larg / 2 + 0.8
    const madeira: BufferGeometry[] = []
    const faixa: BufferGeometry[] = []
    const cabo: BufferGeometry[] = []
    for (const lado of [-1, 1]) {
      const z = Q.z + lado * zPoste
      const y = chao(Q.x, z)
      madeira.push(new CylinderGeometry(0.075, 0.09, 2.75, 12).translate(Q.x, y + 1.3, z))
      madeira.push(new CylinderGeometry(0.085, 0.075, 0.06, 12).translate(Q.x, y + 2.68, z))
      // estaca e cabo de sustentação, pra fora da quadra
      const est = new Vector3(Q.x, chao(Q.x, z + lado * 1.6) + 0.05, z + lado * 1.6)
      cabo.push(tubo(new Vector3(Q.x, y + 2.5, z), est, 0.008))
      madeira.push(new CylinderGeometry(0.025, 0.015, 0.3, 6).translate(est.x, est.y + 0.05, est.z))
      // cordinha da rede até o poste
      const za = Q.z + lado * (Q.larg / 2)
      cabo.push(tubo(new Vector3(Q.x, yRede + Q.rede - 0.04, za), new Vector3(Q.x, y + Q.rede - 0.04, z), 0.007))
      cabo.push(tubo(new Vector3(Q.x, yRede + Q.rede - 0.98, za), new Vector3(Q.x, y + Q.rede - 0.98, z), 0.007))
      // faixas laterais da rede
      faixa.push(new BoxGeometry(0.02, 1, 0.05).translate(Q.x, yRede + Q.rede - 0.5, za - lado * 0.025))
    }
    // faixa de cima (azul, larga) e de baixo
    faixa.push(new BoxGeometry(0.025, 0.08, Q.larg).translate(Q.x, yRede + Q.rede - 0.04, Q.z))
    faixa.push(new BoxGeometry(0.015, 0.04, Q.larg).translate(Q.x, yRede + Q.rede - 0.98, Q.z))
    const rede = new PlaneGeometry(Q.larg, 0.9).rotateY(Math.PI / 2).translate(Q.x, yRede + Q.rede - 0.53, Q.z)
    const uv = rede.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (Q.larg / 0.1), uv.getY(i) * (0.9 / 0.1))
    return { madeira: mergeGeometries(madeira)!, faixa: mergeGeometries(faixa)!, cabo: mergeGeometries(cabo)!, rede }
  }, [yRede])

  // a tenda da escolinha: toldo branco com a barra verde, cadeiras de praia, isopor e a bandeira do Brasil
  const tenda = useMemo(() => {
    const { x, z, lado: L } = TENDA
    const y = chao(x, z)
    const h = 2.3
    const metal: BufferGeometry[] = []
    const verde: BufferGeometry[] = []
    const madeira: BufferGeometry[] = []
    const lona: BufferGeometry[] = []
    for (const [dx, dz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ])
      metal.push(new CylinderGeometry(0.025, 0.025, h, 8).translate(x + (dx * L) / 2, chao(x + (dx * L) / 2, z + (dz * L) / 2) + h / 2, z + (dz * L) / 2))
    // barra verde em volta do toldo
    for (const s of [-1, 1]) {
      verde.push(new BoxGeometry(L + 0.04, 0.26, 0.02).translate(x, y + h - 0.05, z + (s * L) / 2))
      verde.push(new BoxGeometry(0.02, 0.26, L + 0.04).translate(x + (s * L) / 2, y + h - 0.05, z))
    }
    const toldo = new ConeGeometry(L / Math.SQRT2, 0.9, 4, 1, true).rotateY(Math.PI / 4).translate(x, y + h + 0.52, z)
    // mastro da bandeira do Brasil no canto da tenda
    const mx = x + L / 2 + 0.25
    const mz = z + L / 2
    metal.push(new CylinderGeometry(0.02, 0.025, 3.4, 8).translate(mx, chao(mx, mz) + 1.7, mz))
    // cadeiras de praia olhando a quadra
    for (const [cx, g] of [
      [x - 0.65, 0.15],
      [x + 0.55, -0.1],
    ]) {
      const c = cadeiraPraia(cx, z + 0.3, g)
      madeira.push(...c.madeira)
      lona.push(...c.lona)
    }
    return {
      metal: mergeGeometries(metal)!,
      verde: mergeGeometries(verde)!,
      madeira: mergeGeometries(madeira)!,
      lona: mergeGeometries(lona)!,
      toldo,
      brasil: [mx + 0.47, chao(mx, mz) + 3.0, mz] as [number, number, number],
      isopor: [x + 1.2, chao(x + 1.2, z - 0.6), z - 0.6] as [number, number, number],
    }
  }, [])

  // bandeiras de praia nos cantos de lá
  const bandeiras = useMemo(
    () =>
      [
        [x0 + 2.4, z0 - 2.2, 0.35],
        [x1 + 1.3, Q.z - 1.5, -0.9],
      ].map(([x, z, g]) => ({ pos: [x, chao(x, z), z] as [number, number, number], giro: g })),
    [x0, x1, z0],
  )

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
        const ox = Math.cos(giro) * 0.13 * (lado ? 1 : -1)
        const oz = -Math.sin(giro) * 0.13 * (lado ? 1 : -1)
        o.position.set(x + ox, chao(x + ox, z + oz) + 0.012, z + oz)
        o.rotation.set(0, giro, 0)
        const s = 0.85 + rand() * 0.35
        o.scale.set(s, 1, s)
        o.updateMatrix()
        m.setMatrixAt(i * 2 + lado, o.matrix)
      }
    }
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [x0, z0])

  // bolas: uma na quadra, uma perto do poste e a sacola cheia do lado da tenda
  const R_BOLA = 0.11
  const sacola = useMemo<[number, number, number]>(() => [TENDA.x + 2.2, chao(TENDA.x + 2.2, TENDA.z + 1.3), TENDA.z + 1.3], [])
  const bolas = useMemo(() => {
    const soltas = [
      [Q.x - 3.4, Q.z + 1.6, 0.4],
      [Q.x + 0.5, Q.z + Q.larg / 2 + 1.1, 1.9],
      [Q.x + 5.2, Q.z - 2.4, 2.6],
      [Q.x - 6.3, z1 + 2.2, 0.9],
    ].map(([x, z, g]) => ({ pos: [x, chao(x, z) + R_BOLA, z] as [number, number, number], giro: g }))
    const [sx, sy, sz] = sacola
    const naSacola = [
      [0, 0, 0],
      [0.2, 0, 0.1],
      [-0.12, 0, 0.18],
      [0.08, 0.17, 0.06],
      [0.06, 0.34, 0.08],
    ].map(([dx, dy, dz], i) => ({ pos: [sx + dx, sy + R_BOLA + dy, sz + dz] as [number, number, number], giro: i * 1.3 }))
    return [...soltas, ...naSacola]
  }, [sacola])

  const zFora = z1 + 2.4
  const yToalha = chao(Q.x - 5, zFora) + 0.02
  const chinelos = useMemo(() => {
    const itens: { pos: [number, number, number]; giro: number; cor: 'chinelo' | 'chinelo2' }[] = []
    const pares: [number, number, number, 'chinelo' | 'chinelo2'][] = [
      [x0 - 0.9, Q.z - 1.2, 0.3, 'chinelo'],
      [x0 - 1.1, Q.z + 0.9, -0.5, 'chinelo2'],
      [Q.x - 2.6, zFora - 0.6, 1.2, 'chinelo'],
      [TENDA.x + 0.2, TENDA.z + 1.9, 2.2, 'chinelo2'],
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
      {/* área de toque invisível, do tamanho da quadra */}
      <mesh position={[Q.x, yRede + 1.3, Q.z]} userData={{ semSombra: true }}>
        <boxGeometry args={[Q.comp + 1, 2.6, Q.larg + 3.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      <mesh geometry={linhas} material={mats.fita} receiveShadow />
      <mesh geometry={estrutura.madeira} material={mats.eucalipto} castShadow />
      <mesh geometry={estrutura.faixa} material={mats.faixa} castShadow />
      <mesh geometry={estrutura.cabo} material={mats.cabo} />
      <mesh geometry={estrutura.rede} material={mats.rede} castShadow />
      <instancedMesh ref={pegadas} args={[geoPegada, mats.pegada, N_PEGADAS * 2]} renderOrder={1} />

      {bolas.map((b, i) => (
        <mesh key={i} position={b.pos} rotation={[0.4, b.giro, 0.2]} material={mats.bola} castShadow>
          <sphereGeometry args={[R_BOLA, 32, 20]} />
        </mesh>
      ))}
      {/* a sacola de rede com as bolas */}
      <mesh position={[sacola[0] + 0.03, sacola[1] + 0.3, sacola[2] + 0.1]} scale={[1, 1.35, 1]} material={mats.sacola}>
        <sphereGeometry args={[0.3, 16, 12]} />
      </mesh>

      {/* tenda da escolinha */}
      <mesh geometry={tenda.metal} material={mats.metal} castShadow />
      <mesh geometry={tenda.verde} material={mats.tendaVerde} castShadow />
      <mesh geometry={tenda.toldo} material={mats.tenda} castShadow receiveShadow />
      <mesh geometry={tenda.madeira} material={mats.eucalipto} castShadow />
      <mesh geometry={tenda.lona} material={mats.lona} castShadow />
      <mesh position={tenda.brasil} material={mats.brasil} castShadow>
        <planeGeometry args={[0.9, 0.63]} />
      </mesh>
      {/* isopor com um coco em cima */}
      <group position={tenda.isopor} rotation-y={0.3}>
        <mesh position-y={0.19} material={mats.caixa} castShadow>
          <boxGeometry args={[0.55, 0.36, 0.36]} />
        </mesh>
        <mesh position-y={0.39} material={mats.branco} castShadow>
          <boxGeometry args={[0.58, 0.06, 0.39]} />
        </mesh>
        <mesh position={[0.1, 0.52, 0]} scale={[1, 1.12, 1]} material={mats.coco} castShadow>
          <sphereGeometry args={[0.1, 16, 12]} />
        </mesh>
        <mesh position={[0.12, 0.66, 0]} rotation-z={-0.3} material={mats.branco}>
          <cylinderGeometry args={[0.006, 0.006, 0.18, 6]} />
        </mesh>
      </group>

      {/* bandeiras de praia */}
      {bandeiras.map((b, i) => (
        <group key={i} position={b.pos} rotation-y={b.giro}>
          <mesh position-y={1.7} material={mats.metal} castShadow>
            <cylinderGeometry args={[0.018, 0.022, 3.4, 8]} />
          </mesh>
          <mesh position={[0.38, 1.95, 0]} material={mats.bandeira} castShadow>
            <planeGeometry args={[0.75, 2.8]} />
          </mesh>
        </group>
      ))}

      {/* toalha estendida */}
      <mesh position={[Q.x - 5, yToalha, zFora]} rotation={[-Math.PI / 2 + 0.01, 0, 0.12]} material={mats.toalha} receiveShadow>
        <planeGeometry args={[1.7, 0.85]} />
      </mesh>

      {chinelos.map((c, i) => (
        <group key={i} position={c.pos} rotation-y={c.giro}>
          <mesh geometry={geoChinelo} material={mats[c.cor]} castShadow />
          <mesh geometry={geoTira} material={mats.branco} />
        </group>
      ))}
    </group>
  )
}
