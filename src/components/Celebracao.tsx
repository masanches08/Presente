import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { CONFIG } from '../config'
import { formatarMeses, DATA_INICIO } from '../lib/contador'
import type { Celebracao as TipoCelebracao } from '../lib/celebracao'
import { formatarData } from '../lib/datas'
import { CeuDeFesta } from './CeuDeFesta'

/** Bolinho de dois andares, em traço dourado, com a velinha acesa */
function Bolo() {
  return (
    <svg viewBox="0 0 120 120" className="mx-auto size-24" fill="none" stroke="#F3DFA8" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="22" y="72" width="76" height="30" rx="6" />
      <rect x="34" y="50" width="52" height="22" rx="5" />
      <path d="M22 84c8 6 14 6 19 0s11-6 19 0 14 6 19 0 11-6 19 0" opacity={0.7} />
      <path d="M34 60c6 5 11 5 17 0s11-5 17 0 12 5 18 0" opacity={0.7} />
      <path d="M14 104h92" />
      <path d="M60 50V36" />
      <motion.path
        d="M60 22c-4 5-5 8-5 10a5 5 0 0 0 10 0c0-2-1-5-5-10z"
        fill="#FFD27A"
        stroke="#FFB347"
        style={{ originX: '60px', originY: '36px' }}
        animate={{ scaleY: [1, 1.18, 0.92, 1.1, 1], scaleX: [1, 0.92, 1.06, 0.95, 1], opacity: [1, 0.85, 1, 0.9, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.circle cx="60" cy="30" r="14" fill="#FFD27A" stroke="none" animate={{ opacity: [0.18, 0.3, 0.18] }} transition={{ duration: 1.6, repeat: Infinity }} />
    </svg>
  )
}

/** 9 → "9" + "meses juntos"; 12 → "1" + "ano juntos"; 14 → "1 ano e 2 meses" + "juntos" */
function comoEscrever(meses: number): { numero: number | null; legenda: string } {
  if (meses < 12) return { numero: meses, legenda: meses === 1 ? 'mês juntos' : 'meses juntos' }
  if (meses % 12 === 0) return { numero: meses / 12, legenda: meses === 12 ? 'ano juntos' : 'anos juntos' }
  return { numero: null, legenda: 'juntos' }
}

const aparecer = (atraso: number) => ({
  initial: { opacity: 0, y: 14, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { delay: atraso, duration: 1.1, ease: [0.22, 1, 0.36, 1] as const },
})

/**
 * O "momento" de abertura no dia especial: aparece toda vez que ela abre o site nesse dia.
 * Depois de fechar, o mundo continua enfeitado (fogos leves no aniversário; pétalas e lanternas no dia 24).
 */
export function Celebracao({ celebracao, visivel }: { celebracao: NonNullable<TipoCelebracao>; visivel: boolean }) {
  const [aberta, setAberta] = useState(true)
  const aniversario = celebracao.tipo === 'aniversario'
  const tempoJuntos = celebracao.tipo === 'mesversario' ? comoEscrever(celebracao.meses) : { numero: null, legenda: '' }

  return (
    <>
      {/* depois de fechar: fogos bem de vez em quando, lá no céu */}
      {aniversario && visivel && !aberta && <CeuDeFesta modo="fogos" intensidade="leve" className="fixed inset-x-0 top-0 z-[15] h-[60vh]" />}

      <AnimatePresence>
        {visivel && aberta && (
          <motion.div
            key="celebracao"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.2 } }}
            transition={{ duration: 1.2 }}
            onClick={() => setAberta(false)}
            className={`fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden px-8 text-center text-white backdrop-blur-[3px] ${
              aniversario
                ? 'bg-[radial-gradient(ellipse_at_50%_38%,rgb(74_34_70/0.62),rgb(22_14_34/0.9))]'
                : 'bg-[radial-gradient(ellipse_at_50%_42%,rgb(52_36_70/0.55),rgb(12_16_34/0.9))]'
            }`}
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <CeuDeFesta modo={aniversario ? 'fogos' : 'lanternas'} className="absolute inset-0" />

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              {aniversario ? (
                <>
                  <motion.div {...aparecer(0.5)}>
                    <Bolo />
                  </motion.div>
                  <motion.p {...aparecer(1)} className="mt-6 text-[11px] tracking-[0.4em] text-[#F3DFA8]/80 uppercase">
                    hoje é o seu dia
                  </motion.p>
                  <motion.div {...aparecer(1.4)}>
                    <h1 className="brilho-champanhe mt-4 font-serif text-[3.4rem] leading-[0.95] font-semibold md:text-[5rem]">
                      Feliz
                      <br />
                      aniversário
                    </h1>
                  </motion.div>
                  {CONFIG.apelidoDela && (
                    <motion.p {...aparecer(2)} className="mt-4 font-serif text-3xl text-[#FFE9EE] italic">
                      {CONFIG.apelidoDela}
                    </motion.p>
                  )}
                </>
              ) : (
                <>
                  <motion.p {...aparecer(0.6)} className="text-[11px] tracking-[0.4em] text-[#F3DFA8]/80 uppercase">
                    hoje é dia 24
                  </motion.p>
                  <motion.div {...aparecer(1.1)} className="mt-3">
                    {tempoJuntos.numero !== null ? (
                      <p className="brilho-champanhe font-serif text-[8rem] leading-none font-semibold lining-nums md:text-[10rem]">{tempoJuntos.numero}</p>
                    ) : (
                      <p className="brilho-champanhe mt-4 font-serif text-[3.4rem] leading-tight font-semibold lining-nums md:text-[4.6rem]">{formatarMeses(celebracao.meses)}</p>
                    )}
                    <p className="-mt-1 font-serif text-3xl text-[#FFE9EE] italic">{tempoJuntos.legenda}</p>
                  </motion.div>
                  <motion.p {...aparecer(1.9)} className="mt-6 text-sm tracking-wide text-white/60">
                    desde {formatarData(DATA_INICIO, "d 'de' MMMM 'de' yyyy")}
                  </motion.p>
                </>
              )}

              <motion.button
                {...aparecer(aniversario ? 2.8 : 2.5)}
                onClick={() => setAberta(false)}
                className="mt-10 rounded-full bg-[#F3DFA8] px-7 py-3 text-sm font-medium text-[#2E2A26] shadow-[0_0_30px_rgb(243_223_168/0.35)] active:scale-[0.98]"
              >
                {aniversario ? 'ver o nosso mundo ♡' : 'continuar ♡'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
