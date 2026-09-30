// Som de paz, bem baixinho, feito na hora (sem arquivo): um acorde macio que "respira",
// sininhos esparsos de vez em quando e ondas lá no fundo.

const VOLUME = 0.05 // bem baixo mesmo

let ctx: AudioContext | null = null
let saida: GainNode | null = null
let sinos: number | null = null

function criar() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const c = new Ctx()
  const volume = c.createGain()
  volume.gain.value = 0
  volume.connect(c.destination)

  // eco longo e suave (dá a sensação de espaço)
  const eco = c.createDelay(2)
  eco.delayTime.value = 0.9
  const retorno = c.createGain()
  retorno.gain.value = 0.45
  const tomEco = c.createBiquadFilter()
  tomEco.type = 'lowpass'
  tomEco.frequency.value = 1400
  eco.connect(tomEco).connect(retorno).connect(eco)
  tomEco.connect(volume)

  // o acorde (Ré com nona): cada nota sobe e desce devagar, em tempos diferentes
  const macio = c.createBiquadFilter()
  macio.type = 'lowpass'
  macio.frequency.value = 900
  macio.connect(volume)
  macio.connect(eco)
  for (const [freq, velocidade] of [
    [146.83, 0.05],
    [220.0, 0.07],
    [293.66, 0.043],
    [329.63, 0.061],
    [369.99, 0.037],
  ]) {
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.detune.value = (Math.random() - 0.5) * 8
    const g = c.createGain()
    g.gain.value = 0.12
    const lfo = c.createOscillator()
    lfo.frequency.value = velocidade
    const lfoG = c.createGain()
    lfoG.gain.value = 0.1
    lfo.connect(lfoG).connect(g.gain)
    osc.connect(g).connect(macio)
    osc.start()
    lfo.start()
  }

  // ondas bem de fundo: ruído grave que sobe e desce
  const dur = 4
  const buffer = c.createBuffer(1, c.sampleRate * dur, c.sampleRate)
  const d = buffer.getChannelData(0)
  let ultimo = 0
  for (let i = 0; i < d.length; i++) {
    ultimo = (ultimo + 0.02 * (Math.random() * 2 - 1)) / 1.02
    d[i] = ultimo * 3.2
  }
  const ruido = c.createBufferSource()
  ruido.buffer = buffer
  ruido.loop = true
  const filtroMar = c.createBiquadFilter()
  filtroMar.type = 'lowpass'
  filtroMar.frequency.value = 500
  const mar = c.createGain()
  mar.gain.value = 0.25
  const lfoMar = c.createOscillator()
  lfoMar.frequency.value = 0.09
  const lfoMarG = c.createGain()
  lfoMarG.gain.value = 0.2
  lfoMar.connect(lfoMarG).connect(mar.gain)
  ruido.connect(filtroMar).connect(mar).connect(volume)
  ruido.start()
  lfoMar.start()

  // sininhos: uma nota da escala pentatônica a cada poucos segundos
  const escala = [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66]
  const tocar = () => {
    const t = c.currentTime
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = escala[Math.floor(Math.random() * escala.length)]
    const g = c.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.07, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4)
    osc.connect(g)
    g.connect(volume)
    g.connect(eco)
    osc.start(t)
    osc.stop(t + 4.2)
    sinos = window.setTimeout(tocar, 3500 + Math.random() * 5000)
  }
  sinos = window.setTimeout(tocar, 2500)

  ctx = c
  saida = volume
}

/** Liga ou desliga o som de paz (entra e sai devagarinho) */
export function somDePaz(ligado: boolean) {
  if (ligado && !ctx) criar()
  if (!ctx || !saida) return
  if (ligado) void ctx.resume()
  saida.gain.cancelScheduledValues(ctx.currentTime)
  saida.gain.setTargetAtTime(ligado ? VOLUME : 0, ctx.currentTime, ligado ? 1.5 : 0.4)
  if (!ligado) {
    const c = ctx
    if (sinos) window.clearTimeout(sinos)
    sinos = null
    ctx = null
    saida = null
    window.setTimeout(() => void c.close(), 1500)
  }
}
