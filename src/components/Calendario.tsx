import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { DataImportante } from '../data/datas'
import { ehNossoDia, formatarData, paraIso } from '../lib/datas'
import { CoracaoCheio, SetaDireita, SetaEsquerda } from './Icons'

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

interface Props {
  mes: Date
  onMudarMes: (mes: Date) => void
  hoje: Date
  selecionado: Date
  onSelecionar: (dia: Date) => void
  datas: DataImportante[]
}

/** Calendário mensal: dá pra trocar de mês pelas setas ou arrastando pro lado. */
export function Calendario({ mes, onMudarMes, hoje, selecionado, onSelecionar, datas }: Props) {
  const [direcao, setDirecao] = useState(0)

  const mudar = (delta: number) => {
    setDirecao(delta)
    onMudarMes(addMonths(mes, delta))
  }

  const dias = eachDayOfInterval({
    start: startOfWeek(startOfMonth(mes)),
    end: endOfWeek(endOfMonth(mes)),
  })

  // agrupa as datas por dia pra achar rápido
  const porDia = new Map<string, DataImportante[]>()
  for (const d of datas) porDia.set(d.data, [...(porDia.get(d.data) ?? []), d])

  const mostrandoMesAtual = isSameMonth(mes, hoje)

  return (
    <section className="cartao overflow-hidden px-4 pt-5 pb-4">
      <div className="flex items-center justify-between px-1">
        <button onClick={() => mudar(-1)} className="grid size-11 place-items-center rounded-full active:bg-grafite/5" aria-label="Mês anterior">
          <SetaEsquerda className="size-5" />
        </button>
        <div className="text-center">
          <p className="font-serif text-[1.7rem] leading-none font-medium capitalize">{formatarData(mes, 'MMMM')}</p>
          <p className="mt-1 text-xs tracking-[0.25em] text-grafite/50">{mes.getFullYear()}</p>
        </div>
        <button onClick={() => mudar(1)} className="grid size-11 place-items-center rounded-full active:bg-grafite/5" aria-label="Próximo mês">
          <SetaDireita className="size-5" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-7 text-center text-[11px] font-medium tracking-wider text-grafite/40">
        {DIAS_SEMANA.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <AnimatePresence mode="popLayout" initial={false} custom={direcao}>
        <motion.div
          key={paraIso(mes)}
          custom={direcao}
          variants={{
            entra: (dir: number) => ({ x: dir * 60, opacity: 0 }),
            fica: { x: 0, opacity: 1 },
            sai: (dir: number) => ({ x: dir * -60, opacity: 0 }),
          }}
          initial="entra"
          animate="fica"
          exit="sai"
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onDragEnd={(_, info) => {
            if (info.offset.x < -50) mudar(1)
            else if (info.offset.x > 50) mudar(-1)
          }}
          className="mt-2 grid touch-pan-y grid-cols-7 gap-y-1"
        >
          {dias.map((dia) => {
            const doMes = isSameMonth(dia, mes)
            const eventos = porDia.get(paraIso(dia)) ?? []
            const nosso = ehNossoDia(dia)
            const ehHoje = isSameDay(dia, hoje)
            const sel = isSameDay(dia, selecionado)

            return (
              <button
                key={dia.toISOString()}
                onClick={() => onSelecionar(dia)}
                className={`relative mx-auto flex aspect-square w-full max-w-12 flex-col items-center justify-center rounded-2xl text-[15px] transition-colors duration-200 ${
                  sel
                    ? 'bg-grafite text-creme'
                    : nosso && doMes
                      ? 'bg-terracota/8 text-terracota'
                      : doMes
                        ? 'active:bg-grafite/5'
                        : 'text-grafite/20'
                } ${ehHoje && doMes && !sel ? 'ring-1 ring-terracota/60' : ''}`}
                aria-label={formatarData(dia)}
                aria-pressed={sel}
              >
                <span className={`leading-none ${ehHoje || nosso ? 'font-semibold' : ''}`}>{dia.getDate()}</span>
                <span className="mt-1 flex h-1.5 items-center gap-0.5">
                  {nosso && doMes && <CoracaoCheio className={`size-2 ${sel ? 'text-rosado' : 'text-terracota'}`} />}
                  {doMes &&
                    eventos.slice(0, 2).map((e) => (
                      <span key={e.id} className={`size-1 rounded-full ${sel ? 'bg-creme' : 'bg-dourado'}`} />
                    ))}
                </span>
              </button>
            )
          })}
        </motion.div>
      </AnimatePresence>

      <div className="mt-3 flex h-8 items-center justify-between px-2 text-[12px] text-grafite/50">
        <span className="flex items-center gap-1.5">
          <CoracaoCheio className="size-2.5 text-terracota" /> o nosso dia
          <span className="ml-2 size-1.5 rounded-full bg-dourado" /> datas especiais
        </span>
        {!mostrandoMesAtual && (
          <button
            onClick={() => {
              setDirecao(hoje > mes ? 1 : -1)
              onMudarMes(startOfMonth(hoje))
              onSelecionar(hoje)
            }}
            className="rounded-full px-3 py-1.5 font-medium text-terracota active:bg-terracota/10"
          >
            hoje
          </button>
        )}
      </div>
    </section>
  )
}
