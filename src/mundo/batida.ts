import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AnimationMixer, type AnimationClip, type Mesh, type Object3D } from 'three'

/**
 * Faz um pássaro (cópia do modelo) bater as asas, com o seu próprio "tocador" de animação ligado
 * direto na cópia. Antes, às vezes um pássaro ficava com as asas paradas: o modelo não dá nome à malha
 * que bate as asas, e a animação apontava pra ela por um código que muda a cada cópia.
 * Aqui a malha ganha um nome fixo e a animação aponta pra ele. Cada pássaro começa num ponto
 * diferente da batida e num ritmo um tiquinho diferente.
 */
export function useBaterAsas(copia: Object3D, clipes: AnimationClip[], ritmo = 1) {
  const { mixer, clipe } = useMemo(() => {
    let corpo: Object3D | null = null
    copia.traverse((o) => {
      if (!corpo && (o as Mesh).morphTargetInfluences?.length) corpo = o
    })
    if (corpo) (corpo as Object3D).name = 'asas'
    const c = clipes[0]?.clone()
    c?.tracks.forEach((t) => (t.name = t.name.replace(/^[^.]*/, 'asas')))
    return { mixer: new AnimationMixer(copia), clipe: c }
  }, [copia, clipes])

  // liga ao montar (e desliga ao sair)
  useEffect(() => {
    if (!clipe) return
    const acao = mixer.clipAction(clipe)
    acao.reset().play()
    acao.time = Math.random() * clipe.duration
    acao.timeScale = ritmo * (0.88 + Math.random() * 0.24)
    return () => void acao.stop()
  }, [mixer, clipe, ritmo])

  // o tempo vem do relógio da cena (o mundo desenha no ritmo dele, então o "delta" pode vir zerado)
  const antes = useRef(-1)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const dt = antes.current < 0 ? 0 : Math.min(0.1, Math.max(0, t - antes.current))
    antes.current = t
    mixer.update(dt)
  })
}
