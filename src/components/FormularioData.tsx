import { AnimatePresence, motion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { EMOJIS_SUGERIDOS, type DataImportante, type NovaData } from '../data/datas'
import { IconeFechar } from './Icons'

interface Props {
  aberto: boolean
  /** Se vier preenchido, estamos editando essa data */
  editando?: DataImportante | null
  /** Data já escolhida ao abrir pra adicionar (aaaa-mm-dd) */
  dataInicial?: string
  onFechar: () => void
  onSalvar: (dados: NovaData) => void
  onApagar?: () => void
}

/** Folha que sobe de baixo (estilo app) pra adicionar ou editar uma data. */
export function FormularioData({ aberto, ...props }: Props) {
  return <AnimatePresence>{aberto && <Folha {...props} />}</AnimatePresence>
}

// A folha é montada de novo a cada abertura, então os campos já nascem preenchidos.
function Folha({ editando, dataInicial, onFechar, onSalvar, onApagar }: Omit<Props, 'aberto'>) {
  const [titulo, setTitulo] = useState(editando?.titulo ?? '')
  const [data, setData] = useState(editando?.data ?? dataInicial ?? '')
  const [emoji, setEmoji] = useState(editando?.emoji ?? '❤️')
  const [descricao, setDescricao] = useState(editando?.descricao ?? '')
  const [confirmarApagar, setConfirmarApagar] = useState(false)

  const valido = titulo.trim() && data

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (!valido) return
    onSalvar({ titulo: titulo.trim(), data, emoji: emoji.trim() || '❤️', descricao: descricao.trim() || undefined })
  }

  const campo =
    'w-full rounded-2xl border border-dourado/25 bg-creme/70 px-4 py-3.5 outline-none transition focus:border-terracota/50 focus:bg-papel'

  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        className="absolute inset-0 bg-grafite/35 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onFechar}
      />
      <motion.form
        onSubmit={enviar}
        role="dialog"
        aria-modal
        aria-label={editando ? 'Editar data' : 'Nova data'}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] max-w-lg overflow-y-auto rounded-t-[32px] bg-papel px-6 pt-3 shadow-2xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-grafite/15" />

        <div className="mt-4 flex items-center justify-between">
          <h2 className="font-serif text-3xl font-medium">{editando ? 'Editar data' : 'Nova data'}</h2>
          <button type="button" onClick={onFechar} className="grid size-10 place-items-center rounded-full text-grafite/50 active:bg-grafite/5" aria-label="Fechar">
            <IconeFechar className="size-5" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-grafite/60">Título</span>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={campo} placeholder="Ex.: Nossa primeira viagem" required />
          </label>

          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-grafite/60">Data</span>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={`${campo} min-h-[52px]`} required />
          </label>

          <div>
            <span className="mb-2 block text-[13px] font-medium text-grafite/60">Emoji</span>
            <div className="grid grid-cols-6 gap-2">
              {EMOJIS_SUGERIDOS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`grid aspect-square place-items-center rounded-2xl text-2xl transition ${
                    emoji === e ? 'bg-terracota/15 ring-1 ring-terracota/50' : 'bg-creme/70 active:bg-grafite/5'
                  }`}
                  aria-pressed={emoji === e}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className={`${campo} mt-2 text-center`}
              aria-label="Ou digite outro emoji"
              placeholder="ou digite outro emoji"
            />
          </div>

          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-grafite/60">
              Descrição <span className="font-normal text-grafite/40">(opcional)</span>
            </span>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className={`${campo} resize-none`} />
          </label>
        </div>

        <button
          type="submit"
          disabled={!valido}
          className="mt-7 w-full rounded-full bg-terracota py-4 font-medium tracking-wide text-creme shadow-suave transition active:scale-[0.98] disabled:opacity-40"
        >
          {editando ? 'Salvar' : 'Adicionar'}
        </button>

        {editando && onApagar && (
          <button
            type="button"
            onClick={() => (confirmarApagar ? onApagar() : setConfirmarApagar(true))}
            className={`mt-3 w-full rounded-full py-3.5 text-sm font-medium transition ${
              confirmarApagar ? 'bg-red-700/10 text-red-800' : 'text-grafite/50 active:bg-grafite/5'
            }`}
          >
            {confirmarApagar ? 'Toque de novo pra apagar' : 'Apagar esta data'}
          </button>
        )}
      </motion.form>
    </div>
  )
}
