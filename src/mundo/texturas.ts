import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import { sorteador } from './util'

// Todas as texturas são desenhadas aqui mesmo, num <canvas>: nada pra baixar.

const cache = new Map<string, Texture>()

export function criar(nome: string, w: number, h: number, desenhar: (ctx: CanvasRenderingContext2D, rand: () => number) => void, repetir = true) {
  const pronto = cache.get(nome)
  if (pronto) return pronto
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  desenhar(ctx, sorteador(nome.length * 97 + w))
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8
  if (repetir) tex.wrapS = tex.wrapT = RepeatWrapping
  cache.set(nome, tex)
  return tex
}

export function pontilhar(ctx: CanvasRenderingContext2D, rand: () => number, w: number, h: number, n: number, cores: string[], tam: [number, number]) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = cores[Math.floor(rand() * cores.length)]
    const r = tam[0] + rand() * (tam[1] - tam[0])
    ctx.globalAlpha = 0.15 + rand() * 0.35
    ctx.beginPath()
    ctx.arc(rand() * w, rand() * h, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/** Folhinhas claras (a cor vem de cada árvore) */
export const texFolhas = () =>
  criar('folhas', 256, 256, (ctx, rand) => {
    ctx.clearRect(0, 0, 256, 256)
    const tons = ['#FFFFFF', '#F1F8E6', '#E2F0CF', '#D4E8BD', '#EEF7DD']
    for (let i = 0; i < 26; i++) {
      const x = 40 + rand() * 176
      const y = 40 + rand() * 176
      const comp = 34 + rand() * 30
      const larg = comp * (0.38 + rand() * 0.12)
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rand() * Math.PI * 2)
      ctx.fillStyle = tons[Math.floor(rand() * tons.length)]
      ctx.beginPath()
      ctx.moveTo(0, -comp / 2)
      ctx.quadraticCurveTo(larg, 0, 0, comp / 2)
      ctx.quadraticCurveTo(-larg, 0, 0, -comp / 2)
      ctx.fill()
      // nervura
      ctx.strokeStyle = 'rgba(120,150,90,0.35)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, -comp / 2 + 3)
      ctx.lineTo(0, comp / 2 - 3)
      ctx.stroke()
      ctx.restore()
    }
  }, false)

/** Folha de coqueiro (uma nervura com vários folíolos) */
export const texPalmeira = () =>
  criar('palmeira', 256, 1024, (ctx) => {
    ctx.scale(2, 2)
    ctx.clearRect(0, 0, 128, 512)
    ctx.strokeStyle = '#E9F3D8'
    ctx.lineCap = 'round'
    for (let i = 0; i < 30; i++) {
      const y = 20 + i * 16
      const comp = 58 * Math.sin(Math.PI * (0.12 + (i / 30) * 0.85))
      ctx.lineWidth = 12
      ctx.beginPath()
      ctx.moveTo(64, y)
      ctx.quadraticCurveTo(64 - comp * 0.6, y + 6, 64 - comp, y + 22)
      ctx.moveTo(64, y)
      ctx.quadraticCurveTo(64 + comp * 0.6, y + 6, 64 + comp, y + 22)
      ctx.stroke()
    }
    ctx.strokeStyle = '#C9D9A8'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(64, 0)
    ctx.lineTo(64, 512)
    ctx.stroke()
  }, false)

type Especie = 'papoula' | 'margarida' | 'amarela' | 'rosa' | 'lilas'

/** Florzinhas vistas de cima */
export const texFlor = (especie: Especie) =>
  criar('flor-' + especie, 128, 128, (ctx, rand) => {
    ctx.clearRect(0, 0, 128, 128)
    const cfg = {
      papoula: { petalas: 5, cor: ['#F0283C', '#D81E36'], miolo: '#2B1A18', larg: 0.9, comp: 50 },
      margarida: { petalas: 14, cor: ['#FFFFFF', '#F6F4EE'], miolo: '#F7C41B', larg: 0.32, comp: 52 },
      amarela: { petalas: 6, cor: ['#FFD21F', '#FFC300'], miolo: '#E08A00', larg: 0.75, comp: 44 },
      rosa: { petalas: 8, cor: ['#FF7FA8', '#FF5E92'], miolo: '#FFE3A1', larg: 0.6, comp: 46 },
      lilas: { petalas: 6, cor: ['#A76BEA', '#8E4FE0'], miolo: '#F6E08A', larg: 0.7, comp: 42 },
    }[especie]
    ctx.translate(64, 64)
    for (let i = 0; i < cfg.petalas; i++) {
      ctx.save()
      ctx.rotate((i / cfg.petalas) * Math.PI * 2 + rand() * 0.2)
      const g = ctx.createLinearGradient(0, 0, 0, -cfg.comp)
      g.addColorStop(0, cfg.cor[1])
      g.addColorStop(1, cfg.cor[0])
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(0, -cfg.comp / 2, (cfg.comp / 2) * cfg.larg, cfg.comp / 2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = cfg.miolo
    ctx.beginPath()
    ctx.arc(0, 0, especie === 'margarida' ? 13 : 10, 0, Math.PI * 2)
    ctx.fill()
  }, false)

export const ESPECIES: Especie[] = ['papoula', 'margarida', 'amarela', 'rosa', 'lilas']

/** Asa de borboleta */
export const texAsa = (cor: string) =>
  criar('asa-' + cor, 128, 128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128)
    ctx.fillStyle = cor
    ctx.beginPath()
    ctx.ellipse(70, 44, 52, 38, -0.35, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(52, 94, 34, 28, 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#2A1D16'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.ellipse(70, 44, 50, 36, -0.35, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#FFFFFF'
    for (const [x, y] of [
      [104, 30],
      [96, 58],
      [112, 46],
    ]) {
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }, false)

/** Tufinho macio de nuvem */
export const urlNuvem = () => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const rand = sorteador(3)
  for (let i = 0; i < 22; i++) {
    const x = 128 + (rand() - 0.5) * 110
    const y = 128 + (rand() - 0.5) * 90
    const r = 40 + rand() * 50
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(255,255,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
  }
  return canvas.toDataURL()
}

// ---------- materiais de construção ----------

export const texReboco = () =>
  criar('reboco', 256, 256, (ctx, rand) => {
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, 256, 256)
    pontilhar(ctx, rand, 256, 256, 2200, ['#E9E9E4', '#F7F7F2', '#DCDCD5'], [0.6, 2.2])
  })

export const texTelhas = () =>
  criar('telhas', 256, 256, (ctx, rand) => {
    ctx.fillStyle = '#7A2E17'
    ctx.fillRect(0, 0, 256, 256)
    const linhas = 8
    const colunas = 6
    const hL = 256 / linhas
    const wC = 256 / colunas
    for (let l = 0; l < linhas; l++) {
      for (let c = -1; c < colunas + 1; c++) {
        const x = c * wC + (l % 2 ? wC / 2 : 0)
        const y = l * hL
        const g = ctx.createLinearGradient(0, y, 0, y + hL)
        const tom = 0.9 + rand() * 0.2
        g.addColorStop(0, `rgb(${232 * tom},${124 * tom},${72 * tom})`)
        g.addColorStop(0.7, `rgb(${198 * tom},${86 * tom},${48 * tom})`)
        g.addColorStop(1, `rgb(${150 * tom},${58 * tom},${34 * tom})`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(x + 2, y)
        ctx.lineTo(x + wC - 2, y)
        ctx.lineTo(x + wC - 2, y + hL * 0.6)
        ctx.quadraticCurveTo(x + wC / 2, y + hL * 1.15, x + 2, y + hL * 0.6)
        ctx.closePath()
        ctx.fill()
      }
    }
  })

export const texTijolo = () =>
  criar('tijolo', 128, 128, (ctx, rand) => {
    ctx.fillStyle = '#E3D6C2'
    ctx.fillRect(0, 0, 128, 128)
    for (let l = 0; l < 8; l++)
      for (let c = -1; c < 4; c++) {
        const tom = 0.85 + rand() * 0.25
        ctx.fillStyle = `rgb(${176 * tom},${84 * tom},${58 * tom})`
        ctx.fillRect(c * 36 + (l % 2 ? 18 : 0) + 2, l * 16 + 2, 32, 12)
      }
  })

export const texMadeira = () =>
  criar('madeira', 256, 256, (ctx, rand) => {
    ctx.fillStyle = '#C79A68'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = `rgba(90,55,30,${0.25 + rand() * 0.2})`
      ctx.fillRect(0, i * 32, 256, 2)
      for (let j = 0; j < 14; j++) {
        ctx.strokeStyle = `rgba(120,80,45,${0.12 + rand() * 0.15})`
        ctx.beginPath()
        const y = i * 32 + 4 + rand() * 26
        ctx.moveTo(0, y)
        ctx.bezierCurveTo(80, y + rand() * 4, 170, y - rand() * 4, 256, y)
        ctx.stroke()
      }
    }
  })

export const texPedra = () =>
  criar('pedra', 256, 256, (ctx, rand) => {
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, 256, 256)
    pontilhar(ctx, rand, 256, 256, 1600, ['#D8D2C6', '#EEEAE2', '#C9C1B2', '#FFFFFF'], [1, 5])
  })

export const texCasca = () =>
  criar('casca', 128, 256, (ctx, rand) => {
    ctx.fillStyle = '#7B5A40'
    ctx.fillRect(0, 0, 128, 256)
    for (let i = 0; i < 70; i++) {
      ctx.strokeStyle = rand() < 0.5 ? 'rgba(50,34,24,0.5)' : 'rgba(160,125,95,0.35)'
      ctx.lineWidth = 1 + rand() * 3
      const x = rand() * 128
      ctx.beginPath()
      ctx.moveTo(x, rand() * 256)
      ctx.lineTo(x + (rand() - 0.5) * 8, rand() * 256)
      ctx.stroke()
    }
  })

/** Detalhe do chão (manchinhas), multiplicado pela cor do terreno */
export const texChao = () =>
  criar('chao', 256, 256, (ctx, rand) => {
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, 256, 256)
    pontilhar(ctx, rand, 256, 256, 3000, ['#C9D8B4', '#E8F2DA', '#B5C79C', '#FFFFFF'], [0.8, 3])
  })

/** Ramo de lavanda (visto de lado) */
export const texLavanda = () =>
  criar('lavanda', 64, 256, (ctx, rand) => {
    ctx.clearRect(0, 0, 64, 256)
    ctx.strokeStyle = '#6E8F4A'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(32, 256)
    ctx.lineTo(32, 20)
    ctx.stroke()
    for (let i = 0; i < 60; i++) {
      const y = 14 + rand() * 120
      const x = 32 + (rand() - 0.5) * 18 * (0.5 + (y - 14) / 120)
      ctx.fillStyle = ['#8E5BD6', '#A77BEA', '#7B47C4', '#B895F0'][Math.floor(rand() * 4)]
      ctx.beginPath()
      ctx.ellipse(x, y, 4.5, 6, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }, false)

/** Veneziana (ripinhas horizontais) */
export const texVeneziana = () =>
  criar('veneziana', 64, 128, (ctx) => {
    ctx.fillStyle = '#D0693D'
    ctx.fillRect(0, 0, 64, 128)
    for (let y = 8; y < 122; y += 9) {
      const g = ctx.createLinearGradient(0, y, 0, y + 9)
      g.addColorStop(0, '#E07D4E')
      g.addColorStop(0.7, '#C45F35')
      g.addColorStop(1, '#8F3E20')
      ctx.fillStyle = g
      ctx.fillRect(7, y, 50, 9)
    }
    ctx.strokeStyle = '#A34A26'
    ctx.lineWidth = 3
    ctx.strokeRect(3, 3, 58, 122)
  }, false)

/** Blocos de pedra claros (térreo da casa) */
export const texBlocos = () =>
  criar('blocos', 256, 256, (ctx, rand) => {
    ctx.fillStyle = '#B9AE9C'
    ctx.fillRect(0, 0, 256, 256)
    const h = 256 / 6
    for (let l = 0; l < 6; l++)
      for (let c = -1; c < 4; c++) {
        const w = 256 / 3
        const x = c * w + (l % 2 ? w / 2 : 0)
        const tom = 0.93 + rand() * 0.1
        ctx.fillStyle = `rgb(${226 * tom},${216 * tom},${198 * tom})`
        ctx.fillRect(x + 2, l * h + 2, w - 4, h - 4)
      }
    pontilhar(ctx, rand, 256, 256, 1400, ['#CFC3AE', '#EFE7DA', '#BFB29C'], [0.6, 1.8])
  })

/** Telhas asfálticas cinza-escuras */
export const texTelhadoEscuro = () =>
  criar('telhado-escuro', 256, 256, (ctx, rand) => {
    ctx.fillStyle = '#2E3237'
    ctx.fillRect(0, 0, 256, 256)
    const linhas = 10
    const hL = 256 / linhas
    for (let l = 0; l < linhas; l++) {
      let x = l % 2 ? -14 : 0
      while (x < 256) {
        const w = 22 + rand() * 18
        const tom = 0.85 + rand() * 0.3
        ctx.fillStyle = `rgb(${78 * tom},${84 * tom},${92 * tom})`
        ctx.fillRect(x + 1, l * hL + 1, w - 2, hL - 3)
        x += w
      }
    }
    pontilhar(ctx, rand, 256, 256, 1500, ['#5F666E', '#3A3F45', '#707882'], [0.5, 1.2])
  })

/** Juta trançada (tapete do corredor) */
export const texJuta = () =>
  criar('juta', 128, 128, (ctx, rand) => {
    ctx.fillStyle = '#C8A877'
    ctx.fillRect(0, 0, 128, 128)
    for (let i = 0; i < 128; i += 4) {
      ctx.fillStyle = `rgba(120,90,50,${0.18 + rand() * 0.12})`
      ctx.fillRect(0, i, 128, 1.5)
      ctx.fillStyle = `rgba(250,230,190,${0.12 + rand() * 0.1})`
      ctx.fillRect(i, 0, 1.5, 128)
    }
  })

/** Rosa vista de frente (pétalas em espiral) — clarinha, a cor vem de cada flor */
export const texRosa = () =>
  criar('rosa', 128, 128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128)
    ctx.translate(64, 64)
    for (let i = 0; i < 20; i++) {
      const a = i * 2.4
      const r = 56 - i * 2.4
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
      g.addColorStop(0, '#FFFFFF')
      g.addColorStop(0.85, i % 2 ? '#F2EDE8' : '#FFFFFF')
      g.addColorStop(1, '#D9CFC6')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(Math.cos(a) * 3, Math.sin(a) * 3, r, r * 0.86, a, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(150,120,110,0.25)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }, false)

/** Pluma de capim-dos-pampas */
export const texPampa = () =>
  criar('pampa', 64, 256, (ctx, rand) => {
    ctx.clearRect(0, 0, 64, 256)
    for (let i = 0; i < 260; i++) {
      const y = 10 + rand() * 200
      const larg = 26 * Math.sin((Math.PI * (y - 10)) / 200)
      const x = 32 + (rand() - 0.5) * larg * 2
      ctx.strokeStyle = ['#F3E6CC', '#E8D5B2', '#FFF6E6'][Math.floor(rand() * 3)]
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(32, y + 20)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
    ctx.strokeStyle = '#B99D70'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(32, 256)
    ctx.lineTo(32, 20)
    ctx.stroke()
  }, false)

/** Placa de boas-vindas com letras elegantes */
export const texPlaca = (linhas: string[]) =>
  criar('placa-' + linhas.join('|'), 512, 700, (ctx) => {
    ctx.fillStyle = '#FBF8F2'
    ctx.fillRect(0, 0, 512, 700)
    ctx.strokeStyle = '#C9A86A'
    ctx.lineWidth = 6
    ctx.strokeRect(24, 24, 464, 652)
    ctx.fillStyle = '#2E2A26'
    ctx.textAlign = 'center'
    ctx.font = 'italic 64px "Cormorant Garamond", Georgia, serif'
    ctx.fillText(linhas[0] ?? '', 256, 230)
    ctx.font = '500 96px "Cormorant Garamond", Georgia, serif'
    ctx.fillText(linhas[1] ?? '', 256, 380)
    ctx.font = '32px Inter, sans-serif'
    ctx.fillStyle = '#9A6B3C'
    ctx.fillText(linhas[2] ?? '', 256, 500)
  }, false)
