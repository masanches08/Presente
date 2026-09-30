import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { EquirectangularReflectionMapping, PMREMGenerator, type WebGLRenderTarget } from 'three'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'

/**
 * Céu de verdade (foto 360° em HDR, do Poly Haven) iluminando a cena e aparecendo nos reflexos
 * (vidros, água, metais). Carrega sem travar a tela: a cena aparece na hora e o céu entra quando chegar.
 */
export function CeuHDR({ arquivo, intensidade = 1 }: { arquivo: string; intensidade?: number }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    let vivo = true
    let alvo: WebGLRenderTarget | null = null
    new HDRLoader().load(`${import.meta.env.BASE_URL}hdri/${arquivo}`, (tex) => {
      if (!vivo) return tex.dispose()
      tex.mapping = EquirectangularReflectionMapping
      const pm = new PMREMGenerator(gl)
      alvo = pm.fromEquirectangular(tex)
      pm.dispose()
      tex.dispose()
      scene.environment = alvo.texture
    })
    return () => {
      vivo = false
      if (alvo && scene.environment === alvo.texture) scene.environment = null
      alvo?.dispose()
    }
  }, [arquivo, gl, scene])

  useEffect(() => {
    scene.environmentIntensity = intensidade
  }, [scene, intensidade])

  return null
}
