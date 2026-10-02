// Baixa os sons ambientes (gravações reais, licença livre, do Wikimedia Commons),
// recorta um trecho bom de cada e salva leve (mono, mp3) em public/sons/.
// Uso: node scripts/baixar-sons.mjs
//
// Créditos:
//  - mar.mp3      ← "Ocean Waves on a Tropical Beach.ogg" (CC0)
//  - gaivota.mp3  ← "Gull 2.ogg" (domínio público)
//  - sinos.mp3    ← "Windglockenspiel.Koshi.ogg" (CC0)
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import ffmpeg from 'ffmpeg-static'

// arquivo do Commons → [nome no site, começo (s), duração (s), qualidade]
const LISTA = {
  'Ocean Waves on a Tropical Beach.ogg': ['mar', 40, 75, '56k'],
  // ('Reggelirigók.ogg', passarinhos: tirado, tinha grilo no fundo)
  'Gull 2.ogg': ['gaivota', 0, 6, '48k'],
  'Windglockenspiel.Koshi.ogg': ['sinos', 2, 54, '56k'],
}

const UA = { 'User-Agent': 'NossoLar/1.0 (presente pessoal; matheussanchesmalu@gmail.com)' }
const tmp = path.resolve('.sons')
const destino = path.resolve('public/sons')
fs.mkdirSync(tmp, { recursive: true })
fs.mkdirSync(destino, { recursive: true })

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

for (const [titulo, [nome, inicio, duracao, kbps]] of Object.entries(LISTA)) {
  const final = path.join(destino, `${nome}.mp3`)
  if (fs.existsSync(final)) continue
  const original = path.join(tmp, titulo.replace(/[^\w.]+/g, '_'))
  if (!fs.existsSync(original)) {
    const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&titles=${encodeURIComponent('File:' + titulo)}`
    const info = await (await fetch(api, { headers: UA })).json()
    const url = Object.values(info.query.pages)[0].imageinfo[0].url
    fs.writeFileSync(original, Buffer.from(await (await fetch(url, { headers: UA })).arrayBuffer()))
    await esperar(1500) // (o Commons não gosta de muitos pedidos seguidos)
  }
  // recorta, junta os canais, suaviza começo e fim e comprime
  execFileSync(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-ss', String(inicio), '-t', String(duracao), '-i', original,
    '-ac', '1', '-ar', '44100',
    '-af', `afade=t=in:d=0.4,afade=t=out:st=${duracao - 0.4}:d=0.4,loudnorm=I=-20:TP=-2`,
    '-b:a', kbps, final,
  ])
  console.log('✓', `${nome}.mp3`, Math.round(fs.statSync(final).size / 1024) + ' KB')
}
