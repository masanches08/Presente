// Passo 3 da luz assada: transforma o que o Blender calculou em arquivos leves pro site.
//  public/luz/<andar>.webp  → o mapa de luz de cada andar
//  public/luz/uv.bin        → onde cada vértice da casa pega a luz no mapa (Uint16)
//  public/luz/casa.json     → as peças, a ordem e a intensidade de cada andar
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const PASTA = '.luz'
const SAIDA = 'public/luz'
fs.mkdirSync(SAIDA, { recursive: true })

const cena = JSON.parse(fs.readFileSync(path.join(PASTA, 'cena.json'), 'utf8'))
const assado = JSON.parse(fs.readFileSync(path.join(PASTA, 'assado.json'), 'utf8'))
const RES = assado.resolucao

const paraSrgb = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055)

/** Tira o chuvisco do cálculo: média com os vizinhos, só entre pixels da mesma "ilha" (sem vazar pro vazio) */
function suavizar(rgb, mascara, raio) {
  const out = new Float32Array(rgb.length)
  const pesos = []
  for (let dy = -raio; dy <= raio; dy++) for (let dx = -raio; dx <= raio; dx++) pesos.push([dx, dy, Math.exp(-(dx * dx + dy * dy) / (raio * raio))])
  for (let y = 0; y < RES; y++)
    for (let x = 0; x < RES; x++) {
      const i = y * RES + x
      if (!mascara[i]) continue
      const c = [rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]]
      let r = 0
      let g = 0
      let b = 0
      let s = 0
      for (const [dx, dy, w0] of pesos) {
        const xx = x + dx
        const yy = y + dy
        if (xx < 0 || yy < 0 || xx >= RES || yy >= RES) continue
        const j = yy * RES + xx
        if (!mascara[j]) continue
        // não mistura com vizinho muito diferente (borda de sombra, outra superfície)
        const dif = Math.abs(rgb[j * 3] - c[0]) + Math.abs(rgb[j * 3 + 1] - c[1]) + Math.abs(rgb[j * 3 + 2] - c[2])
        const w = w0 * Math.exp(-dif / (0.35 * (c[0] + c[1] + c[2] + 0.05)))
        r += rgb[j * 3] * w
        g += rgb[j * 3 + 1] * w
        b += rgb[j * 3 + 2] * w
        s += w
      }
      out[i * 3] = r / s
      out[i * 3 + 1] = g / s
      out[i * 3 + 2] = b / s
    }
  return out
}

const andares = {}
for (const andar of cena.andares) {
  // (se passou pelo denoiser do Blender, usa a versão limpa)
  const limpo = path.join(PASTA, `${andar}.limpo.f32`)
  const cru = path.join(PASTA, `${andar}.f32`)
  if (!fs.existsSync(cru)) continue
  const denoise = fs.existsSync(limpo) && fs.statSync(limpo).mtimeMs >= fs.statSync(cru).mtimeMs
  const arq = denoise ? limpo : cru
  const px = new Float32Array(fs.readFileSync(arq).buffer.slice(0))
  const n = RES * RES
  const rgb = new Float32Array(n * 3)
  const mascara = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    rgb[i * 3] = px[i * 4]
    rgb[i * 3 + 1] = px[i * 4 + 1]
    rgb[i * 3 + 2] = px[i * 4 + 2]
    mascara[i] = px[i * 4 + 3] > 0.5 ? 1 : 0
  }
  const liso = denoise ? suavizar(rgb, mascara, 1) : suavizar(suavizar(rgb, mascara, 2), mascara, 1)

  // intensidade: o mais claro que importa (99,5%) vira branco; o resto é guardado em sRGB (mais detalhe nas sombras)
  const brilhos = []
  for (let i = 0; i < n; i += 7) if (mascara[i]) brilhos.push(Math.max(liso[i * 3], liso[i * 3 + 1], liso[i * 3 + 2]))
  brilhos.sort((a, b) => a - b)
  const escala = brilhos[Math.floor(brilhos.length * 0.995)] || 1

  // o Blender guarda de baixo pra cima; a imagem vai de cima pra baixo
  const img = Buffer.alloc(n * 3)
  for (let y = 0; y < RES; y++)
    for (let x = 0; x < RES; x++) {
      const i = y * RES + x
      const o = ((RES - 1 - y) * RES + x) * 3
      for (let c = 0; c < 3; c++) img[o + c] = Math.round(255 * paraSrgb(Math.min(1, Math.max(0, liso[i * 3 + c] / escala))))
    }
  await sharp(img, { raw: { width: RES, height: RES, channels: 3 } })
    .webp({ quality: 90, effort: 6 })
    .toFile(path.join(SAIDA, `${andar}.webp`))
  andares[andar] = { imagem: `${andar}.webp`, escala: Number(escala.toFixed(5)) }
  console.log('✓', `${andar}.webp`, 'escala', escala.toFixed(3), Math.round(fs.statSync(path.join(SAIDA, `${andar}.webp`)).size / 1024) + ' KB')
}

// coordenadas: float → Uint16 (0..65535)
const uv = new Float32Array(fs.readFileSync(path.join(PASTA, 'uv.bin')).buffer.slice(0))
const q = new Uint16Array(uv.length)
for (let i = 0; i < uv.length; i++) q[i] = Math.round(Math.min(1, Math.max(0, uv[i])) * 65535)
fs.writeFileSync(path.join(SAIDA, 'uv.bin'), Buffer.from(q.buffer))

const porNome = Object.fromEntries(cena.pecas.map((p) => [p.nome, p]))
let offset = 0
const pecas = assado.ordem.map((nome) => {
  const count = porNome[nome].count
  const r = { nome, count, offset }
  offset += count
  return r
})
fs.writeFileSync(
  path.join(SAIDA, 'casa.json'),
  JSON.stringify({ versao: Date.now(), resolucao: RES, amostras: assado.amostras, andares, pecas }),
)
console.log('✓ uv.bin', Math.round(q.byteLength / 1024) + ' KB', '·', pecas.length, 'peças')
