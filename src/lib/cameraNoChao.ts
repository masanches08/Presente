import { useFrame } from '@react-three/fiber'
import type CameraControlsImpl from 'camera-controls'
import type { RefObject } from 'react'
import { Box3, Vector3 } from 'three'

const v = new Vector3()
const w = new Vector3()

/** A câmera (pra onde ela está indo) saiu da vista padrão? Com folga, pra um toquinho não contar. */
export function saiuDaVista(c: CameraControlsImpl, pos: Vector3, alvo: Vector3) {
  c.getPosition(v, true)
  c.getTarget(w, true)
  const folga = Math.max(0.6, pos.distanceTo(alvo) * 0.06)
  return v.distanceTo(pos) > folga || w.distanceTo(alvo) > folga
}

/**
 * Área por onde o ponto que a câmera olha pode andar. O chão da caixa é o "chão" da visão livre:
 * como a câmera fica sempre acima do ponto (polar < 90°), ela também nunca desce dele.
 */
export const area = (x0: number, x1: number, z0: number, z1: number, y0: number, y1 = 30) =>
  new Box3(new Vector3(x0, y0, z0), new Vector3(x1, y1, z1))

/**
 * Rede de segurança pra terreno com morrinho: se a câmera (a de verdade, não o destino dela)
 * for parar dentro do chão, sobe na hora. Só mexe quando precisa, pra não brigar com o zoom.
 * Roda depois do update do CameraControls (que é prioridade -1).
 */
export function useCameraNoChao(ref: RefObject<CameraControlsImpl | null>, chao: (x: number, z: number) => number, ativo = true, folga = 0.3) {
  useFrame(() => {
    const c = ref.current
    if (!c || !ativo) return
    c.getPosition(v, false)
    const y = chao(v.x, v.z) + folga
    if (v.y < y) c.setPosition(v.x, y, v.z, false)
  })
}
