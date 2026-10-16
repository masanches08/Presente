import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { CARTA_CAFE, SEGREDOS } from '../data/luademel'
import { desbloquear, useDesbloqueios } from '../lib/desbloqueios'

/**
 * Segredo 3 da lua de mel: a cartinha que cai do sino da capela (src/casamento/Capela.tsx).
 * O envelope chega flutuando, fechado com uma flor de frangipani (a flor de Bali) no lugar do selo.
 * Tocar na flor: as pétalas abrem, a aba vira e sobe a carta com a bandeja do café boiando na piscina.
 */

type Fase = 'chegando' | 'flor' | 'abrindo' | 'carta'

/** A flor de frangipani: 5 pétalas brancas com o miolo amarelo (abertas = `abre` 1) */
function Frangipani({ abre = 0 }: { abre?: number }) {
  return (
    <svg viewBox="-50 -50 100 100" className="h-full w-full drop-shadow-[0_3px_5px_rgb(80_50_20/0.35)]" aria-hidden>
      <defs>
        <radialGradient id="petala" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 -6) scale(40)">
          <stop offset="0" stopColor="#FFD24A" />
          <stop offset="0.38" stopColor="#FFF1C9" />
          <stop offset="1" stopColor="#FFFFFF" />
        </radialGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((k) => (
        <g key={k} transform={`rotate(${k * 72 + abre * 30})`}>
          <path d="M0 0 C -14 -8 -20 -30 -6 -42 C 6 -48 18 -36 10 -18 C 6 -10 4 -4 0 0 Z" fill="url(#petala)" stroke="#F1E2C4" strokeWidth="0.8" transform={`translate(0 ${-abre * 8}) scale(${1 + abre * 0.15})`} />
        </g>
      ))}
      <circle r="5" fill="#F5B92E" />
    </svg>
  )
}

/** Desenho dourado: a piscina com a bandeja boiando (frutas, xícara, flor), as folhas da selva e as ondinhas */
function Desenho() {
  return (
    <svg viewBox="0 0 160 90" className="mx-auto h-24 w-44" fill="none" stroke="#B08A45" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* folhas de palmeira nos cantos */}
      <path d="M6 10 C 18 14 26 22 30 34 M10 8 C 20 6 30 10 36 18 M4 22 C 14 22 22 28 26 36" />
      <path d="M154 10 C 142 14 134 22 130 34 M150 8 C 140 6 130 10 124 18 M156 22 C 146 22 138 28 134 36" />
      {/* a borda da piscina */}
      <path d="M14 46 H146" opacity="0.7" />
      {/* a bandeja */}
      <path d="M46 58 H114 L108 66 H52 Z" />
      {/* frutas, a xícara com vapor e a flor */}
      <circle cx="62" cy="53" r="5" />
      <circle cx="71" cy="54" r="4" />
      <path d="M84 58 V50 H96 V58" />
      <path d="M96 52 C 101 52 101 56 96 56" />
      <path d="M88 46 C 86 43 90 41 88 38 M92 46 C 90 43 94 41 92 38" opacity="0.8" />
      <path d="M106 53 c -3 -3 -1 -6 2 -4 c 1 -4 5 -3 4 0 c 4 -1 4 3 1 4 c 2 3 -1 5 -3 3 c -2 3 -5 1 -4 -3 Z" />
      {/* a água: ondinhas mexendo */}
      {[0, 1, 2].map((k) => (
        <motion.path
          key={k}
          d={`M${20 + k * 6} ${72 + k * 7} C ${40 + k * 6} ${68 + k * 7}, ${60} ${76 + k * 7}, 80 ${72 + k * 7} S ${120 - k * 6} ${68 + k * 7}, ${140 - k * 6} ${72 + k * 7}`}
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 2.4 + k * 0.4, repeat: Infinity, ease: 'easeInOut' }}
          opacity={0.75 - k * 0.15}
        />
      ))}
    </svg>
  )
}

export function CartinhaCafe({ onIr, onFechar }: { onIr: () => void; onFechar: () => void }) {
  const achados = useDesbloqueios().length
  const [fase, setFase] = useState<Fase>('chegando')

  // a cartinha chegou: o segredo está achado
  useEffect(() => {
    desbloquear('cafe')
    const t = window.setTimeout(() => setFase('flor'), 1500)
    return () => window.clearTimeout(t)
  }, [])
  useEffect(() => {
    if (fase !== 'abrindo') return
    const t = window.setTimeout(() => setFase('carta'), 2300)
    return () => window.clearTimeout(t)
  }, [fase])

  const aberto = fase === 'abrindo'
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[65] flex items-center justify-center overflow-hidden bg-[#14202A]/70 px-6 select-none"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {fase !== 'carta' && (
        <div className="relative flex flex-col items-center">
          {/* clarão de água e sol quando abre */}
          {aberto && (
            <motion.div
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1.5, 2.2] }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
              className="pointer-events-none absolute top-1/2 left-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: 'radial-gradient(circle, rgb(255 236 190 / 0.95), rgb(120 210 230 / 0.35) 45%, rgb(120 210 230 / 0) 70%)' }}
            />
          )}
          {/* o envelope chega flutuando (como se descesse do sino), e desce um pouco quando abre */}
          <motion.div
            initial={{ y: '-60vh', rotate: -10, opacity: 0 }}
            animate={{ y: aberto ? 70 : 0, rotate: 0, opacity: 1 }}
            transition={aberto ? { duration: 1.2, delay: 0.6, ease: 'easeInOut' } : { duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              animate={fase === 'flor' ? { y: [0, -6, 0], rotate: [0, 1, 0, -1, 0] } : {}}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="relative aspect-[3/2] w-[min(82vw,330px)]"
              style={{ perspective: 900 }}
            >
              {/* o forro de dentro: azul da piscina com reflexos */}
              <div
                className="absolute inset-0 rounded-[3px]"
                style={{ background: 'repeating-radial-gradient(circle at 30% 40%, #7FD3E0 0 6px, #5BB8CC 6px 13px), #5BB8CC' }}
              />
              {/* a carta, que sobe quando abre */}
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: aberto ? '-62%' : 0 }}
                transition={{ duration: 1.1, delay: 0.85, ease: [0.3, 0.7, 0.3, 1] }}
                className="absolute inset-x-[7%] top-[6%] bottom-[4%] z-[2] flex flex-col items-center rounded-[2px] bg-[#FFFDF7] pt-4 shadow-md"
              >
                <p className="text-[8px] tracking-[0.35em] text-[#B08A45] uppercase">{CARTA_CAFE.chamada}</p>
                <p className="mt-1 font-serif text-lg text-[#3B342C] italic">{CARTA_CAFE.nome}</p>
                <div className="mt-1.5 h-px w-10 bg-[#C9A86A]/60" />
              </motion.div>
              {/* o "bolso" da frente */}
              <div
                className="absolute inset-0 z-[3] rounded-[3px] shadow-[0_18px_40px_rgb(0_0_0/0.35)]"
                style={{ clipPath: 'polygon(0 0, 50% 54%, 100% 0, 100% 100%, 0 100%)', background: 'radial-gradient(circle at 30% 20%, #FBF7EE, #EEE6D4 70%), #F1EADB' }}
              />
              <svg viewBox="0 0 300 200" preserveAspectRatio="none" className="absolute inset-0 z-[3] h-full w-full" aria-hidden>
                <path d="M0 200 L128 104 M300 200 L172 104" stroke="#DCD0B6" strokeWidth="1.6" />
                <rect x="6" y="6" width="288" height="188" fill="none" stroke="#C9A86A" strokeWidth="0.8" opacity="0.5" />
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
                  <path d="M0 0 L150 116 L300 0 Z" fill="#ECE3D0" />
                  <path d="M8 3 L150 108 L292 3" fill="none" stroke="#C9A86A" strokeWidth="1" opacity="0.7" />
                </svg>
              </motion.div>
              {/* a flor que fecha o envelope (toque nela) */}
              <motion.button
                type="button"
                aria-label="abrir"
                onClick={() => fase === 'flor' && setFase('abrindo')}
                className="absolute top-[58%] left-1/2 z-[5] size-[78px] -translate-x-1/2 -translate-y-1/2 outline-none"
                animate={aberto ? { scale: [1, 1.3, 0], rotate: [0, 40, 120], opacity: [1, 1, 0] } : fase === 'flor' ? { scale: [1, 1.08, 1] } : {}}
                transition={aberto ? { duration: 0.8 } : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                {fase === 'flor' && (
                  <motion.span
                    className="absolute inset-1 rounded-full"
                    animate={{ boxShadow: ['0 0 0 0 rgb(255 230 170 / 0.6)', '0 0 0 16px rgb(255 230 170 / 0)'] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
                <Frangipani abre={aberto ? 1 : 0} />
              </motion.button>
            </motion.div>
          </motion.div>
          {fase === 'flor' && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} onClick={onFechar} className="mt-8 rounded-full px-5 py-2 text-[13px] text-[#FFFDF7]/45 active:bg-white/5">
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
          style={{ background: 'linear-gradient(180deg, #E4F6F8 0%, #F6FCFB 30%, #FFFDF7 60%)' }}
        >
          <div className="pointer-events-none absolute inset-2.5 rounded-[2px] border border-[#C9A86A]/55" />
          <div className="pointer-events-none absolute inset-3.5 rounded-[2px] border border-[#C9A86A]/25" />
          {/* a flor presa no cantinho */}
          <div className="pointer-events-none absolute top-3 right-3 size-12 rotate-12 opacity-95">
            <Frangipani />
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}>
            <Desenho />
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-2 text-[10px] tracking-[0.4em] text-[#B08A45] uppercase">
            {CARTA_CAFE.chamada}
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.8 }} className="mt-2 font-serif text-[2.1rem] leading-tight font-medium italic">
            {CARTA_CAFE.nome}
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-1 text-[12px] tracking-wide text-[#3B342C]/55">
            {CARTA_CAFE.lugar}
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.9 }} className="mt-4 font-serif text-[1.08rem] leading-snug text-[#3B342C]/80 italic">
            {CARTA_CAFE.texto}
          </motion.p>
          <ul className="mt-4 space-y-1">
            {CARTA_CAFE.destaques.map((d, i) => (
              <motion.li key={d} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.6 + i * 0.18 }} className="text-[12.5px] text-[#3B342C]/70">
                <span className="mr-1.5 text-[#5BB8CC]">✦</span>
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
