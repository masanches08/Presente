import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// A pergunta do login aparece só na PRIMEIRA vez que alguém entra num aparelho.
// Depois disso o aparelho guarda a entrada dele e, se a sessão cair por qualquer motivo
// (no meio do uso ou de um dia pro outro), entra de novo sozinho, sem perguntar nada.
// Só volta a perguntar se apertar "sair".
//
// ⚠️ Sair sempre com scope 'local' (só este aparelho): o padrão do Supabase ('global')
// desconecta a conta em TODOS os aparelhos.

const ENTRADA = 'nosso-lar:entrada'
interface Entrada {
  email: string
  senha: string
}

/** Guarda (ou apaga) a entrada deste aparelho: a conta e a senha técnica que a pergunta devolveu */
export function guardarEntrada(e: Entrada | null) {
  try {
    if (e) localStorage.setItem(ENTRADA, JSON.stringify(e))
    else localStorage.removeItem(ENTRADA)
  } catch {
    // (sem armazenamento: só vai perguntar de novo se a sessão cair)
  }
}

function lerEntrada(): Entrada | null {
  try {
    const e = JSON.parse(localStorage.getItem(ENTRADA) ?? 'null') as Entrada | null
    return e?.email && e.senha ? e : null
  } catch {
    return null
  }
}

/** Entra de novo sozinho com a entrada guardada (ou `null` se não tiver / não der) */
async function entrarDeNovo(): Promise<Session | null> {
  const e = lerEntrada()
  if (!supabase || !e) return null
  const { data, error } = await supabase.auth.signInWithPassword({ email: e.email, password: e.senha })
  // (resposta "senha errada" = a entrada guardada não vale mais: aí pergunta de novo; sem internet, guarda e tenta depois)
  if (error && error.status === 400) guardarEntrada(null)
  return data.session ?? null
}

// Quando o site passou a ter uma conta pra cada um, todo aparelho precisou responder a pergunta de novo
// uma vez (senão continuaria na conta antiga, a do casal, e o site acharia que é a Camila em todo lugar)
const DUAS_CONTAS = 'nosso-lar:login-duas-contas'
function jaRespondeuDeNovo() {
  try {
    const ja = localStorage.getItem(DUAS_CONTAS) === '1'
    localStorage.setItem(DUAS_CONTAS, '1')
    return ja
  } catch {
    return true
  }
}

/** true enquanto o próprio usuário está saindo (apertou "sair"): aí não entra de novo sozinho */
let saindo = false

/** Quem está logado (ou `null`). `pronto` = já verificamos. Sem Supabase, sempre "liberado". */
export function useSessao() {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [pronto, setPronto] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return
    const cliente = supabase
    cliente.auth.getSession().then(async ({ data }) => {
      let s = data.session
      const ja = jaRespondeuDeNovo()
      if (s && !ja) {
        await cliente.auth.signOut({ scope: 'local' })
        s = null
      }
      // abriu o site e a sessão tinha caído: entra sozinho com a entrada guardada
      if (!s && ja) s = await entrarDeNovo()
      setSessao(s)
      setPronto(true)
    })
    const { data } = cliente.auth.onAuthStateChange((evento, s) => {
      if (evento === 'SIGNED_OUT' && !saindo) {
        // a sessão caiu no meio do uso, sem ninguém pedir: entra de novo sozinho, sem mostrar a pergunta
        // (fora do aviso: chamar o Supabase dentro dele trava a biblioteca)
        const tentar = (vez: number) =>
          void entrarDeNovo().then((nova) => {
            if (nova) setSessao(nova)
            // sem internet agora: continua no site e tenta de novo daqui a pouco
            else if (lerEntrada() && vez < 20) window.setTimeout(() => tentar(vez + 1), 15000)
            else setSessao(null)
          })
        window.setTimeout(() => tentar(0), 0)
        return
      }
      setSessao(s)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return { sessao, pronto, precisaLogin: !!supabase && pronto && !sessao }
}

/** Sai só deste aparelho (os outros continuam entrando normalmente) e esquece a entrada guardada */
export async function sair() {
  saindo = true
  guardarEntrada(null)
  try {
    await supabase?.auth.signOut({ scope: 'local' })
  } finally {
    saindo = false
  }
}
