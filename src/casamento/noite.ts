import { useFrame } from '@react-three/fiber'
import { useEffect } from 'react'
import { Color, Vector3 } from 'three'

// O casamento pode "anoitecer": na parada dos fogos o pôr do sol vira noite estrelada, com lua.
// NOITE.valor vai de 0 (pôr do sol) a 1 (noite) devagarinho; o céu, o mar e as luzes leem daqui a cada quadro.

export const NOITE = { valor: 0, alvo: 0 }

/** O clarão de cada estouro de fogos (a cena inteira acende de leve com a cor dele) */
export const CLARAO = { forca: 0, cor: new Color() }

/** Onde fica a lua (lá pro lado do mar, alta e à esquerda do sol) */
export const LUA = new Vector3(-0.3, 0.4, -0.86).normalize()

/** Faz a noite chegar (ou ir embora) aos poucos: uns 4 segundos */
export function RelogioNoite({ alvo }: { alvo: number }) {
  useEffect(() => {
    NOITE.alvo = alvo
  }, [alvo])
  // sai do casamento: volta pro pôr do sol na próxima vez
  useEffect(
    () => () => {
      NOITE.valor = 0
      NOITE.alvo = 0
    },
    [],
  )
  useFrame((_, dt) => {
    const d = NOITE.alvo - NOITE.valor
    NOITE.valor = Math.abs(d) < 0.002 ? NOITE.alvo : NOITE.valor + d * Math.min(1, dt * 0.9)
  })
  return null
}
