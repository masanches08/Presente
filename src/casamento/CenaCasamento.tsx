import { Environment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  IcosahedronGeometry,
  InstancedMesh,
  LatheGeometry,
  Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  SphereGeometry,
  Vector2,
  Vector3,
  type DirectionalLight,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { criarArranjos, materialRosas } from '../mundo/arranjos'
import { Coqueiro, matFolhas } from '../mundo/Arvore'
import { criarTufo } from '../mundo/Grama'
import { Passaros } from '../mundo/Passaros'
import { relevoReal, texReal } from '../lib/texturasReais'
import { texJuta, texLavanda, texMadeira } from '../mundo/texturas'
import { aplicarVento, vento } from '../mundo/vento'
import { texMarmore } from '../casa/texturas'
import { Areia, CeuPorDoSol, MarPorDoSol, NuvensPorDoSol, SOL } from './Ambiente'
import { LOUNGE, montarCasamento, type Inst } from './montar'
import { texPalha, texPista, texPistaLuz, texTrelica } from './texturas'

export type Qualidade = 'alta' | 'media'

// ---------------- geometrias repetidas ----------------

/** Cadeira "cross-back" de madeira natural */
function geoCadeira() {
  const p: BufferGeometry[] = []
  const add = (w: number, h: number, d: number, x: number, y: number, z: number, rz = 0) => {
    const b = new BoxGeometry(w, h, d)
    if (rz) b.rotateZ(rz)
    b.translate(x, y, z)
    p.push(b)
  }
  add(0.44, 0.04, 0.42, 0, 0.45, 0)
  for (const x of [-0.19, 0.19]) {
    add(0.04, 0.45, 0.04, x, 0.225, 0.18)
    add(0.04, 0.95, 0.04, x, 0.475, -0.19)
  }
  add(0.36, 0.025, 0.025, 0, 0.16, 0.18)
  add(0.36, 0.025, 0.025, 0, 0.16, -0.19)
  add(0.42, 0.06, 0.04, 0, 0.92, -0.19)
  add(0.03, 0.52, 0.025, 0, 0.67, -0.19, 0.66)
  add(0.03, 0.52, 0.025, 0, 0.67, -0.19, -0.66)
  return mergeGeometries(p)!
}

/** Lanterna de metal preto (armação); o vidro vai separado */
function geoLanterna() {
  const p: BufferGeometry[] = []
  const add = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const b = new BoxGeometry(w, h, d)
    b.translate(x, y, z)
    p.push(b.toNonIndexed())
  }
  add(0.26, 0.03, 0.26, 0, 0.015, 0)
  add(0.28, 0.04, 0.28, 0, 0.5, 0)
  for (const x of [-0.12, 0.12]) for (const z of [-0.12, 0.12]) add(0.02, 0.48, 0.02, x, 0.26, z)
  const topo = new CylinderGeometry(0.03, 0.15, 0.1, 4)
  topo.rotateY(Math.PI / 4)
  topo.translate(0, 0.57, 0)
  p.push(topo.toNonIndexed())
  const argola = new CylinderGeometry(0.03, 0.03, 0.06, 8, 1, true)
  argola.rotateX(Math.PI / 2)
  argola.translate(0, 0.65, 0)
  p.push(argola.toNonIndexed())
  return mergeGeometries(p)!
}

/** Taça de vinho (perfil girado) */
function geoTaca() {
  const pts = [
    [0.0, 0],
    [0.035, 0],
    [0.035, 0.005],
    [0.004, 0.012],
    [0.004, 0.09],
    [0.03, 0.12],
    [0.038, 0.17],
    [0.036, 0.2],
  ].map(([x, y]) => new Vector2(x, y))
  return new LatheGeometry(pts, 14)
}

/** Várias cópias de um objeto, desenhadas de uma vez só */
function Instancias({ geo, mat, itens, sombra = false }: { geo: BufferGeometry; mat: Material; itens: Inst[]; sombra?: boolean }) {
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
  if (!itens.length) return null
  return <instancedMesh ref={ref} args={[geo, mat, itens.length]} castShadow={sombra} receiveShadow={sombra} />
}

function materiais() {
  const tex = (t: ReturnType<typeof texMadeira>) => {
    const c = t.clone()
    c.wrapS = c.wrapT = RepeatWrapping
    c.needsUpdate = true
    return c
  }
  const std = (cor: string, extra: ConstructorParameters<typeof MeshStandardMaterial>[0] = {}) => new MeshStandardMaterial({ color: cor, roughness: 0.8, ...extra })
  const pistaLuz = tex(texPistaLuz())
  const carvalho = texReal('oak_veneer_01', 'diff')
  const TRAMA = 'poly_wool_herringbone'
  const relevo = (id: string, forca = 1) => relevoReal(id, forca)
  return {
    // madeira, tecidos e areia com fotos escaneadas de verdade (Poly Haven, CC0)
    deck: std('#EADBCB', { map: carvalho, roughness: 0.65, ...relevo('oak_veneer_01', 0.5) }),
    madeira: std('#F2E0CC', { map: carvalho, roughness: 0.75, ...relevo('oak_veneer_01', 0.5) }),
    madeiraClara: std('#FFF6EA', { map: carvalho, roughness: 0.7, ...relevo('oak_veneer_01', 0.5) }),
    madeiraCadeira: std('#FFF1E0', { map: carvalho, roughness: 0.6, ...relevo('oak_veneer_01', 0.5) }),
    ouro: std('#E3BE6E', { metalness: 0.9, roughness: 0.28 }),
    cristal: new MeshStandardMaterial({ color: '#FFFFFF', emissive: '#FFE7C4', emissiveIntensity: 1.4, roughness: 0.05, metalness: 0.3 }),
    vela: std('#FFF6E6', { roughness: 0.6, emissive: '#FFC98A', emissiveIntensity: 0.25 }),
    chama: new MeshBasicMaterial({ color: new Color(3.2, 2.1, 0.9), toneMapped: false }),
    juta: std('#E6CFA4', { map: tex(texJuta()), roughness: 1 }),
    preto: std('#1E1F21', { roughness: 0.5, metalness: 0.4 }),
    papel: new MeshStandardMaterial({ color: '#FFF8EE', emissive: '#FFCF94', emissiveIntensity: 0.75, roughness: 1 }),
    toalha: std('#FFFCF6', { roughness: 0.95, ...relevo(TRAMA, 0.45) }),
    linho: std('#F3E7DB', { roughness: 1, ...relevo(TRAMA, 0.7) }),
    pista: std('#FFFFFF', { map: tex(texPista()), emissiveMap: pistaLuz, emissive: '#FFFFFF', emissiveIntensity: 1.6, roughness: 0.35 }),
    bolo: std('#FFFDF8', { roughness: 0.55 }),
    sofa: std('#F1E8DA', { roughness: 1, ...relevo(TRAMA, 0.9) }),
    almTerracota: std('#D98A6A', { roughness: 1 }),
    almSalvia: std('#A9BA98', { roughness: 1 }),
    almLavanda: std('#C7B8E3', { roughness: 1 }),
    almCreme: std('#F7EEDD', { roughness: 1 }),
    rattan: std('#FFFFFF', { map: tex(texPalha()), roughness: 0.9 }),
    marmore: std('#FFFFFF', { map: tex(texMarmore()), roughness: 0.2 }),
    garrafaA: std('#5E7F52', { roughness: 0.15, metalness: 0.2 }),
    garrafaB: std('#C9A45C', { roughness: 0.15, metalness: 0.2 }),
    garrafaC: std('#E9E2D6', { roughness: 0.15, metalness: 0.2 }),
    vidro: new MeshStandardMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.2, depthWrite: false, side: DoubleSide }),
    lampada: new MeshBasicMaterial({ color: new Color(2.6, 1.9, 1.1), toneMapped: false }),
    pisca: new MeshBasicMaterial({ color: new Color(2.2, 1.7, 1.0), toneMapped: false }),
    trelica: new MeshStandardMaterial({ map: texTrelica(), alphaTest: 0.4, side: DoubleSide, color: '#E2B67A', emissive: '#FF9E4A', emissiveIntensity: 0.35 }),
    petala: new MeshStandardMaterial({ side: DoubleSide, roughness: 0.6 }),
    florzinha: new MeshStandardMaterial({ color: '#FFFFFF', emissive: '#FFF2E6', emissiveIntensity: 0.25, roughness: 0.7 }),
    guardanapo: std('#C9B8E4', { roughness: 1 }),
    prato: std('#FFFFFF', { roughness: 0.3 }),
  } as Record<string, Material>
}

/** Tudo o que existe no casamento */
export function CenaCasamento({ qualidade }: { qualidade: Qualidade }) {
  const dados = useMemo(() => montarCasamento(), [])
  const mats = useMemo(() => materiais(), [])
  const g = useMemo(() => {
    const flores = criarArranjos(dados.arranjos, 77)
    const chama = new SphereGeometry(0.018, 8, 6)
    chama.scale(1, 2.4, 1)
    return {
      cadeira: geoCadeira(),
      almofada: new RoundedBoxGeometry(0.42, 0.06, 0.4, 2, 0.02),
      vela: new CylinderGeometry(0.035, 0.035, 0.1, 10),
      chama,
      copo: new CylinderGeometry(1, 1, 1, 14, 1, true),
      lanterna: geoLanterna(),
      palha: new SphereGeometry(0.3, 16, 12),
      miolo: new SphereGeometry(0.07, 8, 6),
      lampada: new SphereGeometry(0.045, 8, 6),
      pisca: new SphereGeometry(0.02, 5, 4),
      petala: new CircleGeometry(0.035, 6),
      florzinha: new IcosahedronGeometry(0.02, 0),
      tufo: criarTufo(),
      prato: new CylinderGeometry(0.13, 0.11, 0.015, 20),
      sousplat: new CylinderGeometry(0.16, 0.16, 0.01, 24),
      guardanapo: new BoxGeometry(0.12, 0.02, 0.2),
      taca: geoTaca(),
      flores,
    }
  }, [dados])

  const chiffon = useMemo(() => {
    const m = new MeshStandardMaterial({ color: '#FFFAF4', emissive: '#FFD9B0', emissiveIntensity: 0.35, transparent: true, opacity: 0.62, side: DoubleSide, depthWrite: false, roughness: 1 })
    aplicarVento(m, { fixo: 0.22, forca: 0.8 })
    return m
  }, [])
  const lavanda = useMemo(() => {
    const m = new MeshStandardMaterial({ map: texLavanda(), alphaTest: 0.4, side: DoubleSide })
    aplicarVento(m, { fixo: 0.25, forca: 0.5 })
    return m
  }, [])
  const capim = useMemo(() => {
    const m = new MeshStandardMaterial({ color: '#C9B67A', side: DoubleSide, roughness: 0.9 })
    aplicarVento(m, { altura: 0.42, forca: 1.4 })
    return m
  }, [])

  // as velas tremulam e o vento anda
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    vento.uTempo.value = t
    const k = 1 + Math.sin(t * 11) * 0.08 + Math.sin(t * 17.3) * 0.06
    ;(mats.chama as MeshBasicMaterial).color.setRGB(3.2 * k, 2.1 * k, 0.9 * k)
  })

  const sol = useRef<DirectionalLight>(null)
  const dirLuz = useMemo(() => new Vector3(SOL.x, 0.24, SOL.z).normalize(), [])
  useLayoutEffect(() => {
    const l = sol.current
    if (!l) return
    const alvo = new Vector3(8, 0, 0)
    l.position.copy(dirLuz).multiplyScalar(90).add(alvo)
    l.target.position.copy(alvo)
    l.target.updateMatrixWorld()
  }, [dirLuz])

  const I = dados.I

  return (
    <>
      <CeuPorDoSol />
      <Environment resolution={32} frames={1} environmentIntensity={0.4}>
        <CeuPorDoSol />
      </Environment>
      <fog attach="fog" args={['#F1B4A6', 90, 430]} />

      {/* luz dourada do sol se pondo + o céu rosado */}
      <hemisphereLight args={['#EDB9CB', '#D9B089', 0.8]} />
      <ambientLight color="#FFD7BF" intensity={0.18} />
      <directionalLight
        ref={sol}
        intensity={2.6}
        color="#FFB47A"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-camera-near={40}
        shadow-camera-far={150}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      {/* o brilho quente das velas e luzinhas */}
      <pointLight position={[17.5, 3.2, 0]} color="#FFC37A" intensity={30} distance={22} decay={1.5} />
      <pointLight position={[0, 2.4, -6.2]} color="#FFC37A" intensity={7} distance={9} decay={1.5} />
      <pointLight position={[LOUNGE.x, 3.0, LOUNGE.z]} color="#FFC37A" intensity={4} distance={9} decay={1.5} />

      <Areia />
      <MarPorDoSol />

      {Object.entries(dados.pecas).map(([nome, geo]) => (
        <mesh key={nome} geometry={geo} material={mats[nome]} castShadow={!['chama', 'papel', 'cristal', 'vidro', 'pista'].includes(nome)} receiveShadow />
      ))}
      <mesh geometry={dados.tecidos} material={chiffon} userData={{ semSombra: true }} />
      {dados.lavanda && <mesh geometry={dados.lavanda} material={lavanda} />}
      <mesh geometry={g.flores.folhas} material={matFolhas(3)} castShadow />
      <mesh geometry={g.flores.rosas} material={materialRosas()} />

      <Instancias geo={g.cadeira} mat={mats.madeiraCadeira} itens={I.cadeiras} sombra />
      <Instancias geo={g.almofada} mat={mats.linho} itens={I.almofadas} />
      <Instancias geo={g.vela} mat={mats.vela} itens={I.velas} />
      <Instancias geo={g.chama} mat={mats.chama} itens={I.chamas} />
      <Instancias geo={g.copo} mat={mats.vidro} itens={I.copos} />
      <Instancias geo={g.lanterna} mat={mats.preto} itens={I.lanternas} sombra />
      <Instancias geo={g.palha} mat={mats.trelica} itens={I.lanternasPalha} />
      <Instancias geo={g.miolo} mat={mats.lampada} itens={I.lanternasPalha} />
      <Instancias geo={g.lampada} mat={mats.lampada} itens={I.lampadas} />
      <Instancias geo={g.pisca} mat={mats.pisca} itens={I.pisca} />
      <Instancias geo={g.petala} mat={mats.petala} itens={I.petalas} />
      <Instancias geo={g.florzinha} mat={mats.florzinha} itens={I.florzinhas} />
      <Instancias geo={g.tufo} mat={capim} itens={I.capim} />
      <Instancias geo={g.sousplat} mat={mats.ouro} itens={I.sousplats} />
      <Instancias geo={g.prato} mat={mats.prato} itens={I.pratos} />
      <Instancias geo={g.guardanapo} mat={mats.guardanapo} itens={I.guardanapos} />
      <Instancias geo={g.taca} mat={mats.vidro} itens={I.tacas} />

      {I.coqueiros.map((c, i) => (
        <Coqueiro key={i} position={c.pos} rotation-y={c.giro} altura={c.alt} curva={1.3} />
      ))}

      <Suspense fallback={null}>
        <NuvensPorDoSol poucas={qualidade !== 'alta'} />
        <Passaros />
      </Suspense>
    </>
  )
}
