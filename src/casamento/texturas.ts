import { criar, pontilhar } from '../mundo/texturas'

/** Pista de dança: tacos de madeira clara com pontinhos de luz */
export const texPista = () =>
  criar('pista', 256, 256, (ctx, rand) => {
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const tom = 0.9 + rand() * 0.14
        ctx.fillStyle = `rgb(${214 * tom},${176 * tom},${128 * tom})`
        ctx.fillRect(i * 64, j * 64, 64, 64)
        ctx.strokeStyle = 'rgba(90,60,30,0.35)'
        ctx.lineWidth = 2
        ctx.strokeRect(i * 64 + 1, j * 64 + 1, 62, 62)
      }
  })

/** Só os pontinhos de luz da pista (vira o "brilho" do material) */
export const texPistaLuz = () =>
  criar('pista-luz', 256, 256, (ctx) => {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 16; i++)
      for (let j = 0; j < 16; j++) {
        const x = i * 16 + 8
        const y = j * 16 + 8
        const g = ctx.createRadialGradient(x, y, 0, x, y, 5)
        g.addColorStop(0, '#FFE2A8')
        g.addColorStop(1, 'rgba(255,200,120,0)')
        ctx.fillStyle = g
        ctx.fillRect(x - 6, y - 6, 12, 12)
      }
  })

/** Palha trançada (frente do bar, banquetas) */
export const texPalha = () =>
  criar('palha', 128, 128, (ctx, rand) => {
    ctx.fillStyle = '#B68A55'
    ctx.fillRect(0, 0, 128, 128)
    for (let y = 0; y < 128; y += 8)
      for (let x = 0; x < 128; x += 8) {
        const h = ((x + y) / 8) % 2
        ctx.fillStyle = h ? '#D4AE78' : '#C49A62'
        if (h) ctx.fillRect(x + 1, y + 2, 6, 4)
        else ctx.fillRect(x + 2, y + 1, 4, 6)
      }
    pontilhar(ctx, rand, 128, 128, 400, ['#8E6636', '#E6C48E'], [0.4, 1])
  })

/** Treliça de palha das lanternas (vazada: a luz de dentro aparece) */
export const texTrelica = () =>
  criar(
    'trelica',
    128,
    128,
    (ctx) => {
      ctx.clearRect(0, 0, 128, 128)
      ctx.strokeStyle = '#C89A5C'
      ctx.lineWidth = 5
      for (let i = -128; i < 256; i += 18) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i + 128, 128)
        ctx.moveTo(i + 128, 0)
        ctx.lineTo(i, 128)
        ctx.stroke()
      }
    },
    true,
  )
