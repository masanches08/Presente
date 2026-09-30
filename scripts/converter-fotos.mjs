// Converte as fotos de `fotos-originais/` em .webp leves (máx. 1600px) em `public/fotos/`.
// Uso: npm run fotos
import { mkdir, readdir } from 'node:fs/promises'
import { extname, join, parse } from 'node:path'
import sharp from 'sharp'

const ENTRADA = 'fotos-originais'
const SAIDA = join('public', 'fotos')
const ACEITAS = ['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif']

await mkdir(ENTRADA, { recursive: true })
await mkdir(SAIDA, { recursive: true })
const arquivos = (await readdir(ENTRADA)).filter((a) => ACEITAS.includes(extname(a).toLowerCase()))

if (arquivos.length === 0) {
  console.log(`Nenhuma foto encontrada. Coloque as fotos na pasta "${ENTRADA}" e rode de novo.`)
  console.log('(Fotos .HEIC do iPhone: exporte como JPG antes, ou mude a câmera pra "Mais compatível".)')
  process.exit(0)
}

const linhas = []
for (const a of arquivos) {
  const nome = parse(a).name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
  const destino = join(SAIDA, `${nome}.webp`)
  await sharp(join(ENTRADA, a)).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(destino)
  console.log(`✓ ${a} → ${destino}`)
  linhas.push(`  { arquivo: '${nome}.webp', legenda: '', data: '' },`)
}
console.log('\nCole isto dentro de FOTOS em src/data/fotos.ts:\n')
console.log(linhas.join('\n'))
