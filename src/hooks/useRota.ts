import { useEffect, useState } from 'react'
import { ROTAS, type RotaId } from '../lib/rotas'

// Navegação simples pelo "#" da URL (ex.: #/dias).
// Assim o botão "voltar" do celular funciona sem precisar de biblioteca.
function lerRota(): RotaId {
  const id = window.location.hash.replace(/^#\/?/, '')
  return ROTAS.find((r) => r.id === id)?.id ?? 'inicio'
}

export function useRota(): RotaId {
  const [rota, setRota] = useState(lerRota)

  useEffect(() => {
    const aoMudar = () => setRota(lerRota())
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [])

  return rota
}

export function irPara(rota: RotaId) {
  window.location.hash = rota === 'inicio' ? '/' : `/${rota}`
}
