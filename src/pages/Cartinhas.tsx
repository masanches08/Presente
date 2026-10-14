import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { EditorCartinha } from '../components/EditorCartinha'
import { Envelope, SeloCera } from '../components/Envelope'
import { IconeFechar } from '../components/Icons'
import { Ornamento } from '../components/Ornamento'
import { PageHeader } from '../components/PageHeader'
import { EnfeiteNoLugar, PapelCarta, TextoCarta } from '../components/PapelCarta'
import { ABRA_QUANDO, ASSINATURA, CARTAS, type Carta } from '../data/cartas'
import { apagarCartinha, listarCartinhas, marcarLida, ouvirCartinhas, type Cartinha } from '../lib/cartinhas'
import { formatarData, lerData } from '../lib/datas'
import { definirQuemSou, escolhaManual, nomeDe, outraPessoa, useQuemSou, type Pessoa } from '../lib/quemSou'

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

/** Uma cartinha escrita pelo site, aberta em cima de tudo (com os adesivos e fotos) */
function CartinhaAberta({ c, eu, onFechar, onApagada }: { c: Cartinha; eu: Pessoa | null; onFechar: () => void; onApagada: () => void }) {
  const [apagando, setApagando] = useState(false)
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onFechar])

  const apagar = async () => {
    if (!window.confirm('Apagar essa cartinha? (some pros dois)')) return
    setApagando(true)
    try {
      await apagarCartinha(c)
      onApagada()
    } catch {
      setApagando(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto bg-grafite/40 px-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onFechar}
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2.5rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="relative mx-auto"
        style={{ maxWidth: 750 }}
        initial={{ y: 60, opacity: 0, rotate: -1.5 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <PapelCarta
          papel={c.papel}
          selo={c.selo}
          data={formatarData(new Date(c.criadaEm))}
          assinatura={`com amor, ${nomeDe(c.de)}`}
          enfeites={c.enfeites.map((e) => (
            <EnfeiteNoLugar key={e.id} e={e} foto={c.fotos[e.valor]} />
          ))}
        >
          <TextoCarta titulo={c.titulo} texto={c.texto} />
        </PapelCarta>
        <button onClick={onFechar} className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-papel/70 text-grafite/50 active:bg-grafite/5" aria-label="Fechar carta">
          <IconeFechar className="size-5" />
        </button>
        {eu === c.de && (
          <p className="mt-4 text-center text-sm text-creme/85">
            {c.lidaEm ? `${nomeDe(c.para)} já leu ♡` : `${nomeDe(c.para)} ainda não abriu`} ·{' '}
            <button onClick={apagar} disabled={apagando} className="underline underline-offset-4">
              {apagando ? 'apagando…' : 'apagar'}
            </button>
          </p>
        )}
      </motion.div>
    </motion.div>
  )
}

/** Envelope de uma cartinha do site (com a marquinha de "nova") */
function EnvelopeCartinha({ c, abrindo, nova, legenda, onClick }: { c: Cartinha; abrindo: boolean; nova: boolean; legenda: string; onClick: () => void }) {
  const carta: Carta = { id: c.id, titulo: c.titulo, envelope: c.titulo || legenda, texto: '', selo: c.selo }
  return (
    <div className="relative">
      <Envelope carta={carta} abrindo={abrindo} onClick={onClick} />
      {nova && <span className="absolute -top-2 -right-1 rounded-full bg-terracota px-2.5 py-1 text-[11px] font-medium tracking-wide text-creme shadow-suave">nova</span>}
      <p className="mt-1 text-center text-[12px] text-grafite/45">{formatarData(new Date(c.criadaEm), "d 'de' MMM")}</p>
    </div>
  )
}

/** "Quem está usando este aparelho?" (só no modo de teste, sem Supabase: com ele, quem decide é a conta) */
function QuemSou() {
  return (
    <div className="cartao mx-1 mb-10 p-6 text-center">
      <p className="font-serif text-2xl">Quem está usando este aparelho?</p>
      <p className="mt-2 text-sm text-grafite/55">É só uma vez: assim a cartinha sai no seu nome e chega pra pessoa certa.</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {(['ela', 'ele'] as Pessoa[]).map((p) => (
          <button key={p} onClick={() => definirQuemSou(p)} className="rounded-2xl bg-papel py-4 font-serif text-2xl shadow-suave ring-1 ring-dourado/30 active:scale-[0.98]">
            {nomeDe(p)}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Cartinhas() {
  const [abrindo, setAbrindo] = useState<string | null>(null)
  const [aberta, setAberta] = useState<Carta | null>(null)
  const [abertaSite, setAbertaSite] = useState<Cartinha | null>(null)
  const [escrevendo, setEscrevendo] = useState(false)
  const [cartinhas, setCartinhas] = useState<Cartinha[] | null>(null)
  const [falhou, setFalhou] = useState(false)
  const eu = useQuemSou()

  const carregar = useCallback(() => {
    listarCartinhas()
      .then((l) => {
        setCartinhas(l)
        setFalhou(false)
      })
      .catch(() => setFalhou(true))
  }, [])
  useEffect(() => {
    carregar()
    return ouvirCartinhas(carregar)
  }, [carregar])

  const abrir = (c: Carta) => {
    setAbrindo(c.id)
    // deixa a animação do envelope acontecer antes de mostrar a carta
    setTimeout(() => {
      setAberta(c)
      setAbrindo(null)
    }, 950)
  }
  const abrirSite = (c: Cartinha) => {
    setAbrindo(c.id)
    setTimeout(() => {
      setAbertaSite(c)
      setAbrindo(null)
      if (eu && c.para === eu && !c.lidaEm) void marcarLida(c).then(carregar).catch(() => {})
    }, 950)
  }

  const recebidas = eu && cartinhas ? cartinhas.filter((c) => c.para === eu) : []
  const enviadas = eu && cartinhas ? cartinhas.filter((c) => c.de === eu) : []

  return (
    <div className="px-5">
      <PageHeader sobretitulo="correspondência" titulo="Cartinhas" subtitulo="palavras guardadas pra você" />

      {!eu ? (
        escolhaManual && <QuemSou />
      ) : (
        <>
          <button
            onClick={() => setEscrevendo(true)}
            className="mx-auto mb-12 flex items-center gap-3 rounded-full bg-terracota py-3 pr-7 pl-3 text-creme shadow-suave active:scale-[0.98]"
          >
            <SeloCera cor="dourado" tamanho={34} />
            <span className="font-serif text-xl italic">escrever uma cartinha pra {nomeDe(outraPessoa(eu))}</span>
          </button>

          <div className="text-center">
            <p className="sobretitulo">pra você</p>
            <p className="mt-2 font-serif text-lg text-grafite/55 italic">o que {nomeDe(outraPessoa(eu))} escreveu</p>
          </div>
          {falhou && <p className="mt-6 text-center text-sm text-terracota">Não consegui buscar as cartinhas agora (sem internet?).</p>}
          {cartinhas && !recebidas.length && <p className="mt-6 text-center font-serif text-lg text-grafite/45 italic">quando chegar cartinha, ela aparece aqui ♡</p>}
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8">
            {recebidas.map((c) => (
              <EnvelopeCartinha key={c.id} c={c} abrindo={abrindo === c.id} nova={!c.lidaEm} legenda={`de ${nomeDe(c.de)}`} onClick={() => abrirSite(c)} />
            ))}
          </div>

          {enviadas.length > 0 && (
            <>
              <div className="mt-14 text-center">
                <p className="sobretitulo">que você mandou</p>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-x-3 gap-y-6">
                {enviadas.map((c) => (
                  <EnvelopeCartinha key={c.id} c={c} abrindo={abrindo === c.id} nova={false} legenda={`pra ${nomeDe(c.para)}`} onClick={() => abrirSite(c)} />
                ))}
              </div>
            </>
          )}
          {escolhaManual && (
            <p className="mt-8 text-center text-xs text-grafite/40">
              neste aparelho: {nomeDe(eu)} ·{' '}
              <button onClick={() => definirQuemSou(null)} className="underline underline-offset-4">
                trocar
              </button>
            </p>
          )}
          <Ornamento className="my-12" />
          <div className="mb-8 text-center">
            <p className="sobretitulo">guardadas</p>
          </div>
        </>
      )}

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
      {createPortal(
        <AnimatePresence>
          {abertaSite && (
            <CartinhaAberta
              c={abertaSite}
              eu={eu}
              onFechar={() => setAbertaSite(null)}
              onApagada={() => {
                setAbertaSite(null)
                carregar()
              }}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
      {createPortal(
        <AnimatePresence>
          {escrevendo && eu && (
            <EditorCartinha
              de={eu}
              onFechar={() => setEscrevendo(false)}
              onEnviada={() => {
                setEscrevendo(false)
                carregar()
              }}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
