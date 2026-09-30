import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BackSide, Color, ShaderMaterial, type Group } from 'three'
import { SOL_TROPICAL } from './Agua'

/** Céu tropical de dia: azul bem forte lá em cima, clarinho no horizonte, com o brilho do sol */
export function CeuTropical({ seguir = true }: { seguir?: boolean }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          topo: { value: new Color('#2C6FCB') },
          meio: { value: new Color('#80BCEB') },
          horizonte: { value: new Color('#E2F1F7') },
          dirSol: { value: SOL_TROPICAL },
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
          uniform vec3 topo, meio, horizonte, dirSol;
          varying vec3 vDir;
          void main() {
            float h = max(vDir.y, -0.05);
            vec3 c = mix(horizonte, meio, smoothstep(0.0, 0.25, h));
            c = mix(c, topo, smoothstep(0.25, 1.0, h));
            float s = max(dot(vDir, dirSol), 0.0);
            c += vec3(1.0, 0.97, 0.9) * (pow(s, 12.0) * 0.25 + pow(s, 300.0) * 2.0);
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )
  // o céu acompanha a câmera (os cenários ficam longe uns dos outros)
  const ref = useRef<Group>(null)
  useFrame(({ camera }) => {
    if (seguir && ref.current) ref.current.position.copy(camera.position)
  })
  return (
    <group ref={ref}>
      <mesh material={material} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[900, 48, 24]} />
      </mesh>
    </group>
  )
}
