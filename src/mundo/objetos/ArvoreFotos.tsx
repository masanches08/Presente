import { useFrame, type ThreeElements } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { QuadraticBezierCurve3, SRGBColorSpace, TextureLoader, TubeGeometry, Vector3, type Group, type Texture } from 'three'
import { FOTOS, urlFoto } from '../../data/fotos'
import { Arvore } from '../Arvore'
import { altura } from '../terreno'
import type { Vec3 } from '../util'

type Props = ThreeElements['group']

// Enquanto não tem foto, cada polaroid mostra uma cor clarinha
const CORES_FOTO = ['#F2A07B', '#8CC6E8', '#F6D365', '#B9E4A8', '#E89AC7', '#FFC09F']

/** Carrega a foto e recorta no meio, quadradinha, como uma polaroid */
function useFotoQuadrada(indice: number) {
  return useMemo<Texture | null>(() => {
    const foto = FOTOS[indice]
    if (!foto) return null
    const t = new TextureLoader().load(urlFoto(foto), (tex) => {
      const img = tex.image as HTMLImageElement
      const r = img.width / img.height
      if (r > 1) {
        tex.repeat.set(1 / r, 1)
        tex.offset.set((1 - 1 / r) / 2, 0)
      } else {
        tex.repeat.set(1, r)
        tex.offset.set(0, (1 - r) / 2)
      }
      tex.needsUpdate = true
    })
    t.colorSpace = SRGBColorSpace
    return t
  }, [indice])
}

function Polaroid({ indice, ...props }: Props & { indice: number }) {
  const ref = useRef<Group>(null)
  const foto = useFotoQuadrada(indice)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.x = Math.sin(clock.elapsedTime * 1.3 + indice * 1.7) * 0.14
  })
  return (
    <group {...props}>
      <group ref={ref}>
        <mesh position-y={0.01}>
          <boxGeometry args={[0.04, 0.09, 0.03]} />
          <meshStandardMaterial color="#C9A06F" />
        </mesh>
        <mesh position-y={-0.23} castShadow>
          <boxGeometry args={[0.36, 0.44, 0.01]} />
          <meshStandardMaterial color="#FFFEFA" roughness={0.5} />
        </mesh>
        {[1, -1].map((lado) => (
          <mesh key={lado} position={[0, -0.2, lado * 0.0056]} rotation-y={lado === 1 ? 0 : Math.PI}>
            <planeGeometry args={[0.3, 0.3]} />
            {foto ? (
              <meshStandardMaterial map={foto} roughness={0.4} />
            ) : (
              <meshStandardMaterial color={CORES_FOTO[indice % CORES_FOTO.length]} roughness={0.3} />
            )}
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Árvore grande com um varal de polaroids até um postinho. `posicao` é a base da árvore no mundo. */
export function ArvoreFotos({ posicao }: { posicao: Vec3 }) {
  const { varal, fotos, poste, angulo } = useMemo(() => {
    const posteLocal = new Vector3(3.9, 0, 3.3)
    posteLocal.y = altura(posicao[0] + posteLocal.x, posicao[2] + posteLocal.z) - posicao[1]
    const inicio = new Vector3(0.35, 2.0, 0.3)
    const fim = posteLocal.clone().add(new Vector3(0, 1.85, 0))
    const meio = inicio.clone().lerp(fim, 0.5)
    meio.y -= 0.45
    const curva = new QuadraticBezierCurve3(inicio, meio, fim)
    return {
      varal: new TubeGeometry(curva, 30, 0.012, 5),
      fotos: [0.16, 0.3, 0.44, 0.58, 0.72, 0.86].map((t) => curva.getPoint(t)),
      poste: posteLocal,
      angulo: Math.atan2(fim.z - inicio.z, fim.x - inicio.x),
    }
  }, [posicao])

  return (
    <group position={posicao}>
      <Arvore semente={4} altura={8.5} cartoes={85} />
      <mesh position={[poste.x, poste.y + 1.0, poste.z]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 2.0, 8]} />
        <meshStandardMaterial color="#9A6F4C" roughness={1} />
      </mesh>
      <mesh geometry={varal}>
        <meshStandardMaterial color="#F7EFE2" />
      </mesh>
      {fotos.map((p, i) => (
        <Polaroid key={i} indice={i} position={p} rotation-y={-angulo} />
      ))}
    </group>
  )
}
