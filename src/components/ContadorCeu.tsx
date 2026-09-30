import { motion } from 'framer-motion'
import { useContagem } from '../hooks/useContagem'
import type { ResultadoContador } from '../lib/contador'
import { formatarData } from '../lib/datas'

const dois = (n: number) => String(n).padStart(2, '0')

/** O contador escrito no céu, como o título de um filme. */
export function ContadorCeu({ c, visivel }: { c: ResultadoContador; visivel: boolean }) {
  const nossoDia = c.tipo === 'aniversario' || c.tipo === 'inicio'
  const r = useContagem(c.proximo)

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: visivel ? 1 : 0, y: visivel ? 0 : -14 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: visivel ? 0.2 : 0 }}
      className="texto-ceu pointer-events-none fixed inset-x-0 top-0 z-20 px-6 text-center"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2.2rem)' }}
    >
      {/* luz suave atrás do texto, pra ler bem mesmo em cima das árvores */}
      <div
        className="absolute inset-x-0 top-0 -z-10 mx-auto h-[130%] max-w-2xl"
        style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 30%, rgb(250 247 242 / 0.55), transparent 70%)' }}
        aria-hidden
      />
      <p className="sobretitulo text-[#9A6B3C]">{nossoDia ? 'hoje é o nosso dia' : 'estamos juntos há'}</p>

      {nossoDia ? (
        <h1 className="brilho-dourado mt-3 font-serif text-[2.9rem] leading-none font-semibold md:text-[4rem]">{c.principal}</h1>
      ) : (
        <>
          <h1 className="mt-3 font-serif text-[3.1rem] leading-none font-medium md:text-[4.2rem]">{c.principal}</h1>
          {c.complemento && (
            <p className="mt-1 font-serif text-[1.9rem] leading-tight text-terracota italic md:text-[2.5rem]">{c.complemento}</p>
          )}
        </>
      )}

      <p className="mt-4 text-[12.5px] tracking-wide md:text-sm text-grafite/65 tabular-nums">
        <span className="font-semibold text-grafite/85">{c.totalDias.toLocaleString('pt-BR')}</span> dias juntos
        <span className="mx-2 text-dourado">✦</span>
        {nossoDia
          ? `o próximo é ${formatarData(c.proximo, "d 'de' MMMM")}`
          : `dia 24 em ${r.dias}d ${dois(r.horas)}h ${dois(r.minutos)}m ${dois(r.segundos)}s`}
      </p>
    </motion.header>
  )
}
