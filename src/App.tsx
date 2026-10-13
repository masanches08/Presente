import { AnimatePresence } from 'framer-motion'
import { lazy, Suspense, useMemo, useState, type ComponentType } from 'react'
import { BotaoRecentrar } from './components/BotaoRecentrar'
import { Carregando } from './components/Carregando'
import { Celebracao } from './components/Celebracao'
import { ContadorCeu } from './components/ContadorCeu'
import { Folha } from './components/Folha'
import { Legenda } from './components/Legenda'
import { Login } from './components/Login'
import { Marcadores } from './components/Marcadores'
import { Petalas } from './components/Petalas'
import { PistaEncontrada } from './components/PistaEncontrada'
import { SomAmbiente } from './components/SomAmbiente'
import { useHoje } from './hooks/useHoje'
import { useSessao } from './hooks/useSessao'
import { irPara, useRota } from './hooks/useRota'
import { celebracaoDoDia } from './lib/celebracao'
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
const PAGINAS: Record<Exclude<PontoId, 'lar' | 'casamento' | 'luademel' | 'futevolei'>, ComponentType> = {
  cartas: Cartinhas,
  fotos: Fotos,
  dias: NossosDias,
}

export default function App() {
  const rota = useRota()
  const hoje = useHoje()
  const contador = useMemo(() => calcularContador(hoje), [hoje])
  const celebracao = useMemo(() => celebracaoDoDia(hoje, contador), [hoje, contador])
  const nossoDia = contador.tipo === 'aniversario' || contador.tipo === 'inicio'

  const [foco, setFoco] = useState<PontoId | null>(null)
  const [pronto, setPronto] = useState(false)
  const [pista, setPista] = useState(false)
  // "recentralizar": aparece quando ela tira a câmera do lugar
  const [fora, setFora] = useState(false)
  const [recentrar, setRecentrar] = useState(0)

  const { precisaLogin } = useSessao()
  // enquanto não entra, só o mundo aparece (desfocado) atrás do cartão de login
  const liberado = pronto && !precisaLogin
  const naCasa = liberado && rota === 'lar'
  const noCasamento = liberado && rota === 'casamento'
  const naLuaDeMel = liberado && rota === 'luademel'
  const Pagina = rota === 'inicio' || rota === 'lar' || rota === 'casamento' || rota === 'luademel' || !liberado ? null : PAGINAS[rota]
  const noMundo = liberado && !Pagina && !naCasa && !noCasamento && !naLuaDeMel && !pista

  const focar = (id: PontoId | null) => {
    setFoco(id)
  }

  return (
    <>
      <Suspense fallback={null}>
        <Mundo foco={foco} onFocar={focar} onPista={() => setPista(true)} nossoDia={nossoDia || celebracao?.tipo === 'aniversario'} pausado={!!Pagina || naCasa || noCasamento || naLuaDeMel} onPronto={() => setPronto(true)} recentrar={recentrar} onFora={setFora} />
      </Suspense>

      <Marcadores foco={foco} visivel={liberado && !Pagina} onFocar={focar} />
      {nossoDia && liberado && <Petalas />}
      <ContadorCeu c={contador} visivel={liberado && !foco} />
      {/* com um lugar em foco, o botão fica em cima da legenda; sem, sozinho no pé da tela */}
      <BotaoRecentrar solto visivel={noMundo && !foco && fora} onClick={() => setRecentrar((n) => n + 1)} />
      <Legenda
        foco={foco}
        onFocar={focar}
        onEntrar={(p) => p.id !== 'futevolei' && irPara(p.id)}
        acima={<BotaoRecentrar visivel={noMundo && fora} onClick={() => setRecentrar((n) => n + 1)} />}
      />

      {/* dia especial (aniversário dela ou dia 24): o "momento" de abertura */}
      {celebracao && <Celebracao key={celebracao.tipo} celebracao={celebracao} visivel={liberado} />}

      {/* som ambiente: casa em silêncio, casamento com sinos de vento, o resto com mar e passarinhos */}
      <SomAmbiente ambiente={naCasa ? 'silencio' : noCasamento ? 'casamento' : 'praia'} botaoVisivel={liberado && !foco && !Pagina && !naCasa && !noCasamento && !naLuaDeMel && !pista} />

      {/* ela pegou a cartinha da arara: um segredo da lua de mel foi desbloqueado */}
      <AnimatePresence>
        {pista && (
          <PistaEncontrada
            onIr={() => {
              setPista(false)
              setFoco(null)
              irPara('luademel')
            }}
            onFechar={() => setPista(false)}
          />
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
