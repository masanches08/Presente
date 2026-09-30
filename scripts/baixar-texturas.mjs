// Baixa as texturas de verdade (fotos escaneadas, licença CC0) do Poly Haven
// e converte pra .webp leve em public/texturas/.
// Uso: node scripts/baixar-texturas.mjs   (só precisa rodar de novo se mudar a lista)
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// id do Poly Haven → mapas (diff = cor, nor = relevo, rough = brilho) e o tamanho de cada um.
// Tudo pequeno de propósito: o site tem que ser leve no celular.
const LISTA = {
  laminate_floor_02: { diff: 1024, nor: 512 }, // piso de madeira clara (aparece grande, merece mais detalhe)
  oak_veneer_01: { diff: 512 }, // móveis de madeira
  poly_wool_herringbone: { nor: 512 }, // trama dos tecidos (sofás, camas, cortinas, tapetes)
  grey_roof_tiles_02: { diff: 512 }, // telhado
  brick_wall_001: { diff: 512 }, // tijolinho da churrasqueira
  concrete_floor_01: { diff: 512 }, // piso lá fora
  dense_sand: { diff: 512 }, // areia (casamento, tanque de areia)
  leafy_grass: { diff: 512 }, // chão do gramado (embaixo dos tufos)
}
const CHAVES = { diff: 'Diffuse', nor: 'nor_gl', rough: 'Rough' }

const destino = path.resolve('public/texturas')
fs.mkdirSync(destino, { recursive: true })

for (const [id, mapas] of Object.entries(LISTA)) {
  const info = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json()
  for (const [m, TAM] of Object.entries(mapas)) {
    const arquivo = path.join(destino, `${id}_${m}.webp`)
    if (fs.existsSync(arquivo)) continue
    const url = info[CHAVES[m]]['1k'].jpg.url
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
    await sharp(buf)
      .resize(TAM, TAM)
      .webp({ quality: m === 'diff' ? 78 : 82 })
      .toFile(arquivo)
    console.log('✓', path.basename(arquivo), Math.round(fs.statSync(arquivo).size / 1024) + ' KB')
  }
}
