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

// pegos neste aparelho que ainda não chegaram na nuvem (sem internet na hora, por exemplo)
const CHAVE_PENDENTES = 'nosso-lar:desbloqueios-pendentes'

// teste: ?resetar-pistas apaga tudo (aqui já, e no Supabase assim que estiver logado)
let resetarNaNuvem = false
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('resetar-pistas')) {
  atuais = []
  gravar(CHAVE, [])
  gravar(CHAVE_REVELADOS, [])
  gravar(CHAVE_PENDENTES, [])
  resetarNaNuvem = true
}

/**
 * Com o Supabase, quem manda é o banco: o aparelho fica igual a ele (mais o que foi pego aqui e ainda não subiu).
 * Assim um "achado" velho guardado num aparelho não desbloqueia nada sozinho.
 */
async function sincronizar() {
  if (!supabase) return
  if (resetarNaNuvem) {
    const { error } = await supabase.from('desbloqueios').delete().neq('id', '')
    if (!error) resetarNaNuvem = false
  }
  // o que foi pego aqui e ainda não subiu: sobe agora
  const pendentes = ler(CHAVE_PENDENTES)
  if (pendentes.length) {
    const { error } = await supabase.from('desbloqueios').upsert(pendentes.map((id) => ({ id })))
    if (!error) gravar(CHAVE_PENDENTES, [])
  }
  const { data, error } = await supabase.from('desbloqueios').select('id')
  if (error || !data) return // sem tabela / sem internet: fica com o que tem no aparelho
  const daNuvem = [...new Set([...(data as { id: string }[]).map((d) => d.id), ...ler(CHAVE_PENDENTES)])]
  // o que não está mais no banco também deixa de contar como "já revelado" neste aparelho
  gravar(
    CHAVE_REVELADOS,
    ler(CHAVE_REVELADOS).filter((id) => daNuvem.includes(id)),
  )
  if (daNuvem.length !== atuais.length || daNuvem.some((id) => !atuais.includes(id))) {
    atuais = daNuvem
    gravar(CHAVE, atuais)
    avisar()
  }
}

// confere o banco assim que ela entra no site (e de novo se logar depois)
if (supabase) {
  supabase.auth.onAuthStateChange((_evento, sessao) => {
    // (fora do aviso: chamar o banco dentro dele trava a biblioteca do Supabase)
    if (sessao) window.setTimeout(() => void sincronizar(), 0)
  })
}

export function desbloquear(id: string) {
  if (atuais.includes(id)) return
  atuais = [...atuais, id]
  gravar(CHAVE, atuais)
  avisar()
  if (!supabase) return
  gravar(CHAVE_PENDENTES, [...ler(CHAVE_PENDENTES), id])
  // (o pedido só é enviado com o .then)
  supabase
    .from('desbloqueios')
    .upsert({ id })
    .then(({ error }) => {
      if (!error) gravar(CHAVE_PENDENTES, ler(CHAVE_PENDENTES).filter((p) => p !== id))
    })
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
