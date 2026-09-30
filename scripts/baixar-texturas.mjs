// Baixa as texturas de verdade (fotos escaneadas, licença CC0) do Poly Haven
// e converte pra .webp leve em public/texturas/.
// Uso: node scripts/baixar-texturas.mjs   (só precisa rodar de novo se mudar a lista)
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// id do Poly Haven → quais mapas baixar (diff = cor, nor = relevo, rough = brilho)
const LISTA = {
  painted_plaster_wall: ['nor', 'rough'], // paredes e teto (a cor continua a nossa)
  laminate_floor_02: ['diff', 'nor', 'rough'], // piso de madeira clara
  oak_veneer_01: ['diff', 'nor'], // móveis de madeira
  poly_wool_herringbone: ['nor'], // trama dos tecidos (sofás, camas, cortinas)
  grey_roof_tiles_02: ['diff', 'nor'], // telhado
  brick_wall_001: ['diff', 'nor'], // tijolinho da churrasqueira
  concrete_floor_01: ['diff', 'nor'], // piso lá fora
  dense_sand: ['diff', 'nor'], // areia (praia, casamento, quadra, tanque de areia)
  leafy_grass: ['diff', 'nor'], // chão do gramado (embaixo dos tufos)
}
const CHAVES = { diff: 'Diffuse', nor: 'nor_gl', rough: 'Rough' }
const TAM = 1024

const destino = path.resolve('public/texturas')
fs.mkdirSync(destino, { recursive: true })

for (const [id, mapas] of Object.entries(LISTA)) {
  const info = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json()
  for (const m of mapas) {
    const arquivo = path.join(destino, `${id}_${m}.webp`)
    if (fs.existsSync(arquivo)) continue
    const url = info[CHAVES[m]]['1k'].jpg.url
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
    await sharp(buf)
      .resize(TAM, TAM)
      .webp({ quality: m === 'diff' ? 80 : 88 })
      .toFile(arquivo)
    console.log('✓', path.basename(arquivo), Math.round(fs.statSync(arquivo).size / 1024) + ' KB')
  }
}
