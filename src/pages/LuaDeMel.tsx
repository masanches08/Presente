import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { SEGREDOS, TEMPO_DESBLOQUEIO, type Segredo } from '../data/luademel'
import { foiRevelado, marcarRevelado, useDesbloqueios } from '../lib/desbloqueios'

function Cadeado({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15.3" r="1.2" fill="currentColor" />
    </svg>
  )
}

type Estado = 'bloqueado' | 'quebrando' | 'aberto'

/** Solzinho nascendo atrás da montanha (o ícone dos segredos já abertos) */
function IconeSegredo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M2.5 19.5h19" />
      <path d="M4 19.5l5.2-7.5 3.3 4.2 2.4-2.9 5.1 6.2" />
      <path d="M12 9.2a3.4 3.4 0 0 1 3.4 3.4" />
      <path d="M12 4.2v1.6M17.6 6.6l-1.1 1.1M6.4 6.6l1.1 1.1" />
    </svg>
  )
}

/** O cadeado quebrando: treme, a alça voa pra um lado, o corpo cai pro outro, e sai um brilho dourado */
function CadeadoQuebrando() {
  return (
    <div className="relative size-10">
      <motion.svg
        viewBox="0 0 24 24"
        className="absolute inset-0 size-10 overflow-visible text-[#F3DFA8]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        aria-hidden
        animate={{ x: [0, -3, 3, -3, 3, -2, 2, 0], rotate: [0, -7, 7, -7, 7, -3, 3, 0] }}
        transition={{ duration: 0.8 }}
      >
        <motion.path
          d="M8 10.5V7.5a4 4 0 0 1 8 0v3"
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: -14, y: -22, rotate: -50, opacity: 0 }}
          transition={{ delay: 0.85, duration: 0.7, ease: 'easeOut' }}
        />
        <motion.g
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: 10, y: 26, rotate: 35, opacity: 0 }}
          transition={{ delay: 0.85, duration: 0.8, ease: 'easeIn' }}
        >
          <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
          <circle cx="12" cy="15.3" r="1.2" fill="currentColor" />
        </motion.g>
      </motion.svg>
      {/* brilho e faíscas no momento em que quebra */}
      <motion.span
        className="absolute inset-0 rounded-full bg-[#FFE29A]"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 3.2], opacity: [0, 0.9, 0] }}
        transition={{ delay: 0.85, duration: 0.7 }}
      />
      {Array.from({ length: 10 }, (_, k) => {
        const a = (k / 10) * Math.PI * 2
        return (
          <motion.span
            key={k}
            className="absolute top-1/2 left-1/2 size-1.5 rounded-full bg-[#FFE7A8]"
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{ x: Math.cos(a) * 46, y: Math.sin(a) * 46, opacity: [0, 1, 0] }}
            transition={{ delay: 0.9, duration: 0.9, ease: 'easeOut' }}
          />
        )
      })}
    </div>
  )
}

function CardSegredo({ s, i, estado, onAbrir }: { s: Segredo; i: number; estado: Estado; onAbrir: () => void }) {
  const aberto = estado === 'aberto'
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.4 + i * 0.15, duration: 0.7 }}
      onClick={aberto ? onAbrir : undefined}
      disabled={!aberto}
      className={`relative flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl px-1.5 ring-1 backdrop-blur-md transition-colors duration-700 ${
        aberto ? 'bg-gradient-to-b from-[#F7E3AE]/95 to-[#D9AE5C]/95 text-[#3A2A14] shadow-[0_0_28px_rgb(243_210_140/0.45)] ring-[#FFF1C9]/70' : 'bg-white/8 text-white ring-white/20'
      }`}
    >
      {estado === 'bloqueado' && (
        <>
          <Cadeado className="size-6 text-white/55" />
          <span className="font-serif text-lg tracking-[0.15em] text-white/60">???</span>
        </>
      )}
      {estado === 'quebrando' && <CadeadoQuebrando />}
      {aberto && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="flex flex-col items-center gap-1.5">
          <IconeSegredo className="size-7" />
          <span className="font-serif text-[0.95rem] leading-tight font-medium">{s.nome}</span>
        </motion.div>
      )}
    </motion.button>
  )
}

/** O segredo aberto, grandão */
function SegredoAberto({ s, achados, onFechar }: { s: Segredo; achados: number; onFechar: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onFechar}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0E1A24]/55 px-7 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.85, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 160, damping: 18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[30px] bg-gradient-to-b from-[#FFF6DF] to-[#F2DAA4] px-7 pt-9 pb-7 text-center text-[#3A2A14] shadow-2xl"
      >
        <IconeSegredo className="mx-auto size-12 text-[#A8742A]" />
        <p className="mt-4 text-[11px] tracking-[0.35em] text-[#A8742A] uppercase">desbloqueado</p>
        <h3 className="mt-2 font-serif text-[2.1rem] leading-tight font-medium">{s.nome}</h3>
        <p className="mt-4 font-serif text-lg leading-snug text-[#3A2A14]/75 italic">{s.frase}</p>
        <p className="mt-6 text-[12px] tracking-wide text-[#3A2A14]/50">
          {achados} de {SEGREDOS.length} segredos da nossa lua de mel
        </p>
        <button onClick={onFechar} className="mt-5 rounded-full bg-[#3A2A14] px-7 py-3 text-sm font-medium text-[#FFF6DF] active:scale-[0.98]">
          guardar no coração ♡
        </button>
      </motion.div>
    </motion.div>
  )
}

/**
 * Lua de mel: bloqueada, com 3 segredos pra ela achar pelo site (e "sem dicks": brincadeira nossa).
 * Quando ela acha um, na próxima vez que entrar aqui o cadeado daquele card quebra e mostra o que é.
 */
export default function LuaDeMel({ onSair }: { onSair: () => void }) {
  const achados = useDesbloqueios()
  const [quebrando, setQuebrando] = useState<string | null>(null)
  const [revelados, setRevelados] = useState(() => SEGREDOS.filter((s) => foiRevelado(s.id)).map((s) => s.id))
  const [aberto, setAberto] = useState<Segredo | null>(null)
  const [primeira, setPrimeira] = useState(true)
  const [paraAbrir, setParaAbrir] = useState<string | null>(null)

  // segredo achado que ainda não foi mostrado neste aparelho: o cadeado dele quebra na frente dela
  useEffect(() => {
    if (quebrando || aberto || paraAbrir) return
    const novo = SEGREDOS.find((s) => achados.includes(s.id) && !revelados.includes(s.id))
    if (!novo) return
    // na primeira vez espera os cards aparecerem
    const t = window.setTimeout(() => setQuebrando(novo.id), primeira ? 2300 : 700)
    return () => window.clearTimeout(t)
  }, [achados, revelados, quebrando, aberto, primeira, paraAbrir])

  useEffect(() => {
    if (!quebrando) return
    const id = quebrando
    const t = window.setTimeout(() => {
      marcarRevelado(id)
      setRevelados((r) => [...r, id])
      setQuebrando(null)
      setPrimeira(false)
      setParaAbrir(id)
    }, 1900)
    return () => window.clearTimeout(t)
  }, [quebrando])

  // depois que o card vira, abre o segredo grandão
  useEffect(() => {
    if (!paraAbrir) return
    const t = window.setTimeout(() => {
      setAberto(SEGREDOS.find((s) => s.id === paraAbrir) ?? null)
      setParaAbrir(null)
    }, 1000)
    return () => window.clearTimeout(t)
  }, [paraAbrir])

  const estado = (s: Segredo): Estado => (quebrando === s.id ? 'quebrando' : achados.includes(s.id) && revelados.includes(s.id) ? 'aberto' : 'bloqueado')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-50 overflow-hidden bg-[#1C4A5A] text-white"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* fundo: as casinhas sobre o mar (uma foto do cenário 3D, desfocada: leve e igualzinha) */}
      <img src={`${import.meta.env.BASE_URL}luademel/fundo.webp`} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover blur-2xl" />
      <div className="absolute inset-0 bg-[#0E1A24]/45" />

      <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 140, damping: 14, delay: 0.3 }}
          className="grid size-24 place-items-center rounded-full bg-white/10 ring-1 ring-white/30 backdrop-blur-md"
        >
          <Cadeado className="size-11 text-[#F3DFA8]" />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }} className="mt-7 font-serif text-[3rem] leading-none font-medium">
          Bloqueado
        </motion.h2>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.8 }} className="mt-8">
          <p className="text-[11px] tracking-[0.35em] text-white/65 uppercase">tempo de desbloqueio</p>
          <p className="mt-2 font-serif text-[3.4rem] leading-none tracking-[0.2em] text-[#F3DFA8]">{TEMPO_DESBLOQUEIO}</p>
        </motion.div>

        <div className="mt-10 grid w-full max-w-xs grid-cols-3 gap-3">
          {SEGREDOS.map((s, i) => (
            <CardSegredo key={s.id} s={s} i={i} estado={estado(s)} onAbrir={() => setAberto(s)} />
          ))}
        </div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="mt-5 text-[11px] tracking-[0.35em] text-white/55 uppercase">
          sem dicks
        </motion.p>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2 }}
          onClick={onSair}
          className="mt-10 rounded-full bg-[#F3DFA8] px-7 py-3 text-sm font-medium whitespace-nowrap text-[#2E2A26] active:scale-[0.98]"
        >
          voltar
        </motion.button>
      </div>

      <AnimatePresence>{aberto && <SegredoAberto s={aberto} achados={achados.length} onFechar={() => setAberto(null)} />}</AnimatePresence>
    </motion.div>
  )
}
