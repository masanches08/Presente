import { createContext, useContext, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { FITAS, LARGURA_FOLHA, PAPEIS, type Enfeite, type FitaId, type PapelId, type SeloId } from '../data/enfeites'
import { SeloCera } from './Envelope'
import { Ornamento } from './Ornamento'

// A folha da cartinha. Ela tem sempre 600 "pontos" de largura e é só ampliada/reduzida pra caber na tela:
// assim o texto quebra igualzinho e os adesivos ficam no mesmo lugar no iPad e no celular.

/** Quanto a folha está ampliada/reduzida na tela (pra converter o arrastar do dedo em pontos da folha) */
const EscalaFolha = createContext(1)
export const useEscalaFolha = () => useContext(EscalaFolha)

function Escala({ children }: { children: ReactNode }) {
  const fora = useRef<HTMLDivElement>(null)
  const dentro = useRef<HTMLDivElement>(null)
  const [k, setK] = useState(1)
  const [altura, setAltura] = useState(0)
  useLayoutEffect(() => {
    const f = fora.current
    const d = dentro.current
    if (!f || !d) return
    const medir = () => {
      setK(Math.min(1.25, f.clientWidth / LARGURA_FOLHA))
      setAltura(d.offsetHeight)
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(f)
    ro.observe(d)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={fora} className="mx-auto w-full" style={{ maxWidth: LARGURA_FOLHA * 1.25, height: altura * k }}>
      <div ref={dentro} style={{ width: LARGURA_FOLHA, transform: `scale(${k})`, transformOrigin: 'top left' }}>
        <EscalaFolha.Provider value={k}>{children}</EscalaFolha.Provider>
      </div>
    </div>
  )
}

// bordinha branca de adesivo recortado (em volta do desenho) + sombrinha
const RECORTE =
  'drop-shadow(2.5px 0 0 #fff) drop-shadow(-2.5px 0 0 #fff) drop-shadow(0 2.5px 0 #fff) drop-shadow(0 -2.5px 0 #fff) drop-shadow(0 3px 5px rgb(46 42 38 / 0.28))'
// pontas "rasgadas" da fitinha
const PONTAS = 'polygon(0 6%, 3% 0, 97% 0, 100% 8%, 98% 30%, 100% 52%, 97% 75%, 100% 94%, 96% 100%, 4% 100%, 0 92%, 2% 70%, 0 48%, 3% 26%)'

/** O desenho de um enfeite (sem posição), do tamanho "1x" */
export function DesenhoEnfeite({ e, foto }: { e: Enfeite; foto?: string }) {
  if (e.tipo === 'adesivo')
    return (
      <span className="block leading-none select-none" style={{ fontSize: 76, filter: RECORTE }}>
        {e.valor}
      </span>
    )
  if (e.tipo === 'fita')
    return <span className="block" style={{ width: 180, height: 38, background: FITAS[e.valor as FitaId] ?? FITAS.listras, opacity: 0.9, clipPath: PONTAS }} />
  const w = 220
  return (
    <span className="block rounded-[6px] bg-white p-[9px] pb-[26px] shadow-[0_6px_16px_-4px_rgb(46_42_38/0.35)]">
      {foto ? (
        <img src={foto} alt="" draggable={false} className="block rounded-[3px] object-cover select-none" style={{ width: w, height: w / (e.proporcao ?? 1) }} />
      ) : (
        <span className="block rounded-[3px] bg-grafite/10" style={{ width: w, height: w / (e.proporcao ?? 1) }} />
      )}
    </span>
  )
}

/** Um enfeite no lugar dele (centro em x, y), girado e no tamanho escolhido */
export function EnfeiteNoLugar({ e, foto, children, estilo }: { e: Enfeite; foto?: string; children?: ReactNode; estilo?: CSSProperties }) {
  return (
    <div className="absolute" style={{ left: e.x, top: e.y, transform: `translate(-50%, -50%) rotate(${e.giro}deg) scale(${e.escala})`, ...estilo }}>
      <DesenhoEnfeite e={e} foto={foto} />
      {children}
    </div>
  )
}

interface Props {
  papel: PapelId
  selo: SeloId
  /** "14 de outubro de 2026" */
  data: string
  /** título e texto (no editor, os campos de escrever) */
  children: ReactNode
  /** quem assina */
  assinatura: string
  /** camada dos enfeites (por cima do texto) */
  enfeites: ReactNode
  aoTocarFolha?: () => void
}

/** A folha inteira: papel, selo, data, conteúdo, assinatura e os enfeites por cima */
export function PapelCarta({ papel, selo, data, children, assinatura, enfeites, aoTocarFolha }: Props) {
  const p = PAPEIS[papel] ?? PAPEIS.creme
  return (
    <Escala>
      <div
        className="relative rounded-[8px] px-[56px] pt-[70px] pb-[64px] shadow-[0_24px_60px_-20px_rgb(46_42_38/0.45)]"
        style={{ background: p.fundo, color: p.tinta, minHeight: 820 }}
        onPointerDown={(ev) => ev.target === ev.currentTarget && aoTocarFolha?.()}
      >
        <div className="pointer-events-none absolute top-[-28px] left-1/2 -translate-x-1/2">
          <SeloCera cor={selo} tamanho={58} />
        </div>
        <p className="text-right font-serif text-[21px] italic opacity-55">{data}</p>
        {children}
        <p className="mt-[40px] text-right font-serif text-[30px] text-terracota italic">{assinatura}</p>
        <div className="pointer-events-none absolute inset-0">
          <div className="pointer-events-auto">{enfeites}</div>
        </div>
      </div>
    </Escala>
  )
}

/** Título e texto só pra ler */
export function TextoCarta({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <>
      {/* (mesmas medidas do editor: título sempre ocupa a linha dele, texto no mínimo 8 linhas) */}
      <h2 className="mt-[18px] min-h-[46px] font-serif text-[40px] leading-[1.15] font-medium break-words">{titulo}</h2>
      <Ornamento className="my-[26px]" />
      <div className="min-h-[328px] font-serif text-[25px] leading-[41px] break-words whitespace-pre-wrap opacity-90">{texto}</div>
    </>
  )
}
