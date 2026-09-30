import { createClient } from '@supabase/supabase-js'

// As chaves vêm do arquivo .env.local (veja .env.example).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Cliente do Supabase. Se as chaves ainda não foram configuradas, fica `null`
 * e o site funciona no "modo local" (datas salvas só neste aparelho).
 */
export const supabase = url && chave ? createClient(url, chave, { auth: { persistSession: true, autoRefreshToken: true } }) : null
