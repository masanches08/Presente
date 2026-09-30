import { criar, pontilhar } from '../mundo/texturas'

// Texturas do interior da casa (todas desenhadas aqui mesmo, nada pra baixar)

/** Assoalho de madeira clara (tábuas) */
export const texPiso = () =>
  criar('piso', 512, 512, (ctx, rand) => {
    const tabuas = 6
    const h = 512 / tabuas
    for (let t = 0; t < tabuas; t++) {
      let x = -rand() * 200
      while (x < 512) {
        const w = 180 + rand() * 220
        const tom = 0.9 + rand() * 0.16
        ctx.fillStyle = `rgb(${214 * tom},${172 * tom},${126 * tom})`
        ctx.fillRect(x, t * h, w, h)
        for (let v = 0; v < 7; v++) {
          ctx.strokeStyle = `rgba(${120 + rand() * 30},${70 + rand() * 20},35,${0.1 + rand() * 0.12})`
          ctx.lineWidth = 1 + rand() * 1.5
          const y = t * h + 4 + rand() * (h - 8)
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.bezierCurveTo(x + w * 0.3, y + (rand() - 0.5) * 6, x + w * 0.7, y + (rand() - 0.5) * 6, x + w, y)
          ctx.stroke()
        }
        ctx.fillStyle = 'rgba(70,40,20,0.35)'
        ctx.fillRect(x, t * h, 2, h)
        x += w
      }
      ctx.fillStyle = 'rgba(70,40,20,0.4)'
      ctx.fillRect(0, t * h, 512, 2)
    }
  })

/** Azulejo verde artesanal (tipo zellige) */
export const texAzulejo = () =>
  criar('azulejo', 256, 256, (ctx, rand) => {
    ctx.fillStyle = '#E8E6DC'
    ctx.fillRect(0, 0, 256, 256)
    const n = 4
    const s = 256 / n
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const tom = 0.85 + rand() * 0.25
        const g = ctx.createLinearGradient(i * s, j * s, i * s + s, j * s + s)
        g.addColorStop(0, `rgb(${110 * tom},${150 * tom},${118 * tom})`)
        g.addColorStop(1, `rgb(${84 * tom},${126 * tom},${96 * tom})`)
        ctx.fillStyle = g
        ctx.fillRect(i * s + 2, j * s + 2, s - 4, s - 4)
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.fillRect(i * s + 6, j * s + 6, s * 0.4, s * 0.15)
      }
  })

/** Piso de banheiro: pedra clara em placas */
export const texPisoBanho = () =>
  criar('piso-banho', 256, 256, (ctx, rand) => {
    ctx.fillStyle = '#CFC8BB'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        const tom = 0.95 + rand() * 0.07
        ctx.fillStyle = `rgb(${236 * tom},${230 * tom},${220 * tom})`
        ctx.fillRect(i * 128 + 2, j * 128 + 2, 124, 124)
      }
    pontilhar(ctx, rand, 256, 256, 900, ['#D8D0C2', '#F5F1EA', '#C4BBAA'], [0.5, 1.6])
  })

/** Mármore branco com veios */
export const texMarmore = () =>
  criar('marmore', 256, 256, (ctx, rand) => {
    ctx.fillStyle = '#F4F2EE'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = `rgba(150,150,155,${0.12 + rand() * 0.2})`
      ctx.lineWidth = 0.6 + rand() * 1.8
      ctx.beginPath()
      let x = rand() * 256
      let y = 0
      ctx.moveTo(x, y)
      while (y < 256) {
        x += (rand() - 0.45) * 30
        y += 10 + rand() * 20
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  })

/** Tapete comprido verde-sálvia com faixa creme (como o do hall da referência) */
export const texTapeteListrado = () =>
  criar(
    'tapete-listrado',
    256,
    512,
    (ctx, rand) => {
      ctx.fillStyle = '#8FA57E'
      ctx.fillRect(0, 0, 256, 512)
      ctx.fillStyle = '#E9E3CF'
      ctx.fillRect(90, 0, 76, 512)
      ctx.fillStyle = '#C9D2B4'
      ctx.fillRect(20, 0, 8, 512)
      ctx.fillRect(228, 0, 8, 512)
      pontilhar(ctx, rand, 256, 512, 2500, ['#7D946C', '#A4B792', '#DCD5BE'], [0.5, 1.4])
    },
    false,
  )

/** Tapete persa desbotado, creme e rosado */
export const texTapetePersa = () =>
  criar(
    'tapete-persa',
    512,
    512,
    (ctx, rand) => {
      ctx.fillStyle = '#EADFCB'
      ctx.fillRect(0, 0, 512, 512)
      ctx.strokeStyle = '#C79A87'
      ctx.lineWidth = 14
      ctx.strokeRect(22, 22, 468, 468)
      ctx.strokeStyle = '#9FAE8E'
      ctx.lineWidth = 4
      ctx.strokeRect(44, 44, 424, 424)
      ctx.translate(256, 256)
      for (let r = 0; r < 3; r++) {
        ctx.strokeStyle = ['#C79A87', '#B98A6E', '#9FAE8E'][r]
        ctx.lineWidth = 5
        ctx.beginPath()
        for (let a = 0; a <= 64; a++) {
          const ang = (a / 64) * Math.PI * 2
          const rr = 60 + r * 45 + Math.sin(ang * 8) * 12
          ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr)
        }
        ctx.stroke()
      }
      for (let i = 0; i < 40; i++) {
        const a = rand() * Math.PI * 2
        const d = 170 + rand() * 30
        ctx.fillStyle = rand() < 0.5 ? '#D7AE9C' : '#A9B893'
        ctx.beginPath()
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 5 + rand() * 6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      pontilhar(ctx, rand, 512, 512, 4000, ['#E2D5BF', '#F2EADB', '#D6C7AE'], [0.5, 1.5])
    },
    false,
  )

/** Tapete redondo liso com borda (a cor vem do material) */
export const texTapeteRedondo = () =>
  criar(
    'tapete-redondo',
    256,
    256,
    (ctx, rand) => {
      ctx.clearRect(0, 0, 256, 256)
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(128, 128, 126, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'
      ctx.lineWidth = 6
      for (const r of [110, 80, 50]) {
        ctx.beginPath()
        ctx.arc(128, 128, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      pontilhar(ctx, rand, 256, 256, 1200, ['#EEEEEE', '#DDDDDD'], [0.5, 1.2])
    },
    false,
  )

/** Quadro botânico (galho com folhas) */
export const texQuadro = (variante: number) =>
  criar(
    'quadro-' + variante,
    256,
    320,
    (ctx, rand) => {
      ctx.fillStyle = ['#F5EFE3', '#EFE8DA', '#F7F1E6'][variante % 3]
      ctx.fillRect(0, 0, 256, 320)
      const cor = ['#7F9A6C', '#C07A56', '#8FA2A8', '#A98C5C'][variante % 4]
      ctx.strokeStyle = cor
      ctx.fillStyle = cor
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(128, 290)
      ctx.bezierCurveTo(118, 220, 140, 120, 124, 40)
      ctx.stroke()
      for (let i = 0; i < 12; i++) {
        const t = i / 12
        const y = 280 - t * 230
        const lado = i % 2 ? 1 : -1
        ctx.save()
        ctx.translate(126 + Math.sin(t * 3) * 6, y)
        ctx.rotate(lado * (0.7 + rand() * 0.3))
        ctx.globalAlpha = 0.85
        ctx.beginPath()
        ctx.ellipse(0, -22, 9, 24, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    },
    false,
  )

/** Laje de cimento com os 5 pezinhos, as iniciais e os coraçõezinhos */
export const texPegadas = (iniciais: { pai: string; mae: string }) =>
  criar(
    'pegadas-' + iniciais.pai + iniciais.mae,
    1024,
    512,
    (ctx, rand) => {
      ctx.fillStyle = '#DCD6CB'
      ctx.fillRect(0, 0, 1024, 512)
      pontilhar(ctx, rand, 1024, 512, 5000, ['#CCC5B8', '#E9E4DB', '#BDB5A6'], [0.6, 2.2])
      ctx.strokeStyle = 'rgba(120,110,95,0.35)'
      ctx.lineWidth = 4
      ctx.strokeRect(12, 12, 1000, 488)

      // pezinho marcado no cimento (baixo-relevo: borda clara + sombra + fundo)
      const pe = (cx: number, cy: number, comp: number, esquerdo: boolean) => {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(esquerdo ? -1 : 1, 1)
        const desenhar = (dx: number, dy: number, cor: string) => {
          ctx.fillStyle = cor
          ctx.beginPath()
          ctx.ellipse(dx, dy + comp * 0.3, comp * 0.17, comp * 0.2, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.ellipse(dx + comp * 0.03, dy - comp * 0.02, comp * 0.2, comp * 0.26, -0.12, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.ellipse(dx + comp * 0.02, dy + comp * 0.14, comp * 0.15, comp * 0.18, 0, 0, Math.PI * 2)
          ctx.fill()
          const dedos = [
            [-0.13, -0.33, 0.075],
            [-0.02, -0.37, 0.058],
            [0.07, -0.35, 0.05],
            [0.14, -0.31, 0.044],
            [0.2, -0.25, 0.038],
          ]
          for (const [x, y, r] of dedos) {
            ctx.beginPath()
            ctx.arc(dx + x * comp, dy + y * comp, r * comp, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        desenhar(-2, -2, 'rgba(255,255,255,0.35)')
        desenhar(2, 2, 'rgba(95,85,72,0.55)')
        desenhar(0, 0, 'rgba(150,140,125,0.6)')
        ctx.restore()
      }
      const coracao = (cx: number, cy: number, s: number) => {
        ctx.fillStyle = 'rgba(160,90,70,0.55)'
        ctx.beginPath()
        ctx.moveTo(cx, cy + s * 0.9)
        ctx.bezierCurveTo(cx - s * 1.4, cy - s * 0.1, cx - s * 0.6, cy - s * 1.1, cx, cy - s * 0.35)
        ctx.bezierCurveTo(cx + s * 0.6, cy - s * 1.1, cx + s * 1.4, cy - s * 0.1, cx, cy + s * 0.9)
        ctx.fill()
      }
      const texto = (t: string, x: number, y: number) => {
        ctx.font = 'italic 600 54px "Cormorant Garamond", Georgia, serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        ctx.fillText(t, x - 2, y - 2)
        ctx.fillStyle = 'rgba(105,92,78,0.75)'
        ctx.fillText(t, x, y)
      }
      // pai (maior), mãe e os 3 filhos
      pe(150, 210, 250, false)
      texto(iniciais.pai, 150, 440)
      pe(340, 225, 215, true)
      texto(iniciais.mae, 340, 440)
      pe(540, 250, 150, false)
      coracao(540, 410, 26)
      pe(710, 255, 135, true)
      coracao(710, 410, 24)
      pe(870, 260, 120, false)
      coracao(870, 410, 22)
    },
    false,
  )
