import { CameraControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import CameraControlsImpl from 'camera-controls'
import { useEffect, useRef } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import { enquadrar } from '../lib/enquadramento'
import { noChao, pontoPorId, type PontoId } from './pontos'
import type { Vec3 } from './util'

const { ACTION } = CameraControlsImpl

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
export function Controles({ foco }: { foco: PontoId | null }) {
  const ref = useRef<CameraControlsImpl>(null)
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
    c.mouseButtons.right = ACTION.NONE
    c.mouseButtons.middle = ACTION.NONE
    c.touches.two = ACTION.TOUCH_DOLLY
    c.touches.three = ACTION.NONE
    c.draggingSmoothTime = 0.12
  }, [])

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
    ultimoToque.current = performance.now() + (emIntro ? 3000 : 0)
  }, [foco, fator])

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
      minDistance={2.5}
      maxDistance={70}
      minPolarAngle={0.2}
      maxPolarAngle={1.42}
      onControlStart={() => (ultimoToque.current = performance.now())}
      onControl={() => (ultimoToque.current = performance.now())}
    />
  )
}
