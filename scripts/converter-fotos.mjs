// Converte as fotos de `fotos-originais/` em .webp no formato das fotinhas do site (3:4, em pé):
//  - public/fotos/<nome>.webp       → 1200 x 1600 (tela cheia)
//  - public/fotos/mini/<nome>.webp  →  600 x 800  (galeria e varal, carrega rápido)
// Foto que não é 3:4 é recortada (sem borda nenhuma), tentando manter o que importa (rostos).
// Se quiser escolher o recorte na mão, ponha em RECORTES: { 'arquivo.jpg': { left, top, width, height } }.
// Uso: npm run fotos
import { mkdir, readdir } from 'node:fs/promises'
import { extname, join, parse } from 'node:path'
import sharp from 'sharp'

const ENTRADA = 'fotos-originais'
const SAIDA = join('public', 'fotos')
const ACEITAS = ['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif']
const W = 1200
const H = 1600

/** Recortes escolhidos na mão (em pixels da foto original) */
const RECORTES = {
  // selfies deitadas: recorte 3:4 com os dois rostos
  '08.jpg': { left: 370, top: 0, width: 540, height: 720 }, // pôr do sol: metade de cada rosto, o sol no meio
  '09.jpg': { left: 290, top: 0, width: 720, height: 960 },
  '12.jpg': { left: 270, top: 0, width: 720, height: 960 },
  // fotos em pé mais compridas (9:16)
  '03.jpg': { left: 0, top: 300, width: 720, height: 960 },
  '05.jpg': { left: 0, top: 160, width: 720, height: 960 },
  '07.jpg': { left: 0, top: 220, width: 720, height: 960 },
  '25.png': { left: 0, top: 150, width: 517, height: 689 }, // frame do vídeo
}

await mkdir(ENTRADA, { recursive: true })
await mkdir(join(SAIDA, 'mini'), { recursive: true })
const arquivos = (await readdir(ENTRADA)).filter((a) => ACEITAS.includes(extname(a).toLowerCase())).sort()

if (arquivos.length === 0) {
  console.log(`Nenhuma foto encontrada. Coloque as fotos na pasta "${ENTRADA}" e rode de novo.`)
  console.log('(Fotos .HEIC do iPhone: exporte como JPG antes, ou mude a câmera pra "Mais compatível".)')
  process.exit(0)
}

const linhas = []
for (const a of arquivos) {
  const nome = 'foto-' + parse(a).name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')
  const recorte = RECORTES[a]
  // gira pela orientação da câmera, recorta em 3:4 e aumenta com um filtro bom (lanczos) + nitidez leve
  const base = () => {
    const s = sharp(join(ENTRADA, a)).rotate()
    return recorte ? s.extract(recorte) : s
  }
  const buf = await base()
    .resize(W, H, { fit: 'cover', position: sharp.strategy.attention, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.6 })
    .toBuffer()
  await sharp(buf).webp({ quality: 94, effort: 6 }).toFile(join(SAIDA, `${nome}.webp`))
  await sharp(buf).resize(600, 800, { kernel: 'lanczos3' }).webp({ quality: 86, effort: 6 }).toFile(join(SAIDA, 'mini', `${nome}.webp`))
  console.log(`✓ ${a} → ${nome}.webp`)
  linhas.push(`  { arquivo: '${nome}.webp' },`)
}
console.log('\nCole isto dentro de FOTOS em src/data/fotos.ts:\n')
console.log(linhas.join('\n'))
