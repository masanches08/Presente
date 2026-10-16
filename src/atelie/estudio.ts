import {
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type Texture,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { Vestido } from './modelo'
import { descartar, montarManequim, montarVestido } from './vestido3d'

// O "estúdio" do Ateliê: a luz (um ambiente de sala clarinha, feito na hora — nada pra baixar),
// o manequim de porcelana, o pedestal e a sombrinha no chão. Serve pra tela grande e pras miniaturas.

/** Manequim de costureira, forrado de linho cinza-areia (frio, pra o branco do vestido se destacar e dar pra ver onde o tecido termina) */
export const materialManequim = () => new MeshPhysicalMaterial({ color: '#CBC5BE', roughness: 0.8, sheen: 0.45, sheenRoughness: 0.6, sheenColor: '#F2EEEA' })

/** A luz do ambiente (reflexos suaves no cetim, nas pérolas e nos cristais) */
export function ambienteDeSala(gl: WebGLRenderer): Texture {
  const pmrem = new PMREMGenerator(gl)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.035).texture
  pmrem.dispose()
  return env
}

/** Luz principal (de cima, da frente-esquerda), uma de recorte atrás e o céu/chão quentinho */
export function luzes() {
  const g = new Group()
  const chave = new DirectionalLight('#FFF4EA', 2.3)
  chave.position.set(-2.2, 4, 3)
  const recorte = new DirectionalLight('#FFE8F0', 1.1)
  recorte.position.set(2.5, 2.6, -3)
  const preenche = new DirectionalLight('#F4F1FF', 0.45)
  preenche.position.set(3, 1.2, 2)
  g.add(chave, recorte, preenche, new HemisphereLight('#FFFFFF', '#D9C3B3', 0.25))
  return g
}

let texSombra: Texture | null = null
const sombra = () => {
  if (texSombra) return texSombra
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, 'rgba(70,45,35,0.42)')
  gr.addColorStop(0.45, 'rgba(70,45,35,0.16)')
  gr.addColorStop(1, 'rgba(70,45,35,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 128, 128)
  texSombra = new CanvasTexture(c)
  texSombra.colorSpace = SRGBColorSpace
  return texSombra
}

/** O tablado redondo (mármore clarinho, borda dourada: cabe até a cauda real) e a sombra embaixo do vestido */
export function pedestal() {
  const g = new Group()
  const marmore = new MeshPhysicalMaterial({ color: '#F6F1EA', roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.25 })
  const ouro = new MeshStandardMaterial({ color: '#D6B77E', metalness: 0.85, roughness: 0.3 })
  const base = new Mesh(new CylinderGeometry(2.9, 2.94, 0.05, 96), marmore)
  base.position.y = -0.025
  const friso = new Mesh(new CylinderGeometry(2.945, 2.945, 0.012, 96, 1, true), ouro)
  friso.position.y = -0.006
  const s = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: sombra(), transparent: true, depthWrite: false, toneMapped: false }))
  s.rotation.x = -Math.PI / 2
  s.position.y = 0.002
  s.scale.set(1.9, 1.9, 1)
  s.renderOrder = 1
  g.add(base, friso, s)
  return g
}

// ---------------- miniaturas (as fotinhas da galeria) ----------------

const cache = new Map<string, string>()
let renderizador: WebGLRenderer | null = null
let cena: Scene | null = null
let camera: PerspectiveCamera | null = null
let fila: Promise<unknown> = Promise.resolve()

export const chaveDe = (v: Vestido) => JSON.stringify(v)
export const miniaturaPronta = (v: Vestido) => cache.get(chaveDe(v))

function preparar() {
  if (renderizador) return
  const r = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  r.setPixelRatio(1)
  r.setSize(300, 420, false)
  r.toneMapping = NeutralToneMapping
  r.outputColorSpace = SRGBColorSpace
  renderizador = r
  cena = new Scene()
  cena.environment = ambienteDeSala(r)
  cena.environmentIntensity = 0.38
  cena.add(luzes(), pedestal(), montarManequim(materialManequim()))
  camera = new PerspectiveCamera(30, 300 / 420, 0.05, 30)
}

/** A fotinha de um vestido (de 3/4, pra aparecer a cauda). Uma de cada vez, pra não travar a tela. */
export function miniatura(v: Vestido): Promise<string> {
  const k = chaveDe(v)
  const pronta = cache.get(k)
  if (pronta) return Promise.resolve(pronta)
  const p = fila.then(
    () =>
      new Promise<string>((ok) => {
        // espera um respiro (a tela continua lisinha enquanto as fotinhas vão saindo)
        const fazer = () => {
          preparar()
          const ja = cache.get(k)
          if (ja) return ok(ja)
          const vest = montarVestido(v)
          cena!.add(vest)
          const longa = v.cauda === 'real' || v.cauda === 'catedral' || v.veu === 'catedral'
          camera!.position.set(1.55, 1.25, longa ? 4.6 : 4.0)
          camera!.lookAt(0, longa ? 0.72 : 0.8, longa ? -0.35 : 0)
          renderizador!.render(cena!, camera!)
          const url = renderizador!.domElement.toDataURL('image/webp', 0.86)
          cena!.remove(vest)
          descartar(vest)
          cache.set(k, url)
          ok(url)
        }
        const ric = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void }).requestIdleCallback
        if (ric) ric(fazer, { timeout: 120 })
        else setTimeout(fazer, 16)
      }),
  )
  fila = p
  return p
}

/** Ao fechar o Ateliê: solta o renderizador das miniaturas (as fotinhas prontas ficam guardadas) */
export function liberarMiniaturas() {
  if (!renderizador) return
  cena?.traverse((o) => {
    const m = o as Mesh
    m.geometry?.dispose()
  })
  cena?.environment?.dispose()
  renderizador.dispose()
  renderizador.forceContextLoss()
  renderizador = null
  cena = null
  camera = null
}
