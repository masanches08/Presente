import { motion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { CoracaoCheio } from './Icons'
import { Ornamento } from './Ornamento'

/**
 * A primeira coisa que ela vê: um cartão de vidro por cima do nosso cantinho em 3D.
 * Só existem 2 contas (criadas no painel do Supabase), não tem cadastro.
 */
export function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const entrar = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setEnviando(true)
    setErro(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    setEnviando(false)
    if (!error) return
    // senha errada é diferente de "sem internet"
    if (error.status === 400 || /invalid/i.test(error.message)) setErro('Hmm, e-mail ou senha não conferem. Tenta de novo?')
    else setErro('Não consegui conectar agora. Confere a internet?')
  }

  const campo =
    'w-full rounded-2xl border border-dourado/30 bg-papel/80 px-4 py-3.5 outline-none transition placeholder:text-grafite/35 focus:border-terracota/50 focus:bg-papel'

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

        <div className="space-y-3 text-left">
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={campo}
            required
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={campo}
            required
          />
        </div>

        {erro && <p className="mt-4 font-serif text-lg text-terracota italic">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="mt-6 w-full rounded-full bg-terracota py-4 font-medium tracking-wide text-creme shadow-suave transition active:scale-[0.98] disabled:opacity-60"
        >
          {enviando ? 'entrando…' : 'entrar'}
        </button>
      </motion.form>
    </motion.div>
  )
}
