import { NoColorSpace, RepeatWrapping, SRGBColorSpace, TextureLoader, type Texture } from 'three'

// Texturas de verdade (fotos escaneadas do Poly Haven, licença CC0), em public/texturas/.
// Pra trocar ou adicionar alguma: edite a lista em scripts/baixar-texturas.mjs e rode o script.

export type Mapa = 'diff' | 'nor' | 'rough'

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
