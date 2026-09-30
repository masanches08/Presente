import { criar, pontilhar } from '../mundo/texturas'

// Texturas da lua de mel (desenhadas aqui mesmo, nada pra baixar)

/** Fibras de telhado (ijuk preto dos templos / palha dos bangalôs): usada como relevo */
export const texFibras = () =>
  criar('fibras', 128, 256, (ctx, rand) => {
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, 128, 256)
    for (let i = 0; i < 700; i++) {
      const x = rand() * 128
      const y = rand() * 256
      ctx.strokeStyle = rand() < 0.5 ? `rgba(255,255,255,${0.2 + rand() * 0.3})` : `rgba(0,0,0,${0.25 + rand() * 0.3})`
      ctx.lineWidth = 0.8 + rand() * 1.4
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (rand() - 0.5) * 3, y + 14 + rand() * 20)
      ctx.stroke()
    }
    // camadas horizontais (as "fiadas" do telhado)
    for (let y = 0; y < 256; y += 32) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.fillRect(0, y, 128, 3)
    }
  })

/** Poleng: o tecido xadrez preto e branco das estátuas sagradas de Bali */
export const texPoleng = () =>
  criar('poleng', 128, 128, (ctx) => {
    const n = 8
    const s = 128 / n
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#1E1E1E' : '#F4F1EA'
        ctx.fillRect(i * s, j * s, s, s)
      }
    // meio-tom cinza nas bordas dos quadrados (tecido de verdade)
    ctx.fillStyle = 'rgba(120,120,120,0.25)'
    for (let i = 0; i < n; i++) ctx.fillRect(i * s - 1, 0, 2, 128)
  })

/** Escamas do dragão (naga): verde com contorno dourado */
export const texEscamas = () =>
  criar('escamas', 128, 128, (ctx) => {
    ctx.fillStyle = '#1F6B3A'
    ctx.fillRect(0, 0, 128, 128)
    const r = 12
    for (let l = -1; l < 12; l++)
      for (let c = -1; c < 7; c++) {
        const x = c * r * 2 + (l % 2 ? r : 0)
        const y = l * r
        const g = ctx.createRadialGradient(x, y + 6, 1, x, y + 6, r + 2)
        g.addColorStop(0, '#6FC08A')
        g.addColorStop(0.7, '#2E8A4E')
        g.addColorStop(1, '#16502B')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI)
        ctx.fill()
        ctx.strokeStyle = '#D9B24A'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, r - 1, 0.1, Math.PI - 0.1)
        ctx.stroke()
      }
  })

/** Topo das pedras octogonais do palácio: flor de lótus entalhada */
export const texEntalhe = () =>
  criar(
    'entalhe',
    256,
    256,
    (ctx, rand) => {
      ctx.fillStyle = '#8F8A80'
      ctx.fillRect(0, 0, 256, 256)
      pontilhar(ctx, rand, 256, 256, 1600, ['#A39E93', '#77726A', '#9A968C'], [0.6, 2])
      ctx.translate(128, 128)
      const sulco = (desenhar: () => void) => {
        ctx.strokeStyle = 'rgba(30,28,24,0.85)'
        ctx.lineWidth = 7
        desenhar()
        ctx.stroke()
        ctx.strokeStyle = 'rgba(235,230,220,0.6)'
        ctx.lineWidth = 3
        ctx.translate(-2, -2)
        desenhar()
        ctx.stroke()
        ctx.translate(2, 2)
      }
      for (const r of [112, 92]) sulco(() => {
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
      })
      // pétalas do lótus
      for (let i = 0; i < 8; i++) {
        ctx.save()
        ctx.rotate((i / 8) * Math.PI * 2)
        sulco(() => {
          ctx.beginPath()
          ctx.moveTo(0, -18)
          ctx.quadraticCurveTo(26, -50, 0, -84)
          ctx.quadraticCurveTo(-26, -50, 0, -18)
        })
        ctx.restore()
      }
      sulco(() => {
        ctx.beginPath()
        ctx.arc(0, 0, 18, 0, Math.PI * 2)
      })
      // musgo nas bordas
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      for (let i = 0; i < 90; i++) {
        const a = rand() * Math.PI * 2
        const d = 110 + rand() * 20
        ctx.fillStyle = `rgba(80,110,50,${0.2 + rand() * 0.3})`
        ctx.beginPath()
        ctx.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 2 + rand() * 5, 0, Math.PI * 2)
        ctx.fill()
      }
    },
    false,
  )

/** Folha de bananeira (forra as bandejas de comida) */
export const texBananeira = () =>
  criar(
    'bananeira',
    256,
    128,
    (ctx, rand) => {
      const g = ctx.createLinearGradient(0, 0, 0, 128)
      g.addColorStop(0, '#2F7A2A')
      g.addColorStop(0.5, '#4E9E38')
      g.addColorStop(1, '#2F7A2A')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 256, 128)
      for (let x = -40; x < 300; x += 5) {
        ctx.strokeStyle = `rgba(${rand() < 0.5 ? '200,240,160' : '20,60,20'},0.25)`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + 40, 60)
        ctx.lineTo(x, 128)
        ctx.stroke()
      }
      ctx.fillStyle = '#B8D98A'
      ctx.fillRect(0, 60, 256, 8)
    },
    true,
  )

/** Flor de frangipani (plumeria): branca com o miolo amarelo */
export const texFrangipani = () =>
  criar(
    'frangipani',
    128,
    128,
    (ctx) => {
      ctx.clearRect(0, 0, 128, 128)
      ctx.translate(64, 64)
      for (let i = 0; i < 5; i++) {
        ctx.save()
        ctx.rotate((i / 5) * Math.PI * 2)
        const g = ctx.createLinearGradient(0, 0, 0, -58)
        g.addColorStop(0, '#FFC933')
        g.addColorStop(0.35, '#FFF3C4')
        g.addColorStop(1, '#FFFFFF')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.ellipse(10, -30, 17, 30, 0.45, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    },
    false,
  )

/** Ondinhas do jato d'água (textura que "corre" pelo jato) */
export const texJato = () =>
  criar('jato', 64, 256, (ctx, rand) => {
    ctx.fillStyle = '#9FD3E0'
    ctx.fillRect(0, 0, 64, 256)
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.6})`
      ctx.fillRect(rand() * 64, rand() * 256, 2 + rand() * 6, 6 + rand() * 20)
    }
  })

/** Toldo dos barcos de cauda longa: listras coloridas */
export const texToldo = () =>
  criar('toldo', 128, 64, (ctx) => {
    const cores = ['#1FA7B5', '#FFFFFF', '#1FA7B5', '#F2C14E']
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = cores[i % cores.length]
      ctx.fillRect(i * 8, 0, 8, 64)
    }
  })

/** Calcário dos penhascos: listras escorridas cinza-escuro e ferrugem, rachaduras e manchinhas */
export const texCalcario = () =>
  criar('calcario', 256, 512, (ctx, rand) => {
    ctx.fillStyle = '#E4DED2'
    ctx.fillRect(0, 0, 256, 512)
    pontilhar(ctx, rand, 256, 512, 5000, ['#CFC7B8', '#F1ECE2', '#BDB4A3', '#D9CFBD'], [0.6, 2.4])
    // escorridos verticais (a chuva desenha no calcário)
    for (let i = 0; i < 70; i++) {
      const x = rand() * 256
      const y0 = rand() * 400
      const comp = 60 + rand() * 260
      const larg = 2 + rand() * 9
      const ferrugem = rand() < 0.35
      const g = ctx.createLinearGradient(0, y0, 0, y0 + comp)
      const cor = ferrugem ? '176,112,58' : rand() < 0.5 ? '70,66,60' : '120,114,104'
      g.addColorStop(0, `rgba(${cor},${0.35 + rand() * 0.35})`)
      g.addColorStop(1, `rgba(${cor},0)`)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(x, y0)
      for (let k = 0; k <= 10; k++) ctx.lineTo(x + Math.sin(k * 0.9 + i) * 3 + (larg * k) / 20, y0 + (comp * k) / 10)
      for (let k = 10; k >= 0; k--) ctx.lineTo(x - larg + Math.sin(k * 0.9 + i) * 3 - (larg * k) / 30, y0 + (comp * k) / 10)
      ctx.fill()
    }
    // rachaduras
    ctx.strokeStyle = 'rgba(50,46,40,0.45)'
    for (let i = 0; i < 26; i++) {
      ctx.lineWidth = 0.8 + rand() * 1.6
      let x = rand() * 256
      let y = rand() * 512
      ctx.beginPath()
      ctx.moveTo(x, y)
      for (let k = 0; k < 6; k++) {
        x += (rand() - 0.5) * 30
        y += 8 + rand() * 20
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  })

/** Palha de verdade (telhado dos bangalôs): fiadas sobrepostas com fibras douradas */
export const texPalhaCor = () =>
  criar('palha-cor', 256, 256, (ctx, rand) => {
    ctx.fillStyle = '#8A6A3E'
    ctx.fillRect(0, 0, 256, 256)
    for (let fiada = 0; fiada < 8; fiada++) {
      const y0 = fiada * 32
      for (let i = 0; i < 260; i++) {
        const x = rand() * 256
        const tom = 0.75 + rand() * 0.5
        ctx.strokeStyle = `rgb(${196 * tom},${160 * tom},${98 * tom})`
        ctx.lineWidth = 1 + rand() * 1.5
        ctx.beginPath()
        ctx.moveTo(x, y0 + rand() * 4)
        ctx.lineTo(x + (rand() - 0.5) * 4, y0 + 30 + rand() * 8)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(60,40,20,0.45)'
      ctx.fillRect(0, y0 + 30, 256, 3)
    }
  })

/** Fibra preta de palmeira (ijuk) dos telhados dos templos */
export const texIjukCor = () =>
  criar('ijuk-cor', 256, 256, (ctx, rand) => {
    ctx.fillStyle = '#1F1C1A'
    ctx.fillRect(0, 0, 256, 256)
    for (let fiada = 0; fiada < 6; fiada++) {
      const y0 = fiada * 43
      for (let i = 0; i < 220; i++) {
        const x = rand() * 256
        const tom = 30 + rand() * 45
        ctx.strokeStyle = `rgb(${tom},${tom * 0.92},${tom * 0.85})`
        ctx.lineWidth = 1 + rand() * 1.2
        ctx.beginPath()
        ctx.moveTo(x, y0)
        ctx.lineTo(x + (rand() - 0.5) * 5, y0 + 40 + rand() * 8)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, y0 + 40, 256, 3)
    }
  })
