// Som ambiente bem baixinho (gravações reais: mar, passarinhos, gaivota, sinos de vento — veja scripts/baixar-sons.mjs).
// Cada lugar tem a sua mistura; trocar de lugar faz uma transição suave.
// O navegador só deixa tocar depois do primeiro toque na tela.

export type Ambiente = 'praia' | 'casamento' | 'silencio'

/** Volume geral (bem baixo de propósito) */
const VOLUME = 0.12

type Faixa = 'mar' | 'passaros' | 'sinos'
// quanto de cada faixa em cada lugar
const MISTURA: Record<Ambiente, Record<Faixa, number>> = {
  praia: { mar: 0.7, passaros: 0, sinos: 0 }, // (a gravação de passarinhos tinha grilo no fundo: desligada)
  casamento: { mar: 0.5, passaros: 0, sinos: 0.42 },
  silencio: { mar: 0, passaros: 0, sinos: 0 },
}
/** gaivota de vez em quando (só na praia), a cada X–Y segundos */
const GAIVOTA: [number, number] = [35, 80]
const EMENDA = 3 // segundos de cruzamento entre uma volta e outra de cada faixa

let ctx: AudioContext | null = null
let geral: GainNode | null = null
const ganhos = new Map<Faixa, GainNode>()
const buffers = new Map<string, AudioBuffer>()
let ambiente: Ambiente = 'silencio'
let ligado = true
let iniciado = false
let timerGaivota = 0

async function carregar(nome: string) {
  const r = await fetch(`${import.meta.env.BASE_URL}sons/${nome}.mp3`)
  const b = await ctx!.decodeAudioData(await r.arrayBuffer())
  buffers.set(nome, b)
  return b
}

/** Toca uma faixa pra sempre, emendando as voltas com um cruzamento suave (sem "clique" na volta) */
function emLoop(faixa: Faixa, buffer: AudioBuffer) {
  const c = ctx!
  const saida = ganhos.get(faixa)!
  const dur = buffer.duration
  let proxima = c.currentTime + 0.05
  const tocar = () => {
    const src = c.createBufferSource()
    src.buffer = buffer
    const g = c.createGain()
    g.gain.setValueAtTime(0, proxima)
    g.gain.linearRampToValueAtTime(1, proxima + EMENDA)
    g.gain.setValueAtTime(1, proxima + dur - EMENDA)
    g.gain.linearRampToValueAtTime(0, proxima + dur)
    src.connect(g).connect(saida)
    src.start(proxima)
    src.stop(proxima + dur + 0.05)
    proxima += dur - EMENDA
    // agenda a próxima volta um pouco antes de precisar
    window.setTimeout(tocar, Math.max(0, (proxima - c.currentTime - 2) * 1000))
  }
  tocar()
}

function agendarGaivota() {
  window.clearTimeout(timerGaivota)
  const espera = (GAIVOTA[0] + Math.random() * (GAIVOTA[1] - GAIVOTA[0])) * 1000
  timerGaivota = window.setTimeout(() => {
    const b = buffers.get('gaivota')
    if (ctx && geral && b && ambiente === 'praia' && ligado && document.visibilityState === 'visible') {
      const src = ctx.createBufferSource()
      src.buffer = b
      const g = ctx.createGain()
      g.gain.value = 0.18 + Math.random() * 0.12
      // vem de um lado ou do outro
      const pan = ctx.createStereoPanner()
      pan.pan.value = Math.random() * 1.4 - 0.7
      src.connect(g).connect(pan).connect(geral)
      src.start()
    }
    agendarGaivota()
  }, espera)
}

async function iniciar() {
  if (iniciado) return
  iniciado = true
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  ctx = new Ctx()
  geral = ctx.createGain()
  geral.gain.value = 0
  // abafa um pouco o agudo (chiado do mar): fica mais calmo
  const abafar = ctx.createBiquadFilter()
  abafar.type = 'lowpass'
  abafar.frequency.value = 4500
  geral.connect(abafar).connect(ctx.destination)
  for (const f of ['mar', 'passaros', 'sinos'] as Faixa[]) {
    const g = ctx.createGain()
    g.gain.value = MISTURA[ambiente][f]
    g.connect(geral)
    ganhos.set(f, g)
  }
  aplicarVolume()
  // (teste: com ?debug, um medidor na saída pra conferir se está tocando)
  if (new URLSearchParams(window.location.search).has('debug')) {
    const medidor = ctx.createAnalyser()
    geral.connect(medidor)
    ;(window as unknown as { __som?: unknown }).__som = { ctx, geral, ganhos, medidor, buffers }
  }
  // carrega e começa cada faixa assim que chegar (o mar primeiro)
  // (só carrega as faixas que algum lugar usa)
  for (const f of (['mar', 'passaros', 'sinos'] as Faixa[]).filter((f) => Object.values(MISTURA).some((m) => m[f] > 0))) {
    try {
      emLoop(f, await carregar(f))
    } catch {
      /* sem esse som: segue sem ele */
    }
  }
  carregar('gaivota').catch(() => {})
  agendarGaivota()
}

function aplicarVolume() {
  if (!ctx || !geral) return
  const alvo = ligado && ambiente !== 'silencio' && document.visibilityState === 'visible' ? VOLUME : 0
  geral.gain.cancelScheduledValues(ctx.currentTime)
  geral.gain.setTargetAtTime(alvo, ctx.currentTime, alvo ? 1.2 : 0.4)
}

/** Troca a mistura conforme o lugar (transição suave) */
export function definirAmbiente(novo: Ambiente) {
  ambiente = novo
  if (!ctx) return
  for (const [f, g] of ganhos) {
    g.gain.cancelScheduledValues(ctx.currentTime)
    g.gain.setTargetAtTime(MISTURA[novo][f], ctx.currentTime, 1.0)
  }
  aplicarVolume()
}

/** Liga/desliga (fica lembrado no aparelho) */
export function ligarSom(v: boolean) {
  ligado = v
  try {
    localStorage.setItem('nosso-lar:som', v ? 'ligado' : 'desligado')
  } catch {
    /* ok */
  }
  if (v) void desbloquear()
  aplicarVolume()
}

export const somLigado = () => {
  try {
    return localStorage.getItem('nosso-lar:som') !== 'desligado'
  } catch {
    return true
  }
}

/** Precisa ser chamado num toque/clique (regra dos navegadores) */
async function desbloquear() {
  if (!ligado) return
  await iniciar()
  if (ctx?.state === 'suspended') await ctx.resume().catch(() => {})
  aplicarVolume()
}

// primeiro toque em qualquer lugar libera o som; sair do site (ou travar o celular) pausa
if (typeof window !== 'undefined') {
  ligado = somLigado()
  const aoTocar = () => void desbloquear()
  window.addEventListener('pointerdown', aoTocar, { passive: true })
  window.addEventListener('keydown', aoTocar)
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.visibilityState === 'visible') void ctx.resume().then(aplicarVolume)
    else {
      aplicarVolume()
      window.setTimeout(() => document.visibilityState !== 'visible' && ctx?.suspend(), 500)
    }
  })
}
