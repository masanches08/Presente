import { Cloud, Clouds } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BackSide, BufferAttribute, CanvasTexture, Color, MeshBasicMaterial, PlaneGeometry, RepeatWrapping, ShaderMaterial, SRGBColorSpace, Vector3 } from 'three'
import { texReal } from '../lib/texturasReais'
import { urlNuvem } from '../mundo/texturas'
import { LUA, NOITE } from './noite'

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
          // a noite (parada dos fogos)
          noite: { value: 0 },
          dirLua: { value: LUA },
          nHorizonte: { value: new Color('#3B3A6E') },
          nMeio: { value: new Color('#1C2453') },
          nTopo: { value: new Color('#090E2B') },
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
          uniform float noite;
          uniform vec3 dirLua, nHorizonte, nMeio, nTopo;
          varying vec3 vDir;
          // estrelinhas: uma "grade" no céu, só algumas casas acendem
          float estrelas(vec3 d) {
            vec3 p = d * 90.0;
            vec3 i = floor(p);
            float h = fract(sin(dot(i, vec3(127.1, 311.7, 74.7))) * 43758.5453);
            float perto = smoothstep(0.16, 0.0, length(fract(p) - 0.5));
            return step(0.972, h) * perto * (0.45 + 0.55 * fract(h * 37.0));
          }
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
            // a noite: azul-marinho, um restinho de poente no horizonte, estrelas e o brilho da lua
            if (noite > 0.001) {
              vec3 n = mix(nHorizonte, nMeio, smoothstep(0.0, 0.22, h));
              n = mix(n, nTopo, smoothstep(0.2, 0.75, h));
              n += vec3(0.35, 0.16, 0.22) * ladoSol * (1.0 - smoothstep(0.0, 0.14, h));
              n += vec3(0.95, 0.95, 1.0) * estrelas(vDir) * smoothstep(0.03, 0.14, h);
              float l = max(dot(vDir, dirLua), 0.0);
              n += vec3(0.55, 0.6, 0.75) * (pow(l, 60.0) * 0.45 + pow(l, 14.0) * 0.08);
              c = mix(c, n, noite);
            }
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )
  const sol = useRef<MeshBasicMaterial>(null)
  const lua = useRef<MeshBasicMaterial>(null)
  useFrame(() => {
    const n = NOITE.valor
    material.uniforms.noite.value = n
    // o sol se põe de vez e a lua aparece
    if (sol.current) {
      sol.current.opacity = 1 - n
      sol.current.visible = n < 0.99
    }
    if (lua.current) lua.current.opacity = n
  })
  return (
    <>
      <mesh material={material} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[450, 48, 24]} />
      </mesh>
      {/* o sol, bem brilhante */}
      <mesh position={SOL.clone().multiplyScalar(400)} frustumCulled={false}>
        <sphereGeometry args={[13, 32, 16]} />
        <meshBasicMaterial ref={sol} color={[5, 3.6, 1.8]} toneMapped={false} fog={false} transparent />
      </mesh>
      {/* a lua (só aparece de noite) */}
      <mesh position={LUA.clone().multiplyScalar(400)} frustumCulled={false}>
        <sphereGeometry args={[8, 24, 12]} />
        <meshBasicMaterial ref={lua} color={[2.3, 2.28, 2.1]} toneMapped={false} fog={false} transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  )
}

/** Nuvens do fim de tarde, tingidas de rosa e dourado */
export function NuvensPorDoSol({ poucas, noite = false }: { poucas: boolean; noite?: boolean }) {
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
    <Clouds material={MeshBasicMaterial} texture={textura} limit={poucas ? 60 : 110}>
      {nuvens.map(([x, y, z, seed]) => (
        <Cloud key={seed} position={[x, y, z]} seed={seed} segments={poucas ? 7 : 12} bounds={[34, 4, 8]} volume={22} growth={5} speed={0.05} opacity={noite ? 0.3 : 0.55} color={noite ? '#4A5288' : '#FFD6C4'} />
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
        // (não grava profundidade: o reflexo dos fogos fica "embaixo" da água e tem que aparecer por cima dela)
        depthWrite: false,
        uniforms: {
          uTempo: { value: 0 },
          dirSol: { value: SOL },
          fundo: { value: new Color('#3C4A78') },
          raso: { value: new Color('#5C8DA6') },
          ceu: { value: new Color('#E9A3B0') },
          horizonte: { value: new Color('#F4B6A6') },
          corSol: { value: new Color('#FFC36B') },
          beira: { value: BEIRA },
          noite: { value: 0 },
          dirLua: { value: LUA },
          nFundo: { value: new Color('#0A1433') },
          nRaso: { value: new Color('#173A63') },
          nCeu: { value: new Color('#2A3266') },
          nHorizonte: { value: new Color('#2C2D5E') },
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
          uniform float uTempo, beira, noite;
          uniform vec3 dirSol, fundo, raso, ceu, horizonte, corSol;
          uniform vec3 dirLua, nFundo, nRaso, nCeu, nHorizonte;
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
            vec3 cor = mix(mix(raso, nRaso, noite), mix(fundo, nFundo, noite), fundura);
            cor = mix(cor, mix(ceu, nCeu, noite), fresnel * 0.75);
            vec3 r = reflect(-v, n);
            float s = max(dot(r, dirSol), 0.0);
            cor += corSol * (pow(s, 180.0) * 7.0 + pow(s, 16.0) * 0.55) * (1.0 - noite);
            // de noite: o caminho prateado da lua
            float sl = max(dot(r, dirLua), 0.0);
            cor += vec3(0.75, 0.8, 0.95) * (pow(sl, 220.0) * 3.0 + pow(sl, 24.0) * 0.18) * noite;
            // espuma: só uma faixinha na beira, indo e voltando (dentro do mar fica a cor da água)
            float d = beira - vMundo.z + sin(vMundo.x * 0.4 + uTempo * 0.9) * 0.6 + sin(uTempo * 0.5) * 0.5;
            float espuma = smoothstep(-0.3, 0.2, d) * (1.0 - smoothstep(0.3, 1.3, d));
            cor = mix(cor, mix(vec3(1.0, 0.95, 0.9), vec3(0.55, 0.62, 0.8), noite), espuma * 0.45);
            cor = mix(cor, mix(horizonte, nHorizonte, noite), smoothstep(120.0, 420.0, dist));
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
    material.uniforms.noite.value = NOITE.valor
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
        <meshStandardMaterial color={AREIA} map={texReal('dense_sand', 'diff', rep)} roughness={1} />
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

// ---------------- em volta da praia: morros de mata, costões de pedra e dunas com vegetação ----------------

/** Ruído suave (pra o relevo não ficar com cara de bolha) */
function ruido(x: number, z: number) {
  const h = (i: number, j: number) => {
    const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
    return n - Math.floor(n)
  }
  const i = Math.floor(x)
  const j = Math.floor(z)
  const fx = x - i
  const fz = z - j
  const u = fx * fx * (3 - 2 * fx)
  const v = fz * fz * (3 - 2 * fz)
  return h(i, j) * (1 - u) * (1 - v) + h(i + 1, j) * u * (1 - v) + h(i, j + 1) * (1 - u) * v + h(i + 1, j + 1) * u * v
}
function fbm(x: number, z: number, oitavas = 5) {
  let t = 0
  let a = 0.5
  let f = 1
  for (let o = 0; o < oitavas; o++) {
    t += ruido(x * f, z * f) * a
    f *= 2.03
    a *= 0.5
  }
  return t
}
const passo = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Altura do relevo em volta: embaixo da areia/do mar no meio; morros atrás e nas laterais; costões entrando no mar */
export function alturaArredores(x: number, z: number) {
  const n = fbm(x * 0.012 + 3.1, z * 0.012 + 7.7)
  const detalhe = fbm(x * 0.09, z * 0.09, 3) // as copas das árvores, de longe
  const ax = Math.abs(x)
  // atrás (lado oposto ao mar)
  const atras = passo(85, 200, z + (n - 0.5) * 40) * (22 + n * 44)
  // laterais da baía, que entram no mar e vão baixando até sumir (longe do enquadramento do pôr do sol)
  const lado = passo(84, 160, ax + (n - 0.5) * 36) * (24 + n * 40) * passo(-115, -55, z)
  const h = Math.max(atras, lado)
  return h > 0.5 ? h + detalhe * Math.min(1, h / 10) * 3.2 - 1.5 : -90
}

const C_DUNA = new Color('#9C9A5C')
const C_MATA_A = new Color('#4C7C3B')
const C_MATA_B = new Color('#6E9449')
const C_MATA_C = new Color('#3A6634')
const C_PEDRA = new Color('#9A8B7C')
const C_NEBLINA = new Color('#C9A3A0')

/** O relevo inteiro numa peça só (sem sombra; a luz do pôr do sol já dá o volume) */
export function Arredores() {
  const geo = useMemo(() => {
    const g = new PlaneGeometry(640, 560, 200, 176)
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0, 50)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) p.setY(i, alturaArredores(p.getX(i), p.getZ(i)))
    g.computeVertexNormals()
    const nrm = g.attributes.normal
    const cores = new Float32Array(p.count * 3)
    const c = new Color()
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const y = p.getY(i)
      const z = p.getZ(i)
      const manchas = fbm(x * 0.05 + 11, z * 0.05 - 4, 3)
      // mata: três verdes misturados em manchas
      c.copy(C_MATA_A).lerp(manchas > 0.55 ? C_MATA_B : C_MATA_C, Math.abs(manchas - 0.5) * 1.6)
      // pé dos morros: vegetação de duna (verde-oliva) se misturando com a areia
      c.lerp(C_DUNA, 1 - passo(3, 9, y))
      // pedra: onde é íngreme e perto do mar (os costões)
      const ingreme = 1 - nrm.getY(i)
      const pedra = Math.max(passo(0.45, 0.7, ingreme), passo(-18, -30, z) * (1 - passo(0.5, 4, y))) * 0.85
      c.lerp(C_PEDRA, Math.min(1, pedra))
      // longe: vai clareando e ficando rosado (o ar do fim de tarde)
      c.lerp(C_NEBLINA, passo(120, 330, Math.hypot(x, z - 10)) * 0.75)
      cores.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new BufferAttribute(cores, 3))
    return g
  }, [])
  // copas das árvores de pertinho (uma imagenzinha repetida a cada 14 m, multiplicando as cores)
  const copas = useMemo(() => {
    const t = texCopas()
    t.repeat.set(640 / 14, 560 / 14)
    return t
  }, [])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial vertexColors map={copas} roughness={1} />
    </mesh>
  )
}

/** Copas de árvore vistas de cima (bolinhas claras com a sombra em baixo), emendando nas bordas */
function texCopas() {
  const N = 256
  const c = document.createElement('canvas')
  c.width = c.height = N
  const g = c.getContext('2d')!
  g.fillStyle = '#8E9E84'
  g.fillRect(0, 0, N, N)
  let semente = 7
  const r = () => ((semente = (semente * 16807) % 2147483647) - 1) / 2147483646
  for (let i = 0; i < 230; i++) {
    const x = r() * N
    const y = r() * N
    const raio = 9 + r() * 15
    for (const [dx, dy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) {
      const cx = x + dx
      const cy = y + dy
      if (cx < -raio || cx > N + raio || cy < -raio || cy > N + raio) continue
      const gr = g.createRadialGradient(cx - raio * 0.3, cy - raio * 0.35, raio * 0.1, cx, cy, raio)
      gr.addColorStop(0, '#FFFFFF')
      gr.addColorStop(0.55, '#D3DDC9')
      gr.addColorStop(1, 'rgba(110,128,100,0.9)')
      g.fillStyle = gr
      g.beginPath()
      g.arc(cx, cy, raio, 0, Math.PI * 2)
      g.fill()
    }
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}
