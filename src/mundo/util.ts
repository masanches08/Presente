import { useLayoutEffect, type RefObject } from 'react'
import { Color, InstancedMesh, Object3D } from 'three'

/** Gerador de números "aleatórios" sempre iguais (pra ilha não mudar a cada visita). */
export function sorteador(semente: number) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Vec3 = [number, number, number]

export interface Instancia {
  pos: Vec3
  rot?: Vec3
  escala?: number | Vec3
  cor?: string
}

/** Posiciona várias cópias de um mesmo objeto (1 desenho só pra placa de vídeo = rápido). */
export function useInstancias(ref: RefObject<InstancedMesh | null>, itens: Instancia[]) {
  useLayoutEffect(() => {
    const malha = ref.current
    if (!malha) return
    const o = new Object3D()
    const cor = new Color()
    itens.forEach((it, i) => {
      o.position.set(...it.pos)
      o.rotation.set(...(it.rot ?? [0, 0, 0]))
      if (Array.isArray(it.escala)) o.scale.set(...it.escala)
      else o.scale.setScalar(it.escala ?? 1)
      o.updateMatrix()
      malha.setMatrixAt(i, o.matrix)
      if (it.cor) malha.setColorAt(i, cor.set(it.cor))
    })
    malha.instanceMatrix.needsUpdate = true
    if (malha.instanceColor) malha.instanceColor.needsUpdate = true
    malha.computeBoundingSphere()
  }, [ref, itens])
}
