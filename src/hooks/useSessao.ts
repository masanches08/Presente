import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/** Quem está logado (ou `null`). `pronto` = já verificamos. Sem Supabase, sempre "liberado". */
export function useSessao() {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [pronto, setPronto] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setPronto(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])

  return { sessao, pronto, precisaLogin: !!supabase && pronto && !sessao }
}

export async function sair() {
  await supabase?.auth.signOut()
}
