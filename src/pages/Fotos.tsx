import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EditorFoto } from '../components/EditorFoto'
import { IconeFechar, SetaDireita, SetaEsquerda } from '../components/Icons'
import { PageHeader } from '../components/PageHeader'
import { FOTOS, urlFoto, urlMini } from '../data/fotos'
import { useFotosEnviadas } from '../hooks/useFotosEnviadas'
import { formatarData, lerData } from '../lib/datas'
import type { FotoEnviada } from '../lib/fotosEnviadas'
import { abrirArquivo, gerarVersoes, type Fonte } from '../lib/prepararFoto'

/** Uma foto da galeria: as que vieram com o site e as que vocês mandaram pelo site */
interface Item {
  chave: string
  grande: string
  mini: string
  legenda?: string
  data?: string
  enviada?: FotoEnviada
}

function IconeLixo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 7h16M9.5 7V5h5v2M6.5 7l1 12.5h9l1-12.5M10 11v5.5M14 11v5.5" />
    </svg>
  )
}

/** Tela cheia: desliza pro lado pra trocar de foto */
function Visualizador({
  itens,
  indice,
  onTrocar,
  onFechar,
  onApagar,
}: {
  itens: Item[]
  indice: number
  onTrocar: (i: number) => void
  onFechar: () => void
  onApagar: (f: FotoEnviada) => Promise<void>
}) {
  const foto = itens[indice]
  const parado = useReducedMotion()
  const [direcao, setDirecao] = useState(0)
  const [confirmar, setConfirmar] = useState(false)
  const [apagando, setApagando] = useState(false)
  const ir = useCallback(
    (d: number) => {
      const novo = indice + d
      if (novo < 0 || novo >= itens.length) return
      setDirecao(d)
      setConfirmar(false)
      onTrocar(novo)
    },
    [indice, itens.length, onTrocar],
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
      const f = itens[indice + d]
      if (f) new Image().src = f.grande
    }
  }, [indice, itens])

  if (!foto) return null

  const apagar = async () => {
    if (!foto.enviada || apagando) return
    setApagando(true)
    try {
      await onApagar(foto.enviada)
      setConfirmar(false)
      if (itens.length <= 1) onFechar()
      else if (indice >= itens.length - 1) onTrocar(indice - 1)
    } finally {
      setApagando(false)
    }
  }

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
          {indice + 1} / {itens.length}
        </span>
        <div className="flex items-center gap-1">
          {/* só as fotos mandadas pelo site podem ser apagadas */}
          {foto.enviada &&
            (confirmar ? (
              <div className="flex items-center gap-1 rounded-full bg-white/10 py-1 pr-1 pl-3 text-sm">
                <span className="text-creme/80">apagar?</span>
                <button onClick={() => void apagar()} disabled={apagando} className="rounded-full px-3 py-1.5 text-[#F2B8A0] active:bg-white/10">
                  {apagando ? '…' : 'sim'}
                </button>
                <button onClick={() => setConfirmar(false)} className="rounded-full px-3 py-1.5 active:bg-white/10">
                  não
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmar(true)} className="grid size-11 place-items-center rounded-full active:bg-white/10" aria-label="Apagar esta foto">
                <IconeLixo className="size-5" />
              </button>
            ))}
          <button onClick={onFechar} className="grid size-11 place-items-center rounded-full active:bg-white/10" aria-label="Fechar">
            <IconeFechar className="size-6" />
          </button>
        </div>
      </div>

      {/* fundo: a própria foto, desfocada (sem faixa preta em volta) */}
      <AnimatePresence initial={false}>
        <motion.img
          key={'fundo' + foto.chave}
          src={foto.mini}
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
            key={foto.chave}
            src={foto.grande}
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
        {indice < itens.length - 1 && (
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
function Miniatura({ foto, indice, onClick }: { foto: Item; indice: number; onClick: () => void }) {
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
          src={foto.mini}
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

/** A última polaroid: vazia, pra pendurar uma foto nova */
function Adicionar({ indice, onEscolher }: { indice: number; onEscolher: () => void }) {
  const giro = indice % 2 ? 1 : -1
  return (
    <motion.button
      onClick={onEscolher}
      whileTap={{ scale: 0.97 }}
      style={{ rotate: giro }}
      className="block w-full rounded-2xl bg-papel/70 p-2 pb-7 text-left shadow-suave ring-1 ring-dourado/15"
      aria-label="Adicionar um momento"
    >
      <div className="grid aspect-[3/4] place-items-center rounded-lg border-2 border-dashed border-dourado/35 bg-[#F6EFE4]">
        <div className="flex flex-col items-center gap-2 text-grafite/45">
          <span className="grid size-12 place-items-center rounded-full bg-white/80 text-3xl leading-none font-light text-terracota shadow-suave">+</span>
          <span className="font-serif text-lg italic">adicionar momento</span>
        </div>
      </div>
    </motion.button>
  )
}

export default function Fotos() {
  const [aberta, setAberta] = useState<number | null>(null)
  const [fonte, setFonte] = useState<Fonte | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const seletor = useRef<HTMLInputElement>(null)
  const { fotos: enviadas, enviar, apagar, erro, naNuvem } = useFotosEnviadas()

  const itens = useMemo<Item[]>(
    () => [
      ...FOTOS.map((f) => ({ chave: f.arquivo, grande: urlFoto(f), mini: urlMini(f), legenda: f.legenda, data: f.data })),
      ...enviadas.map((f) => ({ chave: f.id, grande: f.grande, mini: f.mini, legenda: f.legenda, enviada: f })),
    ],
    [enviadas],
  )

  const escolheu = async (arquivo: File | undefined) => {
    if (seletor.current) seletor.current.value = ''
    if (!arquivo) return
    setAviso(null)
    try {
      setFonte(await abrirArquivo(arquivo))
    } catch {
      setAviso('Não consegui abrir esse arquivo. Se for foto .HEIC do iPhone, tenta mandar como JPG.')
    }
  }

  const fecharEditor = () => {
    if (fonte) URL.revokeObjectURL(fonte.url)
    setFonte(null)
  }

  return (
    <div className="px-4">
      <PageHeader sobretitulo="penduradas no varal" titulo="Nossas Fotos" subtitulo="os nossos momentos" />

      <div className="grid grid-cols-2 gap-x-3 gap-y-4 pb-6 sm:grid-cols-3">
        {itens.map((f, i) => (
          <Miniatura key={f.chave} foto={f} indice={i} onClick={() => setAberta(i)} />
        ))}
        <Adicionar indice={itens.length} onEscolher={() => seletor.current?.click()} />
      </div>
      {(aviso || erro) && <p className="-mt-2 pb-6 text-center font-serif text-lg text-grafite/55 italic">{aviso ?? erro}</p>}

      {/* escolher foto ou vídeo (do vídeo, fica o primeiro frame) */}
      <input ref={seletor} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => void escolheu(e.target.files?.[0])} />

      {/* fora da folha (portal), pra cobrir a tela toda */}
      {createPortal(
        <>
          <AnimatePresence>
            {aberta !== null && <Visualizador itens={itens} indice={aberta} onTrocar={setAberta} onFechar={() => setAberta(null)} onApagar={apagar} />}
          </AnimatePresence>
          <AnimatePresence>
            {fonte && (
              <EditorFoto
                key={fonte.url}
                fonte={fonte}
                naNuvem={naNuvem}
                onCancelar={fecharEditor}
                onGuardar={async (recorte, legenda) => {
                  const { grande, mini } = await gerarVersoes(fonte, recorte)
                  await enviar(grande, mini, legenda)
                  fecharEditor()
                }}
              />
            )}
          </AnimatePresence>
        </>,
        document.body,
      )}
    </div>
  )
}
