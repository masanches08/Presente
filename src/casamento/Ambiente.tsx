import { Cloud, Clouds } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { BackSide, Color, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, Vector3 } from 'three'
import { texReal } from '../lib/texturasReais'
import { urlNuvem } from '../mundo/texturas'

/** O sol se pondo no mar (o mar fica pro lado -z) */
export const SOL = new Vector3(0.18, 0.05, -1).normalize()
export const NIVEL_MAR = -0.55
/** Onde a areia encontra a água */
export const BEIRA = -21

/** Altura da areia: plana onde fica a festa, descendo devagar até o mar */
export function alturaAreia(x: number, z: number) {
  let h = 0.04 * Math.sin(x * 0.21 + z * 0.13) + 0.03 * Math.sin(x * 0.53 - z * 0.37)
  if (z < -12) h -= (z + 12) * -0.075
  if (z > 14) h += (z - 14) * 0.06 // dunas lá atrás
  return h
}

/** Céu do pôr do sol: dourado no horizonte, coral, rosa, lilás e azul lá em cima */
export function CeuPorDoSol() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          dirSol: { value: SOL },
          ouro: { value: new Color('#FFC46B') },
          coral: { value: new Color('#FF8E6E') },
          rosa: { value: new Color('#EE9AB0') },
          lilas: { value: new Color('#A898CF') },
          topo: { value: new Color('#5A6AA5') },
          horizonteLonge: { value: new Color('#F4B6A6') },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 dirSol, ouro, coral, rosa, lilas, topo, horizonteLonge;
          varying vec3 vDir;
          void main() {
            float h = max(vDir.y, -0.02);
            float ladoSol = pow(max(dot(normalize(vDir.xz), normalize(dirSol.xz)), 0.0), 2.5);
            vec3 hz = mix(horizonteLonge, ouro, ladoSol);
            vec3 c = mix(hz, coral, smoothstep(0.0, 0.08, h) * (0.4 + 0.6 * ladoSol));
            c = mix(c, rosa, smoothstep(0.05, 0.22, h));
            c = mix(c, lilas, smoothstep(0.18, 0.45, h));
            c = mix(c, topo, smoothstep(0.4, 0.9, h));
            float s = max(dot(vDir, dirSol), 0.0);
            c += vec3(1.0, 0.72, 0.4) * (pow(s, 6.0) * 0.45 + pow(s, 40.0) * 0.6);
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
        <sphereGeometry args={[450, 48, 24]} />
      </mesh>
      {/* o sol, bem brilhante (o Bloom faz o resto) */}
      <mesh position={SOL.clone().multiplyScalar(400)} frustumCulled={false}>
        <sphereGeometry args={[13, 32, 16]} />
        <meshBasicMaterial color={[5, 3.6, 1.8]} toneMapped={false} fog={false} />
      </mesh>
    </>
  )
}

/** Nuvens do fim de tarde, tingidas de rosa e dourado */
export function NuvensPorDoSol({ poucas }: { poucas: boolean }) {
  const textura = useMemo(() => urlNuvem(), [])
  const nuvens: [number, number, number, number][] = [
    [-60, 38, -170, 1],
    [30, 30, -190, 2],
    [120, 45, -150, 3],
    [-140, 50, -110, 4],
    [70, 60, -120, 5],
    [-20, 70, -140, 6],
  ]
  return (
    <Clouds material={MeshBasicMaterial} texture={textura} limit={poucas ? 120 : 240}>
      {nuvens.map(([x, y, z, seed]) => (
        <Cloud key={seed} position={[x, y, z]} seed={seed} segments={poucas ? 14 : 26} bounds={[34, 4, 8]} volume={22} growth={5} speed={0.05} opacity={0.55} color="#FFD6C4" />
      ))}
    </Clouds>
  )
}

/** Mar do entardecer: azul-arroxeado, refletindo o céu, com o caminho dourado do sol */
export function MarPorDoSol() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        uniforms: {
          uTempo: { value: 0 },
          dirSol: { value: SOL },
          fundo: { value: new Color('#3C4A78') },
          raso: { value: new Color('#5C8DA6') },
          ceu: { value: new Color('#E9A3B0') },
          horizonte: { value: new Color('#F4B6A6') },
          corSol: { value: new Color('#FFC36B') },
          beira: { value: BEIRA },
        },
        vertexShader: /* glsl */ `
          varying vec3 vMundo;
          void main() {
            vec4 p = modelMatrix * vec4(position, 1.0);
            vMundo = p.xyz;
            gl_Position = projectionMatrix * viewMatrix * p;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTempo, beira;
          uniform vec3 dirSol, fundo, raso, ceu, horizonte, corSol;
          varying vec3 vMundo;
          vec3 normalOndas(vec2 p) {
            vec2 d = vec2(0.0);
            d += vec2(0.2, 1.0) * cos(dot(p, vec2(0.2, 1.0)) * 0.7 + uTempo * 1.1) * 0.10;
            d += vec2(-0.6, 0.8) * cos(dot(p, vec2(-0.6, 0.8)) * 1.6 + uTempo * 1.7) * 0.06;
            d += vec2(0.9, 0.4) * cos(dot(p, vec2(0.9, 0.4)) * 3.3 + uTempo * 2.4) * 0.04;
            d += vec2(-0.3, -1.0) * cos(dot(p, vec2(-0.3, -1.0)) * 7.1 + uTempo * 3.1) * 0.025;
            return normalize(vec3(-d.x, 1.0, -d.y));
          }
          void main() {
            vec3 olho = cameraPosition - vMundo;
            float dist = length(olho);
            vec3 v = olho / dist;
            vec3 n = normalize(mix(normalOndas(vMundo.xz), vec3(0.0, 1.0, 0.0), smoothstep(60.0, 220.0, dist)));
            float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
            float fundura = smoothstep(0.0, 18.0, beira - vMundo.z);
            vec3 cor = mix(raso, fundo, fundura);
            cor = mix(cor, ceu, fresnel * 0.75);
            vec3 r = reflect(-v, n);
            float s = max(dot(r, dirSol), 0.0);
            cor += corSol * (pow(s, 180.0) * 7.0 + pow(s, 16.0) * 0.55);
            float espuma = smoothstep(1.6, 0.0, vMundo.z - beira + sin(vMundo.x * 0.4 + uTempo * 0.9) * 0.6 + sin(uTempo * 0.5) * 0.5);
            cor = mix(cor, vec3(1.0, 0.95, 0.9), espuma * 0.55);
            cor = mix(cor, horizonte, smoothstep(120.0, 420.0, dist));
            float alfa = smoothstep(beira + 1.2, beira - 0.4, vMundo.z) * 0.97;
            gl_FragColor = vec4(cor, alfa);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )
  useFrame(({ clock }) => {
    material.uniforms.uTempo.value = clock.elapsedTime
  })
  return (
    <mesh material={material} position={[0, NIVEL_MAR, -330]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[1400, 620, 1, 1]} />
    </mesh>
  )
}

/** A areia da praia (com dunas atrás) e os morros verdes na costa, lá longe */
// clareia a foto da areia até o dourado do pôr do sol (cor linear)
const AREIA = new Color(2.6, 2.6, 2.75)

export function Areia() {
  const geo = useMemo(() => {
    const g = new PlaneGeometry(260, 180, 160, 110)
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0, 40)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) p.setY(i, alturaAreia(p.getX(i), p.getZ(i)))
    g.computeVertexNormals()
    return g
  }, [])
  // areia de verdade (foto escaneada): cor + relevo, repetindo a cada 1,8 m
  const rep: [number, number] = [260 / 1.8, 180 / 1.8]
  return (
    <>
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial color={AREIA} map={texReal('dense_sand', 'diff', rep)} normalMap={texReal('dense_sand', 'nor', rep)} roughness={1} />
      </mesh>
      {/* costões verdes dos dois lados da baía */}
      {[
        [-190, -260, 90, 1.8],
        [-120, -300, 60, 2.2],
        [210, -240, 80, 2.0],
        [150, -320, 55, 2.4],
      ].map(([x, z, r, sx], i) => (
        <mesh key={i} position={[x, -r * 0.62, z]} scale={[sx, 0.85, 1]}>
          <sphereGeometry args={[r, 32, 16]} />
          <meshStandardMaterial color="#6E7F74" roughness={1} />
        </mesh>
      ))}
      {/* veleiro */}
      <group position={[46, NIVEL_MAR, -170]} rotation-y={0.4}>
        <mesh position-y={0.6}>
          <boxGeometry args={[6, 1.2, 1.8]} />
          <meshStandardMaterial color="#F4F0EA" />
        </mesh>
        <mesh position-y={6}>
          <cylinderGeometry args={[0.1, 0.1, 10, 6]} />
          <meshStandardMaterial color="#5A4A40" />
        </mesh>
        <mesh position={[1.3, 5.8, 0]}>
          <coneGeometry args={[2.3, 8.5, 3]} />
          <meshStandardMaterial color="#FFF4EC" emissive="#FFB38A" emissiveIntensity={0.3} />
        </mesh>
      </group>
    </>
  )
}
