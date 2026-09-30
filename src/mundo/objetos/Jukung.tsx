import type { ThreeElements } from '@react-three/fiber'
import { useMemo } from 'react'
import { Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, BufferGeometry, QuadraticBezierCurve3, TubeGeometry, Vector3 } from 'three'

type Props = ThreeElements['group']

/** Casco do jukung: comprido, fininho, com as pontas subindo; azul embaixo, branco em cima, faixa vermelha */
function geoCasco() {
  const comp = 5.2
  const g = new CylinderGeometry(0.34, 0.34, comp, 14, 24, true)
  g.rotateZ(Math.PI / 2)
  g.rotateX(Math.PI / 2)
  const p = g.attributes.position
  const cores: number[] = []
  const azul = new Color('#2F6FB8')
  const branco = new Color('#F7F3EA')
  const vermelho = new Color('#D8453A')
  const amarelo = new Color('#F2C14E')
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    let y = p.getY(i)
    let z = p.getZ(i)
    const t = Math.abs(x) / (comp / 2) // 0 no meio, 1 nas pontas
    const afina = 1 - Math.pow(t, 2.2) * 0.92
    if (y > 0.05) y = 0.05 // casco aberto em cima
    y = y * 0.85 * afina + Math.pow(t, 3) * 0.75 // as pontas sobem
    z = z * 0.9 * afina
    p.setXYZ(i, x, y, z)
    const c = y < -0.05 + Math.pow(t, 3) * 0.75 ? azul : branco
    const topo = Math.abs(y - (0.05 * afina + Math.pow(t, 3) * 0.75)) < 0.06
    const cor = topo ? (t > 0.7 ? amarelo : vermelho) : c
    cores.push(cor.r, cor.g, cor.b)
  }
  g.setAttribute('color', new Float32BufferAttribute(cores, 3))
  g.computeVertexNormals()
  return g
}

/** Vela triangular listrada (as velas coloridas dos barquinhos de Bali) */
function geoVela() {
  const g = new BufferGeometry()
  const pos: number[] = []
  const cor: number[] = []
  const faixas = ['#E94B3C', '#F2C14E', '#3FA7D6', '#F7F3EA', '#7BC47F', '#F28AB2']
  const n = faixas.length
  const c = new Color()
  // triângulo: base no mastro (0,0)-(0,3.2), ponta em (2.3, 0.2)
  for (let i = 0; i < n; i++) {
    const a = i / n
    const b = (i + 1) / n
    const p0 = [0, 0.2 + a * 3.0, 0]
    const p1 = [0, 0.2 + b * 3.0, 0]
    const q0 = [2.3 * (1 - a), 0.2 + a * 0.6, 0]
    const q1 = [2.3 * (1 - b), 0.2 + b * 0.6, 0]
    pos.push(...p0, ...q0, ...p1, ...p1, ...q0, ...q1)
    c.set(faixas[i])
    for (let k = 0; k < 6; k++) cor.push(c.r, c.g, c.b)
  }
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new Float32BufferAttribute(cor, 3))
  g.computeVertexNormals()
  return g
}

/** Jukung: o barquinho tradicional da Indonésia, com os dois flutuadores de bambu */
export function Jukung(props: Props) {
  const { casco, vela, bracos } = useMemo(() => {
    const bracos: TubeGeometry[] = []
    for (const x of [-1.1, 1.1])
      for (const lado of [-1, 1])
        bracos.push(new TubeGeometry(new QuadraticBezierCurve3(new Vector3(x, 0.15, 0), new Vector3(x, 0.55, lado * 0.9), new Vector3(x, 0.08, lado * 1.75)), 12, 0.035, 5))
    return { casco: geoCasco(), vela: geoVela(), bracos }
  }, [])

  return (
    <group {...props}>
      <mesh geometry={casco} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.55} side={DoubleSide} />
      </mesh>
      {/* olhos pintados na proa (tradição dos pescadores) */}
      {[-1, 1].map((l) => (
        <group key={l} position={[2.05, 0.42, l * 0.21]} rotation-y={l * 0.35}>
          <mesh rotation-y={l > 0 ? 0 : Math.PI}>
            <circleGeometry args={[0.1, 20]} />
            <meshStandardMaterial color="#FFFFFF" side={DoubleSide} />
          </mesh>
          <mesh position-z={l * 0.005} rotation-y={l > 0 ? 0 : Math.PI}>
            <circleGeometry args={[0.05, 16]} />
            <meshStandardMaterial color="#1A1A1A" side={DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* flutuadores e braços de bambu */}
      {[-1.75, 1.75].map((z) => (
        <mesh key={z} position={[0, 0.08, z]} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 4.4, 8]} />
          <meshStandardMaterial color="#D9C08A" roughness={0.8} />
        </mesh>
      ))}
      {bracos.map((b, i) => (
        <mesh key={i} geometry={b} castShadow>
          <meshStandardMaterial color="#C9AE78" roughness={0.8} />
        </mesh>
      ))}
      {/* mastro e vela colorida */}
      <mesh position={[0.2, 1.9, 0]} rotation-z={-0.08} castShadow>
        <cylinderGeometry args={[0.035, 0.045, 3.6, 8]} />
        <meshStandardMaterial color="#8C6647" />
      </mesh>
      <mesh geometry={vela} position={[0.25, 0.35, 0.02]} rotation-z={-0.08}>
        <meshStandardMaterial vertexColors side={DoubleSide} roughness={0.9} />
      </mesh>
    </group>
  )
}

/** Tedung: o guarda-sol cerimonial amarelo, com franjinha */
export function Tedung(props: Props) {
  return (
    <group {...props}>
      <mesh position-y={1.3} castShadow>
        <cylinderGeometry args={[0.03, 0.035, 2.6, 8]} />
        <meshStandardMaterial color="#6B4A2F" />
      </mesh>
      <mesh position-y={2.55} castShadow>
        <coneGeometry args={[0.85, 0.35, 24, 1, true]} />
        <meshStandardMaterial color="#F2C230" side={DoubleSide} roughness={0.7} />
      </mesh>
      <mesh position-y={2.3}>
        <cylinderGeometry args={[0.86, 0.86, 0.18, 24, 1, true]} />
        <meshStandardMaterial color="#FFE39A" side={DoubleSide} transparent opacity={0.85} />
      </mesh>
      <mesh position-y={2.75}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color="#D9A62B" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}
