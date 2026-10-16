import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'

// As texturas do Ateliê, desenhadas na hora (nada pra baixar): renda, tule, brilho e trama.

const cache = new Map<string, Texture>()
function criar(nome: string, w: number, h: number, desenhar: (g: CanvasRenderingContext2D) => void, cor = true) {
  const pronta = cache.get(nome)
  if (pronta) return pronta
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  desenhar(g)
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  if (cor) t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  cache.set(nome, t)
  return t
}

let semente = 7
const rand = () => ((semente = (semente * 16807) % 2147483647) - 1) / 2147483646

/** Uma florzinha de renda: pétalas contornadas com picot (os pontinhos da borda) e o miolo vazado */
function florRenda(g: CanvasRenderingContext2D, x: number, y: number, r: number, petalas: number, giro: number) {
  g.save()
  g.translate(x, y)
  g.rotate(giro)
  for (let k = 0; k < petalas; k++) {
    g.rotate((Math.PI * 2) / petalas)
    g.beginPath()
    g.moveTo(0, 0)
    g.bezierCurveTo(r * 0.5, -r * 0.35, r * 1.05, -r * 0.3, r, 0)
    g.bezierCurveTo(r * 1.05, r * 0.3, r * 0.5, r * 0.35, 0, 0)
    g.fillStyle = 'rgba(255,255,255,0.55)'
    g.fill()
    g.lineWidth = 2.2
    g.strokeStyle = 'rgba(255,255,255,0.95)'
    g.stroke()
    // a nervura da pétala
    g.beginPath()
    g.moveTo(r * 0.15, 0)
    g.lineTo(r * 0.8, 0)
    g.lineWidth = 1
    g.stroke()
    // picot na ponta
    for (let p = 0; p < 5; p++) {
      const a = -0.5 + p * 0.25
      g.beginPath()
      g.arc(r * 0.98 + Math.cos(a) * r * 0.12, Math.sin(a) * r * 0.32, 1.4, 0, Math.PI * 2)
      g.fillStyle = 'rgba(255,255,255,0.95)'
      g.fill()
    }
  }
  g.beginPath()
  g.arc(0, 0, r * 0.22, 0, Math.PI * 2)
  g.lineWidth = 2
  g.strokeStyle = 'rgba(255,255,255,1)'
  g.stroke()
  g.restore()
}

/** Renda (Chantilly/Alençon): a redinha de tule hexagonal, florais grandes, folhas e ramos em volta. Fundo transparente. */
export const texRenda = () =>
  criar('renda', 512, 512, (g) => {
    semente = 11
    g.clearRect(0, 0, 512, 512)
    // a redinha (bem leve)
    g.strokeStyle = 'rgba(255,255,255,0.32)'
    g.lineWidth = 0.8
    const p = 9
    for (let y = 0; y < 512 + p; y += p * 0.866)
      for (let x = 0; x < 512 + p; x += p) {
        const ox = (Math.round(y / (p * 0.866)) % 2) * (p / 2)
        g.beginPath()
        for (let k = 0; k <= 6; k++) {
          const a = (k / 6) * Math.PI * 2
          const px = x + ox + Math.cos(a) * p * 0.55
          const py = y + Math.sin(a) * p * 0.55
          if (k) g.lineTo(px, py)
          else g.moveTo(px, py)
        }
        g.stroke()
      }
    // ramos curvos ligando as flores
    g.strokeStyle = 'rgba(255,255,255,0.85)'
    g.lineWidth = 2
    for (let i = 0; i < 14; i++) {
      const x = rand() * 512
      const y = rand() * 512
      g.beginPath()
      g.moveTo(x, y)
      g.bezierCurveTo(x + rand() * 120 - 60, y + rand() * 120 - 60, x + rand() * 160 - 80, y + rand() * 160 - 80, x + rand() * 200 - 100, y + rand() * 200 - 100)
      g.stroke()
      // folhinhas ao longo do ramo
      for (let f = 0; f < 4; f++) {
        const fx = x + rand() * 100 - 50
        const fy = y + rand() * 100 - 50
        g.save()
        g.translate(fx, fy)
        g.rotate(rand() * Math.PI * 2)
        g.beginPath()
        g.ellipse(0, 0, 11, 4.5, 0, 0, Math.PI * 2)
        g.fillStyle = 'rgba(255,255,255,0.5)'
        g.fill()
        g.strokeStyle = 'rgba(255,255,255,0.95)'
        g.lineWidth = 1.4
        g.stroke()
        g.restore()
      }
    }
    // as flores grandes e as pequenas (repetindo nas bordas, pra emendar sem costura)
    const flores: [number, number, number, number][] = []
    for (let i = 0; i < 9; i++) flores.push([rand() * 512, rand() * 512, 26 + rand() * 18, 5 + Math.floor(rand() * 3)])
    for (let i = 0; i < 22; i++) flores.push([rand() * 512, rand() * 512, 8 + rand() * 7, 5])
    for (const [x, y, r, n] of flores)
      for (const dx of [-512, 0, 512])
        for (const dy of [-512, 0, 512]) {
          const px = x + dx
          const py = y + dy
          if (px < -60 || px > 572 || py < -60 || py > 572) continue
          florRenda(g, px, py, r, n, (x + y) * 0.01)
        }
    // a borda festonada (scallop) fica por conta do formato do vestido
  })

/** Tule: uma névoa fininha, sem trama marcada (a trama em grade fazia listras de longe) */
export const texTule = () =>
  criar('tule', 256, 256, (g) => {
    semente = 3
    const img = g.createImageData(256, 256)
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4
        img.data.set([255, 255, 255, Math.round((0.82 + rand() * 0.18) * 255)], i)
      }
    g.putImageData(img, 0, 0)
  })

/** Brilho (glitter/paetê): pontinhos de luz espalhados — vai como "luz própria" do tecido */
export const texBrilho = () =>
  criar('brilho', 512, 512, (g) => {
    semente = 5
    g.fillStyle = '#000'
    g.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 2600; i++) {
      const x = rand() * 512
      const y = rand() * 512
      const r = 0.6 + rand() * 1.4
      const b = 140 + rand() * 115
      g.fillStyle = `rgb(${b},${b},${b})`
      g.beginPath()
      g.arc(x, y, r, 0, Math.PI * 2)
      g.fill()
    }
  })

/** Trama de tecido encorpado (mikado, zibeline): relevo bem fininho, em diagonal */
export const texTrama = () =>
  criar(
    'trama',
    256,
    256,
    (g) => {
      semente = 9
      g.fillStyle = '#808080'
      g.fillRect(0, 0, 256, 256)
      for (let i = -256; i < 256; i += 3) {
        g.strokeStyle = `rgba(${rand() < 0.5 ? '255,255,255' : '0,0,0'},${0.08 + rand() * 0.1})`
        g.lineWidth = 1.2
        g.beginPath()
        g.moveTo(i, 0)
        g.lineTo(i + 256, 256)
        g.stroke()
      }
    },
    false,
  )

/** O vestido "borrado" que fica no píer: dá pra ver que é um vestido de noiva (véu, corpete, saia cheia),
 *  mas tudo desfocado — ninguém sabe qual é */
export function texVestidoBorrado() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 384
  const g = c.getContext('2d')!
  // o véu, bem clarinho, atrás de tudo
  g.filter = 'blur(9px)'
  g.fillStyle = 'rgba(255,255,255,0.45)'
  g.beginPath()
  g.moveTo(128, 30)
  g.bezierCurveTo(70, 120, 40, 260, 30, 372)
  g.lineTo(226, 372)
  g.bezierCurveTo(216, 260, 186, 120, 128, 30)
  g.fill()
  g.filter = 'blur(6px)'
  // ombros e braços (tom de pele bem suave)
  g.fillStyle = 'rgba(236,214,200,0.9)'
  g.beginPath()
  g.ellipse(128, 44, 15, 19, 0, 0, Math.PI * 2)
  g.fill()
  g.fillRect(121, 58, 14, 16)
  g.beginPath()
  g.moveTo(98, 76)
  g.quadraticCurveTo(128, 66, 158, 76)
  g.lineTo(166, 140)
  g.lineTo(90, 140)
  g.closePath()
  g.fill()
  // corpete com decote coração e a cintura fininha
  g.fillStyle = '#FFFDF8'
  g.beginPath()
  g.moveTo(104, 96)
  g.quadraticCurveTo(116, 88, 128, 100)
  g.quadraticCurveTo(140, 88, 152, 96)
  g.lineTo(146, 150)
  g.lineTo(110, 150)
  g.closePath()
  g.fill()
  // saia cheia, caindo até o chão
  const gr = g.createLinearGradient(0, 150, 0, 372)
  gr.addColorStop(0, '#FFFFFF')
  gr.addColorStop(1, '#F3E9DC')
  g.fillStyle = gr
  g.beginPath()
  g.moveTo(110, 146)
  g.bezierCurveTo(70, 200, 34, 290, 28, 368)
  g.quadraticCurveTo(128, 382, 228, 368)
  g.bezierCurveTo(222, 290, 186, 200, 146, 146)
  g.closePath()
  g.fill()
  // pregas da saia (sombrinhas suaves)
  g.filter = 'blur(8px)'
  g.strokeStyle = 'rgba(205,185,170,0.35)'
  g.lineWidth = 6
  for (const x of [-60, -25, 15, 55]) {
    g.beginPath()
    g.moveTo(128 + x * 0.25, 170)
    g.quadraticCurveTo(128 + x * 0.7, 270, 128 + x * 1.3, 360)
    g.stroke()
  }
  // o buquê
  g.filter = 'blur(5px)'
  g.fillStyle = 'rgba(247,214,214,0.95)'
  g.beginPath()
  g.arc(128, 160, 14, 0, Math.PI * 2)
  g.fill()
  // brilhinho dourado no meio
  g.filter = 'blur(24px)'
  g.fillStyle = 'rgba(255,220,160,0.32)'
  g.beginPath()
  g.arc(128, 190, 60, 0, Math.PI * 2)
  g.fill()
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}
