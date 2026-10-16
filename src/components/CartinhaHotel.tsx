import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CONFIG } from '../config'
import { CARTA_HOTEL, SEGREDOS } from '../data/luademel'
import { desbloquear, useDesbloqueios } from '../lib/desbloqueios'

/**
 * Segredo 2 da lua de mel (a cartinha da estante, src/casa/CartinhaEstante.tsx).
 * O envelope chega na tela fechado com um selo de cera. Ela tem que SEGURAR o dedo no selo:
 * um anel dourado vai enchendo, o envelope treme, o selo vai rachando… e quebra em pedaços.
 * A aba abre, a carta sobe e mostra o hotel. Soltou antes da hora: o anel volta devagar.
 */

type Fase = 'chegando' | 'selo' | 'abrindo' | 'carta'

const SEGURAR = 1.6 // segundos segurando pra quebrar
const VOLTAR = 0.9 // segundos pra o anel esvaziar se ela soltar

const vibrar = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p)
  } catch {
    /* sem vibração: tudo bem */
  }
}

/** Contorno de cera derretida (um círculo meio torto) */
function contornoCera() {
  const pts: string[] = []
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2
    const r = 44 + Math.sin(a * 5 + 0.6) * 2.4 + Math.sin(a * 9 + 2) * 1.5 + Math.sin(a * 3) * 1.2
    pts.push(`${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`)
  }
  return `M${pts.join('L')}Z`
}

// rachaduras: [caminho, a partir de quanto do anel ela aparece]
const RACHADURAS: [string, number][] = [
  ['M52 48 L60 36 L58 27 L66 14', 0.3],
  ['M52 48 L40 55 L33 53 L18 63', 0.5],
  ['M52 48 L57 61 L54 72 L61 88', 0.68],
  ['M52 48 L42 39 L30 36 L22 24', 0.84],
]

// os pedaços quando ele quebra: [recorte, pra onde voa (x, y), giro]
const PEDACOS: [string, number, number, number][] = [
  ['polygon(52% 48%, 66% 0, 100% 0, 100% 46%)', 70, -60, 50],
  ['polygon(52% 48%, 100% 46%, 100% 100%, 61% 100%)', 80, 30, 80],
  ['polygon(52% 48%, 61% 100%, 0 100%, 0 63%)', -75, 40, -70],
  ['polygon(52% 48%, 0 63%, 0 0, 66% 0)', -65, -55, -45],
]

function Selo({ p, inteiro = true }: { p: number; inteiro?: boolean }) {
  const cera = useMemo(() => contornoCera(), [])
  const { pai, mae } = CONFIG.iniciais
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-[0_3px_4px_rgb(60_10_8/0.45)]" aria-hidden>
      <defs>
        <radialGradient id="cera" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#C2463A" />
          <stop offset="0.55" stopColor="#962A24" />
          <stop offset="1" stopColor="#6A1714" />
        </radialGradient>
      </defs>
      <path d={cera} fill="url(#cera)" />
      <circle cx="50" cy="50" r="31" fill="none" stroke="#6A1714" strokeWidth="2.2" opacity="0.7" />
      <circle cx="50" cy="50" r="31" fill="none" stroke="#E0786C" strokeWidth="0.8" opacity="0.35" transform="translate(-0.8 -0.8)" />
      {/* as iniciais em alto-relevo */}
      <text x="50" y="58" textAnchor="middle" fontFamily="Cormorant Garamond, Georgia, serif" fontStyle="italic" fontSize="24" fill="#E8867A" opacity="0.45" transform="translate(-0.7 -0.7)">
        {pai}&amp;{mae}
      </text>
      <text x="50" y="58" textAnchor="middle" fontFamily="Cormorant Garamond, Georgia, serif" fontStyle="italic" fontSize="24" fill="#5E1411" opacity="0.85">
        {pai}&amp;{mae}
      </text>
      {inteiro &&
        RACHADURAS.map(([d, de]) => {
          const v = Math.min(1, Math.max(0, (p - de) / 0.2))
          return <path key={d} d={d} fill="none" stroke="#2E0807" strokeWidth="2.2" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - v} />
        })}
    </svg>
  )
}

/** Desenhinho dourado do hotel: o pavilhão balinês entre os arrozais, o casulo de bambu e o rio */
function Desenho() {
  return (
    <svg viewBox="0 0 160 84" className="mx-auto h-20 w-40" fill="none" stroke="#B08A45" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* arrozais em degraus nos dois lados */}
      <path d="M6 44 C16 41 26 41 36 44 M4 52 C16 48 30 48 42 52 M4 60 C18 56 34 56 48 60" />
      <path d="M156 44 C150 42 144 42 138 44 M157 52 C150 50 143 50 137 52 M158 60 C150 58 143 58 136 60" />
      {/* o pavilhão (bale) com o telhado de dois andares */}
      <path d="M66 32 L80 18 L94 32 Z" />
      <path d="M56 42 L68 32 L92 32 L104 42 Z" />
      <path d="M80 18 L80 13" />
      <path d="M62 42 L62 60 M98 42 L98 60 M74 42 L74 60 M86 42 L86 60" />
      <path d="M56 60 L104 60 M60 64 L100 64" />
      {/* o casulo de bambu do jantar */}
      <path d="M122 66 C114 66 112 54 118 46 C120 43 124 43 126 46 C132 54 130 66 122 66 Z" />
      <path d="M118 52 L126 52 M117 58 L127 58" />
      {/* o rio */}
      <path d="M20 72 C34 69 46 75 60 72 C74 69 86 75 100 72 C114 69 126 75 140 72" />
      <path d="M36 78 C48 76 58 80 70 78 C82 76 92 80 104 78 C114 76 120 79 126 78" />
      {/* passarinho voando */}
      <path d="M30 20 C33 17 36 17 38 20 C40 17 43 17 46 20" />
    </svg>
  )
}

export function CartinhaHotel({ onIr, onFechar }: { onIr: () => void; onFechar: () => void }) {
  const achados = useDesbloqueios().length
  const [fase, setFase] = useState<Fase>('chegando')
  const [p, setP] = useState(0) // quanto do anel já encheu (0..1)
  const [agora, setAgora] = useState(0)
  const segurando = useRef(false)
  const quebrou = useRef(false)

  // chegou na tela: espera um tiquinho e libera o selo
  useEffect(() => {
    const t = window.setTimeout(() => setFase('selo'), 900)
    return () => window.clearTimeout(t)
  }, [])

  // o anel enche enquanto ela segura (e esvazia devagar se soltar)
  useEffect(() => {
    if (fase !== 'selo') return
    let raf = 0
    let antes = performance.now()
    let ultimaVibrada = 0
    let atual = 0
    const passo = (t: number) => {
      const dt = Math.min(0.05, (t - antes) / 1000)
      antes = t
      atual = segurando.current ? Math.min(1, atual + dt / SEGURAR) : Math.max(0, atual - dt / VOLTAR)
      if (segurando.current && t - ultimaVibrada > 110) {
        vibrar(Math.round(5 + atual * 16))
        ultimaVibrada = t
      }
      setP(atual)
      setAgora(t)
      if (atual >= 1 && !quebrou.current) {
        quebrou.current = true
        segurando.current = false
        vibrar([35, 50, 70])
        desbloquear('hotel')
        setFase('abrindo')
        return
      }
      raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [fase])

  // aberto: a carta sobe e depois vem pra frente
  useEffect(() => {
    if (fase !== 'abrindo') return
    const t = window.setTimeout(() => setFase('carta'), 2300)
    return () => window.clearTimeout(t)
  }, [fase])

  const segurar = (v: boolean) => {
    if (fase === 'selo') segurando.current = v
  }
  const aberto = fase === 'abrindo'
  // tremidinha que aumenta quanto mais perto de quebrar
  const treme = fase === 'selo' ? p * p : 0
  const tremor = { x: Math.sin(agora * 0.07) * treme * 3, rotate: Math.sin(agora * 0.05) * treme * 2.2 }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[65] flex items-center justify-center overflow-hidden bg-[#1E1A16]/70 px-6 select-none"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', WebkitTouchCallout: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {fase !== 'carta' && (
        <div className="relative flex flex-col items-center">
          {/* clarão dourado quando o selo quebra */}
          {aberto && (
            <motion.div
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1.4, 2] }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="pointer-events-none absolute top-1/2 left-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: 'radial-gradient(circle, rgb(255 230 170 / 0.9), rgb(255 210 130 / 0) 65%)' }}
            />
          )}

          {/* o envelope chegando (continua o voo da estante) */}
          <motion.div
            initial={{ scale: 0.25, rotate: -14, y: -40, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, y: aberto ? 70 : 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 110, damping: 14, y: { duration: 1.2, delay: aberto ? 0.5 : 0, ease: 'easeInOut' } }}
          >
            <div className="relative aspect-[3/2] w-[min(82vw,330px)]" style={{ perspective: 900, transform: `translateX(${tremor.x}px) rotate(${tremor.rotate}deg)` }}>
              {/* o fundo de dentro do envelope: forro verde-floresta com pontinhos dourados */}
              <div
                className="absolute inset-0 rounded-[3px]"
                style={{ background: 'radial-gradient(circle at 50% 50%, #C9A86A 1.2px, transparent 1.6px) 0 0 / 12px 12px, #24392D' }}
              />

              {/* a carta, que sobe quando abre */}
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: aberto ? '-62%' : 0 }}
                transition={{ duration: 1.1, delay: 0.75, ease: [0.3, 0.7, 0.3, 1] }}
                className="absolute inset-x-[7%] top-[6%] bottom-[4%] z-[2] flex flex-col items-center rounded-[2px] bg-[#FFFDF7] pt-4 shadow-md"
              >
                <p className="text-[8px] tracking-[0.35em] text-[#B08A45] uppercase">{CARTA_HOTEL.chamada}</p>
                <p className="mt-1 font-serif text-xl text-[#3B342C] italic">{CARTA_HOTEL.nome}</p>
                <div className="mt-1.5 h-px w-10 bg-[#C9A86A]/60" />
              </motion.div>

              {/* o "bolso" da frente (abas de baixo e dos lados) */}
              <div
                className="absolute inset-0 z-[3] rounded-[3px] shadow-[0_18px_40px_rgb(0_0_0/0.35)]"
                style={{
                  clipPath: 'polygon(0 0, 50% 54%, 100% 0, 100% 100%, 0 100%)',
                  background: 'radial-gradient(circle at 30% 20%, #FBF5EA, #EFE4CF 70%), #F1E8D6',
                }}
              />
              <svg viewBox="0 0 300 200" preserveAspectRatio="none" className="absolute inset-0 z-[3] h-full w-full" aria-hidden>
                <path d="M0 200 L128 104 M300 200 L172 104" stroke="#DCCDB2" strokeWidth="1.6" />
                <rect x="6" y="6" width="288" height="188" fill="none" stroke="#C9A86A" strokeWidth="0.8" opacity="0.5" />
              </svg>

              {/* a aba de cima, que abre virando pra trás */}
              <motion.div
                initial={{ rotateX: 0 }}
                animate={{ rotateX: aberto ? 180 : 0 }}
                transition={{ duration: 0.7, delay: 0.25, ease: 'easeInOut' }}
                style={{ transformOrigin: 'top center', transformStyle: 'preserve-3d', zIndex: aberto ? 1 : 4 }}
                className="absolute inset-x-0 top-0 h-[58%]"
              >
                <svg viewBox="0 0 300 116" preserveAspectRatio="none" className="h-full w-full drop-shadow-[0_2px_2px_rgb(0_0_0/0.12)]" aria-hidden>
                  <path d="M0 0 L150 116 L300 0 Z" fill="#E8DCC5" />
                  <path d="M8 3 L150 108 L292 3" fill="none" stroke="#C9A86A" strokeWidth="1" opacity="0.7" />
                </svg>
              </motion.div>

              {/* o selo de cera (segure!) */}
              {!aberto && (
                <button
                  type="button"
                  aria-label="segure o selo pra abrir"
                  className="absolute top-[58%] left-1/2 z-[5] size-[86px] -translate-x-1/2 -translate-y-1/2 touch-none rounded-full outline-none"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    segurar(true)
                  }}
                  onPointerUp={() => segurar(false)}
                  onPointerCancel={() => segurar(false)}
                  onLostPointerCapture={() => segurar(false)}
                >
                  {/* brilho chamando o toque (só enquanto ela não começou) */}
                  {fase === 'selo' && p === 0 && (
                    <motion.span
                      className="absolute inset-0 rounded-full"
                      animate={{ boxShadow: ['0 0 0 0 rgb(243 210 140 / 0.55)', '0 0 0 14px rgb(243 210 140 / 0)'] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                    />
                  )}
                  {/* o anel dourado que enche */}
                  <svg viewBox="0 0 100 100" className="pointer-events-none absolute -inset-[14px] h-[calc(100%+28px)] w-[calc(100%+28px)] -rotate-90" aria-hidden>
                    <circle cx="50" cy="50" r="46" fill="none" stroke="#F3D28C" strokeOpacity="0.18" strokeWidth="3" />
                    <circle cx="50" cy="50" r="46" fill="none" stroke="#F3D28C" strokeWidth="3.2" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} style={{ filter: 'drop-shadow(0 0 4px rgb(243 210 140 / 0.9))' }} />
                  </svg>
                  <span className="pointer-events-none absolute inset-0 block" style={{ transform: `scale(${1 - p * 0.06})` }}>
                    <Selo p={p} />
                  </span>
                </button>
              )}

              {/* quebrou: os pedaços voam e caem */}
              {aberto && (
                <div className="pointer-events-none absolute top-[58%] left-1/2 z-[6] size-[86px] -translate-x-1/2 -translate-y-1/2">
                  {PEDACOS.map(([recorte, dx, dy, giro]) => (
                    <motion.div
                      key={recorte}
                      className="absolute inset-0"
                      style={{ clipPath: recorte }}
                      initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                      animate={{ x: [0, dx * 0.7, dx], y: [0, dy, dy + 320], rotate: [0, giro * 0.6, giro * 2], opacity: [1, 1, 0] }}
                      transition={{ duration: 1.3, times: [0, 0.25, 1], ease: 'easeIn' }}
                    >
                      <Selo p={1} inteiro={false} />
                    </motion.div>
                  ))}
                  {/* farelinhos de cera */}
                  {Array.from({ length: 12 }, (_, i) => {
                    const a = (i / 12) * Math.PI * 2 + 0.3
                    return (
                      <motion.span
                        key={i}
                        className="absolute top-1/2 left-1/2 size-1.5 rounded-full bg-[#8E2420]"
                        initial={{ x: 0, y: 0, opacity: 1 }}
                        animate={{ x: Math.cos(a) * (50 + (i % 3) * 22), y: [0, Math.sin(a) * 50 - 20, Math.sin(a) * 50 + 220], opacity: [1, 1, 0] }}
                        transition={{ duration: 1.1, times: [0, 0.3, 1], ease: 'easeIn' }}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* a dica, bem discreta */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: fase === 'selo' ? 1 : 0 }}
            transition={{ delay: fase === 'selo' ? 0.9 : 0, duration: 0.8 }}
            className="mt-10 font-serif text-lg text-[#FFFDF7]/80 italic"
          >
            {p > 0.02 ? 'não solta…' : 'segure o selo'}
          </motion.p>
          {fase === 'selo' && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} onClick={onFechar} className="mt-3 rounded-full px-5 py-2 text-[13px] text-[#FFFDF7]/45 active:bg-white/5">
              agora não
            </motion.button>
          )}
        </div>
      )}

      {/* a carta aberta, grandona */}
      {fase === 'carta' && (
        <motion.div
          initial={{ scale: 0.6, y: -60, opacity: 0, rotate: -2 }}
          animate={{ scale: 1, y: 0, opacity: 1, rotate: -0.6 }}
          transition={{ type: 'spring', stiffness: 120, damping: 16 }}
          className="relative w-full max-w-sm rounded-[3px] bg-[#FFFDF7] px-7 pt-7 pb-6 text-center text-[#3B342C] shadow-2xl"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 0%, #FFFFFF, #FBF5EA 70%)' }}
        >
          {/* moldura dourada dupla, de papel de hotel */}
          <div className="pointer-events-none absolute inset-2.5 rounded-[2px] border border-[#C9A86A]/55" />
          <div className="pointer-events-none absolute inset-3.5 rounded-[2px] border border-[#C9A86A]/25" />

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}>
            <Desenho />
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-2 text-[10px] tracking-[0.4em] text-[#B08A45] uppercase">
            {CARTA_HOTEL.chamada}
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.8 }} className="mt-2 font-serif text-[2.3rem] leading-tight font-medium italic">
            {CARTA_HOTEL.nome}
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-1 text-[12px] tracking-wide text-[#3B342C]/55">
            {CARTA_HOTEL.lugar}
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.9 }} className="mt-4 font-serif text-[1.08rem] leading-snug text-[#3B342C]/80 italic">
            {CARTA_HOTEL.texto}
          </motion.p>
          <ul className="mt-4 space-y-1">
            {CARTA_HOTEL.destaques.map((d, i) => (
              <motion.li
                key={d}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.6 + i * 0.18 }}
                className="text-[12.5px] text-[#3B342C]/70"
              >
                <span className="mr-1.5 text-[#C9A86A]">✦</span>
                {d}
              </motion.li>
            ))}
          </ul>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3 }} className="mt-5 text-[11px] tracking-[0.25em] text-[#9C2B25]/75 uppercase">
            você achou um segredo · {achados} de {SEGREDOS.length}
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="mt-4 flex flex-col items-center gap-1">
            <button onClick={onIr} className="rounded-full bg-[#3B342C] px-6 py-3 text-sm font-medium text-[#FFFDF7] active:scale-[0.98]">
              abrir na lua de mel
            </button>
            <button onClick={onFechar} className="rounded-full px-5 py-2 text-[13px] text-[#3B342C]/55 active:bg-black/5">
              continuar explorando
            </button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
}
