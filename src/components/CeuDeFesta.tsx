import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'

// Efeitos desenhados num <canvas> (leves, sem baixar nada):
//  - "fogos": fogos de artifício (alguns em formato de coração) + confete caindo
//  - "lanternas": lanternas de papel iluminadas e coraçõezinhos subindo devagar + pétalas caindo

type Modo = 'fogos' | 'lanternas'

const CORES_FOGOS = [
  ['#FFD27A', '#FFF1D6', '#FFB347'], // dourado
  ['#FF9FB5', '#FFD6E0', '#FF7A9C'], // rosa
  ['#FFF7EA', '#FFE3B0', '#FFFFFF'], // champanhe
  ['#FF8A65', '#FFC3A8', '#FFD27A'], // coral
  ['#D7B8FF', '#F3E6FF', '#FF9FB5'], // lilás
]
const CORES_CONFETE = ['#E8BF72', '#F6D98E', '#FF9FB5', '#FFD6E0', '#FFF7EA', '#A9C79B']
const CORES_PETALA = ['#F2A6B8', '#E8B4A0', '#F7C9D2', '#C8643B', '#F3DFB1']

const aleatorio = (a: number, b: number) => a + Math.random() * (b - a)
const escolher = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)]

/** Formato de coração (x, y entre -1 e 1) */
function coracao(t: number) {
  const x = 16 * Math.sin(t) ** 3
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
  return { x: x / 17, y: -y / 17 }
}

function desenharCoracao(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath()
  ctx.moveTo(x, y + s * 0.35)
  ctx.bezierCurveTo(x - s * 1.1, y - s * 0.45, x - s * 0.45, y - s * 1.15, x, y - s * 0.45)
  ctx.bezierCurveTo(x + s * 0.45, y - s * 1.15, x + s * 1.1, y - s * 0.45, x, y + s * 0.35)
  ctx.fill()
}

export function CeuDeFesta({ modo, intensidade = 'festa', className = '' }: { modo: Modo; intensidade?: 'festa' | 'leve'; className?: string }) {
  const rastro = useRef<HTMLCanvasElement>(null) // fogos (deixam rastro)
  const limpo = useRef<HTMLCanvasElement>(null) // confete e lanternas (redesenha do zero)
  const parado = useReducedMotion()

  useEffect(() => {
    if (parado) return
    const cR = rastro.current!
    const cL = limpo.current!
    const r = cR.getContext('2d')!
    const l = cL.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let W = 0
    let H = 0
    const medir = () => {
      W = cR.clientWidth
      H = cR.clientHeight
      for (const c of [cR, cL]) {
        c.width = W * dpr
        c.height = H * dpr
      }
      r.setTransform(dpr, 0, 0, dpr, 0, 0)
      l.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    medir()
    window.addEventListener('resize', medir)

    const k = Math.max(0.7, Math.min(1.4, Math.min(W, H) / 700)) // tamanho relativo à tela
    const festa = intensidade === 'festa'

    // ---------- fogos ----------
    interface Foguete {
      x: number
      y: number
      vy: number
      vx: number
      cores: string[]
      forma: 'bola' | 'coracao' | 'anel'
    }
    interface Faisca {
      x: number
      y: number
      vx: number
      vy: number
      vida: number
      gasto: number
      cor: string
      t: number
    }
    const foguetes: Foguete[] = []
    const faiscas: Faisca[] = []
    const G = 0.05 * k
    let proximoFogo = 0

    const lancar = () => {
      const alvo = H * aleatorio(0.12, festa ? 0.42 : 0.3)
      const altura = H + 10 - alvo
      foguetes.push({
        x: W * aleatorio(0.12, 0.88),
        y: H + 10,
        vy: -Math.sqrt(2 * G * 2.2 * altura),
        vx: aleatorio(-0.4, 0.4),
        cores: escolher(CORES_FOGOS),
        forma: Math.random() < 0.28 ? 'coracao' : Math.random() < 0.3 ? 'anel' : 'bola',
      })
    }
    const explodir = (f: Foguete) => {
      const n = f.forma === 'coracao' ? 90 : festa ? Math.round(aleatorio(70, 110)) : 60
      const forca = aleatorio(2.6, 4) * k
      for (let i = 0; i < n; i++) {
        let vx: number
        let vy: number
        if (f.forma === 'coracao') {
          const p = coracao((i / n) * Math.PI * 2)
          vx = p.x * forca
          vy = p.y * forca
        } else {
          const a = Math.random() * Math.PI * 2
          const v = f.forma === 'anel' ? forca : forca * Math.sqrt(Math.random())
          vx = Math.cos(a) * v
          vy = Math.sin(a) * v
        }
        faiscas.push({ x: f.x, y: f.y, vx, vy, vida: 1, gasto: aleatorio(0.008, 0.014), cor: escolher(f.cores), t: Math.random() * 10 })
      }
    }

    // ---------- confete (aniversário) ou pétalas (dia 24) ----------
    const petalas = modo === 'lanternas'
    const confetes = festa
      ? Array.from({ length: Math.round((petalas ? 34 : 70) * k) }, () => ({
          x: Math.random() * W,
          y: aleatorio(-H, 0),
          vy: (petalas ? aleatorio(0.35, 0.8) : aleatorio(0.6, 1.5)) * k,
          balanco: aleatorio(0.5, 1.6),
          fase: Math.random() * 6.28,
          giro: Math.random() * 6.28,
          vgiro: aleatorio(-0.08, 0.08),
          w: aleatorio(5, 9) * k,
          h: aleatorio(9, 15) * k,
          cor: escolher(petalas ? CORES_PETALA : CORES_CONFETE),
        }))
      : []

    // ---------- lanternas ----------
    const lanternas = Array.from({ length: modo === 'lanternas' ? Math.round(30 * k) : 0 }, () => {
      const perto = Math.random()
      return {
        x: Math.random() * W,
        y: aleatorio(0, H * 1.2),
        vy: (0.25 + perto * 0.55) * k,
        s: (7 + perto * 14) * k,
        fase: Math.random() * 6.28,
        balanco: aleatorio(6, 18),
        coracao: Math.random() < 0.3,
        brilho: aleatorio(0.75, 1),
      }
    })

    let quadro = 0
    let ultimo = performance.now()
    const passo = (agora: number) => {
      const dt = Math.min(3, (agora - ultimo) / 16.7)
      ultimo = agora

      // rastro dos fogos: apaga devagarinho o quadro anterior
      r.globalCompositeOperation = 'destination-out'
      r.fillStyle = `rgba(0,0,0,${0.16 * dt})`
      r.fillRect(0, 0, W, H)
      r.globalCompositeOperation = 'lighter'

      if (modo === 'fogos') {
        proximoFogo -= dt * 16.7
        if (proximoFogo <= 0) {
          lancar()
          if (festa && Math.random() < 0.3) lancar()
          proximoFogo = festa ? aleatorio(550, 1200) : aleatorio(2600, 5200)
        }
        for (let i = foguetes.length - 1; i >= 0; i--) {
          const f = foguetes[i]
          f.x += f.vx * dt
          f.y += f.vy * dt
          f.vy += G * 2.2 * dt
          r.fillStyle = f.cores[1]
          r.beginPath()
          r.arc(f.x, f.y, 1.8 * k, 0, 6.28)
          r.fill()
          if (f.vy >= -0.6) {
            explodir(f)
            foguetes.splice(i, 1)
          }
        }
        for (let i = faiscas.length - 1; i >= 0; i--) {
          const p = faiscas[i]
          p.vx *= 0.985 ** dt
          p.vy = p.vy * 0.985 ** dt + G * 0.55 * dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.vida -= p.gasto * dt
          if (p.vida <= 0) {
            faiscas.splice(i, 1)
            continue
          }
          // no fim, as faíscas piscam
          const pisca = p.vida < 0.35 ? 0.5 + 0.5 * Math.sin(quadro * 0.6 + p.t) : 1
          r.globalAlpha = Math.max(0, p.vida * pisca)
          r.fillStyle = p.cor
          r.beginPath()
          r.arc(p.x, p.y, (1.1 + p.vida * 1.3) * k, 0, 6.28)
          r.fill()
        }
        r.globalAlpha = 1
      }

      // quadro limpo: confete e lanternas
      l.clearRect(0, 0, W, H)
      for (const c of confetes) {
        c.y += c.vy * dt
        c.fase += 0.03 * dt
        c.giro += c.vgiro * dt
        const x = c.x + Math.sin(c.fase) * c.balanco * 12
        if (c.y > H + 20) {
          c.y = -20
          c.x = Math.random() * W
        }
        l.save()
        l.translate(x, c.y)
        l.rotate(c.giro)
        l.scale(1, Math.abs(Math.cos(c.fase * 2))) // o papelzinho "virando" no ar
        l.fillStyle = c.cor
        if (petalas) {
          // pétala: gotinha arredondada
          l.globalAlpha = 0.75
          l.beginPath()
          l.ellipse(0, 0, c.w * 0.8, c.h * 0.6, 0.6, 0, Math.PI * 2)
          l.fill()
        } else {
          l.globalAlpha = 0.9
          l.fillRect(-c.w / 2, -c.h / 2, c.w, c.h)
        }
        l.restore()
      }
      for (const a of lanternas) {
        a.y -= a.vy * dt
        a.fase += 0.012 * dt
        if (a.y < -a.s * 4) {
          a.y = H + a.s * 4
          a.x = Math.random() * W
        }
        const x = a.x + Math.sin(a.fase) * a.balanco
        const chama = 0.85 + 0.15 * Math.sin(quadro * 0.25 + a.fase * 7)
        // brilho em volta
        const g = l.createRadialGradient(x, a.y, 0, x, a.y, a.s * 3.2)
        g.addColorStop(0, a.coracao ? `rgba(255,150,180,${0.45 * chama})` : `rgba(255,190,110,${0.5 * chama})`)
        g.addColorStop(1, 'rgba(255,170,90,0)')
        l.fillStyle = g
        l.fillRect(x - a.s * 3.2, a.y - a.s * 3.2, a.s * 6.4, a.s * 6.4)
        if (a.coracao) {
          l.fillStyle = `rgba(255,${170 + 40 * chama},${200 + 20 * chama},${a.brilho})`
          desenharCoracao(l, x, a.y, a.s * 0.75)
        } else {
          // a lanterna: papel alaranjado, mais claro no meio (a chama por dentro)
          const corpo = l.createLinearGradient(x, a.y - a.s, x, a.y + a.s)
          corpo.addColorStop(0, `rgba(255,170,90,${a.brilho})`)
          corpo.addColorStop(0.6, `rgba(255,${215 + 30 * chama},160,${a.brilho})`)
          corpo.addColorStop(1, `rgba(255,150,70,${a.brilho})`)
          l.fillStyle = corpo
          l.beginPath()
          l.moveTo(x - a.s * 0.5, a.y - a.s * 0.85)
          l.lineTo(x + a.s * 0.5, a.y - a.s * 0.85)
          l.quadraticCurveTo(x + a.s * 0.72, a.y, x + a.s * 0.42, a.y + a.s * 0.85)
          l.lineTo(x - a.s * 0.42, a.y + a.s * 0.85)
          l.quadraticCurveTo(x - a.s * 0.72, a.y, x - a.s * 0.5, a.y - a.s * 0.85)
          l.fill()
        }
      }

      quadro++
      id = requestAnimationFrame(passo)
    }
    let id = requestAnimationFrame(passo)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', medir)
    }
  }, [modo, intensidade, parado])

  if (parado) return null
  return (
    <div className={`pointer-events-none ${className}`} aria-hidden>
      <canvas ref={rastro} className="absolute inset-0 size-full" />
      <canvas ref={limpo} className="absolute inset-0 size-full" />
    </div>
  )
}
