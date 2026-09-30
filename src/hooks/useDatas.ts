import { useCallback, useEffect, useState } from 'react'
import { DATAS_INICIAIS, type DataImportante, type NovaData } from '../data/datas'
import { supabase } from '../lib/supabase'

// Com Supabase configurado: as datas moram no banco e aparecem nos dois celulares (em tempo real).
// Sem Supabase: ficam guardadas só neste aparelho (modo local), pra dar pra testar.

const CHAVE = 'nosso-lar:datas'
const TABELA = 'datas_importantes'

interface Linha {
  id: string
  titulo: string
  data: string
  descricao: string | null
  emoji: string
}

const daLinha = (l: Linha): DataImportante => ({ id: l.id, titulo: l.titulo, data: l.data, descricao: l.descricao ?? undefined, emoji: l.emoji })
const paraLinha = (d: NovaData) => ({ titulo: d.titulo, data: d.data, descricao: d.descricao ?? null, emoji: d.emoji })

function carregarLocal(): DataImportante[] {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo) return JSON.parse(salvo)
  } catch {
    /* sem acesso ao armazenamento: usa as datas iniciais */
  }
  return DATAS_INICIAIS
}

function novoId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useDatas() {
  const [datas, setDatas] = useState<DataImportante[]>(() => (supabase ? [] : carregarLocal()))
  const [carregando, setCarregando] = useState(!!supabase)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.from(TABELA).select('id, titulo, data, descricao, emoji').order('data')
    if (error) setErro('Não consegui buscar as datas agora. Confira a internet.')
    else {
      setErro(null)
      setDatas((data as Linha[]).map(daLinha))
    }
    setCarregando(false)
  }, [])

  // Supabase: busca e fica "ouvindo" mudanças feitas no outro celular
  useEffect(() => {
    if (!supabase) return
    const cliente = supabase
    void recarregar()
    const canal = cliente
      .channel('datas-importantes')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABELA }, () => void recarregar())
      .subscribe()
    return () => void cliente.removeChannel(canal)
  }, [recarregar])

  // modo local: salva no aparelho
  useEffect(() => {
    if (supabase) return
    try {
      localStorage.setItem(CHAVE, JSON.stringify(datas))
    } catch {
      /* ignora */
    }
  }, [datas])

  const executar = async (acao: () => PromiseLike<{ error: unknown }>) => {
    const { error } = await acao()
    if (error) setErro('Não deu pra salvar. Tenta de novo daqui a pouquinho?')
    await recarregar()
  }

  const adicionar = (nova: NovaData) => {
    if (supabase) return void executar(() => supabase!.from(TABELA).insert(paraLinha(nova)))
    setDatas((ds) => [...ds, { ...nova, id: novoId() }])
  }
  const editar = (id: string, dados: NovaData) => {
    if (supabase) return void executar(() => supabase!.from(TABELA).update(paraLinha(dados)).eq('id', id))
    setDatas((ds) => ds.map((d) => (d.id === id ? { ...dados, id } : d)))
  }
  const apagar = (id: string) => {
    if (supabase) return void executar(() => supabase!.from(TABELA).delete().eq('id', id))
    setDatas((ds) => ds.filter((d) => d.id !== id))
  }

  // sempre em ordem cronológica
  const ordenadas = [...datas].sort((a, b) => a.data.localeCompare(b.data))

  return { datas: ordenadas, adicionar, editar, apagar, carregando, erro, online: !!supabase }
}
