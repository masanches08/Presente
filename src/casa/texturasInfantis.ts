import { criar, pontilhar } from '../mundo/texturas'

/** Trama de tecido (usada como relevo nos estofados) */
export const texTrama = () =>
  criar('trama', 128, 128, (ctx, rand) => {
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, 128, 128)
    for (let i = 0; i < 128; i += 4) {
      ctx.fillStyle = `rgba(255,255,255,${0.18 + rand() * 0.1})`
      ctx.fillRect(0, i, 128, 2)
      ctx.fillStyle = `rgba(0,0,0,${0.12 + rand() * 0.08})`
      ctx.fillRect(i, 0, 2, 128)
    }
    pontilhar(ctx, rand, 128, 128, 500, ['#FFFFFF', '#000000'], [0.4, 1])
  })

/** Degradê vertical: uma cor que vai se misturando na outra (paredes dos quartos das crianças) */
export const texDegrade = (baixo: string, meio: string, cima: string) =>
  criar(
    `degrade-${baixo}-${meio}-${cima}`,
    4,
    256,
    (ctx) => {
      const g = ctx.createLinearGradient(0, 256, 0, 0)
      g.addColorStop(0, baixo)
      g.addColorStop(0.5, meio)
      g.addColorStop(1, cima)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 4, 256)
    },
    false,
  )

type Ctx = CanvasRenderingContext2D

function nuvem(ctx: Ctx, x: number, y: number, s: number, cor = 'rgba(255,255,255,0.95)') {
  ctx.fillStyle = cor
  for (const [dx, dy, r] of [
    [-0.9, 0.15, 0.55],
    [-0.3, -0.2, 0.75],
    [0.45, -0.05, 0.62],
    [1.0, 0.2, 0.45],
    [0.05, 0.3, 0.6],
  ]) {
    ctx.beginPath()
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2)
    ctx.fill()
  }
}

function estrela(ctx: Ctx, x: number, y: number, r: number, cor: string) {
  ctx.fillStyle = cor
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const rr = i % 2 ? r * 0.45 : r
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.fill()
}

const DESENHOS: Record<string, (ctx: Ctx, rand: () => number) => void> = {
  montanhas(ctx) {
    const camadas: [string, number, number][] = [
      ['#A8D5C2', 330, 0.9],
      ['#86C2AE', 380, 1.1],
      ['#66AD96', 430, 1.3],
    ]
    for (const [cor, base, alt] of camadas) {
      ctx.fillStyle = cor
      ctx.beginPath()
      ctx.moveTo(0, 512)
      for (let x = 0; x <= 512; x += 8) ctx.lineTo(x, base - Math.abs(Math.sin(x * 0.012 * alt + base)) * 150 * alt)
      ctx.lineTo(512, 512)
      ctx.fill()
    }
    nuvem(ctx, 120, 110, 40)
    nuvem(ctx, 390, 70, 30)
    ctx.fillStyle = '#FFE08A'
    ctx.beginPath()
    ctx.arc(420, 170, 36, 0, Math.PI * 2)
    ctx.fill()
    // a base das montanhas some suavemente na parede (sem "retângulo")
    const g = ctx.createLinearGradient(0, 380, 0, 512)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = g
    ctx.fillRect(0, 380, 512, 132)
    ctx.globalCompositeOperation = 'source-over'
  },
  balao(ctx) {
    const cores = ['#F6A5A0', '#FFD66E', '#8FD3C9', '#9DB8F2']
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = cores[i % 4]
      ctx.beginPath()
      ctx.moveTo(256, 60)
      ctx.quadraticCurveTo(256 - 150 + i * 60, 170, 256, 320)
      ctx.quadraticCurveTo(256 - 90 + i * 60, 170, 256, 60)
      ctx.fill()
    }
    ctx.strokeStyle = '#B98A5E'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(220, 300)
    ctx.lineTo(236, 390)
    ctx.moveTo(292, 300)
    ctx.lineTo(276, 390)
    ctx.stroke()
    ctx.fillStyle = '#C08A5B'
    ctx.fillRect(228, 388, 56, 44)
    nuvem(ctx, 90, 420, 36)
    nuvem(ctx, 430, 140, 30)
  },
  sol(ctx) {
    ctx.translate(256, 256)
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6)
      ctx.fillStyle = i % 2 ? '#FFB347' : '#FFD35C'
      ctx.beginPath()
      ctx.moveTo(-26, -150)
      ctx.lineTo(0, -235)
      ctx.lineTo(26, -150)
      ctx.fill()
    }
    const g = ctx.createRadialGradient(0, 0, 20, 0, 0, 140)
    g.addColorStop(0, '#FFE680')
    g.addColorStop(1, '#FFB23E')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, 140, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#8A5A2B'
    ctx.beginPath()
    ctx.arc(-45, -20, 12, 0, Math.PI * 2)
    ctx.arc(45, -20, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#8A5A2B'
    ctx.lineWidth = 9
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(0, 15, 50, 0.2 * Math.PI, 0.8 * Math.PI)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,140,120,0.6)'
    ctx.beginPath()
    ctx.arc(-80, 30, 18, 0, Math.PI * 2)
    ctx.arc(80, 30, 18, 0, Math.PI * 2)
    ctx.fill()
  },
  arcoiris(ctx) {
    const cores = ['#F59B8F', '#FFC46B', '#FFE38A', '#A8D8A0', '#8CC8E8']
    cores.forEach((c, i) => {
      ctx.strokeStyle = c
      ctx.lineWidth = 34
      ctx.beginPath()
      ctx.arc(256, 400, 200 - i * 34, Math.PI, 0)
      ctx.stroke()
    })
    nuvem(ctx, 80, 400, 48)
    nuvem(ctx, 432, 400, 48)
  },
  lua(ctx, rand) {
    ctx.fillStyle = '#FFF1B8'
    ctx.beginPath()
    ctx.arc(256, 240, 150, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(330, 190, 140, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
    for (let i = 0; i < 14; i++) estrela(ctx, 40 + rand() * 430, 40 + rand() * 430, 8 + rand() * 14, i % 2 ? '#FFF1B8' : '#FFFFFF')
    nuvem(ctx, 170, 420, 46)
  },
  nuvem(ctx) {
    nuvem(ctx, 256, 256, 120)
  },
  borboletas(ctx, rand) {
    const cores = ['#F29CC4', '#C8A2F0', '#FFD27A', '#8FD3E8']
    for (let i = 0; i < 7; i++) {
      const x = 60 + rand() * 390
      const y = 60 + rand() * 390
      const s = 26 + rand() * 20
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate((rand() - 0.5) * 0.8)
      ctx.fillStyle = cores[i % 4]
      for (const l of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(l * s * 0.6, -s * 0.3, s * 0.6, s * 0.75, l * 0.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(l * s * 0.45, s * 0.45, s * 0.4, s * 0.5, -l * 0.4, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#6B4F4F'
      ctx.fillRect(-3, -s * 0.7, 6, s * 1.4)
      ctx.restore()
    }
  },
  estrelas(ctx, rand) {
    for (let i = 0; i < 22; i++) estrela(ctx, 30 + rand() * 450, 30 + rand() * 450, 10 + rand() * 18, ['#FFE08A', '#FFFFFF', '#FFC7D9'][i % 3])
  },
  foguete(ctx) {
    ctx.translate(256, 256)
    ctx.rotate(0.5)
    ctx.fillStyle = '#F6F2EA'
    ctx.beginPath()
    ctx.ellipse(0, 0, 60, 150, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#F28B6E'
    ctx.beginPath()
    ctx.moveTo(-60, -80)
    ctx.quadraticCurveTo(0, -250, 60, -80)
    ctx.closePath()
    ctx.fill()
    for (const l of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(l * 55, 60)
      ctx.lineTo(l * 110, 150)
      ctx.lineTo(l * 50, 130)
      ctx.fill()
    }
    ctx.fillStyle = '#8CC8E8'
    ctx.beginPath()
    ctx.arc(0, -20, 30, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFC24B'
    ctx.beginPath()
    ctx.moveTo(-30, 145)
    ctx.lineTo(0, 230)
    ctx.lineTo(30, 145)
    ctx.fill()
  },
}

/** Desenhos pintados na parede dos quartos infantis (fundo transparente) */
export const texDesenho = (tipo: string) =>
  criar(
    'desenho-' + tipo,
    512,
    512,
    (ctx, rand) => {
      ctx.clearRect(0, 0, 512, 512)
      DESENHOS[tipo]?.(ctx, rand)
      // suaviza as cores (menos saturadas, um pouco mais claras): parece pintado à mão, aguado
      const img = ctx.getImageData(0, 0, 512, 512)
      const d = img.data
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue
        const cinza = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11
        for (let k = 0; k < 3; k++) d[i + k] = (d[i + k] * 0.78 + cinza * 0.22) * 0.94 + 236 * 0.06
        d[i + 3] *= 0.88
      }
      ctx.putImageData(img, 0, 0)
    },
    false,
  )

/** Tapete redondo de arco-íris / listras coloridas pros quartos */
export const texTapeteInfantil = (cores: string[]) =>
  criar(
    'tapete-infantil-' + cores.join(''),
    256,
    256,
    (ctx, rand) => {
      ctx.clearRect(0, 0, 256, 256)
      const n = cores.length
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = cores[i]
        ctx.beginPath()
        ctx.arc(128, 128, 126 - i * (118 / n), 0, Math.PI * 2)
        ctx.fill()
      }
      pontilhar(ctx, rand, 256, 256, 1500, ['rgba(255,255,255,0.4)', 'rgba(0,0,0,0.15)'], [0.4, 1])
    },
    false,
  )
