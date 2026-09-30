import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { NeutralToneMapping } from 'three'

// Tudo que deixa o 3D leve, igual em todas as cenas:
// - nada de pós-processamento (cada efeito redesenhava a tela inteira de novo, todo quadro)
// - resolução contida (a tela do celular tem pixel demais: 1,25x já fica nítido)
// - sombra "congelada": só é redesenhada quando algo muda de lugar

export const ehCelular = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

/** Resolução inicial do 3D (baixa sozinha se o aparelho sofrer) */
export const dprInicial = () => Math.min(window.devicePixelRatio || 1, ehCelular() ? 1.25 : 1.5)

/** Configuração do WebGL: tom de cor "neutro" direto no desenho (sem passada extra) */
export const GL_LEVE = { antialias: true, powerPreference: 'high-performance', toneMapping: NeutralToneMapping } as const

/** O "acabamento" que antes era efeito 3D, agora feito pelo navegador (de graça): cor mais viva */
export const CLASSE_CANVAS = '[&_canvas]:[filter:saturate(1.14)]'

/** Bordas levemente escurecidas (vinheta), por cima do 3D */
export function Vinheta({ forca = 0.28 }: { forca?: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ background: `radial-gradient(ellipse at center, transparent 55%, rgb(20 14 8 / ${forca}) 100%)` }}
      aria-hidden
    />
  )
}

/**
 * Sombra congelada: a cena é parada, então a sombra só precisa ser desenhada de novo
 * nos primeiros segundos (enquanto as coisas carregam) e quando `chave` muda.
 */
export function SombraCongelada({ chave }: { chave?: unknown }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    return () => {
      gl.shadowMap.autoUpdate = true
    }
  }, [gl])
  useEffect(() => {
    let n = 0
    gl.shadowMap.needsUpdate = true
    const id = window.setInterval(() => {
      gl.shadowMap.needsUpdate = true
      if (++n >= 16) window.clearInterval(id)
    }, 250)
    return () => window.clearInterval(id)
  }, [gl, chave])
  return null
}

/** Com ?debug no endereço, mostra no console quantos desenhos/triângulos a cena faz (pra medir o peso) */
export function MedidorDebug() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('debug')) return
    ;(window as unknown as { __gl?: unknown[] }).__gl = [...((window as unknown as { __gl?: unknown[] }).__gl ?? []), gl]
  }, [gl])
  return null
}

/** Quantos quadros por segundo desenhar: no celular, 30 (fica suave e esquenta/gasta bem menos bateria) */
export const fpsAlvo = () => (ehCelular() ? 30 : 60)

/**
 * Quem manda desenhar cada quadro (o Canvas fica com frameloop="never"): no máximo `fps` por segundo.
 * Tudo continua andando (vento, câmera, pássaros), só que desenhando menos vezes.
 * `ativo = false` para de desenhar (ex.: quando uma página cobre o 3D).
 */
export function LimiteFps({ fps = fpsAlvo(), ativo = true }: { fps?: number; ativo?: boolean }) {
  const advance = useThree((s) => s.advance)
  const clock = useThree((s) => s.clock)
  useEffect(() => {
    if (!ativo) return
    let id = 0
    let ultimo = -Infinity
    let t0 = -1
    const inicio = clock.elapsedTime // o relógio continua de onde parou
    const intervalo = 1000 / fps - 2
    const loop = (t: number) => {
      id = requestAnimationFrame(loop)
      if (t0 < 0) t0 = t
      if (t - ultimo < intervalo) return
      ultimo = t
      advance(inicio + (t - t0) / 1000)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [fps, ativo, advance, clock])
  return null
}
