import { AnimatePresence, motion } from 'framer-motion'
import { lazy, Suspense, useMemo, useState, type ComponentType } from 'react'
import { Carregando } from './components/Carregando'
import { ContadorCeu } from './components/ContadorCeu'
import { Folha } from './components/Folha'
import { Legenda } from './components/Legenda'
import { Login } from './components/Login'
import { Marcadores } from './components/Marcadores'
import { Petalas } from './components/Petalas'
import { useHoje } from './hooks/useHoje'
import { useSessao } from './hooks/useSessao'
import { irPara, useRota } from './hooks/useRota'
import { calcularContador } from './lib/contador'
import type { PontoId } from './mundo/pontos'
import Cartinhas from './pages/Cartinhas'
import Fotos from './pages/Fotos'
import NossosDias from './pages/NossosDias'

// o 3D é pesado, então só é baixado quando precisa
const Mundo = lazy(() => import('./mundo/Mundo'))
const CasaTour = lazy(() => import('./casa/CasaTour'))
const CasamentoTour = lazy(() => import('./casamento/CasamentoTour'))
const LuaDeMel = lazy(() => import('./pages/LuaDeMel'))

// (o Nosso Lar abre a casa em 3D, não uma página)
const PAGINAS: Record<Exclude<PontoId, 'lar' | 'casamento' | 'luademel'>, ComponentType> = {
  cartas: Cartinhas,
  fotos: Fotos,
  dias: NossosDias,
}

export default function App() {
  const rota = useRota()
  const hoje = useHoje()
  const contador = useMemo(() => calcularContador(hoje), [hoje])
  const nossoDia = contador.tipo === 'aniversario' || contador.tipo === 'inicio'

  const [foco, setFoco] = useState<PontoId | null>(null)
  const [pronto, setPronto] = useState(false)
  const [jaTocou, setJaTocou] = useState(false)

  const { precisaLogin } = useSessao()
  // enquanto não entra, só o mundo aparece (desfocado) atrás do cartão de login
  const liberado = pronto && !precisaLogin
  const naCasa = liberado && rota === 'lar'
  const noCasamento = liberado && rota === 'casamento'
  const naLuaDeMel = liberado && rota === 'luademel'
  const Pagina = rota === 'inicio' || rota === 'lar' || rota === 'casamento' || rota === 'luademel' || !liberado ? null : PAGINAS[rota]

  const focar = (id: PontoId | null) => {
    setFoco(id)
    if (id) setJaTocou(true)
  }

  return (
    <>
      <Suspense fallback={null}>
        <Mundo foco={foco} onFocar={focar} nossoDia={nossoDia} pausado={!!Pagina || naCasa || noCasamento || naLuaDeMel} onPronto={() => setPronto(true)} />
      </Suspense>

      <Marcadores foco={foco} visivel={liberado && !Pagina} onFocar={focar} />
      {nossoDia && liberado && <Petalas />}
      <ContadorCeu c={contador} visivel={liberado && !foco} />
      <Legenda foco={foco} onFocar={focar} onEntrar={(p) => irPara(p.id)} />

      {/* dica discreta, até ela tocar em alguma coisa */}
      <AnimatePresence>
        {liberado && !foco && !jaTocou && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            transition={{ delay: 3.2, duration: 1 }}
            className="texto-ceu pointer-events-none fixed inset-x-0 bottom-0 z-20 text-center font-serif text-lg text-grafite/70 italic"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.75rem)' }}
          >
            toque em algo do nosso mundinho
            <span className="mt-1 block font-sans text-[11px] tracking-[0.2em] text-grafite/45 uppercase not-italic">
              arraste pra girar · pince pra aproximar
            </span>
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>{!pronto && <Carregando />}</AnimatePresence>
      <AnimatePresence>{pronto && precisaLogin && <Login />}</AnimatePresence>

      {/* Nosso Lar: a casa por dentro, em tela cheia */}
      <Suspense fallback={<Carregando texto="abrindo a porta do nosso lar…" />}>
        <AnimatePresence>{naCasa && <CasaTour key="casa" onSair={() => irPara('inicio')} />}</AnimatePresence>
      </Suspense>
      {/* Nosso Casamento: a praia no pôr do sol, em tela cheia */}
      <Suspense fallback={<Carregando texto="preparando o nosso casamento…" />}>
        <AnimatePresence>{noCasamento && <CasamentoTour key="casamento" onSair={() => irPara('inicio')} />}</AnimatePresence>
      </Suspense>
      {/* Lua de mel: só spoilers, o resto bloqueado */}
      <Suspense fallback={null}>
        <AnimatePresence>{naLuaDeMel && <LuaDeMel key="luademel" onSair={() => irPara('inicio')} />}</AnimatePresence>
      </Suspense>

      <AnimatePresence>
        {Pagina && (
          <Folha key="folha" onFechar={() => irPara('inicio')}>
            <Pagina />
          </Folha>
        )}
      </AnimatePresence>
    </>
  )
}
