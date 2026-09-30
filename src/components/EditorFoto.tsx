import { motion } from 'framer-motion'
import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import type { Fonte, Recorte } from '../lib/prepararFoto'

interface Vista {
  zoom: number
  x: number
  y: number
}

const ZOOM_MAX = 4

/**
 * Escolher o recorte da foto nova: a moldura é a própria polaroid (3:4).
 * Arrasta pra mudar o enquadramento, pinça (ou a barrinha) pra aproximar.
 */
export function EditorFoto({
  fonte,
  naNuvem,
  onCancelar,
  onGuardar,
}: {
  fonte: Fonte
  naNuvem: boolean
  onCancelar: () => void
  onGuardar: (recorte: Recorte, legenda: string) => Promise<void>
}) {
  const moldura = useRef<HTMLDivElement>(null)
  const [tam, setTam] = useState({ w: 0, h: 0 })
  const [vista, setVista] = useState<Vista>({ zoom: 1, x: 0, y: 0 })
  const [legenda, setLegenda] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const dedos = useRef(new Map<number, { x: number; y: number }>())

  // escala que faz a foto cobrir a moldura inteira (sem sobrar borda)
  const escalaBase = tam.w ? Math.max(tam.w / fonte.largura, tam.h / fonte.altura) : 1

  /** mantém a moldura sempre coberta pela foto */
  const prender = useCallback(
    (v: Vista): Vista => {
      const zoom = Math.min(ZOOM_MAX, Math.max(1, v.zoom))
      const s = escalaBase * zoom
      const minX = tam.w - fonte.largura * s
      const minY = tam.h - fonte.altura * s
      return { zoom, x: Math.min(0, Math.max(minX, v.x)), y: Math.min(0, Math.max(minY, v.y)) }
    },
    [escalaBase, tam, fonte],
  )

  // mede a moldura e começa com a foto centralizada
  useLayoutEffect(() => {
    const el = moldura.current
    if (!el) return
    const medir = () => {
      const r = el.getBoundingClientRect()
      setTam({ w: r.width, h: r.height })
    }
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  useLayoutEffect(() => {
    if (!tam.w) return
    const s = Math.max(tam.w / fonte.largura, tam.h / fonte.altura)
    setVista({ zoom: 1, x: (tam.w - fonte.largura * s) / 2, y: (tam.h - fonte.altura * s) / 2 })
  }, [tam, fonte])

  /** aproxima/afasta mantendo o ponto (cx, cy) da moldura no lugar */
  const aproximar = (zoomNovo: (atual: number) => number, cx = tam.w / 2, cy = tam.h / 2) =>
    setVista((v) => {
      const z = Math.min(ZOOM_MAX, Math.max(1, zoomNovo(v.zoom)))
      const k = z / v.zoom
      return prender({ zoom: z, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k })
    })

  const local = (e: PointerEvent | WheelEvent) => {
    const r = moldura.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const aoTocar = (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dedos.current.set(e.pointerId, local(e))
  }
  const aoMover = (e: PointerEvent) => {
    const antes = dedos.current.get(e.pointerId)
    if (!antes) return
    const agora = local(e)
    if (dedos.current.size === 1) {
      setVista((v) => prender({ ...v, x: v.x + agora.x - antes.x, y: v.y + agora.y - antes.y }))
    } else if (dedos.current.size === 2) {
      // pinça: a distância entre os dois dedos vira zoom
      const [a, b] = [...dedos.current.entries()].map(([id, p]) => (id === e.pointerId ? agora : p))
      const [a0, b0] = [...dedos.current.values()]
      const d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y)
      const d1 = Math.hypot(a.x - b.x, a.y - b.y)
      if (d0 > 0) aproximar((z) => z * (d1 / d0), (a.x + b.x) / 2, (a.y + b.y) / 2)
    }
    dedos.current.set(e.pointerId, agora)
  }
  const aoSoltar = (e: PointerEvent) => void dedos.current.delete(e.pointerId)
  const aoRolar = (e: WheelEvent) => {
    const p = local(e)
    aproximar((z) => z * Math.exp(-e.deltaY * 0.0015), p.x, p.y)
  }

  const guardar = async () => {
    if (guardando || !tam.w) return
    const s = escalaBase * vista.zoom
    setGuardando(true)
    setErro(null)
    try {
      await onGuardar({ x: -vista.x / s, y: -vista.y / s, largura: tam.w / s, altura: tam.h / s }, legenda.trim())
    } catch {
      setErro('Não deu pra guardar agora. Confere a internet e tenta de novo?')
      setGuardando(false)
    }
  }

  const s = escalaBase * vista.zoom
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center bg-[#1C1916] text-creme"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex w-full items-center justify-between px-3 py-2">
        <button onClick={onCancelar} disabled={guardando} className="rounded-full px-4 py-2 text-sm text-creme/75 active:bg-white/10">
          cancelar
        </button>
        <p className="font-serif text-lg italic text-creme/80">nova foto</p>
        <span className="w-20" />
      </div>

      <div className="flex w-full flex-1 flex-col items-center justify-center gap-5 px-6">
        {/* a polaroid: a moldura branca com a foto recortada dentro */}
        <div className="w-full max-w-[min(20rem,calc((100dvh_-_22rem)*0.75))] rounded-2xl bg-papel p-2.5 pb-10 shadow-2xl">
          <div
            ref={moldura}
            onPointerDown={aoTocar}
            onPointerMove={aoMover}
            onPointerUp={aoSoltar}
            onPointerCancel={aoSoltar}
            onWheel={aoRolar}
            className="relative aspect-[3/4] cursor-grab touch-none overflow-hidden rounded-lg bg-[#EFE6D8] select-none active:cursor-grabbing"
          >
            <img
              src={fonte.url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute top-0 left-0 max-w-none origin-top-left"
              style={{ width: fonte.largura * s, height: fonte.altura * s, transform: `translate(${vista.x}px, ${vista.y}px)` }}
            />
          </div>
        </div>

        <input
          type="range"
          min={1}
          max={ZOOM_MAX}
          step={0.01}
          value={vista.zoom}
          onChange={(e) => aproximar(() => Number(e.target.value))}
          aria-label="Aproximar"
          className="w-full max-w-xs accent-[#F3DFA8]"
        />
        <input
          value={legenda}
          onChange={(e) => setLegenda(e.target.value)}
          placeholder="legenda (se quiser)"
          maxLength={80}
          className="w-full max-w-xs rounded-full bg-white/10 px-5 py-3 text-center font-serif text-lg text-creme italic placeholder:text-creme/40 focus:ring-1 focus:ring-[#F3DFA8]/60 focus:outline-none"
        />
      </div>

      <div className="flex w-full flex-col items-center gap-2 px-6 pt-2 pb-6">
        {erro && <p className="text-center text-sm text-[#F2B8A0]">{erro}</p>}
        <button
          onClick={() => void guardar()}
          disabled={guardando}
          className="h-12 w-full max-w-xs rounded-full bg-[#F3DFA8] font-medium text-[#2E2A26] transition active:scale-[0.98] disabled:opacity-60"
        >
          {guardando ? 'guardando…' : 'guardar no varal'}
        </button>
        {!naNuvem && <p className="text-center text-[11px] tracking-wide text-creme/40">por enquanto, fica guardada só neste aparelho</p>}
      </div>
    </motion.div>
  )
}
