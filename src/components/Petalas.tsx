import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'

const CORES = ['#C8643B', '#C9A86A', '#E8B4A0', '#F3DFB1']

// Número "aleatório" fixo, pra as pétalas não mudarem de lugar a cada render
function aleatorio(semente: number) {
  const x = Math.sin(semente * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

/** Pétalas caindo devagar pela tela: só aparece no nosso dia. */
export function Petalas({ quantidade = 16 }: { quantidade?: number }) {
  const reduzir = useReducedMotion()

  const petalas = useMemo(
    () =>
      Array.from({ length: quantidade }, (_, i) => ({
        esquerda: aleatorio(i + 1) * 100,
        atraso: aleatorio(i + 7) * 10,
        duracao: 10 + aleatorio(i + 13) * 8,
        tamanho: 8 + aleatorio(i + 21) * 8,
        balanco: 20 + aleatorio(i + 29) * 40,
        cor: CORES[i % CORES.length],
      })),
    [quantidade],
  )

  if (reduzir) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden" aria-hidden>
      {petalas.map((p, i) => (
        <motion.span
          key={i}
          className="absolute -top-8 block rounded-[60%_0_60%_0] opacity-70"
          style={{ left: `${p.esquerda}%`, width: p.tamanho, height: p.tamanho * 1.3, background: p.cor }}
          animate={{
            y: ['0vh', '110vh'],
            x: [0, p.balanco, -p.balanco / 2, p.balanco / 2],
            rotate: [0, 180, 300, 420],
          }}
          transition={{ duration: p.duracao, delay: p.atraso, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  )
}
