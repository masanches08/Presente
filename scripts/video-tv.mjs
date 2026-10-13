// Prepara a cena que passa na TV da nossa suíte (public/tv/):
//  - public/tv/cena-720.mp4  → 1280 x 720 (iPad e computador)
//  - public/tv/cena-540.mp4  →  960 x 540 (celular: a TV ocupa menos pixels, carrega mais rápido)
//  - public/tv/capa.webp     → um quadro da cena, aparece na TV enquanto o vídeo carrega
// Sai sem som (a casa é silenciosa) e já cortado/encaixado em 16:9 (o tamanho exato da tela da TV, sem borda preta).
// Uso: npm run tv -- <arquivo de vídeo> [início em segundos] [fim em segundos]
//   ex.: npm run tv -- fotos-originais/himym.mp4 0.05 104.5
import { execFileSync } from 'node:child_process'
import { mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import ffmpeg from 'ffmpeg-static'

const [entrada, inicio = '0', fim] = process.argv.slice(2)
if (!entrada) {
  console.error('Uso: npm run tv -- <arquivo de vídeo> [início] [fim]')
  process.exit(1)
}
const SAIDA = join('public', 'tv')
mkdirSync(SAIDA, { recursive: true })

const corte = ['-ss', inicio, ...(fim ? ['-to', fim] : [])]
// preenche 16:9 (corta o que sobrar em vez de pôr borda) e afina com lanczos
const encaixar = (w, h) => `scale=${w}:${h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${w}:${h},format=yuv420p`

for (const [w, h, crf] of [
  [1280, 720, 23],
  [960, 540, 25],
]) {
  const arq = join(SAIDA, `cena-${h}.mp4`)
  // (o YouTube já vem comprimido: 23 deixa igual ao original sem inflar o arquivo)
  // H.264 "high" + faststart: o iPad/iPhone toca em qualquer versão e começa antes de baixar tudo
  execFileSync(ffmpeg, ['-v', 'error', '-y', ...corte, '-i', entrada, '-vf', encaixar(w, h), '-an', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'film', '-crf', String(crf), '-profile:v', 'high', '-level', '4.0', '-movflags', '+faststart', arq], { stdio: 'inherit' })
  console.log(`${arq}: ${(statSync(arq).size / 1e6).toFixed(1)} MB`)
}
const capa = join(SAIDA, 'capa.webp')
execFileSync(ffmpeg, ['-v', 'error', '-y', '-ss', String(Number(inicio) + 1), '-i', entrada, '-frames:v', '1', '-vf', encaixar(1280, 720), '-c:v', 'libwebp', '-quality', '80', capa], { stdio: 'inherit' })
console.log(`${capa}: ${(statSync(capa).size / 1e3).toFixed(0)} KB`)
