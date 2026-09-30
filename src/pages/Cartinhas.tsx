import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Envelope, SeloCera } from '../components/Envelope'
import { IconeFechar } from '../components/Icons'
import { Ornamento } from '../components/Ornamento'
import { PageHeader } from '../components/PageHeader'
import { ABRA_QUANDO, ASSINATURA, CARTAS, type Carta } from '../data/cartas'
import { formatarData, lerData } from '../lib/datas'

const ainda = (t: string) => t.trim().startsWith('TODO')

/** A carta aberta, em papel, ocupando a tela */
function CartaAberta({ carta, onFechar }: { carta: Carta; onFechar: () => void }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onFechar])

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto bg-grafite/40 px-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onFechar}
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
    >
      <motion.article
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 60, opacity: 0, rotate: -1.5 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-lg rounded-[6px] px-7 pt-12 pb-14 shadow-2xl sm:px-10"
        style={{
          // papel de carta: creme, com leve textura e linhas bem clarinhas
          background:
            'repeating-linear-gradient(to bottom, transparent 0 35px, rgb(154 107 60 / 0.07) 35px 36px), radial-gradient(120% 80% at 30% 0%, #FFFDF8, #F8F0E1 70%, #F1E5CF)',
        }}
      >
        <button onClick={onFechar} className="absolute top-3 right-3 grid size-10 place-items-center rounded-full text-grafite/40 active:bg-grafite/5" aria-label="Fechar carta">
          <IconeFechar className="size-5" />
        </button>
        <div className="absolute -top-5 left-1/2 -translate-x-1/2">
          <SeloCera cor={carta.selo} tamanho={52} />
        </div>

        {carta.data && <p className="text-right font-serif text-base text-grafite/50 italic">{formatarData(lerData(carta.data))}</p>}
        {ainda(carta.titulo) ? null : <h2 className="mt-4 font-serif text-[2.1rem] leading-tight font-medium">{carta.titulo}</h2>}
        <Ornamento className="my-6" />

        {ainda(carta.texto) ? (
          <p className="py-10 text-center font-serif text-2xl text-grafite/50 italic">esta cartinha ainda está sendo escrita ♡</p>
        ) : (
          <div className="space-y-5 font-serif text-[1.35rem] leading-[1.7] whitespace-pre-line text-grafite/90">{carta.texto}</div>
        )}

        <p className="mt-10 text-right font-serif text-2xl text-terracota italic">{ASSINATURA}</p>
      </motion.article>
    </motion.div>
  )
}

export default function Cartinhas() {
  const [abrindo, setAbrindo] = useState<string | null>(null)
  const [aberta, setAberta] = useState<Carta | null>(null)

  const abrir = (c: Carta) => {
    setAbrindo(c.id)
    // deixa a animação do envelope acontecer antes de mostrar a carta
    setTimeout(() => {
      setAberta(c)
      setAbrindo(null)
    }, 950)
  }

  return (
    <div className="px-5">
      <PageHeader sobretitulo="correspondência" titulo="Cartinhas" subtitulo="palavras guardadas pra você" />

      <div className="grid grid-cols-2 gap-x-4 gap-y-8">
        {CARTAS.map((c) => (
          <Envelope key={c.id} carta={c} abrindo={abrindo === c.id} onClick={() => abrir(c)} />
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="sobretitulo">abra quando…</p>
        <p className="mt-2 font-serif text-lg text-grafite/55 italic">pra cada momento, uma carta</p>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8">
        {ABRA_QUANDO.map((c) => (
          <Envelope key={c.id} carta={c} abrindo={abrindo === c.id} onClick={() => abrir(c)} />
        ))}
      </div>

      {/* fora da folha (portal), pra cobrir a tela toda */}
      {createPortal(<AnimatePresence>{aberta && <CartaAberta carta={aberta} onFechar={() => setAberta(null)} />}</AnimatePresence>, document.body)}
    </div>
  )
}
