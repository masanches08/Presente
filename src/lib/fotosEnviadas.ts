import { supabase } from './supabase'

// Fotos que vocês enviam pelo próprio site (do celular ou do computador).
// Com Supabase: ficam guardadas na nuvem (pasta privada "fotos") e aparecem nos dois celulares.
// Sem Supabase: ficam guardadas só neste aparelho (IndexedDB), pra dar pra testar.

export interface FotoEnviada {
  id: string
  /** endereço da foto grande (tela cheia) */
  grande: string
  /** endereço da versão menor (galeria) */
  mini: string
  legenda?: string
  criadaEm: string
  /** onde os arquivos estão guardados (pra poder apagar) */
  caminhos: [string, string]
}

const TABELA = 'fotos'
const PASTA = 'fotos'
const VALIDADE = 60 * 60 * 24 * 7 // os links privados valem 7 dias (são renovados a cada visita)

const novoId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
const extensao = (b: Blob) => (b.type === 'image/webp' ? 'webp' : 'jpg')

// ---------------- nuvem (Supabase) ----------------

interface Linha {
  id: string
  caminho: string
  caminho_mini: string
  legenda: string | null
  created_at: string
}

async function listarNuvem(): Promise<FotoEnviada[]> {
  const { data, error } = await supabase!.from(TABELA).select('id, caminho, caminho_mini, legenda, created_at').order('created_at')
  if (error) throw error
  const linhas = data as Linha[]
  if (!linhas.length) return []
  const caminhos = linhas.flatMap((l) => [l.caminho, l.caminho_mini])
  const { data: links, error: erroLinks } = await supabase!.storage.from(PASTA).createSignedUrls(caminhos, VALIDADE)
  if (erroLinks) throw erroLinks
  const url = new Map(links.map((l) => [l.path, l.signedUrl]))
  return linhas.map((l) => ({
    id: l.id,
    grande: url.get(l.caminho) ?? '',
    mini: url.get(l.caminho_mini) ?? '',
    legenda: l.legenda ?? undefined,
    criadaEm: l.created_at,
    caminhos: [l.caminho, l.caminho_mini],
  }))
}

async function enviarNuvem(grande: Blob, mini: Blob, legenda?: string) {
  const id = novoId()
  const caminho = `${id}.${extensao(grande)}`
  const caminhoMini = `mini/${id}.${extensao(mini)}`
  const pasta = supabase!.storage.from(PASTA)
  for (const [c, b] of [
    [caminho, grande],
    [caminhoMini, mini],
  ] as const) {
    const { error } = await pasta.upload(c, b, { contentType: b.type, cacheControl: '31536000' })
    if (error) throw error
  }
  const { error } = await supabase!.from(TABELA).insert({ id, caminho, caminho_mini: caminhoMini, legenda: legenda || null })
  if (error) {
    await pasta.remove([caminho, caminhoMini])
    throw error
  }
}

async function apagarNuvem(f: FotoEnviada) {
  const { error } = await supabase!.from(TABELA).delete().eq('id', f.id)
  if (error) throw error
  await supabase!.storage.from(PASTA).remove(f.caminhos)
}

// ---------------- neste aparelho (IndexedDB) ----------------

interface Guardada {
  id: string
  grande: Blob
  mini: Blob
  legenda?: string
  criadaEm: string
}

function abrirBanco() {
  return new Promise<IDBDatabase>((ok, falha) => {
    const req = indexedDB.open('nosso-lar', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('fotos', { keyPath: 'id' })
    req.onsuccess = () => ok(req.result)
    req.onerror = () => falha(req.error)
  })
}

async function naLoja<T>(modo: IDBTransactionMode, acao: (loja: IDBObjectStore) => IDBRequest<T>) {
  const banco = await abrirBanco()
  return new Promise<T>((ok, falha) => {
    const req = acao(banco.transaction('fotos', modo).objectStore('fotos'))
    req.onsuccess = () => ok(req.result)
    req.onerror = () => falha(req.error)
  })
}

// os endereços (blob:) de cada foto guardada, pra não criar de novo a cada leitura
const enderecos = new Map<string, [string, string]>()

async function listarLocal(): Promise<FotoEnviada[]> {
  const todas = (await naLoja<Guardada[]>('readonly', (l) => l.getAll() as IDBRequest<Guardada[]>)).sort((a, b) => a.criadaEm.localeCompare(b.criadaEm))
  return todas.map((g) => {
    let e = enderecos.get(g.id)
    if (!e) {
      e = [URL.createObjectURL(g.grande), URL.createObjectURL(g.mini)]
      enderecos.set(g.id, e)
    }
    return { id: g.id, grande: e[0], mini: e[1], legenda: g.legenda, criadaEm: g.criadaEm, caminhos: ['', ''] }
  })
}

async function enviarLocal(grande: Blob, mini: Blob, legenda?: string) {
  await naLoja('readwrite', (l) => l.put({ id: novoId(), grande, mini, legenda: legenda || undefined, criadaEm: new Date().toISOString() } satisfies Guardada))
}

async function apagarLocal(f: FotoEnviada) {
  await naLoja('readwrite', (l) => l.delete(f.id))
  const e = enderecos.get(f.id)
  if (e) e.forEach((u) => URL.revokeObjectURL(u))
  enderecos.delete(f.id)
}

// ---------------- o que o resto do site usa ----------------

export const naNuvem = !!supabase
export const listarFotos = () => (supabase ? listarNuvem() : listarLocal())
export const enviarFoto = (grande: Blob, mini: Blob, legenda?: string) => (supabase ? enviarNuvem(grande, mini, legenda) : enviarLocal(grande, mini, legenda))
export const apagarFoto = (f: FotoEnviada) => (supabase ? apagarNuvem(f) : apagarLocal(f))

/** Avisa quando o outro celular adiciona ou apaga uma foto (só com Supabase) */
export function ouvirFotos(aoMudar: () => void) {
  if (!supabase) return () => {}
  const cliente = supabase
  const canal = cliente.channel('fotos').on('postgres_changes', { event: '*', schema: 'public', table: TABELA }, aoMudar).subscribe()
  return () => void cliente.removeChannel(canal)
}
