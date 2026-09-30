import { motion } from 'framer-motion'
import type { Carta } from '../data/cartas'
import { CoracaoCheio } from './Icons'

const SELOS = {
  terracota: { base: '#B4532C', brilho: '#D9774C' },
  dourado: { base: '#A8823F', brilho: '#D6B06A' },
  salvia: { base: '#6E8A5C', brilho: '#9CB585' },
}

/** Selo de cera redondinho com um coração dourado */
export function SeloCera({ cor = 'terracota', tamanho = 46 }: { cor?: Carta['selo']; tamanho?: number }) {
  const s = SELOS[cor ?? 'terracota']
  return (
    <span
      className="grid place-items-center rounded-full shadow-[0_2px_6px_rgb(0_0_0/0.25)]"
      style={{
        width: tamanho,
        height: tamanho,
        background: `radial-gradient(circle at 35% 30%, ${s.brilho}, ${s.base} 60%, ${s.base})`,
        // bordinha irregular de cera derretida
        clipPath: 'polygon(50% 0%, 62% 4%, 74% 2%, 83% 11%, 95% 16%, 97% 30%, 100% 42%, 97% 55%, 100% 68%, 92% 80%, 84% 90%, 70% 95%, 58% 100%, 45% 97%, 32% 100%, 20% 92%, 9% 85%, 4% 72%, 0% 58%, 3% 45%, 0% 32%, 7% 20%, 16% 9%, 29% 4%, 40% 0%)',
      }}
    >
      <CoracaoCheio className="text-[#F3DFA8] drop-shadow-sm" style={{ width: tamanho * 0.38, height: tamanho * 0.38 }} />
    </span>
  )
}

/** Envelope de papel creme. `abrindo` faz a aba virar e a carta aparecer. */
export function Envelope({ carta, abrindo, onClick }: { carta: Carta; abrindo: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="group relative block w-full text-left [perspective:900px]"
      aria-label={`Abrir: ${carta.envelope ?? carta.titulo}`}
    >
      <div
        className="relative aspect-[4/3] w-full overflow-visible rounded-[14px] shadow-[0_10px_30px_-12px_rgb(46_42_38/0.35)]"
        style={{ background: 'linear-gradient(160deg, #FBF5EA 0%, #F3E8D6 55%, #EADCC4 100%)' }}
      >
        {/* a carta que sai de dentro */}
        <motion.div
          className="absolute inset-x-[7%] top-[8%] bottom-[10%] rounded-md bg-[#FFFDF8] shadow-sm"
          initial={false}
          animate={{ y: abrindo ? '-38%' : '0%' }}
          transition={{ delay: abrindo ? 0.35 : 0, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mx-auto mt-[12%] h-[3px] w-1/2 rounded bg-grafite/10" />
          <div className="mx-auto mt-2 h-[3px] w-2/3 rounded bg-grafite/10" />
        </motion.div>

        {/* abas de baixo e dos lados (a "bolsa" do envelope) */}
        <div
          className="absolute inset-0 rounded-[14px]"
          style={{
            background: 'linear-gradient(to top, #EFE3CF, #F6EDDF)',
            clipPath: 'polygon(0 0, 50% 55%, 100% 0, 100% 100%, 0 100%)',
          }}
        />
        <div className="absolute inset-0 rounded-[14px]" style={{ background: 'linear-gradient(115deg, rgb(0 0 0/0.04), transparent 40%)', clipPath: 'polygon(0 0, 50% 55%, 0 100%)' }} />

        {/* aba de cima, que vira pra abrir */}
        <motion.div
          className="absolute inset-x-0 top-0 h-[58%] origin-top"
          style={{ transformStyle: 'preserve-3d' }}
          initial={false}
          animate={{ rotateX: abrindo ? 178 : 0 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, #F7EEDF, #EADBC2)',
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
              filter: 'drop-shadow(0 2px 2px rgb(0 0 0 / 0.08))',
              backfaceVisibility: 'hidden',
            }}
          />
        </motion.div>

        {/* selo */}
        <motion.div
          className="absolute top-[58%] left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{ opacity: abrindo ? 0 : 1, scale: abrindo ? 0.8 : 1 }}
          transition={{ duration: 0.25 }}
        >
          <SeloCera cor={carta.selo} />
        </motion.div>
      </div>
      <p className="mt-3 px-1 text-center font-serif text-[1.15rem] leading-snug text-grafite/80 italic">{carta.envelope ?? carta.titulo}</p>
    </motion.button>
  )
}
