import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  MeshStandardMaterial,
  ShaderMaterial,
  Vector3,
  type Group,
  type PerspectiveCamera,
  type Sprite,
  type SpriteMaterial,
} from 'three'
import { alturaAreia } from './Ambiente'
import { CAPELA } from './montar'

// O segredo 3 da lua de mel saindo do sino da capela (a primeira vez que ele badala com força):
// um clarão dourado sai do sino, um anel de faíscas se abre no céu, uma chuva de purpurina dourada
// cai girando em volta da capela, e uma cartinha brilhando aparece no campanário e desce em espiral,
// balançando como papel, até parar bem na frente da câmera. Aí abre a cartinha (CartinhaCafe).

const N = 420
const DESCER = 3.6 // segundos da cartinha descendo

function texBrilho() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, 'rgba(255,255,255,1)')
  r.addColorStop(0.25, 'rgba(255,230,170,0.6)')
  r.addColorStop(1, 'rgba(255,200,120,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 64, 64)
  return new CanvasTexture(c)
}

export function RevelacaoCafe({ onChegou }: { onChegou: () => void }) {
  const { camera, gl, size } = useThree()
  const y0 = alturaAreia(CAPELA.x, CAPELA.z) + 0.38
  const sino = useMemo(() => new Vector3(CAPELA.x, y0 + 5.9, CAPELA.z + 5.1), [y0])
  const brilho = useMemo(() => texBrilho(), [])
  const clarao = useRef<Sprite>(null)
  const carta = useRef<Group>(null)
  const auraCarta = useRef<Sprite>(null)
  const t0 = useRef(-1)
  const chegou = useRef(false)
  // onde a cartinha para: bem na frente da câmera (guardado no começo, a câmera está parada)
  const fim = useMemo(() => {
    const d = new Vector3()
    camera.getWorldDirection(d)
    return camera.position.clone().addScaledVector(d, 1.7).add(new Vector3(0, -0.15, 0))
  }, [camera])

  // a purpurina dourada e o anel de faíscas
  const p = useMemo(() => {
    const geo = new BufferGeometry()
    const pos = new Float32Array(N * 3)
    const tam = new Float32Array(N)
    const alfa = new Float32Array(N)
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    geo.setAttribute('tam', new BufferAttribute(tam, 1))
    geo.setAttribute('alfa', new BufferAttribute(alfa, 1))
    // cada uma: ângulo, raio, altura de começo, velocidade de queda, fase
    const sem = Array.from({ length: N }, (_, i) => ({ anel: i < 120, a: Math.random() * Math.PI * 2, r: 0.5 + Math.random() * 4.5, h: Math.random() * 3, v: 0.5 + Math.random() * 0.8, f: Math.random() * 10 }))
    return { geo, pos, tam, alfa, sem }
  }, [])
  const matP = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { escala: { value: 700 } },
        vertexShader: /* glsl */ `
          attribute float tam;
          attribute float alfa;
          uniform float escala;
          varying float vAlfa;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = tam * escala / max(1.0, -mv.z);
            vAlfa = alfa;
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vAlfa;
          void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            float a = 1.0 - smoothstep(0.0, 1.0, d);
            gl_FragColor = vec4(vec3(1.0, 0.82, 0.45) * a * a * vAlfa * 1.6 + vec3(1.0) * smoothstep(0.35, 0.0, d) * vAlfa * 0.5, 1.0);
          }
        `,
      }),
    [],
  )

  // o envelope: papel creme, a aba, o selo de cera vermelho (os dois lados)
  const mats = useMemo(
    () => ({
      papel: new MeshStandardMaterial({ color: '#F6EEDC', emissive: '#FFE2A6', emissiveIntensity: 0.6, roughness: 0.9, side: DoubleSide }),
      aba: new MeshStandardMaterial({ color: '#ECE0C6', emissive: '#FFE2A6', emissiveIntensity: 0.4, roughness: 0.9, side: DoubleSide }),
      selo: new MeshStandardMaterial({ color: '#B3322A', emissive: '#7A1A14', emissiveIntensity: 0.5, roughness: 0.5 }),
    }),
    [],
  )

  useEffect(() => {
    t0.current = -1
  }, [])

  const tmp = useMemo(() => new Vector3(), [])
  useFrame(({ clock }) => {
    if (t0.current < 0) t0.current = clock.elapsedTime
    const t = clock.elapsedTime - t0.current
    matP.uniforms.escala.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan(((camera as PerspectiveCamera).fov * Math.PI) / 360))

    // o clarão no sino: cresce rápido e apaga devagar
    const c = clarao.current
    if (c) {
      const k = t < 0.35 ? t / 0.35 : Math.max(0, 1 - (t - 0.35) / 2.2)
      c.scale.setScalar(1 + 9 * Math.min(1, t / 0.5))
      ;(c.material as SpriteMaterial).opacity = k
    }

    // o anel abrindo e a purpurina caindo em redemoinho
    for (let i = 0; i < N; i++) {
      const s = p.sem[i]
      const j = i * 3
      if (s.anel) {
        const r = Math.min(1, t / 1.2) * (5 + s.r * 0.3)
        const a = s.a + t * 0.6
        p.pos[j] = sino.x + Math.cos(a) * r
        p.pos[j + 1] = sino.y + Math.sin(a * 3 + s.f) * 0.3 - t * 0.4
        p.pos[j + 2] = sino.z + Math.sin(a) * r
        p.alfa[i] = Math.max(0, 1 - t / 2.4)
        p.tam[i] = 0.16
      } else {
        const tt = t - 0.3 - s.h * 0.4
        if (tt < 0) {
          p.alfa[i] = 0
          continue
        }
        const a = s.a + tt * (1.2 + s.v)
        const r = s.r * (1 + tt * 0.15)
        p.pos[j] = sino.x + Math.cos(a) * r
        p.pos[j + 1] = sino.y + 1 - tt * s.v * 1.3
        p.pos[j + 2] = sino.z - 1 + Math.sin(a) * r
        p.alfa[i] = Math.max(0, Math.min(1, tt * 3) * (1 - tt / 6)) * (0.6 + 0.4 * Math.sin(tt * 14 + s.f))
        p.tam[i] = 0.1
      }
    }
    p.geo.attributes.position.needsUpdate = true
    ;(p.geo.attributes.alfa as BufferAttribute).needsUpdate = true
    ;(p.geo.attributes.tam as BufferAttribute).needsUpdate = true

    // a cartinha: aparece no sino e desce em espiral até a frente da câmera
    const g = carta.current
    if (g) {
      const u = Math.max(0, Math.min(1, (t - 0.8) / DESCER))
      g.visible = t > 0.8 && !chegou.current
      const e = 1 - Math.pow(1 - u, 2.2)
      tmp.lerpVectors(sino, fim, e)
      const gira = (1 - u) * 1.6
      tmp.x += Math.sin(u * Math.PI * 3) * gira
      tmp.z += Math.cos(u * Math.PI * 3) * gira * 0.6
      g.position.copy(tmp)
      // balança como papel e, no fim, fica de frente pra câmera
      g.quaternion.copy(camera.quaternion)
      g.rotateZ(Math.sin(t * 3.2) * 0.35 * (1 - u))
      g.rotateX(Math.sin(t * 2.3) * 0.5 * (1 - u))
      g.scale.setScalar(Math.min(1, (t - 0.8) * 3) * (0.6 + 0.4 * u))
      if (auraCarta.current) (auraCarta.current.material as SpriteMaterial).opacity = 0.45 + 0.25 * Math.sin(t * 5)
      if (u >= 1 && !chegou.current) {
        // chegou na frente da câmera: some daqui e abre a cartinha de verdade na tela
        chegou.current = true
        onChegou()
      }
    }
  })

  return (
    <>
      <sprite ref={clarao} position={sino}>
        <spriteMaterial map={brilho} color={new Color(1.4, 1.1, 0.7)} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} opacity={0} />
      </sprite>
      <points geometry={p.geo} material={matP} frustumCulled={false} />
      <group ref={carta} visible={false}>
        <sprite ref={auraCarta} scale={1.3} renderOrder={-1}>
          <spriteMaterial map={brilho} color="#FFC96B" transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} opacity={0.5} />
        </sprite>
        <mesh material={mats.papel}>
          <planeGeometry args={[0.5, 0.34]} />
        </mesh>
        <mesh material={mats.aba} position={[0, 0.03, 0.002]} rotation-z={Math.PI}>
          <circleGeometry args={[0.26, 3, Math.PI / 2]} />
        </mesh>
        <mesh material={mats.selo} position={[0, -0.04, 0.006]}>
          <circleGeometry args={[0.055, 18]} />
        </mesh>
      </group>
    </>
  )
}
