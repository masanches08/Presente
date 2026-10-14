import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as PE } from 'react'
import { ADESIVOS, FITAS, LARGURA_FOLHA, PAPEIS, SELOS, type Enfeite, type FitaId, type PapelId } from '../data/enfeites'
import { enviarCartinha, guardarRascunho, lerRascunho, type Rascunho } from '../lib/cartinhas'
import { formatarData } from '../lib/datas'
import { abrirArquivo, fotoAdesivo } from '../lib/prepararFoto'
import { nomeDe, outraPessoa, type Pessoa } from '../lib/quemSou'
import { SeloCera } from './Envelope'
import { IconeFechar } from './Icons'
import { Ornamento } from './Ornamento'
import { DesenhoEnfeite, PapelCarta, useEscalaFolha } from './PapelCarta'

const novoId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** Segue o dedo (ou o mouse) até soltar */
function seguir(ev: PE, mover: (m: PointerEvent) => void) {
  ev.stopPropagation()
  ev.preventDefault()
  const alvo = ev.currentTarget as HTMLElement
  alvo.setPointerCapture(ev.pointerId)
  const soltar = () => {
    alvo.removeEventListener('pointermove', mover)
    alvo.removeEventListener('pointerup', soltar)
    alvo.removeEventListener('pointercancel', soltar)
  }
  alvo.addEventListener('pointermove', mover)
  alvo.addEventListener('pointerup', soltar)
  alvo.addEventListener('pointercancel', soltar)
}

interface EditavelProps {
  e: Enfeite
  selecionado: boolean
  onSelecionar: () => void
  onMudar: (m: Partial<Enfeite>) => void
  onApagar: () => void
}

/** Um enfeite que dá pra arrastar; selecionado, ganha o "x" (tirar) e a bolinha de girar/aumentar */
function EnfeiteEditavel({ e, selecionado, onSelecionar, onMudar, onApagar }: EditavelProps) {
  const k = useEscalaFolha()
  const ref = useRef<HTMLDivElement>(null)
  // os controles ficam sempre do mesmo tamanho na tela, seja qual for o tamanho do enfeite
  const t = 40 / (k * e.escala)

  const arrastar = (ev: PE) => {
    onSelecionar()
    const [x0, y0, ex, ey] = [ev.clientX, ev.clientY, e.x, e.y]
    seguir(ev, (m) => onMudar({ x: limitar(ex + (m.clientX - x0) / k, 0, LARGURA_FOLHA), y: Math.max(0, ey + (m.clientY - y0) / k) }))
  }
  const girar = (ev: PE) => {
    const b = ref.current!.getBoundingClientRect()
    const [cx, cy] = [b.left + b.width / 2, b.top + b.height / 2]
    const a0 = Math.atan2(ev.clientY - cy, ev.clientX - cx)
    const d0 = Math.max(10, Math.hypot(ev.clientX - cx, ev.clientY - cy))
    const [g0, s0] = [e.giro, e.escala]
    seguir(ev, (m) => {
      const a = Math.atan2(m.clientY - cy, m.clientX - cx)
      const d = Math.hypot(m.clientX - cx, m.clientY - cy)
      onMudar({ giro: g0 + ((a - a0) * 180) / Math.PI, escala: limitar((s0 * d) / d0, 0.35, 3.5) })
    })
  }

  return (
    <div ref={ref} className="absolute" style={{ left: e.x, top: e.y, transform: `translate(-50%, -50%) rotate(${e.giro}deg) scale(${e.escala})`, touchAction: 'none' }} onPointerDown={arrastar}>
      <DesenhoEnfeite e={e} foto={e.tipo === 'foto' ? e.valor : undefined} />
      {selecionado && (
        <>
          <span className="pointer-events-none absolute rounded-md border-dashed border-terracota" style={{ inset: -8 / e.escala, borderWidth: 2 / (k * e.escala) }} />
          <button
            className="absolute grid place-items-center rounded-full bg-grafite text-white shadow-md"
            style={{ width: t, height: t, left: -t / 2, top: -t / 2 }}
            onPointerDown={(ev) => {
              ev.stopPropagation()
              onApagar()
            }}
            aria-label="Tirar"
          >
            <IconeFechar style={{ width: t * 0.5, height: t * 0.5 }} />
          </button>
          <span
            className="absolute rounded-full border-white bg-terracota shadow-md"
            style={{ width: t, height: t, right: -t / 2, bottom: -t / 2, borderWidth: 3 / (k * e.escala), touchAction: 'none' }}
            onPointerDown={girar}
            aria-label="Girar e aumentar"
          />
        </>
      )}
    </div>
  )
}

type Aba = 'adesivos' | 'fitas' | 'foto' | 'papel'

/** Escrever uma cartinha: texto, papel, selo, adesivos, fitinhas e fotos. Envia pro outro. */
export function EditorCartinha({ de, onFechar, onEnviada }: { de: Pessoa; onFechar: () => void; onEnviada: () => void }) {
  const para = outraPessoa(de)
  const [r, setR] = useState<Rascunho>(() => {
    const g = lerRascunho()
    return g && g.de === de ? g : { de, para, titulo: '', texto: '', papel: 'creme', selo: 'terracota', enfeites: [] }
  })
  const [sel, setSel] = useState<string | null>(null)
  const [aba, setAba] = useState<Aba>('adesivos')
  const [estado, setEstado] = useState<'escrevendo' | 'enviando' | 'enviada'>('escrevendo')
  const [erro, setErro] = useState('')
  const [lendoFoto, setLendoFoto] = useState(false)
  const [hoje] = useState(() => formatarData(new Date()))
  const folha = useRef<HTMLDivElement>(null)
  const titulo = useRef<HTMLTextAreaElement>(null)
  const texto = useRef<HTMLTextAreaElement>(null)
  const arquivo = useRef<HTMLInputElement>(null)

  // não perde nada: o rascunho fica guardado no aparelho enquanto escreve
  useEffect(() => {
    const id = setTimeout(() => guardarRascunho(r), 400)
    return () => clearTimeout(id)
  }, [r])

  // a caixa de texto cresce junto com o que vai sendo escrito
  useLayoutEffect(() => {
    for (const t of [titulo.current, texto.current]) {
      if (!t) continue
      t.style.height = 'auto'
      t.style.height = `${t.scrollHeight}px`
    }
  }, [r.titulo, r.texto])

  const mudar = (id: string, m: Partial<Enfeite>) => setR((v) => ({ ...v, enfeites: v.enfeites.map((e) => (e.id === id ? { ...e, ...m } : e)) }))
  const selecionar = (id: string) => {
    setSel(id)
    // o tocado vai pra frente dos outros
    setR((v) => {
      const i = v.enfeites.findIndex((e) => e.id === id)
      if (i < 0 || i === v.enfeites.length - 1) return v
      const lista = [...v.enfeites]
      lista.push(...lista.splice(i, 1))
      return { ...v, enfeites: lista }
    })
  }

  /** Cola um enfeite no meio do pedaço da folha que está aparecendo na tela */
  const colar = (tipo: Enfeite['tipo'], valor: string, extra: Partial<Enfeite> = {}) => {
    const b = folha.current?.getBoundingClientRect()
    const k = b ? b.width / LARGURA_FOLHA : 1
    const x = b ? limitar((window.innerWidth / 2 - b.left) / k, 90, LARGURA_FOLHA - 90) : 300
    const y = b ? limitar((window.innerHeight * 0.4 - b.top) / k, 90, b.height / k - 90) : 300
    const e: Enfeite = { id: novoId(), tipo, valor, x: x + (Math.random() - 0.5) * 60, y: y + (Math.random() - 0.5) * 60, giro: (Math.random() - 0.5) * 16, escala: 1, ...extra }
    setR((v) => ({ ...v, enfeites: [...v.enfeites, e] }))
    setSel(e.id)
  }

  const escolherFoto = async (f: File | undefined) => {
    if (!f) return
    setLendoFoto(true)
    setErro('')
    try {
      const fonte = await abrirArquivo(f)
      const { blob, largura, altura } = await fotoAdesivo(fonte)
      URL.revokeObjectURL(fonte.url)
      const dados = await new Promise<string>((ok, falha) => {
        const leitor = new FileReader()
        leitor.onload = () => ok(leitor.result as string)
        leitor.onerror = () => falha(leitor.error)
        leitor.readAsDataURL(blob)
      })
      colar('foto', dados, { proporcao: largura / altura, escala: 0.9 })
    } catch {
      setErro('Não consegui abrir essa foto. Se for .HEIC, tenta mandar como JPG.')
    } finally {
      setLendoFoto(false)
    }
  }

  const vazia = !r.titulo.trim() && !r.texto.trim() && !r.enfeites.length
  const enviar = async () => {
    if (vazia || estado !== 'escrevendo') return
    setSel(null)
    setErro('')
    setEstado('enviando')
    try {
      await enviarCartinha({ ...r, para })
      guardarRascunho(null)
      setEstado('enviada')
      setTimeout(onEnviada, 1900)
    } catch {
      setEstado('escrevendo')
      setErro('Não deu pra enviar agora. Confere a internet e tenta de novo (o que você escreveu está guardado).')
    }
  }

  const abaBotao = (a: Aba, nome: string) => (
    <button
      key={a}
      onClick={() => setAba(a)}
      className={`rounded-full px-4 py-2 text-[13px] font-medium tracking-wide transition ${aba === a ? 'bg-terracota text-creme shadow-suave' : 'text-grafite/60'}`}
    >
      {nome}
    </button>
  )

  return (
    <motion.div className="fixed inset-0 z-[60] flex flex-col bg-[#EFE6D8]" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}>
      {/* topo: fechar (guarda o rascunho), pra quem é, enviar */}
      <div className="flex items-center justify-between gap-2 px-3 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
        <button onClick={onFechar} className="grid size-11 place-items-center rounded-full bg-papel/80 text-grafite/70 shadow-suave" aria-label="Fechar (fica guardado)">
          <IconeFechar className="size-5" />
        </button>
        <p className="font-serif text-xl text-grafite/70 italic">pra {nomeDe(para)} ♡</p>
        <button
          onClick={enviar}
          disabled={vazia || estado !== 'escrevendo'}
          className="rounded-full bg-terracota px-5 py-2.5 font-medium text-creme shadow-suave transition active:scale-[0.97] disabled:opacity-40"
        >
          {estado === 'enviando' ? 'enviando…' : 'enviar'}
        </button>
      </div>
      {erro && <p className="mx-4 mb-2 rounded-2xl bg-terracota/10 px-4 py-2 text-center text-sm text-terracota">{erro}</p>}

      {/* a folha */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-8 pb-64" onPointerDown={(ev) => ev.target === ev.currentTarget && setSel(null)}>
        <div ref={folha} className="mx-auto" style={{ maxWidth: LARGURA_FOLHA * 1.25 }}>
          <PapelCarta
            papel={r.papel}
            selo={r.selo}
            data={hoje}
            assinatura={`com amor, ${nomeDe(de)}`}
            aoTocarFolha={() => setSel(null)}
            enfeites={r.enfeites.map((e) => (
              <EnfeiteEditavel key={e.id} e={e} selecionado={sel === e.id} onSelecionar={() => selecionar(e.id)} onMudar={(m) => mudar(e.id, m)} onApagar={() => setR((v) => ({ ...v, enfeites: v.enfeites.filter((x) => x.id !== e.id) }))} />
            ))}
          >
            {/* (mesmas medidas da cartinha aberta: o que fica onde no editor fica igual pra quem lê) */}
            <textarea
              ref={titulo}
              value={r.titulo}
              onChange={(ev) => setR({ ...r, titulo: ev.target.value.replace(/\n/g, ' ') })}
              onFocus={() => setSel(null)}
              placeholder="um título (se quiser)"
              rows={1}
              className="mt-[18px] block w-full resize-none overflow-hidden bg-transparent p-0 font-serif font-medium outline-none placeholder:opacity-35"
              style={{ fontSize: 40, lineHeight: 1.15 }}
            />
            <Ornamento className="my-[26px]" />
            <textarea
              ref={texto}
              value={r.texto}
              onChange={(ev) => setR({ ...r, texto: ev.target.value })}
              onFocus={() => setSel(null)}
              placeholder="escreva aqui…"
              rows={8}
              className="block w-full resize-none overflow-hidden bg-transparent p-0 font-serif outline-none placeholder:opacity-35"
              style={{ fontSize: 25, lineHeight: '41px' }}
            />
          </PapelCarta>
        </div>
      </div>

      {/* a bandeja de enfeites */}
      <div className="fixed inset-x-0 bottom-0 z-10 px-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}>
        <div className="mx-auto max-w-2xl rounded-[28px] bg-papel/92 p-3 shadow-flutuante ring-1 ring-dourado/25 backdrop-blur-xl">
          <div className="flex justify-center gap-1">
            {abaBotao('adesivos', 'adesivos')}
            {abaBotao('fitas', 'fitinhas')}
            {abaBotao('foto', 'foto')}
            {abaBotao('papel', 'papel')}
          </div>
          <div className="mt-2 h-[112px] overflow-x-auto overflow-y-hidden">
            {aba === 'adesivos' && (
              <div className="flex h-full items-center gap-1 px-1">
                {ADESIVOS.flatMap((g) => g.itens).map((a) => (
                  <button key={a} onClick={() => colar('adesivo', a)} className="grid size-14 shrink-0 place-items-center rounded-2xl active:bg-grafite/5">
                    <span className="text-[34px] leading-none" style={{ filter: 'drop-shadow(1.5px 0 0 #fff) drop-shadow(-1.5px 0 0 #fff) drop-shadow(0 1.5px 0 #fff) drop-shadow(0 -1.5px 0 #fff)' }}>
                      {a}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {aba === 'fitas' && (
              <div className="flex h-full items-center justify-center gap-4">
                {(Object.keys(FITAS) as FitaId[]).map((f) => (
                  <button key={f} onClick={() => colar('fita', f, { giro: (Math.random() - 0.5) * 30 })} className="rounded-xl p-2 active:bg-grafite/5" aria-label={`fitinha ${f}`}>
                    <span className="block h-7 w-24 -rotate-6" style={{ background: FITAS[f], opacity: 0.9 }} />
                  </button>
                ))}
              </div>
            )}
            {aba === 'foto' && (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <button onClick={() => arquivo.current?.click()} disabled={lendoFoto} className="rounded-full bg-terracota px-6 py-3 font-medium text-creme shadow-suave active:scale-[0.97] disabled:opacity-50">
                  {lendoFoto ? 'preparando…' : 'escolher uma foto'}
                </button>
                <p className="text-xs text-grafite/50">ela vira um adesivo: arraste, gire e aumente pela bolinha</p>
                <input ref={arquivo} type="file" accept="image/*" className="hidden" onChange={(ev) => void escolherFoto(ev.target.files?.[0]).then(() => (ev.target.value = ''))} />
              </div>
            )}
            {aba === 'papel' && (
              <div className="flex h-full items-center justify-center gap-3 px-1">
                {(Object.keys(PAPEIS) as PapelId[]).map((p) => (
                  <button key={p} onClick={() => setR({ ...r, papel: p })} className="flex shrink-0 flex-col items-center gap-1">
                    <span className={`block h-14 w-11 rounded-md shadow-sm ring-2 ${r.papel === p ? 'ring-terracota' : 'ring-transparent'}`} style={{ background: PAPEIS[p].fundo }} />
                    <span className="text-[11px] text-grafite/60">{PAPEIS[p].nome}</span>
                  </button>
                ))}
                <span className="mx-1 h-12 w-px bg-grafite/10" />
                {SELOS.map((s) => (
                  <button key={s} onClick={() => setR({ ...r, selo: s })} className={`shrink-0 rounded-full p-1 ring-2 ${r.selo === s ? 'ring-terracota' : 'ring-transparent'}`} aria-label={`selo ${s}`}>
                    <SeloCera cor={s} tamanho={38} />
                  </button>
                ))}
                <span className="mx-1 h-12 w-px bg-grafite/10" />
                <button
                  onClick={() => window.confirm('Apagar tudo e começar uma cartinha nova?') && setR({ de, para, titulo: '', texto: '', papel: r.papel, selo: r.selo, enfeites: [] })}
                  className="shrink-0 rounded-full px-3 py-2 text-xs text-grafite/50 ring-1 ring-grafite/15"
                >
                  começar de novo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* enviada! o envelope fecha e voa */}
      <AnimatePresence>
        {estado === 'enviada' && (
          <motion.div className="fixed inset-0 z-20 grid place-items-center bg-[#EFE6D8]/85 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="text-center" initial={{ scale: 0.8, y: 20 }} animate={{ scale: [0.8, 1.05, 1], y: [20, 0, -260], opacity: [1, 1, 0] }} transition={{ duration: 1.8, times: [0, 0.35, 1], ease: 'easeInOut' }}>
              <SeloCera cor={r.selo} tamanho={90} />
            </motion.div>
            <motion.p className="absolute font-serif text-3xl text-grafite/80 italic" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1] }} transition={{ duration: 1.6, times: [0, 0.4, 1] }}>
              enviada pra {nomeDe(para)} ♡
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
