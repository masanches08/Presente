import { useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Environment, useGLTF } from '@react-three/drei'
import {
  Box3,
  Color,
  DoubleSide,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  ShaderMaterial,
  Vector3,
  type DirectionalLight,
  type Material,
  type BufferGeometry,
  type Mesh,
} from 'three'
import { CONFIG } from '../config'
import { relevoReal, texReal } from '../lib/texturasReais'
import { Arbusto, Arvore, Cipreste } from '../mundo/Arvore'
import { Ceu, Nuvens } from '../mundo/Ceu'
import { criarTufo } from '../mundo/Grama'
import { texJuta } from '../mundo/texturas'
import { sorteador } from '../mundo/util'
import { aplicarVento, vento } from '../mundo/vento'
import type { Modelo } from './moveis'
import { CASA_ARVORE, LAJE_PEGADAS, LOTE, PISCINA, REDE, semGrama, SPA } from './exterior'
import { geoTapete, montarCasa, type GeoAndar } from './geometria'
import { comLuz, SOL_CASA, useLuzAssada, usarLuz, type LuzAssada } from './luzAssada'
import { criarMateriais, ocultar } from './materiais'
import { texPegadas, texQuadro, texTapeteListrado, texTapetePersa, texTapeteRedondo } from './texturas'
import { texDesenho, texTapeteInfantil } from './texturasInfantis'

export type Qualidade = 'alta' | 'media'

const SOL = SOL_CASA

const SEM_SOMBRA = new Set(['vidro', 'luz', 'cupula', 'voil'])

/** Um modelo escaneado de verdade (plantas, vasos…), escalado pra altura certa e apoiado no chão/móvel */
function ModeloGLB({ m }: { m: Modelo }) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}modelos/${m.arquivo}.glb`)
  const obj = useMemo(() => {
    const c = scene.clone(true)
    const caixa = new Box3().setFromObject(c)
    const s = m.altura / Math.max(0.001, caixa.max.y - caixa.min.y)
    c.scale.setScalar(s)
    c.position.set((-(caixa.min.x + caixa.max.x) / 2) * s, -caixa.min.y * s, (-(caixa.min.z + caixa.max.z) / 2) * s)
    c.traverse((o) => {
      if ((o as Mesh).isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    return c
  }, [scene, m])
  return (
    <group position={m.pos} rotation-y={m.giro}>
      <primitive object={obj} />
    </group>
  )
}

/** Um andar da casa: poucas peças grandes + plantas, flores, tapetes e quadros */
function Andar3D({ nome: andar, geo, oculto, luz }: { nome: string; geo: GeoAndar; oculto: boolean; luz: LuzAssada | null }) {
  const mats = useMemo(() => {
    const m = criarMateriais()
    // materiais dos tapetes e quadros deste andar (entram no "esconder" também)
    geo.tapetes.forEach((t, i) => {
      // a trama de tecido de verdade (foto escaneada) por cima do desenho de cada tapete
      const d = t.tipo === 'redondo' || t.tipo === 'infantil' ? t.w : t.d
      const trama = relevoReal('poly_wool_herringbone', 1.2, [t.w / 0.27, d / 0.27])
      if (t.tipo === 'listrado') m['tapete' + i] = new MeshStandardMaterial({ map: texTapeteListrado(), roughness: 1, ...trama })
      else if (t.tipo === 'persa') m['tapete' + i] = new MeshStandardMaterial({ map: texTapetePersa(), roughness: 1, ...trama })
      else if (t.tipo === 'infantil') m['tapete' + i] = new MeshStandardMaterial({ map: texTapeteInfantil(t.cores ?? ['#FFFFFF']), alphaTest: 0.5, roughness: 1, ...trama })
      else if (t.tipo === 'redondo') m['tapete' + i] = new MeshStandardMaterial({ map: texTapeteRedondo(), color: t.cor, alphaTest: 0.5, roughness: 1, ...trama })
      else {
        const j = texJuta().clone()
        j.repeat.set(t.w / 0.9, t.d / 0.9)
        j.needsUpdate = true
        m['tapete' + i] = new MeshStandardMaterial({ map: j, color: '#EBD5AC', roughness: 1, ...trama })
      }
    })
    geo.quadros.forEach(
      (q, i) =>
        (m['quadro' + i] = q.desenho
          ? new MeshStandardMaterial({ map: texDesenho(q.desenho), transparent: true, alphaTest: 0.05, roughness: 0.95, depthWrite: false })
          : new MeshStandardMaterial({ map: texQuadro(q.variante), roughness: 0.8 })),
    )
    return m as Record<string, Material>
  }, [geo])

  useEffect(() => ocultar(mats, oculto), [mats, oculto])

  // a fogueira tremula
  useFrame(({ clock }) => {
    const fogo = mats.fogo as MeshStandardMaterial | undefined
    if (!fogo) return
    const t = clock.elapsedTime
    fogo.emissiveIntensity = 3 + Math.sin(t * 13) * 0.5 + Math.sin(t * 7.3) * 0.6
  })

  const tapetesBase = useMemo(() => geo.tapetes.map((t) => geoTapete(t)), [geo])

  // luz assada (quando já carregou): geometria com as coordenadas do mapa + material que usa o mapa
  const { pecas, tapetes } = useMemo(() => {
    const mapa = luz?.mapas[andar]
    if (!luz || !mapa) return { pecas: geo.pecas, tapetes: tapetesBase }
    const trocar = (chave: string, g: BufferGeometry) => {
      const nova = comLuz(g, luz.uv.get(`${andar}/${chave}`))
      if (!nova) return g
      usarLuz(mats[chave], mapa)
      return nova
    }
    return {
      pecas: Object.fromEntries(Object.entries(geo.pecas).map(([k, g]) => [k, trocar(k, g)])),
      tapetes: tapetesBase.map((g, i) => trocar('tapete' + i, g)),
    }
  }, [luz, andar, geo, tapetesBase, mats])

  return (
    <group>
      {Object.entries(pecas).map(([nome, g]) => (
        <mesh key={nome} geometry={g} material={mats[nome]} castShadow={!SEM_SOMBRA.has(nome)} receiveShadow />
      ))}
      {geo.folhas && <mesh geometry={geo.folhas} material={mats.folhas} castShadow receiveShadow />}
      {geo.arranjos && (
        <>
          <mesh geometry={geo.arranjos.folhas} material={mats.folhas} castShadow />
          <mesh geometry={geo.arranjos.rosas} material={mats.rosas} />
        </>
      )}
      {/* plantas e vasos escaneados de verdade */}
      <group visible={!oculto}>
        {geo.modelos.map((m, i) => (
          <Suspense key={i} fallback={null}>
            <ModeloGLB m={m} />
          </Suspense>
        ))}
      </group>
      {tapetes.map((g, i) => (
        <mesh key={i} geometry={g} material={mats['tapete' + i]} receiveShadow />
      ))}
      {geo.quadros.map((q, i) => (
        <group key={i} position={q.pos} rotation-y={q.giro}>
          <mesh position-z={q.desenho ? 0.012 : 0.037} material={mats['quadro' + i]}>
            <planeGeometry args={[q.w, q.h]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Água da piscina: azul-turquesa com o desenho de luz no fundo (cáusticas) balançando */
function Agua() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        uniforms: { uTempo: { value: 0 }, raso: { value: new Color('#5FD3DF') }, fundo: { value: new Color('#1E93B5') } },
        vertexShader: /* glsl */ `
          varying vec3 vMundo;
          void main() {
            vec4 p = modelMatrix * vec4(position, 1.0);
            vMundo = p.xyz;
            gl_Position = projectionMatrix * viewMatrix * p;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTempo;
          uniform vec3 raso, fundo;
          varying vec3 vMundo;
          float linhas(vec2 p) {
            float a = sin(p.x * 2.1 + sin(p.y * 1.7 + uTempo * 0.9) * 1.4 + uTempo * 0.6);
            float b = sin(p.y * 2.4 + sin(p.x * 1.3 - uTempo * 0.7) * 1.3 - uTempo * 0.5);
            return pow(1.0 - abs(a * b), 8.0);
          }
          void main() {
            vec2 p = vMundo.xz * 1.6;
            float c = linhas(p) + linhas(p * 1.7 + 3.0) * 0.6;
            vec3 v = normalize(cameraPosition - vMundo);
            float fresnel = pow(1.0 - max(v.y, 0.0), 3.0);
            vec3 cor = mix(raso, fundo, 0.35 + 0.25 * sin(p.x * 0.3 + uTempo * 0.2));
            cor += c * 0.35;
            cor = mix(cor, vec3(0.85, 0.95, 1.0), fresnel * 0.6);
            gl_FragColor = vec4(cor, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )
  useFrame(({ clock }) => {
    mat.uniforms.uTempo.value = clock.elapsedTime
  })
  const P = PISCINA
  return (
    <>
      <mesh material={mat} position={[(P.x0 + P.x1) / 2, 0.035, (P.z0 + P.z1) / 2]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[P.x1 - P.x0, P.z1 - P.z0]} />
      </mesh>
      <mesh material={mat} position={[SPA.x, 0.36, SPA.z]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[SPA.r + 0.05, 40]} />
      </mesh>
    </>
  )
}

/** Gramado aparadinho em volta da casa (balança com o vento) */
function GramaLote({ quantidade }: { quantidade: number }) {
  const ref = useRef<InstancedMesh>(null)
  const geo = useMemo(() => criarTufo(), [])
  const mat = useMemo(() => {
    const m = new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.85 })
    aplicarVento(m, { forca: 0.7, altura: 0.42 })
    return m
  }, [])
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const rand = sorteador(7)
    const o = new Object3D()
    const c = new Color()
    const tons = ['#FFFFFF', '#EEFFDD', '#F7FFE8', '#E2F5CC']
    let i = 0
    let t = 0
    while (i < quantidade && t < quantidade * 6) {
      t++
      // o lote inteiro (de 24 m na frente até a cerca do fundo), um pouco além das laterais
      const x = (rand() - 0.5) * 56
      const z = 24 - rand() * 72
      if (semGrama(x, z)) continue
      o.position.set(x, -0.03, z)
      o.rotation.set(0, rand() * 6.28, 0)
      const s = 0.8 + rand() * 0.5
      o.scale.set(s, s * (0.45 + rand() * 0.2), s)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, c.set(tons[i % tons.length]))
      i++
    }
    m.count = i
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [quantidade])
  return <instancedMesh key={quantidade} ref={ref} args={[geo, mat, quantidade]} receiveShadow />
}

// multiplica a foto (meio marrom, com folhinhas) até o verde do gramado (cor linear)
const VERDE_GRAMADO = new Color(0.4, 1.45, 0.42)

/** Chão verde, os pezinhos na calçada, árvores, cercas-vivas e morrinhos ao longe */
function Quintal({ qualidade }: { qualidade: Qualidade }) {
  const pegadas = useMemo(() => texPegadas(CONFIG.iniciais), [])
  const arvores: [number, number, number, number][] = [
    // frente
    [6.9, 11.6, 9.5, 11],
    [-7.2, 12.6, 8.5, 12],
    [13.8, 2.5, 9, 13],
    [-13.5, 9.5, 8, 14],
    [9, 25, 8.5, 19],
    [-19, 22, 9.5, 20],
    [26, 14, 10, 21],
    // fundo: ao longo da cerca
    [-21.8, -12, 9, 22],
    [21.8, -12.5, 9.5, 23],
    [-21.5, -22, 8.5, 24],
    [22, -38, 9, 25],
    [0, -44.3, 10, 26],
    [-8, -44.4, 8.5, 27],
    [10.8, -44.2, 9, 28],
    [REDE.x0, REDE.z, 7.5, 29],
    [REDE.x1, REDE.z, 8, 30],
    // vizinhança lá atrás
    [-30, -30, 11, 31],
    [32, -20, 11, 32],
    [-12, -56, 12, 33],
    [16, -58, 11, 34],
  ]
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.04} receiveShadow>
        <planeGeometry args={[420, 420]} />
        {/* chão de grama de verdade (foto escaneada, puxada pro verde), repetindo a cada 2 m */}
        <meshStandardMaterial color={VERDE_GRAMADO} map={texReal('leafy_grass', 'diff', 210)} roughness={0.95} />
      </mesh>
      {/* os 5 pezinhos marcados no cimento */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.043, LAJE_PEGADAS.z]} receiveShadow>
        <planeGeometry args={[LAJE_PEGADAS.w, LAJE_PEGADAS.d]} />
        <meshStandardMaterial map={pegadas} roughness={0.9} />
      </mesh>
      <GramaLote quantidade={qualidade === 'alta' ? 14000 : 8000} />
      <Agua />
      {arvores.map(([x, z, alt, s]) => (
        <Arvore key={s} semente={s} altura={alt} position={[x, 0, z]} rotation-y={s} cartoes={qualidade === 'alta' ? 45 : 32} />
      ))}
      {/* a árvore da casinha */}
      {/* ao lado da casinha (e bem alta): os galhos passam por cima do telhado */}
      <Arvore semente={77} altura={14} position={[CASA_ARVORE.x - 2.7, 0, CASA_ARVORE.z - 2.5]} cartoes={90} />
      {/* cerca-viva e ciprestes na frente da casa */}
      {[-1, 1].map((l) => (
        <group key={l}>
          <Arbusto semente={120 + l} largura={5.6} profundidade={0.8} alturaArbusto={0.8} position={[l * 5.6, 0, 8.3]} />
          <Cipreste semente={130 + l} altura={2.8} position={[l * 2.5, 0, 8.4]} />
          <Cipreste semente={140 + l} altura={3.2} position={[l * 9.9, 0, 8.2]} />
        </group>
      ))}
      <Arbusto semente={150} largura={1.4} profundidade={1.4} alturaArbusto={1.2} position={[10.6, 0, -2]} />
      <Arbusto semente={151} largura={1.4} profundidade={1.4} alturaArbusto={1.2} position={[-10.6, 0, 3]} />
      {/* canteiros junto da cerca */}
      {[-18, -8, 2, 12].map((x, i) => (
        <Arbusto key={x} semente={160 + i} largura={4} profundidade={1} alturaArbusto={1.1} position={[x, 0, LOTE.z0 + 0.8]} />
      ))}
      {[-38, -30, -18].map((z, i) => (
        <Arbusto key={z} semente={170 + i} largura={1} profundidade={3.5} alturaArbusto={1.2} position={[LOTE.x1 - 0.8, 0, z]} />
      ))}
      {/* morrinhos verdes no horizonte */}
      {[
        [-120, -160, 70],
        [40, -190, 90],
        [170, -60, 70],
        [-180, 40, 80],
        [120, 150, 70],
      ].map(([x, z, r], i) => (
        <mesh key={i} position={[x, -r * 0.82, z]} scale={[1.6, 1, 1]}>
          <sphereGeometry args={[r, 32, 16]} />
          <meshStandardMaterial color="#7DB55A" roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

interface CenaProps {
  ocultos: { superior: boolean; teto: boolean }
  qualidade: Qualidade
  /** Pra onde a câmera está olhando: a sombra fica nítida em volta desse ponto */
  foco: [number, number, number]
  /** Visão livre: sombra cobrindo o lote inteiro */
  amplo: boolean
  /** Luzes quentes do cômodo atual (luminárias acesas) */
  luzes: [number, number, number][]
}

export function CenaCasa({ ocultos, qualidade, foco, amplo, luzes }: CenaProps) {
  const geo = useMemo(() => montarCasa(), [])
  const luz = useLuzAssada()
  const sol = useRef<DirectionalLight>(null)

  // a "área de sombra" do sol segue o que a câmera está vendo (sombra nítida perto, sem gastar à toa)
  useEffect(() => {
    const l = sol.current
    if (!l) return
    const alvo = amplo ? new Vector3(0, 0, -16) : new Vector3(...foco)
    const raio = amplo ? 42 : 16
    l.position.copy(SOL).multiplyScalar(80).add(alvo)
    l.target.position.copy(alvo)
    l.target.updateMatrixWorld()
    const c = l.shadow.camera
    c.left = c.bottom = -raio
    c.right = c.top = raio
    c.near = 30
    c.far = 140
    c.updateProjectionMatrix()
  }, [foco, amplo])

  useFrame(({ clock }) => {
    vento.uTempo.value = clock.elapsedTime
  })

  return (
    <>
      <Ceu />
      {/* céu de verdade (foto 360°) nos reflexos dos vidros, da água e dos metais */}
      <Environment resolution={32} frames={1} environmentIntensity={0.3}>
        <Ceu />
      </Environment>
      <fog attach="fog" args={['#DCEBF4', 70, 320]} />
      <hemisphereLight args={['#FFF3E2', '#E9D6B6', 0.8]} />
      <ambientLight color="#FFE6C4" intensity={0.18} />
      <directionalLight
        ref={sol}
        intensity={3.8}
        color="#FFE2B4"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      {/* luz quentinha das luminárias do cômodo */}
      {/* sempre 2 luzes (mudar a quantidade faria o celular "engasgar" recompilando tudo) */}
      {[0, 1].map((i) => (
        <pointLight key={i} position={luzes[i] ?? [0, -50, 0]} color="#FFC98E" intensity={luzes[i] ? 9 : 0} distance={9} decay={1.6} />
      ))}

      <Andar3D nome="terreo" geo={geo.terreo} oculto={false} luz={luz} />
      <Andar3D nome="superior" geo={geo.superior} oculto={ocultos.superior} luz={luz} />
      <Andar3D nome="teto" geo={geo.teto} oculto={ocultos.teto} luz={luz} />
      <Andar3D nome="fora" geo={geo.fora} oculto={false} luz={null} />
      <Quintal qualidade={qualidade} />
      <Nuvens poucas={qualidade !== 'alta'} />
    </>
  )
}
