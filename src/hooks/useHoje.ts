import { useEffect, useState } from 'react'
import { diaDeHoje } from '../lib/tempo'

/** Devolve o dia de hoje e se atualiza sozinho quando vira a meia-noite. */
export function useHoje(): Date {
  const [hoje, setHoje] = useState(diaDeHoje)

  useEffect(() => {
    const id = setInterval(() => {
      const novo = diaDeHoje()
      setHoje((atual) => (atual.getTime() === novo.getTime() ? atual : novo))
    }, 10_000)
    return () => clearInterval(id)
  }, [])

  return hoje
}
