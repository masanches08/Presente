import { useEffect, useMemo, useState } from 'react'
import { MeshBasicMaterial, SRGBColorSpace, TextureLoader, VideoTexture, type Material } from 'three'
import { Y1 } from './construcao'
import { novoAndar } from './exterior'
import { clarear } from './luzAssada'
import { criarMateriais, ESCALAS, ocultar } from './materiais'
import { em } from './moveis'

// A TV grande da nossa suíte, de frente pra cama, passando How I Met Your Mother.
// Fica fora da "obra" do 2º andar de propósito: juntar com a madeira de lá mudaria a geometria
// e a luz assada do Blender deixaria de bater (aí teria que rodar `npm run luz` de novo).
// O vídeo sai de `npm run tv` (public/tv/).

/** Onde fica (centro do rack, encostado no vidro do fundo) e a largura da tela (~105") */
export const TV = { x: 0.5, z: -15.3, largura: 2.3 }
// tela em 16:9, igual ao vídeo: a imagem preenche a tela inteira, sem borda preta
const ALTURA = (TV.largura * 9) / 16
const RACK = 0.48 // altura do rack (com o tampo)
const BASE = RACK + 0.11 // onde começa a tela (em cima do pezinho)
const FRENTE = 0.06 // a tela fica um pouco à frente do centro do rack

function montarTv() {
  const a = novoAndar(Y1)
  const l = em(a, [TV.x, Y1, TV.z], 0) // frente olhando pra cama (+z)
  // rack baixo e comprido: caixa de madeira clara, frente ripada e tampo de mármore, num rodapé preto recuado
  const w = 1.4
  l.caixa('preto', -w + 0.1, w - 0.1, 0, 0.07, -0.18, 0.18)
  l.caixa('madeira', -w, w, 0.07, RACK - 0.02, -0.23, 0.2)
  l.caixa('madeiraEscura', -w + 0.04, w - 0.04, 0.1, RACK - 0.05, 0.2, 0.205)
  for (let x = -w + 0.07; x < w - 0.05; x += 0.055) l.caixa('madeira', x - 0.017, x + 0.017, 0.1, RACK - 0.05, 0.205, 0.225)
  l.caixa('marmore', -w - 0.01, w + 0.01, RACK - 0.02, RACK, -0.24, 0.235)
  // TV de verdade (não só a imagem): moldura escura em volta da tela, borda de metal na lateral,
  // corpo grosso atrás, pé central e uma soundbar na frente
  const lt = TV.largura / 2
  const m = 0.035 // moldura em volta da imagem
  l.caixa('tela', -lt - m, lt + m, BASE - m, BASE + ALTURA + m, FRENTE - 0.015, FRENTE)
  l.caixa('metal', -lt - m - 0.006, lt + m + 0.006, BASE - m - 0.006, BASE + ALTURA + m + 0.006, FRENTE - 0.055, FRENTE - 0.012)
  l.caixa('preto', -lt * 0.82, lt * 0.82, BASE + 0.06, BASE + ALTURA - 0.08, FRENTE - 0.13, FRENTE - 0.055)
  l.caixa('preto', -0.32, 0.32, RACK, RACK + 0.02, -0.16, 0.04)
  l.caixa('preto', -0.07, 0.07, RACK, BASE + 0.3, FRENTE - 0.12, FRENTE - 0.07)
  l.caixa('preto', -0.55, 0.55, RACK, RACK + 0.075, 0.09, 0.17)
  // nas pontas do rack: livros com uma vela por cima, e uma bandejinha de latão com outra vela
  ;['livroB', 'livroD', 'livroA'].forEach((m, i) => l.caixa(m, 1.0, 1.28 - i * 0.02, RACK + i * 0.035, RACK + (i + 1) * 0.035, -0.12 + i * 0.01, 0.1 - i * 0.01))
  l.cil('branco', 1.12, RACK + 0.105, RACK + 0.2, 0, 0.045)
  l.cil('latao', -1.15, RACK, RACK + 0.012, 0, 0.16, 0.16, 24)
  l.cil('branco', -1.2, RACK + 0.012, RACK + 0.15, 0.02, 0.04)
  l.cil('branco', -1.08, RACK + 0.012, RACK + 0.1, -0.04, 0.035)
  return a.o.finalizar(ESCALAS)
}

const capa = () => {
  const t = new TextureLoader().load(`${import.meta.env.BASE_URL}tv/capa.webp`)
  t.colorSpace = SRGBColorSpace
  return t
}

/** O vídeo certo pro aparelho: iPad/computador em 720p; celular (tela pequena) em 540p, mais leve */
const arquivoVideo = () => `${import.meta.env.BASE_URL}tv/cena-${Math.min(screen.width, screen.height) >= 600 ? 720 : 540}.mp4`

interface Props {
  /** A câmera está na suíte: a TV toca (do começo) */
  ligada: boolean
  /** Já pode ir baixando o vídeo (o tour está chegando na suíte) */
  carregar: boolean
  /** 2º andar escondido (visão livre só do térreo) */
  oculto: boolean
}

export function TvSuite({ ligada, carregar, oculto }: Props) {
  const pecas = useMemo(() => montarTv(), [])
  const mats = useMemo(() => {
    const todos = criarMateriais()
    const m: Record<string, Material> = {}
    for (const k of Object.keys(pecas)) {
      m[k] = todos[k]
      if (k !== 'tela') clarear(m[k]) // dentro de casa é dia claro (a moldura da TV continua bem preta)
    }
    return m
  }, [pecas])
  // a tela não recebe luz nenhuma: brilha sozinha, com as cores do vídeo
  const tela = useMemo(() => new MeshBasicMaterial({ map: capa(), toneMapped: false }), [])
  // (a moldura também se chama "tela" nos materiais da casa: a do vídeo vai com outro nome, senão a moldura ficava de fora)
  useEffect(() => ocultar({ ...mats, telaVideo: tela }, oculto), [mats, tela, oculto])

  // o vídeo só nasce quando o tour chega perto (ninguém baixa 13 MB sem ir até a suíte)
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  useEffect(() => {
    if (!carregar || video) return
    const v = document.createElement('video')
    // mudo + inline: é o que deixa o iPad/iPhone tocar sozinho, dentro da TV (sem abrir o player)
    v.muted = v.defaultMuted = true
    v.playsInline = true
    v.setAttribute('playsinline', '')
    v.setAttribute('webkit-playsinline', '')
    v.loop = true
    v.preload = 'auto'
    v.src = arquivoVideo()
    v.load()
    setVideo(v)
  }, [carregar, video])

  // troca a capa pelo vídeo só quando já tem imagem (senão a tela piscava preta)
  useEffect(() => {
    if (!video) return
    const tex = new VideoTexture(video)
    tex.colorSpace = SRGBColorSpace
    const capaTex = tela.map
    const trocar = () => {
      tela.map = tex
      tela.needsUpdate = true
    }
    if (video.readyState >= 2) trocar()
    else video.addEventListener('loadeddata', trocar, { once: true })
    return () => {
      video.removeEventListener('loadeddata', trocar)
      tela.map = capaTex
      tex.dispose()
    }
  }, [video, tela])

  // liga do começo ao chegar na suíte; pausa ao sair
  useEffect(() => {
    if (!video) return
    if (!ligada) {
      video.pause()
      return
    }
    video.currentTime = 0
    // (modo economia de bateria do iPhone/iPad bloqueia o "tocar sozinho": aí liga no próximo toque na tela)
    const noToque = () => void video.play().catch(() => {})
    video.play().catch(() => window.addEventListener('pointerdown', noToque, { once: true }))
    return () => window.removeEventListener('pointerdown', noToque)
  }, [video, ligada])

  // ao sair da casa: para e solta o vídeo
  useEffect(
    () => () => {
      if (!video) return
      video.pause()
      video.removeAttribute('src')
      video.load()
    },
    [video],
  )

  return (
    <group>
      {Object.entries(pecas).map(([k, g]) => (
        <mesh key={k} geometry={g} material={mats[k]} castShadow receiveShadow />
      ))}
      <mesh position={[TV.x, Y1 + BASE + ALTURA / 2, TV.z + FRENTE + 0.001]} material={tela}>
        <planeGeometry args={[TV.largura, ALTURA]} />
      </mesh>
    </group>
  )
}
