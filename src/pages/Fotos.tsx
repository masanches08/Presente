import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconeFechar, SetaDireita, SetaEsquerda } from '../components/Icons'
import { PageHeader } from '../components/PageHeader'
import { FOTOS, urlFoto, urlMini, type Foto } from '../data/fotos'
import { formatarData, lerData } from '../lib/datas'

/** Tela cheia: desliza pro lado pra trocar de foto */
function Visualizador({ indice, onTrocar, onFechar }: { indice: number; onTrocar: (i: number) => void; onFechar: () => void }) {
  const foto = FOTOS[indice]
  const parado = useReducedMotion()
  const [direcao, setDirecao] = useState(0)
  const ir = useCallback(
    (d: number) => {
      const novo = indice + d
      if (novo < 0 || novo >= FOTOS.length) return
      setDirecao(d)
      onTrocar(novo)
    },
    [indice, onTrocar],
  )

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
      if (e.key === 'ArrowRight') ir(1)
      if (e.key === 'ArrowLeft') ir(-1)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [ir, onFechar])

  // já deixa as vizinhas carregando
  useEffect(() => {
    for (const d of [-1, 1]) {
      const f = FOTOS[indice + d]
      if (f) new Image().src = urlFoto(f)
    }
  }, [indice])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-[#1C1916]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative z-10 flex items-center justify-between px-3 py-2 text-creme/80">
        <span className="px-3 text-sm tabular-nums">
          {indice + 1} / {FOTOS.length}
        </span>
        <button onClick={onFechar} className="grid size-11 place-items-center rounded-full active:bg-white/10" aria-label="Fechar">
          <IconeFechar className="size-6" />
        </button>
      </div>

      {/* fundo: a própria foto, desfocada (sem faixa preta em volta) */}
      <AnimatePresence initial={false}>
        <motion.img
          key={'fundo' + foto.arquivo}
          src={urlMini(foto)}
          alt=""
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="pointer-events-none absolute inset-0 size-full scale-125 object-cover blur-3xl"
        />
      </AnimatePresence>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direcao}>
          <motion.img
            key={foto.arquivo}
            src={urlFoto(foto)}
            alt={foto.legenda ?? ''}
            custom={direcao}
            variants={{
              entra: (d: number) => ({ x: d * 300, opacity: 0, scale: 1 }),
              // (e um zoom bem lentinho enquanto ela está aberta)
              fica: {
                x: 0,
                opacity: 1,
                scale: parado ? 1 : 1.04,
                transition: { x: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.4 }, scale: { duration: 14, ease: 'linear' } },
              },
              sai: (d: number) => ({ x: d * -300, opacity: 0, transition: { duration: 0.35 } }),
            }}
            initial="entra"
            animate="fica"
            exit="sai"
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) ir(1)
              else if (info.offset.x > 60) ir(-1)
            }}
            className="absolute inset-0 m-auto max-h-full max-w-full touch-pan-y object-contain px-2 select-none"
            draggable={false}
          />
        </AnimatePresence>
        {indice > 0 && (
          <button onClick={() => ir(-1)} className="absolute top-1/2 left-2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-creme sm:grid" aria-label="Anterior">
            <SetaEsquerda className="size-6" />
          </button>
        )}
        {indice < FOTOS.length - 1 && (
          <button onClick={() => ir(1)} className="absolute top-1/2 right-2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-creme sm:grid" aria-label="Próxima">
            <SetaDireita className="size-6" />
          </button>
        )}
      </div>

      <div className="relative min-h-24 px-6 pt-4 pb-6 text-center">
        {foto.legenda && <p className="font-serif text-2xl text-creme italic">{foto.legenda}</p>}
        {foto.data && <p className="mt-1 text-sm text-creme/50">{formatarData(lerData(foto.data))}</p>}
      </div>
    </motion.div>
  )
}

/** Uma polaroid: todas no mesmo formato (3:4), levemente tortinhas */
function Miniatura({ foto, indice, onClick }: { foto: Foto; indice: number; onClick: () => void }) {
  const [carregou, setCarregou] = useState(false)
  const parado = useReducedMotion()
  const giro = indice % 2 ? 1 : -1 // cada polaroid levemente torta pra um lado
  return (
    <motion.button
      onClick={onClick}
      initial={parado ? false : { opacity: 0, y: 28, rotate: giro * 4 }}
      whileInView={{ opacity: 1, y: 0, rotate: giro }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: (indice % 2) * 0.1 }}
      style={parado ? { rotate: giro } : undefined}
      whileTap={{ scale: 0.97 }}
      className="block w-full rounded-2xl bg-papel p-2 pb-7 text-left shadow-suave ring-1 ring-dourado/15"
    >
      <div className="aspect-[3/4] overflow-hidden rounded-lg bg-[#EFE6D8]">
        <img
          src={urlMini(foto)}
          alt={foto.legenda ?? ''}
          loading="lazy"
          decoding="async"
          onLoad={() => setCarregou(true)}
          className={`size-full object-cover ${carregou ? 'revelar' : 'opacity-0'}`}
        />
      </div>
      {foto.legenda && <p className="-mb-4 px-1 pt-2 font-serif text-base leading-tight text-grafite/70 italic">{foto.legenda}</p>}
    </motion.button>
  )
}

export default function Fotos() {
  const [aberta, setAberta] = useState<number | null>(null)

  return (
    <div className="px-4">
      <PageHeader sobretitulo="penduradas no varal" titulo="Nossas Fotos" subtitulo="os nossos momentos" />

      {FOTOS.length === 0 ? (
        // enquanto não tem fotos: molduras vazias esperando
        <>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className={`rounded-2xl bg-papel p-2 pb-8 shadow-suave ring-1 ring-dourado/15 ${i % 2 ? 'rotate-1' : '-rotate-1'}`}
              >
                <div
                  className="aspect-square rounded-lg"
                  style={{ background: `linear-gradient(${40 + i * 50}deg, #F2D7C4, #DDE8D2 60%, #F6ECDD)` }}
                />
              </div>
            ))}
          </div>
          <p className="mt-8 text-center font-serif text-xl text-grafite/50 italic">as nossas fotos vão morar aqui ♡</p>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 pb-6 sm:grid-cols-3">
          {FOTOS.map((f, i) => (
            <Miniatura key={f.arquivo} foto={f} indice={i} onClick={() => setAberta(i)} />
          ))}
        </div>
      )}

      {/* fora da folha (portal), pra cobrir a tela toda */}
      {createPortal(
        <AnimatePresence>{aberta !== null && <Visualizador indice={aberta} onTrocar={setAberta} onFechar={() => setAberta(null)} />}</AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
