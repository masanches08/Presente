import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Quais segredos da lua de mel já foram achados.
// Fica guardado neste aparelho e também no Supabase (tabela "desbloqueios"), pra valer em todos os aparelhos.
// "Revelado" = a animação do cadeado quebrando já foi mostrada neste aparelho.
// Pra testar de novo do zero: abra o site com ?resetar-pistas

const CHAVE = 'nosso-lar:desbloqueios'
const CHAVE_REVELADOS = 'nosso-lar:revelados'

function ler(chave: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(chave) ?? '[]')
  } catch {
    return []
  }
}
function gravar(chave: string, ids: string[]) {
  try {
    localStorage.setItem(chave, JSON.stringify([...new Set(ids)]))
  } catch {
    /* sem armazenamento: só não lembra */
  }
}

const ouvintes = new Set<(ids: string[]) => void>()
let atuais = ler(CHAVE)
const avisar = () => ouvintes.forEach((f) => f(atuais))

// teste: ?resetar-pistas apaga tudo (aqui e no Supabase)
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('resetar-pistas')) {
  atuais = []
  gravar(CHAVE, [])
  gravar(CHAVE_REVELADOS, [])
  supabase?.from('desbloqueios').delete().neq('id', '').then(() => {})
}

/** Busca no Supabase (se a tabela não existir ainda, fica só com o que tem no aparelho) */
async function sincronizar() {
  if (!supabase) return
  const { data, error } = await supabase.from('desbloqueios').select('id')
  if (error || !data) return
  const daNuvem = (data as { id: string }[]).map((d) => d.id)
  const juntos = [...new Set([...atuais, ...daNuvem])]
  // o que só tinha aqui sobe pra nuvem
  const faltam = atuais.filter((id) => !daNuvem.includes(id))
  if (faltam.length) await supabase.from('desbloqueios').upsert(faltam.map((id) => ({ id })))
  if (juntos.length !== atuais.length) {
    atuais = juntos
    gravar(CHAVE, atuais)
    avisar()
  }
}

export function desbloquear(id: string) {
  if (atuais.includes(id)) return
  atuais = [...atuais, id]
  gravar(CHAVE, atuais)
  avisar()
  // (o pedido só é enviado com o .then)
  supabase?.from('desbloqueios').upsert({ id }).then(() => {})
}

export const jaDesbloqueado = (id: string) => atuais.includes(id)

export const foiRevelado = (id: string) => ler(CHAVE_REVELADOS).includes(id)
export const marcarRevelado = (id: string) => gravar(CHAVE_REVELADOS, [...ler(CHAVE_REVELADOS), id])

/** A lista de segredos achados (atualiza sozinha) */
export function useDesbloqueios() {
  const [ids, setIds] = useState(atuais)
  useEffect(() => {
    ouvintes.add(setIds)
    void sincronizar()
    return () => {
      ouvintes.delete(setIds)
    }
  }, [])
  return ids
}
