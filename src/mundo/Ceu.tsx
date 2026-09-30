import { Cloud, Clouds } from '@react-three/drei'
import { useMemo } from 'react'
import { BackSide, Color, MeshLambertMaterial, ShaderMaterial } from 'three'
import { DIRECAO_SOL } from './cores'
import { urlNuvem } from './texturas'

export const RAIO_CEU = 420

/** Céu de fim de tarde: azul forte lá em cima, dourado e pêssego no horizonte do lado do sol. */
export function Ceu() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          topo: { value: new Color('#2F74D0') },
          meio: { value: new Color('#7FB8EE') },
          horizonte: { value: new Color('#CFE4F2') },
          horizonteSol: { value: new Color('#FFE9CF') },
          corSol: { value: new Color('#FFC16B') },
          dirSol: { value: DIRECAO_SOL },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww; // sempre no fundo
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 topo, meio, horizonte, horizonteSol, corSol, dirSol;
          varying vec3 vDir;
          void main() {
            float h = max(vDir.y, -0.05);
            // do lado do sol o horizonte fica dourado
            float ladoSol = pow(max(dot(normalize(vDir.xz), normalize(dirSol.xz)), 0.0), 12.0);
            vec3 hz = mix(horizonte, horizonteSol, ladoSol * 0.8);
            vec3 c = mix(hz, meio, smoothstep(0.0, 0.3, h));
            c = mix(c, topo, smoothstep(0.25, 0.75, h));
            float s = max(dot(vDir, dirSol), 0.0);
            c += corSol * (pow(s, 8.0) * 0.35 + pow(s, 60.0) * 0.5);
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )

  return (
    <>
      <mesh material={material} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[RAIO_CEU, 48, 24]} />
      </mesh>
      {/* o sol: bem claro, pra o Bloom fazer ele brilhar */}
      <mesh position={DIRECAO_SOL.clone().multiplyScalar(RAIO_CEU * 0.9)} frustumCulled={false}>
        <sphereGeometry args={[11, 32, 16]} />
        <meshBasicMaterial color={[4, 3.1, 1.9]} toneMapped={false} fog={false} />
      </mesh>
    </>
  )
}

/** Nuvens volumosas espalhadas pelo céu */
export function Nuvens({ poucas = false }: { poucas?: boolean }) {
  const textura = useMemo(() => urlNuvem(), [])
  const nuvens: { pos: [number, number, number]; seed: number; bounds: [number, number, number]; volume: number }[] = [
    { pos: [-40, 34, -90], seed: 1, bounds: [22, 5, 6], volume: 16 },
    { pos: [30, 40, -110], seed: 2, bounds: [26, 6, 6], volume: 18 },
    { pos: [110, 26, -30], seed: 3, bounds: [20, 5, 6], volume: 14 },
    { pos: [120, 30, 60], seed: 4, bounds: [24, 5, 6], volume: 15 },
    { pos: [-90, 38, 40], seed: 5, bounds: [22, 5, 6], volume: 16 },
    { pos: [-20, 46, 110], seed: 6, bounds: [24, 6, 6], volume: 16 },
    { pos: [60, 50, 120], seed: 7, bounds: [20, 5, 6], volume: 14 },
    { pos: [-120, 30, -40], seed: 8, bounds: [22, 5, 6], volume: 15 },
  ]
  return (
    <Clouds material={MeshLambertMaterial} texture={textura} limit={poucas ? 160 : 320}>
      {nuvens.map((n) => (
        <Cloud
          key={n.seed}
          position={n.pos}
          seed={n.seed}
          segments={poucas ? 16 : 30}
          bounds={n.bounds}
          volume={n.volume}
          growth={4}
          speed={0.08}
          opacity={0.95}
          color="#FFFFFF"
        />
      ))}
    </Clouds>
  )
}
