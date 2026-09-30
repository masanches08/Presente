import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { Color, ShaderMaterial, Vector3, Vector4 } from 'three'

export const SOL_TROPICAL = new Vector3(0.32, 0.78, 0.54).normalize()

const RUIDO = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float ruido(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * ruido(p); p *= 2.03; a *= 0.5; } return v; }
  // linhas de luz no fundo (cáusticas)
  float causticas(vec2 p, float t) {
    float a = sin(p.x * 1.7 + sin(p.y * 1.3 + t * 0.8) * 1.5 + t * 0.5);
    float b = sin(p.y * 1.9 + sin(p.x * 1.1 - t * 0.6) * 1.4 - t * 0.45);
    return pow(1.0 - abs(a * b), 10.0);
  }
`

interface MarProps {
  centro: [number, number]
  tamanho?: number
  /** Ilhas/bancos de areia: [x, z, raio] — a água fica rasinha e clara em volta */
  ilhas?: ([number, number, number] | [number, number, number, number])[]
  cores?: { raso: string; medio: string; fundo: string }
}

/** Mar tropical: turquesa bem clarinho no raso, azul-safira no fundo, com recifes e o brilho do sol */
export function MarTurquesa({ centro, tamanho = 1300, ilhas = [], cores = { raso: '#7FF0E0', medio: '#1EC4C9', fundo: '#0A62A8' } }: MarProps) {
  const mat = useMemo(() => {
    const lista = [...ilhas, ...Array(4).fill([0, 0, -1, 0])].slice(0, 4).map(([x, z, r, e]) => new Vector4(x, z, r, e ?? 0))
    return new ShaderMaterial({
      uniforms: {
        uTempo: { value: 0 },
        dirSol: { value: SOL_TROPICAL },
        raso: { value: new Color(cores.raso) },
        medio: { value: new Color(cores.medio) },
        fundo: { value: new Color(cores.fundo) },
        ceu: { value: new Color('#BFE3FF') },
        horizonte: { value: new Color('#D6EEF8') },
        ilhas: { value: lista },
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
        uniform vec3 dirSol, raso, medio, fundo, ceu, horizonte;
        uniform vec4 ilhas[4];
        varying vec3 vMundo;
        ${RUIDO}
        vec3 normalOndas(vec2 p) {
          vec2 d = vec2(0.0);
          d += vec2(0.7, 0.7) * cos(dot(p, vec2(0.7, 0.7)) * 0.8 + uTempo * 1.2) * 0.06;
          d += vec2(-0.6, 0.8) * cos(dot(p, vec2(-0.6, 0.8)) * 1.9 + uTempo * 1.8) * 0.04;
          d += vec2(0.95, -0.3) * cos(dot(p, vec2(0.95, -0.3)) * 4.1 + uTempo * 2.6) * 0.025;
          d += vec2(-0.2, -1.0) * cos(dot(p, vec2(-0.2, -1.0)) * 8.7 + uTempo * 3.4) * 0.015;
          return normalize(vec3(-d.x, 1.0, -d.y));
        }
        void main() {
          vec3 olho = cameraPosition - vMundo;
          float dist = length(olho);
          vec3 v = olho / dist;
          vec3 n = normalize(mix(normalOndas(vMundo.xz), vec3(0.0, 1.0, 0.0), smoothstep(80.0, 400.0, dist)));

          // quão fundo é aqui: manchas de recife + raso perto das ilhas
          float prof = smoothstep(0.3, 0.75, fbm(vMundo.xz * 0.012));
          float perto = 0.0;
          for (int i = 0; i < 4; i++) {
            if (ilhas[i].z < 0.0) continue;
            float d = length(vMundo.xz - ilhas[i].xy) - ilhas[i].z;
            perto = max(perto, 1.0 - smoothstep(0.0, 45.0, d));
          }
          prof = clamp(prof * (1.0 - perto) + 0.15 * (1.0 - perto), 0.0, 1.0);
          vec3 cor = mix(raso, medio, smoothstep(0.0, 0.45, prof));
          cor = mix(cor, fundo, smoothstep(0.45, 1.0, prof));
          // recifes escurinhos embaixo d'água
          cor *= 1.0 - 0.18 * smoothstep(0.55, 0.8, fbm(vMundo.xz * 0.09 + 3.0)) * (1.0 - prof);
          // desenho de luz no fundo, só onde é raso e perto da câmera
          float c = causticas(vMundo.xz * 0.35, uTempo) + 0.6 * causticas(vMundo.xz * 0.6 + 7.0, uTempo * 1.2);
          cor += vec3(0.9, 1.0, 1.0) * c * 0.22 * (1.0 - prof) * (1.0 - smoothstep(20.0, 120.0, dist));
          // o céu refletido e o brilho do sol
          float fresnel = pow(1.0 - max(dot(n, v), 0.0), 4.0);
          cor = mix(cor, ceu, fresnel * 0.6);
          vec3 r = reflect(-v, n);
          float s = max(dot(r, dirSol), 0.0);
          cor += vec3(1.0, 0.98, 0.9) * (pow(s, 400.0) * 5.0 + pow(s, 40.0) * 0.18);
          // espuma branquinha onde bate na areia
          for (int i = 0; i < 4; i++) {
            if (ilhas[i].z < 0.0 || ilhas[i].w < 0.5) continue;
            float d = length(vMundo.xz - ilhas[i].xy) - ilhas[i].z;
            float esp = smoothstep(2.5, 0.0, abs(d - 0.8 + sin(uTempo * 0.9 + vMundo.x * 0.3) * 0.6));
            cor = mix(cor, vec3(1.0), esp * 0.55);
          }
          cor = mix(cor, horizonte, smoothstep(250.0, 650.0, dist));
          gl_FragColor = vec4(cor, 1.0);
          #include <colorspace_fragment>
        }
      `,
    })
  }, [ilhas, cores])
  useFrame(({ clock }) => {
    mat.uniforms.uTempo.value = clock.elapsedTime
  })
  return (
    <mesh material={mat} position={[centro[0], 0, centro[1]]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[tamanho, tamanho, 1, 1]} />
    </mesh>
  )
}

interface LagoProps {
  pos: [number, number, number]
  larg: number
  prof: number
  cor?: string
  /** 0 = transparente (mostra o reflexo); 1 = opaco */
  opacidade?: number
  circulo?: boolean
}

/**
 * Água parada de lago: por baixo dela fica uma "cópia de cabeça pra baixo" do cenário (o reflexo).
 * A água é meio transparente, com ondinhas bem suaves e mais espelhada de longe.
 */
export function AguaParada({ pos, larg, prof, cor = '#6F97A6', opacidade = 0.5, circulo = false }: LagoProps) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTempo: { value: 0 }, cor: { value: new Color(cor) }, opacidade: { value: opacidade }, dirSol: { value: SOL_TROPICAL } },
        vertexShader: /* glsl */ `
          varying vec3 vMundo;
          void main() {
            vec4 p = modelMatrix * vec4(position, 1.0);
            vMundo = p.xyz;
            gl_Position = projectionMatrix * viewMatrix * p;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTempo, opacidade;
          uniform vec3 cor, dirSol;
          varying vec3 vMundo;
          ${RUIDO}
          void main() {
            vec3 v = normalize(cameraPosition - vMundo);
            float fresnel = pow(1.0 - max(v.y, 0.0), 3.0);
            // ondinhas: linhas claras bem finas
            float o = ruido(vMundo.xz * vec2(0.6, 2.2) + vec2(uTempo * 0.15, uTempo * 0.05));
            float linha = smoothstep(0.72, 0.8, o) * 0.18;
            vec3 c = cor + linha;
            float s = pow(max(dot(reflect(-v, vec3(0.0, 1.0, 0.0)), dirSol), 0.0), 200.0);
            c += vec3(1.0) * s * 2.0;
            float a = clamp(opacidade + fresnel * 0.25 - 0.18 * (1.0 - fresnel), 0.0, 0.95);
            gl_FragColor = vec4(c, a);
            #include <colorspace_fragment>
          }
        `,
      }),
    [cor, opacidade],
  )
  useFrame(({ clock }) => {
    mat.uniforms.uTempo.value = clock.elapsedTime
  })
  return (
    <mesh material={mat} position={pos} rotation-x={-Math.PI / 2} renderOrder={2}>
      {circulo ? <circleGeometry args={[larg / 2, 64]} /> : <planeGeometry args={[larg, prof]} />}
    </mesh>
  )
}
