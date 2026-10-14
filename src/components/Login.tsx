import { motion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { guardarEntrada } from '../hooks/useSessao'
import { supabase } from '../lib/supabase'
import { CoracaoCheio } from './Icons'
import { Ornamento } from './Ornamento'

/**
 * A primeira coisa que ela vê: um cartão de vidro por cima do nosso cantinho em 3D.
 * Nada de e-mail e senha: só "Nome do amor da minha vida:".
 * Quem confere a resposta é o Supabase (função entrar_no_lar, em supabase/duas-contas.sql):
 * o nome dela (ou "amor"…) entra na conta dela; a senha dele, na conta dele.
 * Cada um responde uma vez em cada aparelho; depois o site lembra (e entra sozinho se a sessão cair).
 */
export function Login() {
  const [resposta, setResposta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const entrar = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !resposta.trim()) return
    setEnviando(true)
    setErro(null)
    const { data: conta, error: erroConta } = await supabase.rpc('entrar_no_lar', { resposta })
    if (erroConta) {
      setEnviando(false)
      // (PGRST202 = a função ainda não foi criada no Supabase)
      setErro(erroConta.code === 'PGRST202' ? 'Falta terminar de preparar o Supabase (duas-contas.sql).' : 'Não consegui conectar agora. Confere a internet?')
      return
    }
    if (!conta) {
      setEnviando(false)
      setErro('Hmm… não é bem isso. Tenta de novo?')
      return
    }
    const { email, senha } = conta as { email: string; senha: string }
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setEnviando(false)
    if (error) setErro('Não consegui entrar agora. Tenta de novo daqui a pouquinho?')
    // o aparelho guarda a entrada: não pergunta mais (nem se a sessão cair), só depois de "sair"
    else guardarEntrada({ email, senha })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
      transition={{ duration: 1.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-grafite/10 px-5 backdrop-blur-[6px]"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <motion.form
        onSubmit={entrar}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm rounded-[34px] bg-creme/85 px-7 pt-10 pb-8 text-center shadow-2xl ring-1 ring-dourado/25 backdrop-blur-xl"
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1 }}
          className="mx-auto w-fit text-terracota"
        >
          <CoracaoCheio className="size-7" />
        </motion.div>
        <p className="sobretitulo mt-5 text-[#9A6B3C]">só nós dois</p>
        <h1 className="mt-2 font-serif text-[2.8rem] leading-none font-medium">Nosso Lar</h1>
        <p className="mt-3 font-serif text-lg text-grafite/60 italic">um cantinho feito pra gente</p>
        <Ornamento className="my-6" />

        <label htmlFor="resposta" className="block font-serif text-xl text-grafite/80 italic">
          Nome do amor da minha vida:
        </label>
        <input
          id="resposta"
          type="text"
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          value={resposta}
          onChange={(e) => {
            setResposta(e.target.value)
            setErro(null)
          }}
          className="mt-3 w-full rounded-2xl border border-dourado/30 bg-papel/80 px-4 py-3.5 text-center font-serif text-xl outline-none transition focus:border-terracota/50 focus:bg-papel"
          required
        />

        {erro && <p className="mt-4 font-serif text-lg text-terracota italic">{erro}</p>}

        <button
          type="submit"
          disabled={enviando || !resposta.trim()}
          className="mt-6 w-full rounded-full bg-terracota py-4 font-medium tracking-wide text-creme shadow-suave transition active:scale-[0.98] disabled:opacity-60"
        >
          {enviando ? 'entrando…' : 'entrar'}
        </button>
      </motion.form>
    </motion.div>
  )
}
