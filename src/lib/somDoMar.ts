// Som de ondas feito na hora (sem arquivo de áudio): um "chiado" suave que sobe e desce como o mar.

let ctx: AudioContext | null = null
let saida: GainNode | null = null

function criar() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const c = new Ctx()
  // ruído "marrom" (grave e macio), em loop de 4 segundos
  const dur = 4
  const buffer = c.createBuffer(2, c.sampleRate * dur, c.sampleRate)
  for (let canal = 0; canal < 2; canal++) {
    const d = buffer.getChannelData(canal)
    let ultimo = 0
    for (let i = 0; i < d.length; i++) {
      ultimo = (ultimo + 0.02 * (Math.random() * 2 - 1)) / 1.02
      d[i] = ultimo * 3.2
    }
  }
  const fonte = c.createBufferSource()
  fonte.buffer = buffer
  fonte.loop = true
  const filtro = c.createBiquadFilter()
  filtro.type = 'lowpass'
  filtro.frequency.value = 650
  // as ondas: o volume sobe e desce devagar
  const onda = c.createGain()
  onda.gain.value = 0.55
  const lfo = c.createOscillator()
  lfo.frequency.value = 0.11
  const lfoGanho = c.createGain()
  lfoGanho.gain.value = 0.4
  lfo.connect(lfoGanho).connect(onda.gain)
  const volume = c.createGain()
  volume.gain.value = 0
  fonte.connect(filtro).connect(onda).connect(volume).connect(c.destination)
  fonte.start()
  lfo.start()
  ctx = c
  saida = volume
}

/** Liga ou desliga o som do mar (com um fade suave) */
export function somDoMar(ligado: boolean) {
  if (ligado && !ctx) criar()
  if (!ctx || !saida) return
  if (ligado) void ctx.resume()
  saida.gain.cancelScheduledValues(ctx.currentTime)
  saida.gain.setTargetAtTime(ligado ? 0.35 : 0, ctx.currentTime, 0.6)
}
