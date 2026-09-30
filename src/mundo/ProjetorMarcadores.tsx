import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { Vector3 } from 'three'
import { elementosMarcador } from './marcadores'
import { noChao, PONTOS } from './pontos'

/** A cada quadro, calcula onde cada objeto aparece na tela e move a etiqueta dele pra lá. */
export function ProjetorMarcadores() {
  const v = useMemo(() => new Vector3(), [])
  const posicoes = useMemo(() => new Map(PONTOS.map((p) => [p.id, noChao(p.marcador)])), [])

  useFrame(({ camera, size }) => {
    for (const p of PONTOS) {
      const el = elementosMarcador.get(p.id)
      if (!el) continue
      v.set(...posicoes.get(p.id)!).project(camera)
      const atras = v.z > 1 // objeto atrás da câmera
      const x = ((v.x + 1) / 2) * size.width
      const y = ((1 - v.y) / 2) * size.height
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`
      el.style.visibility = atras ? 'hidden' : 'visible'
    }
  })

  return null
}
