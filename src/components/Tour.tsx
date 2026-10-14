import { CameraControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import CameraControlsImpl from 'camera-controls'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, type ReactNode } from 'react'
import { Vector3, type Box3, type PerspectiveCamera } from 'three'
import { saiuDaVista, useCameraNoChao } from '../lib/cameraNoChao'
import { enquadrar, recuar, subidaPainel } from '../lib/enquadramento'
import { BotaoRecentrar } from './BotaoRecentrar'
import { SetaDireita, SetaEsquerda } from './Icons'

const { ACTION } = CameraControlsImpl
type V3 = [number, number, number]

export interface CamTour {
  pos: V3
  alvo: V3
  /** Paradas do mesmo grupo: a câmera desliza. Grupos diferentes: um "piscar" suave (pra não atravessar paredes) */
  grupo?: string
  /** Quanto a câmera pode recuar numa tela estreita (celular em pé). Dentro de casa, pouco: senão atravessa parede */
  recuoMax?: number
  /** Depois de chegar, a câmera vira devagar (na mesma parada) pra uma segunda vista */
  depois?: { pos: V3; alvo: V3; espera: number }
}

interface CameraTourProps {
  cam: CamTour
  livre: boolean
  vistaLivre: { pos: V3; alvo: V3 }
  /** Limites da visão livre */
  distancia?: [number, number]
  /** De onde a câmera vem na entrada de cinema (somado à posição da primeira parada) */
  entrada?: V3
  /** Tempo da entrada de cinema (segundos) */
  duracaoEntrada?: number
  onPiscar?: (v: boolean) => void
  /** Ângulo da câmera no notebook (as cenas foram enquadradas com ele) */
  fovBase?: number
  /** O máximo que o ângulo pode abrir numa tela estreita */
  fovMax?: number
  /** Recuo máximo padrão (quando a parada não diz o dela) */
  recuoMax?: number
  /** Por onde a visão livre pode andar (o chão da caixa é o chão da câmera) */
  area?: Box3
  /** Altura do chão, pra terreno com morrinho (a visão livre não deixa a câmera entrar nele) */
  chao?: (x: number, z: number) => number
  /** Muda a cada toque no "recentralizar" (volta pra vista padrão da visão livre) */
  recentrar?: number
  /** A câmera saiu (ou voltou) da vista padrão da visão livre */
  onFora?: (fora: boolean) => void
}

const chaoPlano = () => 0

function irPraVistaLivre(c: CameraControlsImpl, vista: { pos: V3; alvo: V3 }, recuo: number) {
  c.smoothTime = 1.0
  c.setLookAt(...recuar(vista.pos, vista.alvo, recuo), ...vista.alvo, true)
}

/**
 * A câmera dos passeios: entrada de cinema, desliza entre paradas próximas,
 * "pisca" suave quando teria que atravessar parede, e na visão livre gira/aproxima com o dedo.
 */
export function CameraTour({
  cam,
  livre,
  vistaLivre,
  distancia = [3, 75],
  entrada = [8, 14, 22],
  duracaoEntrada = 2.2,
  onPiscar,
  fovBase = 50,
  fovMax = 78,
  recuoMax = 1.5,
  area,
  chao = chaoPlano,
  recentrar = 0,
  onFora,
}: CameraTourProps) {
  const ref = useRef<CameraControlsImpl>(null)
  // (os números soltos, não os arrays: um array novo a cada render fazia a visão livre voltar sozinha pra vista de cima)
  const [distMin, distMax] = distancia
  const [ex, ey, ez] = entrada
  const { size, camera } = useThree()
  const aspecto = size.width / size.height
  // celular em pé: abre o ângulo (e recua um pouco, onde dá) pra mostrar a mesma largura de cena do notebook
  const { fov, recuo } = enquadrar(aspecto, fovBase, fovMax, cam.recuoMax ?? recuoMax)
  const recuoLivre = enquadrar(aspecto, fovBase, fovMax, recuoMax).recuo
  const deslocamento = useRef(0)
  const anterior = useRef<CamTour | null>(null)
  const saiuDoLivre = useRef(false)
  const cortePendente = useRef(false) // um "piscar" foi interrompido no meio (cliques rápidos)
  const fora = useRef(false)
  const ultimoRecentrar = useRef(recentrar)

  useEffect(() => {
    const c = camera as PerspectiveCamera
    c.fov = fov
    c.near = 0.05
    c.updateProjectionMatrix()
  }, [fov, camera])

  // a imagem sobe um pouco, pra o que importa ficar no meio da parte livre (acima do cartão de baixo)
  useFrame((_, dt) => {
    const c = camera as PerspectiveCamera
    const alvo = subidaPainel(aspecto, !livre)
    deslocamento.current += (alvo - deslocamento.current) * Math.min(1, dt * 3)
    c.setViewOffset(size.width, size.height, 0, deslocamento.current * size.height, size.width, size.height)
  })

  // no tour a câmera anda sozinha; na visão livre ela gira e aproxima com o dedo
  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.mouseButtons.left = livre ? ACTION.ROTATE : ACTION.NONE
    c.mouseButtons.right = livre ? ACTION.TRUCK : ACTION.NONE
    c.mouseButtons.middle = ACTION.NONE
    c.mouseButtons.wheel = livre ? ACTION.DOLLY : ACTION.NONE
    c.touches.one = livre ? ACTION.TOUCH_ROTATE : ACTION.NONE
    c.touches.two = livre ? ACTION.TOUCH_DOLLY_TRUCK : ACTION.NONE
    c.touches.three = ACTION.NONE
    c.minDistance = livre ? distMin : 0
    c.maxDistance = livre ? distMax : Infinity
    c.maxPolarAngle = livre ? 1.5 : Math.PI
    // como no Maps do iPad: 2 dedos arrastam pelo chão e a pinça aproxima de onde os dedos estão;
    // o ponto que a câmera olha fica dentro da área da cena (e o chão dela segura a câmera)
    c.verticalDragToForward = livre
    c.dollyToCursor = livre
    c.setBoundary(livre ? area : undefined)
  }, [livre, distMin, distMax, area])

  useCameraNoChao(ref, chao, livre)

  // "recentralizar": volta deslizando pra vista padrão da visão livre
  useEffect(() => {
    const c = ref.current
    if (!c || recentrar === ultimoRecentrar.current) return
    ultimoRecentrar.current = recentrar
    if (!livre) return
    irPraVistaLivre(c, vistaLivre, recuoLivre)
    fora.current = false
    onFora?.(false)
  }, [recentrar, livre, vistaLivre, recuoLivre, onFora])

  // ela mexeu na câmera: se saiu da vista padrão, aparece o "recentralizar"
  const mexeu = () => {
    const c = ref.current
    if (!c || !livre || fora.current) return
    const pos = new Vector3(...recuar(vistaLivre.pos, vistaLivre.alvo, recuoLivre))
    if (!saiuDaVista(c, pos, new Vector3(...vistaLivre.alvo))) return
    fora.current = true
    onFora?.(true)
  }

  useEffect(() => {
    const c = ref.current
    if (!c) return
    fora.current = false
    onFora?.(false)
    if (livre) {
      saiuDoLivre.current = true
      cortePendente.current = false
      onPiscar?.(false)
      irPraVistaLivre(c, vistaLivre, recuoLivre)
      return
    }
    const ant = anterior.current
    anterior.current = cam
    const [px, py, pz] = recuar(cam.pos, cam.alvo, recuo)
    const [tx, ty, tz] = cam.alvo
    const timers: number[] = []
    // a segunda vista da parada (se tiver): a câmera vira devagarinho, sem piscar
    const virarDepois = (atraso: number) => {
      const d = cam.depois
      if (!d) return
      timers.push(
        window.setTimeout(() => {
          c.smoothTime = 2.2
          c.setLookAt(...recuar(d.pos, d.alvo, recuo), ...d.alvo, true)
        }, atraso + d.espera * 1000),
      )
    }
    const limpar = () => timers.forEach((t) => clearTimeout(t))
    if (!ant) {
      // entrada de cinema
      c.setLookAt(px + ex, py + ey, pz + ez, tx, ty + 2, tz, false)
      c.smoothTime = duracaoEntrada
      c.setLookAt(px, py, pz, tx, ty, tz, true)
      virarDepois(duracaoEntrada * 1000)
      return limpar
    }
    const mesmoLugar = !cam.grupo || ant.grupo === cam.grupo
    if (mesmoLugar && !saiuDoLivre.current && !cortePendente.current) {
      onPiscar?.(false)
      c.smoothTime = 1.1
      c.setLookAt(px, py, pz, tx, ty, tz, true)
      virarDepois(1100)
      return limpar
    }
    saiuDoLivre.current = false
    cortePendente.current = true
    onPiscar?.(true)
    timers.push(
      window.setTimeout(() => {
        cortePendente.current = false
        c.setLookAt(px, py + 0.3, pz, tx, ty + 0.35, tz, false)
        c.smoothTime = 0.9
        c.setLookAt(px, py, pz, tx, ty, tz, true)
        onPiscar?.(false)
      }, 420),
    )
    virarDepois(420 + 900)
    return limpar
  }, [cam, livre, onPiscar, onFora, vistaLivre, ex, ey, ez, duracaoEntrada, recuo, recuoLivre])

  return <CameraControls ref={ref} makeDefault onControl={mexeu} />
}

interface Parada {
  id: string
  nome: string
  frase: string
}

interface PainelProps {
  paradas: readonly Parada[]
  i: number
  onIr: (i: number) => void
  sobretitulo: string
  livre: boolean
  onLivre: () => void
  onSair: () => void
  /** Conteúdo do painel da visão livre */
  painelLivre: ReactNode
  /** "Recentralizar" da visão livre: aparece em cima do cartão quando ela tira a câmera do lugar */
  recentrar?: { visivel: boolean; onClick: () => void }
  /** Botões extras no topo (ex.: som) */
  extras?: ReactNode
  /** Um botão da própria parada, embaixo da frase (ex.: acelerar o touro, grande final dos fogos) */
  acao?: ReactNode
}

/** Botões e legendas por cima da cena 3D dos passeios */
export function PainelTour({ paradas, i, onIr, sobretitulo, livre, onLivre, onSair, painelLivre, extras, recentrar, acao }: PainelProps) {
  const parada = paradas[i]
  const ir = (d: number) => onIr((i + d + paradas.length) % paradas.length)

  // setinhas do teclado (no computador)
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSair()
      if (livre) return
      if (e.key === 'ArrowRight') onIr((i + 1) % paradas.length)
      if (e.key === 'ArrowLeft') onIr((i - 1 + paradas.length) % paradas.length)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [i, livre, onIr, onSair, paradas.length])

  const botao = 'rounded-full bg-papel/80 shadow-suave ring-1 ring-dourado/25 backdrop-blur-md active:scale-[0.97]'

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-10 flex items-center justify-between gap-2 px-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
        <button onClick={onSair} className={`flex items-center gap-1 py-2 pr-4 pl-2 font-serif text-lg text-grafite/80 italic ${botao}`}>
          <SetaEsquerda className="size-5" /> nosso mundo
        </button>
        <div className="flex items-center gap-2">
          {extras}
          <button onClick={onLivre} className={`px-4 py-2 text-[13px] font-medium tracking-wide text-grafite/80 ${botao}`}>
            {livre ? 'voltar ao tour' : 'visão livre'}
          </button>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 px-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
        {recentrar && <BotaoRecentrar visivel={livre && recentrar.visivel} onClick={recentrar.onClick} />}
        <AnimatePresence mode="wait">
          {livre ? (
            <motion.div
              key="livre"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="pointer-events-auto mx-auto max-w-md rounded-[26px] bg-papel/85 p-4 text-center shadow-suave ring-1 ring-dourado/25 backdrop-blur-xl"
            >
              {painelLivre}
            </motion.div>
          ) : (
            <motion.div
              key="tour"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="pointer-events-auto relative mx-auto max-w-md rounded-[30px] bg-papel/82 px-5 pt-5 pb-4 text-center shadow-suave ring-1 ring-dourado/25 backdrop-blur-xl"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={parada.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35 }}>
                  <p className="sobretitulo text-[#9A6B3C]">{sobretitulo}</p>
                  <h2 className="mt-2 font-serif text-[1.95rem] leading-none font-medium">{parada.nome}</h2>
                  <p className="mx-auto mt-2 max-w-72 font-serif text-lg leading-snug text-grafite/70 italic">{parada.frase}</p>
                  {acao && <div className="mt-3 flex justify-center">{acao}</div>}
                </motion.div>
              </AnimatePresence>
              <div className="mt-4 flex items-center gap-3">
                <button onClick={() => ir(-1)} className="grid size-12 shrink-0 place-items-center rounded-full ring-1 ring-dourado/30 active:bg-grafite/5" aria-label="Anterior">
                  <SetaEsquerda className="size-5" />
                </button>
                <div className="flex flex-1 flex-wrap justify-center gap-1">
                  {paradas.map((t, k) => (
                    <button
                      key={t.id}
                      onClick={() => onIr(k)}
                      aria-label={t.nome}
                      className={`h-1.5 rounded-full transition-all duration-300 ${k === i ? 'w-5 bg-terracota' : 'w-1.5 bg-grafite/20'}`}
                    />
                  ))}
                </div>
                <button onClick={() => ir(1)} className="grid size-12 shrink-0 place-items-center rounded-full bg-terracota text-creme shadow-suave active:scale-[0.97]" aria-label="Próximo">
                  <SetaDireita className="size-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
