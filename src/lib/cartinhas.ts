import type { Enfeite, PapelId, SeloId } from '../data/enfeites'
import type { Pessoa } from './quemSou'
import { supabase } from './supabase'

// As cartinhas que vocês escrevem um pro outro pelo próprio site.
// Com Supabase: ficam no banco (tabela "cartinhas") e as fotos coladas na pasta privada "fotos/cartinhas/".
// Sem Supabase: ficam só neste aparelho (pra dar pra testar).

export interface Cartinha {
  id: string
  de: Pessoa
  para: Pessoa
  titulo: string
  texto: string
  papel: PapelId
  selo: SeloId
  enfeites: Enfeite[]
  lidaEm: string | null
  criadaEm: string
  /** endereço de cada foto colada (pelo `valor` do enfeite) */
  fotos: Record<string, string>
}

/** O que o editor monta (as fotos ainda estão dentro do aparelho, como imagem) */
export type Rascunho = Pick<Cartinha, 'de' | 'para' | 'titulo' | 'texto' | 'papel' | 'selo' | 'enfeites'>

const TABELA = 'cartinhas'
const PASTA = 'fotos'
const VALIDADE = 60 * 60 * 24 * 7

const novoId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
/** Foto que ainda não subiu pra nuvem (está no rascunho, como imagem) */
export const fotoLocal = (v: string) => v.startsWith('data:')

// ---------------- nuvem (Supabase) ----------------

interface Linha {
  id: string
  de: Pessoa
  para: Pessoa
  titulo: string
  texto: string
  papel: PapelId
  selo: SeloId
  enfeites: Enfeite[]
  lida_em: string | null
  created_at: string
}

const daLinha = (l: Linha, fotos: Record<string, string>): Cartinha => ({
  id: l.id,
  de: l.de,
  para: l.para,
  titulo: l.titulo,
  texto: l.texto,
  papel: l.papel,
  selo: l.selo,
  enfeites: l.enfeites ?? [],
  lidaEm: l.lida_em,
  criadaEm: l.created_at,
  fotos,
})

async function listarNuvem(): Promise<Cartinha[]> {
  const { data, error } = await supabase!.from(TABELA).select('*').order('created_at', { ascending: false })
  if (error) throw error
  const linhas = data as Linha[]
  const caminhos = linhas.flatMap((l) => (l.enfeites ?? []).filter((e) => e.tipo === 'foto').map((e) => e.valor))
  const fotos: Record<string, string> = {}
  if (caminhos.length) {
    const { data: links, error: erroLinks } = await supabase!.storage.from(PASTA).createSignedUrls(caminhos, VALIDADE)
    if (erroLinks) throw erroLinks
    for (const l of links) if (l.path && l.signedUrl) fotos[l.path] = l.signedUrl
  }
  return linhas.map((l) => daLinha(l, fotos))
}

async function enviarNuvem(r: Rascunho) {
  const id = novoId()
  const pasta = supabase!.storage.from(PASTA)
  const subidas: string[] = []
  try {
    const enfeites: Enfeite[] = []
    for (const e of r.enfeites) {
      if (e.tipo !== 'foto' || !fotoLocal(e.valor)) {
        enfeites.push(e)
        continue
      }
      const blob = await (await fetch(e.valor)).blob()
      const caminho = `cartinhas/${id}/${e.id}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`
      const { error } = await pasta.upload(caminho, blob, { contentType: blob.type, cacheControl: '31536000' })
      if (error) throw error
      subidas.push(caminho)
      enfeites.push({ ...e, valor: caminho })
    }
    const { error } = await supabase!.from(TABELA).insert({ id, de: r.de, para: r.para, titulo: r.titulo, texto: r.texto, papel: r.papel, selo: r.selo, enfeites })
    if (error) throw error
  } catch (e) {
    if (subidas.length) await pasta.remove(subidas)
    throw e
  }
}

async function apagarNuvem(c: Cartinha) {
  const { error } = await supabase!.from(TABELA).delete().eq('id', c.id)
  if (error) throw error
  const fotos = c.enfeites.filter((e) => e.tipo === 'foto').map((e) => e.valor)
  if (fotos.length) await supabase!.storage.from(PASTA).remove(fotos)
}

// ---------------- neste aparelho ----------------

const LOCAL = 'nosso-lar:cartinhas'
type Guardada = Omit<Cartinha, 'fotos'>

function lerLocal(): Guardada[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL) ?? '[]') as Guardada[]
  } catch {
    return []
  }
}
const gravarLocal = (l: Guardada[]) => localStorage.setItem(LOCAL, JSON.stringify(l))
// (aqui a foto já é a própria imagem: o "endereço" é ela mesma)
const comFotos = (c: Guardada): Cartinha => ({ ...c, fotos: Object.fromEntries(c.enfeites.filter((e) => e.tipo === 'foto').map((e) => [e.valor, e.valor])) })

// ---------------- o que o resto do site usa ----------------

export const naNuvem = !!supabase

export const listarCartinhas = async () => (supabase ? listarNuvem() : lerLocal().map(comFotos))

export async function enviarCartinha(r: Rascunho) {
  if (supabase) return enviarNuvem(r)
  gravarLocal([{ ...r, id: novoId(), lidaEm: null, criadaEm: new Date().toISOString() }, ...lerLocal()])
}

export async function marcarLida(c: Cartinha) {
  if (c.lidaEm) return
  const agora = new Date().toISOString()
  if (supabase) {
    const { error } = await supabase.from(TABELA).update({ lida_em: agora }).eq('id', c.id).is('lida_em', null)
    if (error) throw error
  } else gravarLocal(lerLocal().map((g) => (g.id === c.id ? { ...g, lidaEm: agora } : g)))
}

export async function apagarCartinha(c: Cartinha) {
  if (supabase) return apagarNuvem(c)
  gravarLocal(lerLocal().filter((g) => g.id !== c.id))
}

/** Avisa quando chega/muda alguma cartinha (com o site aberto, nos dois aparelhos) */
export function ouvirCartinhas(aoMudar: () => void) {
  if (!supabase) return () => {}
  const cliente = supabase
  const canal = cliente.channel(`cartinhas-${novoId()}`).on('postgres_changes', { event: '*', schema: 'public', table: TABELA }, aoMudar).subscribe()
  return () => void cliente.removeChannel(canal)
}

// ---------------- rascunho (não perde o que estava escrevendo) ----------------

const RASCUNHO = 'nosso-lar:rascunho-cartinha'

export function lerRascunho(): Rascunho | null {
  try {
    const r = localStorage.getItem(RASCUNHO)
    return r ? (JSON.parse(r) as Rascunho) : null
  } catch {
    return null
  }
}

export function guardarRascunho(r: Rascunho | null) {
  try {
    if (r) localStorage.setItem(RASCUNHO, JSON.stringify(r))
    else localStorage.removeItem(RASCUNHO)
  } catch {
    // (fotos demais pro espaço do aparelho: o rascunho só não fica guardado)
  }
}
