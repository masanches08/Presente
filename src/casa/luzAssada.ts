import { useEffect, useState } from 'react'
import { BufferAttribute, NoColorSpace, SRGBColorSpace, TextureLoader, Vector3, type BufferGeometry, type Material, type MeshStandardMaterial, type Texture } from 'three'

/** Sol de fim de tarde vindo da frente e da direita (entra pelos janelões). O mesmo no site e no Blender. */
export const SOL_CASA = new Vector3(0.5, 0.6, 0.62).normalize()

// Luz "assada": o Blender calculou a luz de verdade dentro da casa (sol pelas janelas, luz rebatendo
// nas paredes, cantinhos mais escuros, abajures acesos) e guardou numa imagem por andar.
// Pra refazer depois de mudar a casa: npm run luz  (veja scripts/luz/)

interface InfoLuz {
  versao: number
  andares: Record<string, { imagem: string; escala: number; oclusao?: string }>
  pecas: { nome: string; count: number; offset: number }[]
}
export interface LuzAssada {
  mapas: Record<string, { textura: Texture; intensidade: number; oclusao?: Texture }>
  /** coordenadas no mapa de luz de cada peça ("terreo/parede", "superior/tapete2"…) */
  uv: Map<string, Uint16Array>
}

// Dentro de casa é sempre "dia claro": uma luz branca forte e por igual em tudo (não precisa ser real,
// tem que ser claro). A luz calculada no Blender entra só por cima, de tempero: o sol no chão, o abajur aceso.
/** Luz de dia em qualquer lugar de dentro da casa (paredes, chão, teto) */
const DIA = 2.3
/** Quanto da luz calculada no Blender soma por cima (sol entrando, abajures) */
const TEMPERO = 0.3
/** Luz de dia a mais nos móveis/objetos que não têm luz calculada (plantas, livros, brinquedos…) */
const DIA_OBJETOS = 1.5
/** Brilho da luz calculada (1 = igual ao Blender) */
const EXPOSICAO = 1

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
        // sombrinha suave nos cantos e embaixo dos móveis (dá noção de espaço sem escurecer a casa)
        let oclusao: Texture | undefined
        if (a.oclusao) {
          oclusao = await loader.loadAsync(`${base}luz/${a.oclusao}?v=${info.versao}`)
          oclusao.colorSpace = NoColorSpace
          oclusao.channel = 1
        }
        mapas[andar] = { textura: t, intensidade: a.escala * Math.PI * EXPOSICAO, oclusao }
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
 * Paredes, chão, teto e móveis com luz calculada: luz de dia forte e por igual + um pouco da luz do Blender
 * por cima (sol e abajures). Os cantinhos e o que encosta ganham sombra suave pelo mapa de oclusão (se existir).
 */
export function usarLuz(m: Material, mapa: { textura: Texture; intensidade: number; oclusao?: Texture }) {
  const s = m as MeshStandardMaterial
  if (!('lightMap' in s)) return
  s.lightMap = mapa.textura
  s.lightMapIntensity = mapa.intensidade
  if (mapa.oclusao) {
    s.aoMap = mapa.oclusao
    s.aoMapIntensity = 1
  }
  s.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <lights_fragment_maps>',
      /* glsl */ `
      reflectedLight.directDiffuse = vec3(0.0);
      irradiance = vec3(0.0);
      #include <lights_fragment_maps>
      irradiance = vec3(1.0, 0.985, 0.96) * ${DIA.toFixed(3)} + min(irradiance * ${TEMPERO.toFixed(3)}, vec3(2.2));
      iblIrradiance = vec3(0.0);
      radiance *= 0.4; // dentro de casa o chão não espelha o céu inteiro
      `,
    )
  }
  s.customProgramCacheKey = () => 'luz-assada-dia'
  s.needsUpdate = true
}

/** O que não tem luz calculada (plantas, livros, brinquedos, vasos…) também fica claro, como de dia */
export function clarear(m: Material) {
  const s = m as MeshStandardMaterial
  if (!('lightMap' in s)) return
  s.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <lights_fragment_maps>',
      `#include <lights_fragment_maps>
      irradiance += vec3(1.0, 0.985, 0.96) * ${DIA_OBJETOS.toFixed(3)};`,
    )
  }
  s.customProgramCacheKey = () => 'clarear-dia'
  s.needsUpdate = true
}
