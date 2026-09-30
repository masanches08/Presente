import { CoracaoCheio } from './Icons'

/** Linha dourada fininha com um coraçãozinho no meio. */
export function Ornamento({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-dourado ${className}`} aria-hidden>
      <span className="h-px w-12 bg-linear-to-r from-transparent to-dourado/60" />
      <CoracaoCheio className="size-2.5" />
      <span className="h-px w-12 bg-linear-to-l from-transparent to-dourado/60" />
    </div>
  )
}
