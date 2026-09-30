import { NoColorSpace, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector2, type Texture } from 'three'

// Texturas de verdade (fotos escaneadas do Poly Haven, licença CC0), em public/texturas/.
// Pra trocar ou adicionar alguma: edite a lista em scripts/baixar-texturas.mjs e rode o script.

export type Mapa = 'diff' | 'nor' | 'rough'

/** Os mapas que existem em public/texturas (poucos e pequenos de propósito: o site tem que ser leve) */
const DISPONIVEIS = new Set([
  'laminate_floor_02_diff',
  'laminate_floor_02_nor',
  'oak_veneer_01_diff',
  'poly_wool_herringbone_nor',
  'grey_roof_tiles_02_diff',
  'brick_wall_001_diff',
  'concrete_floor_01_diff',
  'dense_sand_diff',
  'leafy_grass_diff',
])

/** Relevo de foto (normal map), só se ele existe; senão, nada */
export function relevoReal(id: string, forca = 1, repetir: number | [number, number] = 1) {
  if (!DISPONIVEIS.has(`${id}_nor`)) return {}
  return { normalMap: texReal(id, 'nor', repetir), normalScale: new Vector2(forca, forca) }
}

const loader = new TextureLoader()
const cache = new Map<string, Texture>()

/**
 * Carrega um mapa (cor, relevo ou brilho). `repetir` = quantas vezes a textura
 * se repete a cada unidade de UV (as peças com UV "planar" já vêm em metros).
 */
export function texReal(id: string, mapa: Mapa, repetir: number | [number, number] = 1): Texture {
  const [rx, ry] = typeof repetir === 'number' ? [repetir, repetir] : repetir
  const chave = `${id}_${mapa}_${rx}_${ry}`
  const pronta = cache.get(chave)
  if (pronta) return pronta
  const t = loader.load(`${import.meta.env.BASE_URL}texturas/${id}_${mapa}.webp`)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(rx, ry)
  t.colorSpace = mapa === 'diff' ? SRGBColorSpace : NoColorSpace
  t.anisotropy = 8
  cache.set(chave, t)
  return t
}
