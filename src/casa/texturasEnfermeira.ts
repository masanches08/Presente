// Desenhos das coisinhas de enfermeira (veja enfermeira.ts): o pijama cirúrgico e o crachá.
import { criar } from '../mundo/texturas'

type Ctx = CanvasRenderingContext2D
type P = [number, number]

/** Cor do pijama cirúrgico (azul-marinho) */
export const COR_PIJAMA = { base: '#2A4570', escuro: '#1A2E4E', claro: '#3F6092', linha: '#7F9BC2' }
/** Cor do estetoscópio e do cordão do crachá */
export const COR_ESTETO = '#7A2638'

/** Contorno a partir de pontos (com cantos levemente arredondados) */
function contorno(ctx: Ctx, pts: P[], raio = 6) {
  ctx.beginPath()
  const n = pts.length
  const meio = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  ctx.moveTo(...meio(pts[n - 1], pts[0]))
  for (let i = 0; i < n; i++) ctx.arcTo(...pts[i], ...meio(pts[i], pts[(i + 1) % n]), raio)
  ctx.closePath()
}

/** Linha de costura (pespontinho tracejado) */
function costura(ctx: Ctx, pts: P[], cor = COR_PIJAMA.linha, fechar = false) {
  ctx.save()
  ctx.setLineDash([5, 4])
  ctx.lineWidth = 1.6
  ctx.strokeStyle = cor
  ctx.globalAlpha = 0.75
  ctx.beginPath()
  ctx.moveTo(...pts[0])
  for (const p of pts.slice(1)) ctx.lineTo(...p)
  if (fechar) ctx.closePath()
  ctx.stroke()
  ctx.restore()
}

/** Pano: cor de base, trama fininha, dobras suaves e a borda um pouco mais escura (dá volume) */
function pano(ctx: Ctx, rand: () => number, forma: P[], raio: number, x: number, y: number, w: number, h: number, dobras: number) {
  contorno(ctx, forma, raio)
  ctx.fillStyle = COR_PIJAMA.base
  ctx.fill()
  ctx.save()
  ctx.clip()
  // trama
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
    ctx.fillRect(x + rand() * w, y + rand() * h, 1 + rand() * 2, 1)
  }
  // dobras: manchas compridas e bem suaves de luz e sombra (a dobra de verdade vem do 3D)
  for (let i = 0; i < dobras; i++) {
    const cx = x + rand() * w
    const cy = y + rand() * h
    const ang = (rand() - 0.5) * 0.9 + (rand() < 0.5 ? 0 : Math.PI / 2)
    const comp = 120 + rand() * 220
    const larg = 18 + rand() * 26
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(ang)
    ctx.scale(comp / larg, 1)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, larg)
    g.addColorStop(0, rand() < 0.55 ? 'rgba(8,16,34,0.16)' : 'rgba(255,255,255,0.08)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, larg, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
  // borda
  ctx.save()
  contorno(ctx, forma, raio)
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(10,20,40,0.4)'
  ctx.stroke()
  ctx.restore()
}

const espelhar = (pts: P[], cx: number): P[] => pts.map(([x, y]) => [2 * cx - x, y] as P).reverse()

/**
 * Pijama cirúrgico (blusa + calça) num desenho só, 1024×1024:
 *  - blusa: metade esquerda, em cima (512×512 = 0,74 m × 0,74 m), gola em cima, barra embaixo
 *  - calça: metade direita inteira (512×1024 = 0,6 m × 1,2 m), cós em cima, barra embaixo
 * O que fica fora das peças é transparente (recortado no 3D).
 */
export const texPijama = () =>
  criar(
    'pijama-cirurgico',
    1024,
    1024,
    (ctx, rand) => {
      ctx.clearRect(0, 0, 1024, 1024)

      // ---------- blusa (gola em V, manga curta, bolso no peito) ----------
      const metadeBlusa: P[] = [
        [256, 30], // gola (atrás)
        [312, 24],
        [382, 44], // ombro
        [494, 126], // manga
        [454, 198],
        [428, 172], // cava
        [436, 496], // barra
      ]
      const blusa: P[] = [...metadeBlusa, ...espelhar(metadeBlusa, 256).slice(0, -1)]
      pano(ctx, rand, blusa, 10, 0, 0, 512, 512, 26)
      // a gola em V deixa ver o avesso das costas (mais escuro)
      ctx.beginPath()
      ctx.moveTo(206, 26)
      ctx.quadraticCurveTo(256, 44, 306, 26)
      ctx.lineTo(256, 124)
      ctx.closePath()
      ctx.fillStyle = COR_PIJAMA.escuro
      ctx.fill()
      // viés da gola
      ctx.lineWidth = 9
      ctx.strokeStyle = COR_PIJAMA.base
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(206, 26)
      ctx.lineTo(256, 124)
      ctx.lineTo(306, 26)
      ctx.stroke()
      costura(ctx, [
        [198, 28],
        [256, 140],
        [314, 28],
      ])
      // ombros
      costura(ctx, [
        [312, 26],
        [380, 46],
      ])
      costura(ctx, [
        [200, 26],
        [132, 46],
      ])
      // barra das mangas
      costura(ctx, [
        [482, 136],
        [446, 194],
      ])
      costura(ctx, [
        [30, 136],
        [66, 194],
      ])
      // bolso do peito (do lado do coração, à direita de quem olha)
      ctx.save()
      contorno(ctx, [
        [306, 214],
        [380, 214],
        [380, 290],
        [306, 290],
      ], 8)
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(15,28,50,0.5)'
      ctx.stroke()
      ctx.restore()
      costura(ctx, [
        [310, 226],
        [376, 226],
      ])
      costura(ctx, [
        [310, 218],
        [310, 286],
        [376, 286],
        [376, 218],
      ])
      // caneta no bolso
      ctx.fillStyle = '#F4F1EA'
      ctx.fillRect(360, 194, 7, 32)
      ctx.fillStyle = '#C23B3B'
      ctx.fillRect(360, 194, 7, 9)
      // bordado do nome, em cima do bolso
      ctx.save()
      ctx.fillStyle = '#F7F3EA'
      ctx.font = 'italic 600 27px "Snell Roundhand", "Segoe Script", "Brush Script MT", cursive'
      ctx.textAlign = 'center'
      ctx.fillText('Camila', 343, 180)
      ctx.restore()
      // barra e fendinhas dos lados
      costura(ctx, [
        [80, 482],
        [432, 482],
      ])
      ctx.strokeStyle = 'rgba(15,28,50,0.5)'
      ctx.lineWidth = 2.5
      for (const x of [82, 430]) {
        ctx.beginPath()
        ctx.moveTo(x, 496)
        ctx.lineTo(x + (x < 256 ? 4 : -4), 450)
        ctx.stroke()
      }

      // ---------- calça (cós de elástico com cordão, bolsos) ----------
      ctx.save()
      ctx.translate(512, 0)
      const metadeCalca: P[] = [
        [256, 6],
        [428, 8], // cós
        [444, 262], // quadril
        [434, 1004], // barra
        [272, 1004],
        [256, 338], // gancho
      ]
      const calca: P[] = [...metadeCalca, ...espelhar(metadeCalca, 256).slice(1, -1)]
      pano(ctx, rand, calca, 8, 0, 0, 512, 1024, 40)
      // cós franzido
      ctx.save()
      contorno(ctx, calca, 8)
      ctx.clip()
      ctx.fillStyle = 'rgba(15,28,50,0.18)'
      ctx.fillRect(0, 0, 512, 54)
      ctx.strokeStyle = 'rgba(15,28,50,0.3)'
      ctx.lineWidth = 1.5
      for (let x = 90; x < 426; x += 7 + rand() * 4) {
        ctx.beginPath()
        ctx.moveTo(x, 10)
        ctx.lineTo(x + (rand() - 0.5) * 3, 50)
        ctx.stroke()
      }
      ctx.restore()
      costura(ctx, [
        [88, 54],
        [424, 54],
      ])
      // cordão com laço
      ctx.strokeStyle = '#EDE8DD'
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(250, 30)
      ctx.bezierCurveTo(226, 6, 210, 44, 244, 36)
      ctx.moveTo(262, 30)
      ctx.bezierCurveTo(286, 6, 302, 44, 268, 36)
      ctx.moveTo(252, 34)
      ctx.bezierCurveTo(244, 70, 230, 100, 238, 134)
      ctx.moveTo(260, 34)
      ctx.bezierCurveTo(268, 76, 282, 104, 276, 142)
      ctx.stroke()
      // bolsos laterais (aberturas curvas no quadril)
      ctx.strokeStyle = 'rgba(15,28,50,0.55)'
      ctx.lineWidth = 3
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(256 + s * 120, 60)
        ctx.quadraticCurveTo(256 + s * 132, 150, 256 + s * 184, 190)
        ctx.stroke()
      }
      // bolso cargo numa perna
      contorno(ctx, [
        [84, 440],
        [170, 440],
        [172, 580],
        [86, 580],
      ], 8)
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(15,28,50,0.5)'
      ctx.stroke()
      costura(ctx, [
        [90, 456],
        [166, 456],
      ])
      // vincos e barra
      ctx.strokeStyle = 'rgba(15,28,50,0.16)'
      ctx.lineWidth = 3
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(256 + s * 92, 300)
        ctx.lineTo(256 + s * 98, 1000)
        ctx.stroke()
      }
      costura(ctx, [
        [82, 986],
        [246, 986],
      ])
      costura(ctx, [
        [266, 986],
        [430, 986],
      ])
      ctx.restore()

      // (o resto do desenho fica transparente)
    },
    false,
  )

/** Crachá: faixa colorida, foto (silhueta), nome e código de barras (256×400) */
export const texCracha = () =>
  criar(
    'cracha',
    256,
    400,
    (ctx, rand) => {
      ctx.fillStyle = '#FBFAF7'
      ctx.fillRect(0, 0, 256, 400)
      // faixa de cima com o furinho do prendedor
      ctx.fillStyle = '#3F8F8A'
      ctx.fillRect(0, 0, 256, 92)
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      contorno(ctx, [
        [98, 14],
        [158, 14],
        [158, 28],
        [98, 28],
      ], 7)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 25px "Segoe UI", "Helvetica Neue", Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('ENFERMAGEM', 128, 70)
      // foto (silhueta)
      ctx.fillStyle = '#E3E8EA'
      ctx.fillRect(68, 112, 120, 140)
      ctx.fillStyle = '#B8C3C8'
      ctx.beginPath()
      ctx.arc(128, 168, 30, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(128, 252, 54, 46, 0, Math.PI, 0)
      ctx.fill()
      // nome
      ctx.fillStyle = '#2B3236'
      ctx.font = '600 34px "Segoe UI", "Helvetica Neue", Arial, sans-serif'
      ctx.fillText('Camila', 128, 298)
      ctx.fillStyle = '#6B767B'
      ctx.font = '20px "Segoe UI", "Helvetica Neue", Arial, sans-serif'
      ctx.fillText('Enfermeira', 128, 326)
      // código de barras
      ctx.fillStyle = '#2B3236'
      for (let x = 58; x < 198; ) {
        const w = 1 + Math.floor(rand() * 3)
        ctx.fillRect(x, 346, w, 32)
        x += w + 1 + Math.floor(rand() * 3)
      }
    },
    false,
  )
