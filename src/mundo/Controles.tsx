import { CameraControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import CameraControlsImpl from 'camera-controls'
import { useEffect, useRef } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import { area, saiuDaVista, useCameraNoChao } from '../lib/cameraNoChao'
import { enquadrar } from '../lib/enquadramento'
import { noChao, pontoPorId, type PontoId } from './pontos'
import { altura, NIVEL_MAR } from './terreno'
import type { Vec3 } from './util'

const { ACTION } = CameraControlsImpl
const chaoDoMundo = (x: number, z: number) => Math.max(altura(x, z), NIVEL_MAR)

/** Vista geral da ilha */
const PADRAO: { alvo: Vec3; direcao: Vec3; distancia: number } = {
  alvo: [6, 4.2, 1],
  direcao: [-0.45, 0.3, 1],
  distancia: 34,
}

/**
 * Câmera: entrada lenta de cinema, voo suave até o objeto tocado,
 * e ela pode girar (1 dedo) e aproximar (pinça) à vontade.
 */
export function Controles({ foco, recentrar, onFora }: { foco: PontoId | null; recentrar: number; onFora: (fora: boolean) => void }) {
  const ref = useRef<CameraControlsImpl>(null)
  // a vista padrão do momento (a geral, ou a do lugar em foco): é pra ela que o "recentralizar" volta
  const padrao = useRef({ pos: new Vector3(), alvo: new Vector3() })
  const fora = useRef(false)
  const { size, camera } = useThree()
  const aspecto = size.width / size.height
  // celular em pé: abre o ângulo e afasta um pouco, pra mostrar a mesma largura do notebook
  const { fov, recuo: fator } = enquadrar(aspecto, 40, 70, 1.8)
  const ultimoToque = useRef(Infinity) // só começa a girar sozinho depois da entrada
  const primeiraVez = useRef(true)
  const introAte = useRef(0)
  const deslocamento = useRef(0)

  useEffect(() => {
    const cam = camera as PerspectiveCamera
    cam.fov = fov
    cam.updateProjectionMatrix()
  }, [fov, camera])

  useEffect(() => {
    const c = ref.current
    if (!c) return
    // como no Maps do iPad: 1 dedo gira; 2 dedos arrastam pelo chão e a pinça aproxima de onde os dedos estão.
    // O zoom para no limite (sem "infinityDolly": perto do alvo ele andava quase nada e parecia travado)
    c.mouseButtons.right = ACTION.TRUCK
    c.mouseButtons.middle = ACTION.TRUCK
    c.touches.two = ACTION.TOUCH_DOLLY_TRUCK
    c.touches.three = ACTION.NONE
    c.verticalDragToForward = true
    c.dollyToCursor = true
    // o miolo da ilha: da casa até a praia do futevôlei, sem fugir pros morros nem pro mar aberto
    c.setBoundary(area(-28, 50, -32, 28, 0, 25))
    c.draggingSmoothTime = 0.12
  }, [])

  useCameraNoChao(ref, chaoDoMundo)

  // voa pro objeto em foco (ou volta pra vista geral)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const destino = foco ? pontoPorId(foco) : PADRAO
    const alvo = new Vector3(...noChao(destino.alvo))
    const pos = alvo.clone().addScaledVector(new Vector3(...destino.direcao).normalize(), destino.distancia * fator)

    if (primeiraVez.current) {
      // entrada: começa longe, lá no alto, e desce devagar até a ilha
      primeiraVez.current = false
      introAte.current = performance.now() + 3500
      c.setLookAt(pos.x - 30, pos.y + 22, pos.z + 40, alvo.x + 10, alvo.y + 8, alvo.z, false)
    }
    const emIntro = performance.now() < introAte.current
    c.smoothTime = emIntro ? 2.4 : 0.85
    c.setLookAt(pos.x, pos.y, pos.z, alvo.x, alvo.y, alvo.z, true)
    // o giro sozinho (e o dedo) vão somando voltas no ângulo; sem isso a câmera "desenrolava"
    // essas voltas todas no voo, dando um 360. Assim ela vai sempre pelo lado mais curto.
    c.normalizeRotations()
    ultimoToque.current = performance.now() + (emIntro ? 3000 : 0)
    padrao.current = { pos, alvo }
    fora.current = false
    onFora(false)
  }, [foco, fator, onFora])

  // "recentralizar": volta deslizando pra vista padrão
  useEffect(() => {
    const c = ref.current
    if (!c || !recentrar) return
    const { pos, alvo } = padrao.current
    c.smoothTime = 0.85
    c.setLookAt(pos.x, pos.y, pos.z, alvo.x, alvo.y, alvo.z, true)
    c.normalizeRotations()
    ultimoToque.current = performance.now()
    fora.current = false
    onFora(false)
  }, [recentrar, onFora])

  // ela mexeu na câmera: se saiu da vista padrão, aparece o "recentralizar"
  const mexeu = () => {
    ultimoToque.current = performance.now()
    const c = ref.current
    if (!c || fora.current || !saiuDaVista(c, padrao.current.pos, padrao.current.alvo)) return
    fora.current = true
    onFora(true)
  }

  // quando ninguém mexe por um tempinho, o mundo gira devagar sozinho
  useFrame((_, dt) => {
    // com algo em foco, "empurra" a imagem pra cima pra o objeto não ficar atrás da legenda
    const cam = camera as PerspectiveCamera
    const desejado = foco ? 0.16 : 0
    deslocamento.current += (desejado - deslocamento.current) * Math.min(1, dt * 2.5)
    if (deslocamento.current < 0.0005 && !foco) {
      if (cam.view) cam.clearViewOffset()
    } else {
      cam.setViewOffset(size.width, size.height, 0, deslocamento.current * size.height, size.width, size.height)
    }

    const c = ref.current
    if (!c) return
    if (c.smoothTime !== 0.85 && performance.now() > introAte.current) c.smoothTime = 0.85
    if (foco) return
    if (performance.now() - ultimoToque.current > 6000) c.rotate(dt * 0.045, 0, false)
  })

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={2}
      maxDistance={70}
      minPolarAngle={0.05}
      maxPolarAngle={1.5}
      onControlStart={() => (ultimoToque.current = performance.now())}
      onControl={mexeu}
    />
  )
}
