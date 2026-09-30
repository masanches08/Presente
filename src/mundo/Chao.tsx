import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { Color, Float32BufferAttribute, PlaneGeometry, ShaderMaterial } from 'three'
import { DIRECAO_SOL } from './cores'
import { altura, ehGramado, fatorCosta, fbm, NIVEL_MAR } from './terreno'
import { texChao } from './texturas'

const TAMANHO = 320

/** O chão: campo verde bem vivo, que vira areia perto do mar. */
export function Chao({ detalhe = 220 }: { detalhe?: number }) {
  const geo = useMemo(() => {
    const g = new PlaneGeometry(TAMANHO, TAMANHO, detalhe, detalhe)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    const cores: number[] = []
    const c = new Color()
    const verdeEscuro = new Color('#3E7D22')
    const verde = new Color('#5FA832')
    const verdeClaro = new Color('#8CC63F')
    const amarelado = new Color('#A9C94A')
    const areia = new Color('#F2D9A0')
    const areiaMolhada = new Color('#C9A56E')
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = altura(x, z)
      pos.setY(i, y)
      // manchas de verde (como um gramado de verdade, que nunca é de uma cor só)
      const n = fbm(x * 0.08, z * 0.08, 3)
      const m = fbm(x * 0.025 + 40, z * 0.025, 2)
      c.copy(verde).lerp(verdeEscuro, Math.max(0, 0.55 - n) * 1.4).lerp(verdeClaro, Math.max(0, n - 0.5) * 1.6)
      c.lerp(amarelado, Math.max(0, m - 0.6) * 1.5)
      // gramado aparado: verde mais uniforme
      if (ehGramado(x, z)) c.lerp(verde, 0.55)
      // praia
      const t = fatorCosta(x, z)
      if (t > 0.01) c.lerp(areia, Math.min(1, (t - 0.01) * 22))
      if (y < NIVEL_MAR + 0.25) c.lerp(areiaMolhada, Math.min(1, (NIVEL_MAR + 0.25 - y) * 3))
      cores.push(c.r, c.g, c.b)
    }
    g.setAttribute('color', new Float32BufferAttribute(cores, 3))
    g.computeVertexNormals()
    return g
  }, [detalhe])

  const detalheChao = useMemo(() => {
    const t = texChao().clone()
    t.repeat.set(TAMANHO / 3, TAMANHO / 3)
    t.needsUpdate = true
    return t
  }, [])

  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors map={detalheChao} roughness={0.95} />
    </mesh>
  )
}

/** O mar: azul vivo, com o caminho de brilho do sol e ondinhas. */
export function Mar() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        uniforms: {
          uTempo: { value: 0 },
          dirSol: { value: DIRECAO_SOL },
          fundo: { value: new Color('#0F6FA8') },
          raso: { value: new Color('#38C4C9') },
          reflexo: { value: new Color('#BFE3FA') },
          horizonte: { value: new Color('#CFE4F2') },
          horizonteSol: { value: new Color('#FFE9CF') },
          corSol: { value: new Color('#FFE0A0') },
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
          uniform float uTempo;
          uniform vec3 dirSol, fundo, raso, reflexo, horizonte, horizonteSol, corSol;
          varying vec3 vMundo;

          // normal das ondinhas: soma de ondas em várias direções
          vec3 normalOndas(vec2 p) {
            vec2 d = vec2(0.0);
            d += vec2(0.8, 0.6) * cos(dot(p, vec2(0.8, 0.6)) * 0.9 + uTempo * 1.3) * 0.10;
            d += vec2(-0.5, 0.9) * cos(dot(p, vec2(-0.5, 0.9)) * 1.7 + uTempo * 1.9) * 0.06;
            d += vec2(0.2, -1.0) * cos(dot(p, vec2(0.2, -1.0)) * 3.1 + uTempo * 2.6) * 0.04;
            d += vec2(-0.9, -0.3) * cos(dot(p, vec2(-0.9, -0.3)) * 6.3 + uTempo * 3.4) * 0.025;
            return normalize(vec3(-d.x, 1.0, -d.y));
          }

          void main() {
            vec3 olho = cameraPosition - vMundo;
            float dist = length(olho);
            vec3 v = olho / dist;
            vec3 n = normalOndas(vMundo.xz);
            n = normalize(mix(n, vec3(0.0, 1.0, 0.0), smoothstep(40.0, 160.0, dist)));

            float fresnel = pow(1.0 - max(dot(n, v), 0.0), 4.0);
            float perto = smoothstep(0.0, 16.0, vMundo.x - 47.0); // mais raso na beira
            vec3 cor = mix(raso, fundo, perto);
            cor = mix(cor, reflexo, fresnel * 0.85);

            // brilho do sol na água
            vec3 r = reflect(-v, n);
            float s = max(dot(r, dirSol), 0.0);
            cor += corSol * (pow(s, 280.0) * 6.0 + pow(s, 24.0) * 0.35);

            // espuma na beirinha
            float espuma = smoothstep(50.5, 47.0, vMundo.x + sin(vMundo.z * 0.35 + uTempo * 0.8) * 1.2);
            cor = mix(cor, vec3(1.0), espuma * 0.5 * (0.6 + 0.4 * sin(uTempo * 1.2 + vMundo.z)));

            // bruma no horizonte
            float ladoSol = pow(max(dot(normalize(-v.xz), normalize(dirSol.xz)), 0.0), 12.0);
            cor = mix(cor, mix(horizonte, horizonteSol, ladoSol * 0.8), smoothstep(80.0, 300.0, dist));
            gl_FragColor = vec4(cor, 0.96);
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
    <mesh material={material} position={[300, NIVEL_MAR, 0]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[540, 900, 1, 1]} />
    </mesh>
  )
}
