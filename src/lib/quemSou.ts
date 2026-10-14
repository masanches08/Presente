import { useSyncExternalStore } from 'react'
import { CONFIG } from '../config'
import { supabase } from './supabase'

// Quem está usando o site agora. Cada um tem a sua conta (a resposta da pergunta do login decide qual),
// então é a conta logada que diz: é ela que define de quem é a cartinha, pra quem vai e em qual celular chega o aviso.
// Sem Supabase (modo de teste, tudo só no aparelho) não tem login: aí o aparelho escolhe uma vez.

export type Pessoa = 'ele' | 'ela'

const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((f) => f())

// ---------------- com Supabase: pela conta logada ----------------

let daConta: Pessoa | null = null
const pessoaDoEmail = (email?: string | null): Pessoa | null =>
  email === CONFIG.contas.ele ? 'ele' : email === CONFIG.contas.ela ? 'ela' : null

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    daConta = pessoaDoEmail(data.session?.user.email)
    avisar()
  })
  supabase.auth.onAuthStateChange((_evento, s) => {
    daConta = pessoaDoEmail(s?.user.email)
    avisar()
  })
}

// ---------------- sem Supabase: o aparelho escolhe ----------------

const CHAVE = 'nosso-lar:quem-sou'
function doAparelho(): Pessoa | null {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'ele' || v === 'ela' ? v : null
  } catch {
    return null
  }
}

/** Só no modo de teste (sem Supabase): escolhe quem está usando este aparelho */
export function definirQuemSou(p: Pessoa | null) {
  try {
    if (p) localStorage.setItem(CHAVE, p)
    else localStorage.removeItem(CHAVE)
  } catch {
    // (sem armazenamento: vale só até fechar)
  }
  avisar()
}

/** Dá pra escolher na mão? (só sem Supabase) */
export const escolhaManual = !supabase

export function useQuemSou() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => (supabase ? daConta : doAparelho()),
    () => null,
  )
}

export const nomeDe = (p: Pessoa) => CONFIG.pessoas[p]
export const outraPessoa = (p: Pessoa): Pessoa => (p === 'ele' ? 'ela' : 'ele')
