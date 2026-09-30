import { useEffect, useState } from 'react'
import { agora, inicioDoDia } from '../lib/tempo'

function calcular(alvo: Date) {
  const s = Math.floor(Math.max(0, inicioDoDia(alvo) - agora().getTime()) / 1000)
  return {
    dias: Math.floor(s / 86400),
    horas: Math.floor((s % 86400) / 3600),
    minutos: Math.floor((s % 3600) / 60),
    segundos: s % 60,
  }
}

/** Contagem regressiva ao vivo até a meia-noite (de São Paulo) do dia `alvo`. */
export function useContagem(alvo: Date) {
  const [restante, setRestante] = useState(() => calcular(alvo))
  useEffect(() => {
    const id = setInterval(() => setRestante(calcular(alvo)), 1000)
    return () => clearInterval(id)
  }, [alvo])
  return restante
}
