import { Environment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import type { DirectionalLight, Group, Mesh } from 'three'
import { Lanternas, Vagalumes } from './Ambiente'
import { Arvore } from './Arvore'
import { Ceu, Nuvens } from './Ceu'
import { DIRECAO_LUZ } from './cores'
import { Borboletas, Flores } from './Flores'
import { Grama } from './Grama'
import { Interativo } from './Interativo'
import { ArvoreFotos } from './objetos/ArvoreFotos'
import { Casa } from './objetos/Casa'
import { Correio } from './objetos/Correio'
import { Jukung, Tedung } from './objetos/Jukung'
import { Casamento } from './objetos/Casamento'
import { QuadraFtv } from './objetos/QuadraFtv'
import { Balizadores, Caminho, Canteiros } from './objetos/Jardim'
import { RelogioSol } from './objetos/RelogioSol'
import { AraraPista } from './AraraPista'
import { Passaros } from './Passaros'
import type { PontoId } from './pontos'
import { altura, fatorCosta } from './terreno'
import { Chao, Mar } from './Chao'
import { sorteador, type Vec3 } from './util'
import { vento } from './vento'

export type Qualidade = 'alta' | 'media' | 'baixa'

// Quanta coisa desenhar em cada nível de qualidade
// (bem mais econômico que antes: o celular agradece)
const QTD = {
  alta: { grama: 22000, flores: 1300, arvoresLonge: 12, sombra: 1024, chao: 140 },
  media: { grama: 13000, flores: 800, arvoresLonge: 9, sombra: 1024, chao: 110 },
  baixa: { grama: 7000, flores: 450, arvoresLonge: 6, sombra: 512, chao: 80 },
}

interface Props {
  onFocar: (id: PontoId) => void
  /** Ela pegou a cartinha da arara (segredo da lua de mel) */
  onPista: () => void
  nossoDia: boolean
  qualidade: Qualidade
}

// a sombra cobre da casa até o casamento na praia
const CENTRO_SOMBRA: Vec3 = [12, 0, 2]
const SOL = DIRECAO_LUZ.clone().multiplyScalar(70).add({ x: CENTRO_SOMBRA[0], y: 0, z: CENTRO_SOMBRA[2] })
const noChao = (x: number, z: number): Vec3 => [x, altura(x, z), z]

// árvores perto da casa: [x, z, altura, semente]
const ARVORES: [number, number, number, number][] = [
  [-15, -9, 9.5, 1],
  [11, -11, 8, 2],
  [-5, -16.5, 10.5, 3],
  [13, 12.5, 7, 5],
  [-19.5, 15.5, 7.5, 6], // (afastada: não fica na frente do varal das fotos)
  [-21, 2, 8.5, 7],
  [5.5, -20, 9, 8],
  [-24, -12, 10, 9],
]

/** Tudo o que existe no nosso cantinho. */
export function Cena({ onFocar, onPista, nossoDia, qualidade }: Props) {
  const q = QTD[qualidade]
  const objetos = useRef<Group>(null)
  const sol = useRef<DirectionalLight>(null)

  useLayoutEffect(() => {
    sol.current?.target.position.set(...CENTRO_SOMBRA)
    sol.current?.target.updateMatrixWorld()
  }, [])

  // o relógio do vento anda junto com o tempo
  useFrame(({ clock }) => {
    vento.uTempo.value = clock.elapsedTime
  })

  // os objetos tocáveis fazem e recebem sombra
  useLayoutEffect(() => {
    objetos.current?.traverse((o) => {
      if ((o as Mesh).isMesh && !o.userData.semSombra) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
  }, [])

  // fileira de árvores ao longe (do lado da terra)
  const arvoresLonge = useMemo(() => {
    const rand = sorteador(42)
    const lista: { pos: Vec3; alt: number; semente: number }[] = []
    let tent = 0
    while (lista.length < q.arvoresLonge && tent < 500) {
      tent++
      const a = rand() * Math.PI * 2
      const r = 55 + rand() * 40
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      if (x > 8 || fatorCosta(x, z) > 0) continue
      lista.push({ pos: noChao(x, z), alt: 10 + rand() * 7, semente: 10 + lista.length })
    }
    return lista
  }, [q.arvoresLonge])

  const casaY = altura(0, -4)

  return (
    <>
      <Ceu />
      {/* reflexos (vidros, mar, metais) vêm desse mesmo céu */}
      {/* reflexos (vidros, mar, metais) vêm desse mesmo céu */}
      <Environment resolution={32} frames={1} environmentIntensity={0.6}>
        <Ceu />
      </Environment>
      <fog attach="fog" args={['#DCEBF4', 50, 260]} />

      {/* luz do fim de tarde */}
      <hemisphereLight args={['#CFE6FF', '#5E9E3A', 0.55]} />
      <directionalLight
        ref={sol}
        position={SOL}
        intensity={3.3}
        color="#FFE3BA"
        castShadow
        shadow-mapSize={[q.sombra, q.sombra]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={20}
        shadow-camera-far={130}
        shadow-bias={-0.0003}
        shadow-normalBias={0.04}
      />

      <Chao detalhe={q.chao} />
      <Mar />
      <Grama quantidade={q.grama} />
      <Flores quantidade={q.flores} />
      <Caminho />
      <Balizadores />
      <Canteiros />

      <group ref={objetos}>
        <Interativo id="lar" onFocar={onFocar}>
          <Casa position={[0, casaY, -4]} />
        </Interativo>

        <Interativo id="casamento" onFocar={onFocar}>
          <Casamento qualidade={qualidade} />
        </Interativo>

        <Interativo id="cartas" onFocar={onFocar}>
          <Correio position={noChao(1.6, 18)} scale={1.3} />
        </Interativo>

        <Interativo id="fotos" onFocar={onFocar}>
          <ArvoreFotos posicao={noChao(-12, 3)} />
        </Interativo>

        <Interativo id="luademel" onFocar={onFocar}>
          <Jukung position={noChao(43.4, 9.3)} rotation-y={0.35} scale={1.35} />
          <Tedung position={noChao(44.6, 5.2)} rotation-y={0.2} scale={1.2} />
        </Interativo>

        <Interativo id="dias" onFocar={onFocar}>
          <RelogioSol position={noChao(8.5, 11)} scale={1.7} />
        </Interativo>
      </group>

      {/* a quadra de futevôlei, na areia do lado do casamento (tocável, só pra olhar) */}
      <Interativo id="futevolei" onFocar={onFocar}>
        <QuadraFtv />
      </Interativo>

      {ARVORES.map(([x, z, alt, s]) => (
        <Arvore key={s} semente={s} altura={alt} position={noChao(x, z)} rotation-y={s} />
      ))}
      {arvoresLonge.map((a) => (
        <Arvore key={a.semente} semente={a.semente} altura={a.alt} cartoes={40} position={a.pos} rotation-y={a.semente} />
      ))}

      <Suspense fallback={null}>
        <Nuvens poucas={qualidade !== 'alta'} />
        <Passaros />
        {/* de vez em quando passa uma arara com uma cartinha no pezinho */}
        <AraraPista onPegou={onPista} />
      </Suspense>
      <Borboletas quantidade={qualidade === 'baixa' ? 8 : 16} />
      <Vagalumes muitos={nossoDia} />
      {nossoDia && <Lanternas />}
    </>
  )
}
