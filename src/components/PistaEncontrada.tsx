import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { CARTA_ARARA, SEGREDOS } from '../data/luademel'
import { useDesbloqueios } from '../lib/desbloqueios'

/**
 * Segredo 1 da lua de mel: a cartinha que a arara trazia no pé (src/mundo/Revoada.tsx).
 * O envelope cai na tela balançando, amarrado com barbante e uma pena de arara presa no laço.
 * Ela tem que SEGURAR o laço: um anel cor de nascer do sol vai enchendo, o envelope treme…
 * e o laço desamarra. O barbante escorrega, a pena cai flutuando, a aba abre e sobe a carta
 * com o Monte Batur. Soltou antes da hora: o anel volta devagar.
 * (o segredo já foi desbloqueado quando ela tocou na arara)
 */

type Fase = 'caindo' | 'laco' | 'abrindo' | 'carta'

const SEGURAR = 1.4 // segundos segurando pra desamarrar
const VOLTAR = 0.9 // segundos pra o anel esvaziar se ela soltar
const BARBANTE = '#C9A06F'
const BARBANTE_ESCURO = '#9C7748'

const vibrar = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p)
  } catch {
    /* sem vibração: tudo bem */
  }
}

/** O laço de barbante (duas alças, o nó e as duas pontinhas) */
function Laco({ soltando = 0 }: { soltando?: number }) {
  // `soltando`: 0 = apertado … 1 = quase soltando (as alças afrouxam)
  const a = 1 + soltando * 0.25
  return (
    <svg viewBox="0 0 100 70" className="h-full w-full drop-shadow-[0_2px_2px_rgb(60_40_20/0.35)]" aria-hidden>
      <g fill="none" stroke={BARBANTE} strokeWidth="5" strokeLinecap="round">
        <path d={`M50 30 C${40 - 6 * a} ${8 - 4 * a}, ${12 - 6 * a} ${12 - 2 * a}, ${18 - 4 * a} 30 C${22 - 4 * a} ${42 + 2 * a}, 40 36, 50 30`} />
        <path d={`M50 30 C${60 + 6 * a} ${8 - 4 * a}, ${88 + 6 * a} ${12 - 2 * a}, ${82 + 4 * a} 30 C${78 + 4 * a} ${42 + 2 * a}, 60 36, 50 30`} />
        <path d={`M48 33 C44 46, ${38 - soltando * 6} 56, ${30 - soltando * 8} 66`} />
        <path d={`M52 33 C56 46, ${62 + soltando * 6} 56, ${70 + soltando * 8} 66`} />
      </g>
      <g fill="none" stroke={BARBANTE_ESCURO} strokeWidth="1" strokeLinecap="round" opacity="0.55">
        <path d="M24 26 C30 18 40 20 46 28 M76 26 C70 18 60 20 54 28" />
      </g>
      <ellipse cx="50" cy="31" rx="7" ry="6" fill={BARBANTE} stroke={BARBANTE_ESCURO} strokeWidth="1" />
    </svg>
  )
}

/** Uma pena de arara: vermelha, com a ponta azul e um fiozinho amarelo */
function Pena() {
  return (
    <svg viewBox="0 0 40 120" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="pena" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2F6DB5" />
          <stop offset="0.28" stopColor="#3F8FD8" />
          <stop offset="0.36" stopColor="#F2C230" />
          <stop offset="0.44" stopColor="#E0362B" />
          <stop offset="1" stopColor="#B71F1A" />
        </linearGradient>
      </defs>
      <path d="M20 4 C34 24 34 62 24 96 L20 116 L16 96 C6 62 6 24 20 4 Z" fill="url(#pena)" />
      <path d="M20 8 L20 118" stroke="#F6E7C8" strokeWidth="1.2" opacity="0.8" />
      {[30, 44, 58, 72, 86].map((y) => (
        <path key={y} d={`M20 ${y} L${y < 60 ? 30 : 27} ${y - 8} M20 ${y} L${y < 60 ? 10 : 13} ${y - 8}`} stroke="#000" strokeOpacity="0.12" strokeWidth="0.8" />
      ))}
    </svg>
  )
}

/** Desenhinho dourado: o vulcão acima das nuvens, o sol nascendo atrás, a trilha e nós dois lá em cima */
function Desenho() {
  return (
    <svg viewBox="0 0 160 84" className="mx-auto h-20 w-40" fill="none" stroke="#B0763D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* o sol nascendo atrás da cratera, com raios */}
      <circle cx="80" cy="36" r="17" />
      {[-75, -50, -25, 0, 25, 50, 75].map((g) => {
        const r = (g * Math.PI) / 180
        return <path key={g} d={`M${80 + Math.sin(r) * 22} ${36 - Math.cos(r) * 22} L${80 + Math.sin(r) * 29} ${36 - Math.cos(r) * 29}`} opacity="0.8" />
      })}
      {/* o vulcão (pintado da cor do papel: esconde a parte de baixo do sol), com a cratera */}
      <path d="M22 66 L66 34 L74 38 L86 38 L94 34 L138 66 Z" fill="#FFF1E2" />
      <path d="M74 38 C78 41 82 41 86 38" />
      {/* a trilha subindo em zigue-zague */}
      <path d="M58 64 L74 56 L64 50 L80 45 L92 37" strokeDasharray="2 3" />
      {/* nós dois lá no topo */}
      <circle cx="97" cy="31" r="1.4" />
      <path d="M97 33 L97 37" />
      <circle cx="101.5" cy="31.5" r="1.3" />
      <path d="M101.5 33.5 L101.5 37" />
      {/* o mar de nuvens embaixo */}
      <path d="M6 70 C14 64 22 66 26 70 C32 64 42 66 46 71 C52 66 60 67 64 71" />
      <path d="M96 71 C102 66 110 66 114 70 C120 64 130 65 134 70 C140 65 150 66 155 71" />
      <path d="M14 78 C26 75 38 79 50 77 C66 75 80 80 96 77 C110 75 124 79 146 77" />
      {/* passarinho */}
      <path d="M124 18 C127 15 130 15 132 18 C134 15 137 15 140 18" />
    </svg>
  )
}

export function PistaEncontrada({ onIr, onFechar }: { onIr: () => void; onFechar: () => void }) {
  const achados = useDesbloqueios().length
  const [fase, setFase] = useState<Fase>('caindo')
  const [p, setP] = useState(0) // quanto do anel já encheu (0..1)
  const [agora, setAgora] = useState(0)
  const segurando = useRef(false)
  const soltou = useRef(false)

  // terminou de cair: libera o laço
  useEffect(() => {
    const t = window.setTimeout(() => setFase('laco'), 1700)
    return () => window.clearTimeout(t)
  }, [])

  // o anel enche enquanto ela segura (e esvazia devagar se soltar)
  useEffect(() => {
    if (fase !== 'laco') return
    let raf = 0
    let antes = performance.now()
    let ultimaVibrada = 0
    let atual = 0
    const passo = (t: number) => {
      const dt = Math.min(0.05, (t - antes) / 1000)
      antes = t
      atual = segurando.current ? Math.min(1, atual + dt / SEGURAR) : Math.max(0, atual - dt / VOLTAR)
      if (segurando.current && t - ultimaVibrada > 120) {
        vibrar(Math.round(4 + atual * 14))
        ultimaVibrada = t
      }
      setP(atual)
      setAgora(t)
      if (atual >= 1 && !soltou.current) {
        soltou.current = true
        segurando.current = false
        vibrar([25, 40, 60])
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
    const t = window.setTimeout(() => setFase('carta'), 2400)
    return () => window.clearTimeout(t)
  }, [fase])

  const segurar = (v: boolean) => {
    if (fase === 'laco') segurando.current = v
  }
  const aberto = fase === 'abrindo'
  const treme = fase === 'laco' ? p * p : 0
  const tremor = { x: Math.sin(agora * 0.07) * treme * 3, rotate: Math.sin(agora * 0.05) * treme * 2.2 }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-[65] flex items-center justify-center overflow-hidden bg-[#1E1A16]/70 px-6 select-none"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', WebkitTouchCallout: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {fase !== 'carta' && (
        <div className="relative flex flex-col items-center">
          {/* clarão de nascer do sol quando o laço solta */}
          {aberto && (
            <motion.div
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 0.95, 0], scale: [0.4, 1.5, 2.2] }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
              className="pointer-events-none absolute top-1/2 left-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: 'radial-gradient(circle, rgb(255 196 120 / 0.95), rgb(255 140 90 / 0.35) 45%, rgb(255 120 80 / 0) 70%)' }}
            />
          )}

          {/* o envelope caindo, balançando de um lado pro outro como papel (depois desce um pouco quando abre) */}
          <motion.div
            initial={{ y: '-70vh', x: -50, rotate: -24, opacity: 0 }}
            animate={{ y: aberto ? [0, 70] : ['-70vh', '-34vh', '-12vh', '0vh'], x: aberto ? 0 : [-50, 36, -18, 0], rotate: aberto ? 0 : [-24, 16, -8, 0], opacity: 1 }}
            transition={aberto ? { duration: 1.2, delay: 0.6, ease: 'easeInOut' } : { duration: 1.6, ease: 'easeOut' }}
          >
            <div className="relative aspect-[3/2] w-[min(82vw,330px)]" style={{ perspective: 900, transform: `translateX(${tremor.x}px) rotate(${tremor.rotate}deg)` }}>
              {/* o forro de dentro: um degradê de nascer do sol com solzinhos dourados */}
              <div
                className="absolute inset-0 rounded-[3px]"
                style={{ background: 'radial-gradient(circle at 50% 50%, #F7D08A 1.3px, transparent 1.8px) 0 0 / 13px 13px, linear-gradient(170deg, #F08A5D, #E9637A 55%, #8E5A9E)' }}
              />

              {/* a carta, que sobe quando abre */}
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: aberto ? '-62%' : 0 }}
                transition={{ duration: 1.1, delay: 0.85, ease: [0.3, 0.7, 0.3, 1] }}
                className="absolute inset-x-[7%] top-[6%] bottom-[4%] z-[2] flex flex-col items-center rounded-[2px] pt-4 shadow-md"
                style={{ background: 'linear-gradient(#FFE9D2, #FFFDF7 60%)' }}
              >
                <p className="text-[8px] tracking-[0.35em] text-[#B0763D] uppercase">{CARTA_ARARA.chamada}</p>
                <p className="mt-1 px-3 text-center font-serif text-lg leading-tight text-[#3B342C] italic">{CARTA_ARARA.nome}</p>
                <div className="mt-1.5 h-px w-10 bg-[#C9A86A]/60" />
              </motion.div>

              {/* o "bolso" da frente */}
              <div
                className="absolute inset-0 z-[3] rounded-[3px] shadow-[0_18px_40px_rgb(0_0_0/0.35)]"
                style={{ clipPath: 'polygon(0 0, 50% 54%, 100% 0, 100% 100%, 0 100%)', background: 'radial-gradient(circle at 30% 20%, #FBF3E4, #EEDFC4 70%), #F1E6D0' }}
              />
              <svg viewBox="0 0 300 200" preserveAspectRatio="none" className="absolute inset-0 z-[3] h-full w-full" aria-hidden>
                <path d="M0 200 L128 104 M300 200 L172 104" stroke="#DCCAAA" strokeWidth="1.6" />
                <rect x="6" y="6" width="288" height="188" fill="none" stroke="#D9A066" strokeWidth="0.8" opacity="0.5" />
              </svg>

              {/* a aba de cima, que abre virando pra trás */}
              <motion.div
                initial={{ rotateX: 0 }}
                animate={{ rotateX: aberto ? 180 : 0 }}
                transition={{ duration: 0.7, delay: 0.45, ease: 'easeInOut' }}
                style={{ transformOrigin: 'top center', transformStyle: 'preserve-3d', zIndex: aberto ? 1 : 4 }}
                className="absolute inset-x-0 top-0 h-[58%]"
              >
                <svg viewBox="0 0 300 116" preserveAspectRatio="none" className="h-full w-full drop-shadow-[0_2px_2px_rgb(0_0_0/0.12)]" aria-hidden>
                  <path d="M0 0 L150 116 L300 0 Z" fill="#E9DBC0" />
                  <path d="M8 3 L150 108 L292 3" fill="none" stroke="#D9A066" strokeWidth="1" opacity="0.7" />
                </svg>
              </motion.div>

              {/* o barbante amarrado em cruz (escorrega pra fora quando solta) */}
              <motion.div
                className="pointer-events-none absolute inset-y-0 left-1/2 z-[5] w-[6px] -translate-x-1/2"
                style={{ background: `repeating-linear-gradient(170deg, ${BARBANTE} 0 5px, ${BARBANTE_ESCURO} 5px 6px)` }}
                animate={aberto ? { y: '120%', opacity: 0 } : { y: 0, opacity: 1 }}
                transition={{ duration: 0.7, ease: 'easeIn' }}
              />
              <motion.div
                className="pointer-events-none absolute inset-x-0 top-[58%] z-[5] h-[6px] -translate-y-1/2"
                style={{ background: `repeating-linear-gradient(80deg, ${BARBANTE} 0 5px, ${BARBANTE_ESCURO} 5px 6px)` }}
                animate={aberto ? { x: '110%', opacity: 0 } : { x: 0, opacity: 1 }}
                transition={{ duration: 0.7, ease: 'easeIn' }}
              />

              {/* a pena presa no barbante (cai flutuando quando solta) */}
              <motion.div
                className="pointer-events-none absolute top-[24%] left-[54%] z-[5] h-[46%] w-[12%]"
                style={{ transformOrigin: '50% 90%' }}
                initial={{ rotate: 28 }}
                animate={aberto ? { x: [0, 40, -20, 30], y: [0, 90, 200, 340], rotate: [28, -20, 30, -10], opacity: [1, 1, 1, 0] } : { rotate: 28 + Math.sin(agora * 0.004) * 3 }}
                transition={aberto ? { duration: 2.4, ease: 'easeInOut' } : { duration: 0 }}
              >
                <Pena />
              </motion.div>

              {/* o laço (segure!) */}
              {!aberto && (
                <button
                  type="button"
                  aria-label="segure o laço pra desamarrar"
                  className="absolute top-[58%] left-1/2 z-[6] h-[70px] w-[100px] -translate-x-1/2 -translate-y-[45%] touch-none outline-none"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    segurar(true)
                  }}
                  onPointerUp={() => segurar(false)}
                  onPointerCancel={() => segurar(false)}
                  onLostPointerCapture={() => segurar(false)}
                >
                  {/* brilho chamando o toque (só enquanto ela não começou) */}
                  {fase === 'laco' && p === 0 && (
                    <motion.span
                      className="absolute top-[44%] left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      animate={{ boxShadow: ['0 0 0 0 rgb(255 190 120 / 0.6)', '0 0 0 16px rgb(255 190 120 / 0)'] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                    />
                  )}
                  {/* o anel cor de nascer do sol que enche */}
                  <svg viewBox="0 0 100 100" className="pointer-events-none absolute top-[44%] left-1/2 size-[96px] -translate-x-1/2 -translate-y-1/2 -rotate-90" aria-hidden>
                    <defs>
                      <linearGradient id="anel-sol" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#FFD58A" />
                        <stop offset="1" stopColor="#FF8A5C" />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="46" fill="none" stroke="#FFD58A" strokeOpacity="0.2" strokeWidth="3" />
                    <circle cx="50" cy="50" r="46" fill="none" stroke="url(#anel-sol)" strokeWidth="3.4" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} style={{ filter: 'drop-shadow(0 0 4px rgb(255 190 120 / 0.9))' }} />
                  </svg>
                  <span className="pointer-events-none absolute inset-0 block" style={{ transform: `scale(${1 + p * 0.06})` }}>
                    <Laco soltando={p} />
                  </span>
                </button>
              )}

              {/* soltou: as duas alças do laço voam */}
              {aberto &&
                [-1, 1].map((l) => (
                  <motion.div
                    key={l}
                    className="pointer-events-none absolute top-[58%] left-1/2 z-[6] h-[70px] w-[100px] -translate-x-1/2 -translate-y-[45%]"
                    style={{ clipPath: l < 0 ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)' }}
                    initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                    animate={{ x: l * 110, y: [0, -30, 260], rotate: l * 70, opacity: [1, 1, 0] }}
                    transition={{ duration: 1.2, times: [0, 0.25, 1], ease: 'easeIn' }}
                  >
                    <Laco soltando={1} />
                  </motion.div>
                ))}
            </div>
          </motion.div>

          {/* a dica, bem discreta */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: fase === 'laco' ? 1 : 0 }}
            transition={{ delay: fase === 'laco' ? 0.6 : 0, duration: 0.8 }}
            className="mt-10 font-serif text-lg text-[#FFFDF7]/80 italic"
          >
            {p > 0.02 ? 'quase…' : 'segure o laço'}
          </motion.p>
          {fase === 'laco' && (
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
          className="relative w-full max-w-sm overflow-hidden rounded-[3px] px-7 pt-7 pb-6 text-center text-[#3B342C] shadow-2xl"
          style={{ background: 'linear-gradient(180deg, #FFE3C8 0%, #FFF3E4 28%, #FFFDF7 55%)' }}
        >
          {/* moldura dourada dupla */}
          <div className="pointer-events-none absolute inset-2.5 rounded-[2px] border border-[#D9A066]/55" />
          <div className="pointer-events-none absolute inset-3.5 rounded-[2px] border border-[#D9A066]/25" />
          {/* a pena, presa no cantinho */}
          <div className="pointer-events-none absolute top-3 right-4 h-20 w-7 rotate-[24deg] opacity-90">
            <Pena />
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}>
            <Desenho />
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-2 text-[10px] tracking-[0.4em] text-[#B0763D] uppercase">
            {CARTA_ARARA.chamada}
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.8 }} className="mt-2 font-serif text-[2.1rem] leading-tight font-medium italic">
            {CARTA_ARARA.nome}
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-1 text-[12px] tracking-wide text-[#3B342C]/55">
            {CARTA_ARARA.lugar}
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.9 }} className="mt-4 font-serif text-[1.08rem] leading-snug text-[#3B342C]/80 italic">
            {CARTA_ARARA.texto}
          </motion.p>
          <ul className="mt-4 space-y-1">
            {CARTA_ARARA.destaques.map((d, i) => (
              <motion.li key={d} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.6 + i * 0.18 }} className="text-[12.5px] text-[#3B342C]/70">
                <span className="mr-1.5 text-[#E08A4E]">✦</span>
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
