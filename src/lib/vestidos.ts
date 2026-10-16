import { PADRAO, type Vestido } from '../atelie/modelo'
import { supabase } from './supabase'

// Os vestidos que ela desenha no Ateliê (o cantinho do píer).
// Com Supabase: tabela "vestidos", e o banco só deixa cada conta ver os PRÓPRIOS vestidos
// (supabase/vestidos.sql) — da conta dele não dá pra ver nenhum, nem pelo site nem pela API.
// Sem Supabase (ou se a tabela ainda não existir): ficam só neste aparelho.

export interface Desenho {
  id: string
  nome: string
  v: Vestido
  atualizado: string
}

const TABELA = 'vestidos'
const CHAVE = 'nosso-lar:vestidos'
const novoId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

/** Completa com o padrão (se um dia aparecer opção nova, os vestidos antigos continuam abrindo) */
const completo = (v: Partial<Vestido> | null | undefined): Vestido => ({ ...PADRAO, ...(v ?? {}) })

// ---------------- no aparelho ----------------

function lerLocal(): Desenho[] {
  try {
    const l = JSON.parse(localStorage.getItem(CHAVE) ?? '[]') as Desenho[]
    return l.map((d) => ({ ...d, v: completo(d.v) }))
  } catch {
    return []
  }
}
function gravarLocal(l: Desenho[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(l))
  } catch {
    // (sem espaço: fica só até fechar)
  }
}

// ---------------- na nuvem ----------------

/** A tabela existe? (se ainda não rodaram o SQL, tudo continua funcionando no aparelho) */
let nuvem = !!supabase

interface Linha {
  id: string
  nome: string
  config: Partial<Vestido>
  atualizado: string
}

export async function listarVestidos(): Promise<Desenho[]> {
  if (nuvem) {
    const { data, error } = await supabase!.from(TABELA).select('id, nome, config, atualizado').order('atualizado', { ascending: false })
    if (!error) return (data as Linha[]).map((l) => ({ id: l.id, nome: l.nome, v: completo(l.config), atualizado: l.atualizado }))
    console.warn('[ateliê] sem a tabela de vestidos, guardando no aparelho', error.message)
    nuvem = false
  }
  return lerLocal().sort((a, b) => b.atualizado.localeCompare(a.atualizado))
}

/** Cria um desenho novo (devolve com o id) */
export function novoDesenho(nome: string, v: Vestido): Desenho {
  return { id: novoId(), nome, v, atualizado: new Date().toISOString() }
}

export async function salvarVestido(d: Desenho) {
  const agora = { ...d, atualizado: new Date().toISOString() }
  if (nuvem) {
    // (o "dono" é preenchido pelo próprio banco com a conta logada)
    const { error } = await supabase!.from(TABELA).upsert({ id: agora.id, nome: agora.nome, config: agora.v, atualizado: agora.atualizado })
    if (!error) return agora
    console.warn('[ateliê] não salvou na nuvem, guardando no aparelho', error.message)
  }
  const l = lerLocal().filter((x) => x.id !== agora.id)
  gravarLocal([agora, ...l])
  return agora
}

export async function apagarVestido(id: string) {
  if (nuvem) {
    const { error } = await supabase!.from(TABELA).delete().eq('id', id)
    if (!error) return
  }
  gravarLocal(lerLocal().filter((x) => x.id !== id))
}
