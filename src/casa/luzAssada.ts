import { useEffect, useState } from 'react'
import { BufferAttribute, SRGBColorSpace, TextureLoader, Vector3, type BufferGeometry, type Material, type MeshStandardMaterial, type Texture } from 'three'

/** Sol de fim de tarde vindo da frente e da direita (entra pelos janelões). O mesmo no site e no Blender. */
export const SOL_CASA = new Vector3(0.5, 0.6, 0.62).normalize()

// Luz "assada": o Blender calculou a luz de verdade dentro da casa (sol pelas janelas, luz rebatendo
// nas paredes, cantinhos mais escuros, abajures acesos) e guardou numa imagem por andar.
// Pra refazer depois de mudar a casa: npm run luz  (veja scripts/luz/)

interface InfoLuz {
  versao: number
  andares: Record<string, { imagem: string; escala: number }>
  pecas: { nome: string; count: number; offset: number }[]
}
export interface LuzAssada {
  mapas: Record<string, { textura: Texture; intensidade: number }>
  /** coordenadas no mapa de luz de cada peça ("terreo/parede", "superior/tapete2"…) */
  uv: Map<string, Uint16Array>
}

/** Brilho geral da luz assada (1 = igual ao Blender) */
const EXPOSICAO = 3.4
/** Luz mínima em qualquer canto (pra nada ficar preto) */
const LUZ_MINIMA = 0.42

let promessa: Promise<LuzAssada | null> | null = null
function carregar() {
  promessa ??= (async () => {
    try {
      const base = import.meta.env.BASE_URL
      const info = (await (await fetch(`${base}luz/casa.json`)).json()) as InfoLuz
      // as coordenadas vêm comprimidas (deflate) e guardadas como "diferença pro anterior"
      const resp = await fetch(`${base}luz/uv.dat?v=${info.versao}`)
      const bin = await new Response(resp.body!.pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()
      const todos = new Uint16Array(bin)
      for (let i = 2; i < todos.length; i++) todos[i] = (todos[i] + todos[i - 2]) & 0xffff
      const uv = new Map(info.pecas.map((p) => [p.nome, todos.subarray(p.offset * 2, (p.offset + p.count) * 2)]))
      const loader = new TextureLoader()
      const mapas: LuzAssada['mapas'] = {}
      for (const [andar, a] of Object.entries(info.andares)) {
        const t = await loader.loadAsync(`${base}luz/${a.imagem}?v=${info.versao}`)
        t.colorSpace = SRGBColorSpace
        t.channel = 1
        t.anisotropy = 4
        mapas[andar] = { textura: t, intensidade: a.escala * Math.PI * EXPOSICAO }
      }
      return { mapas, uv }
    } catch {
      return null // sem luz assada: a casa fica com a luz normal
    }
  })()
  return promessa
}

/** Carrega a luz assada (uma vez só); `null` enquanto carrega ou se não existir */
export function useLuzAssada() {
  const [luz, setLuz] = useState<LuzAssada | null>(null)
  useEffect(() => {
    let vivo = true
    void carregar().then((l) => vivo && setLuz(l))
    return () => {
      vivo = false
    }
  }, [])
  return luz
}

/**
 * Prepara a geometria pra receber a luz assada: mesmos triângulos soltos que foram pro Blender + as coordenadas do mapa.
 * Se a casa mudou depois do último "npm run luz" (quantidade de vértices diferente), devolve null e fica a luz normal.
 */
export function comLuz(geo: BufferGeometry, uv: Uint16Array | undefined): BufferGeometry | null {
  if (!uv) return null
  const g = geo.index ? geo.toNonIndexed() : geo.clone()
  if (g.attributes.position.count * 2 !== uv.length) {
    g.dispose()
    return null
  }
  g.setAttribute('uv1', new BufferAttribute(uv, 2, true))
  return g
}

/**
 * O material passa a usar só a luz assada pra parte "difusa" (sem somar de novo o sol, o céu e as lâmpadas,
 * que já estão dentro do mapa). O brilho do sol e os reflexos continuam de verdade.
 */
export function usarLuz(m: Material, mapa: { textura: Texture; intensidade: number }) {
  const s = m as MeshStandardMaterial
  if (!('lightMap' in s)) return
  s.lightMap = mapa.textura
  s.lightMapIntensity = mapa.intensidade
  s.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <lights_fragment_maps>',
      /* glsl */ `
      reflectedLight.directDiffuse = vec3(0.0);
      irradiance = vec3(0.0);
      #include <lights_fragment_maps>
      // luz mínima de preenchimento: nenhum canto da casa fica preto (luz de casa acesa, dia claro)
      irradiance = irradiance + vec3(${LUZ_MINIMA.toFixed(3)});
      iblIrradiance = vec3(0.0);
      // dentro de casa o chão não reflete o céu inteiro: onde a luz assada é fraca, o reflexo também é
      radiance *= clamp(dot(irradiance, vec3(0.2126, 0.7152, 0.0722)) * 0.22, 0.0, 1.0);
      `,
    )
  }
  s.customProgramCacheKey = () => 'luz-assada'
  s.needsUpdate = true
}
