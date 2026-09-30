import { isSameDay, startOfMonth } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Calendario } from '../components/Calendario'
import { FormularioData } from '../components/FormularioData'
import { CoracaoCheio, IconeMais } from '../components/Icons'
import { ItemData } from '../components/ItemData'
import { PageHeader } from '../components/PageHeader'
import type { DataImportante } from '../data/datas'
import { useDatas } from '../hooks/useDatas'
import { useHoje } from '../hooks/useHoje'
import { sair } from '../hooks/useSessao'
import { ehNossoDia, formatarData, lerData, paraIso } from '../lib/datas'

export default function NossosDias() {
  const hoje = useHoje()
  const { datas, adicionar, editar, apagar, carregando, erro, online } = useDatas()

  const [mes, setMes] = useState(() => startOfMonth(hoje))
  const [selecionado, setSelecionado] = useState(hoje)
  const [form, setForm] = useState<{ aberto: boolean; editando: DataImportante | null; dataInicial?: string }>({
    aberto: false,
    editando: null,
  })

  const hojeIso = paraIso(hoje)
  const proximas = datas.filter((d) => d.data >= hojeIso)
  const passadas = datas.filter((d) => d.data < hojeIso).reverse()
  const doDia = datas.filter((d) => isSameDay(lerData(d.data), selecionado))

  const abrirNova = (dataInicial?: string) => setForm({ aberto: true, editando: null, dataInicial })
  const abrirEdicao = (d: DataImportante) => setForm({ aberto: true, editando: d })
  const fechar = () => setForm((f) => ({ ...f, aberto: false }))

  return (
    <div className="px-5">
      <PageHeader sobretitulo="o nosso calendário" titulo="Nossos Dias" subtitulo="todo dia 24 é nosso" />

      <Calendario
        mes={mes}
        onMudarMes={setMes}
        hoje={hoje}
        selecionado={selecionado}
        onSelecionar={setSelecionado}
        datas={datas}
      />

      {/* O que tem no dia selecionado */}
      <AnimatePresence mode="wait">
        <motion.section
          key={paraIso(selecionado)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-6 px-1"
        >
          <p className="font-serif text-xl italic first-letter:uppercase">{formatarData(selecionado, "EEEE, d 'de' MMMM")}</p>

          {ehNossoDia(selecionado) && (
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-terracota/10 px-3 py-1.5 text-[13px] font-medium text-terracota">
              <CoracaoCheio className="size-3" /> dia 24, o nosso dia
            </p>
          )}

          {doDia.length > 0 ? (
            <ul className="mt-2 -mx-3">
              {doDia.map((d) => (
                <ItemData key={d.id} data={d} hoje={hoje} onClick={() => abrirEdicao(d)} />
              ))}
            </ul>
          ) : (
            <button
              onClick={() => abrirNova(paraIso(selecionado))}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-dourado/40 py-4 text-sm text-grafite/55 active:bg-grafite/5"
            >
              <IconeMais className="size-4" /> marcar algo neste dia
            </button>
          )}
        </motion.section>
      </AnimatePresence>

      <button
        onClick={() => abrirNova()}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-terracota py-4 font-medium tracking-wide text-creme shadow-suave transition active:scale-[0.98]"
      >
        <IconeMais className="size-5" /> Adicionar data importante
      </button>

      <ListaSecao titulo="próximas" vazio="Nenhuma data marcada pela frente, ainda.">
        {proximas.map((d) => (
          <ItemData key={d.id} data={d} hoje={hoje} onClick={() => abrirEdicao(d)} />
        ))}
      </ListaSecao>

      <ListaSecao titulo="já vividas" vazio={carregando ? 'Buscando as nossas datas…' : 'As nossas lembranças vão aparecer aqui.'}>
        {passadas.map((d) => (
          <ItemData key={d.id} data={d} hoje={hoje} onClick={() => abrirEdicao(d)} />
        ))}
      </ListaSecao>

      {erro && <p className="mt-6 rounded-2xl bg-terracota/10 px-4 py-3 text-center font-serif text-lg text-terracota italic">{erro}</p>}

      <p className="mt-12 text-center text-[12px] text-grafite/40">
        {online ? 'sincronizado entre os nossos celulares ♡' : 'modo local: as datas ficam só neste aparelho'}
      </p>
      {online && (
        <button onClick={() => void sair()} className="mx-auto mt-2 block rounded-full px-4 py-2 text-[13px] text-grafite/45 active:bg-grafite/5">
          sair
        </button>
      )}

      <FormularioData
        aberto={form.aberto}
        editando={form.editando}
        dataInicial={form.dataInicial}
        onFechar={fechar}
        onSalvar={(dados) => {
          if (form.editando) editar(form.editando.id, dados)
          else adicionar(dados)
          // pula o calendário pro mês da data salva
          const dia = lerData(dados.data)
          setMes(startOfMonth(dia))
          setSelecionado(dia)
          fechar()
        }}
        onApagar={
          form.editando
            ? () => {
                apagar(form.editando!.id)
                fechar()
              }
            : undefined
        }
      />
    </div>
  )
}

function ListaSecao({ titulo, vazio, children }: { titulo: string; vazio: string; children: React.ReactNode[] }) {
  return (
    <section className="mt-10">
      <p className="sobretitulo px-1">{titulo}</p>
      {children.length > 0 ? (
        <ul className="mt-3 -mx-2">
          <AnimatePresence initial={false}>{children}</AnimatePresence>
        </ul>
      ) : (
        <p className="mt-3 px-1 font-serif text-lg text-grafite/45 italic">{vazio}</p>
      )}
    </section>
  )
}
