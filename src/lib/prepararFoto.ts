// Prepara uma foto (ou o primeiro frame de um vídeo) escolhida no celular/computador:
// abre, deixa escolher o recorte 3:4 e gera a versão grande (1200x1600) e a menor (600x800).

export interface Fonte {
  /** algo que dá pra desenhar num canvas */
  imagem: HTMLImageElement
  largura: number
  altura: number
  /** endereço pra mostrar no editor */
  url: string
}

/** Recorte em pixels da foto original */
export interface Recorte {
  x: number
  y: number
  largura: number
  altura: number
}

export const LARGURA = 1200
export const ALTURA = 1600

function carregarImagem(url: string) {
  return new Promise<HTMLImageElement>((ok, falha) => {
    const img = new Image()
    img.onload = () => ok(img)
    img.onerror = () => falha(new Error('imagem'))
    img.src = url
  })
}

/** Pega o primeiro frame de um vídeo e devolve como imagem */
function primeiroFrame(arquivo: File) {
  return new Promise<Blob>((ok, falha) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(arquivo)
    let feito = false
    const terminar = (b: Blob | null) => {
      if (feito) return
      feito = true
      video.pause()
      video.removeAttribute('src')
      URL.revokeObjectURL(url)
      if (b) ok(b)
      else falha(new Error('video'))
    }
    const desenhar = () => {
      if (feito || !video.videoWidth) return
      const c = document.createElement('canvas')
      c.width = video.videoWidth
      c.height = video.videoHeight
      c.getContext('2d')!.drawImage(video, 0, 0)
      c.toBlob((b) => terminar(b), 'image/jpeg', 0.95)
    }
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.onerror = () => terminar(null)
    // (o iPhone só carrega o vídeo de verdade depois de um "play")
    video.onloadedmetadata = () => void video.play().catch(() => {})
    video.onloadeddata = () => {
      video.pause()
      try {
        video.currentTime = 0.05 // um tiquinho depois do começo (o frame 0 às vezes vem preto)
      } catch {
        desenhar()
      }
      window.setTimeout(desenhar, 1200) // se o "pular pro começo" não responder, usa o frame que já tem
    }
    video.onseeked = desenhar
    window.setTimeout(() => (video.videoWidth ? desenhar() : terminar(null)), 8000)
    video.src = url
  })
}

/** Abre o arquivo escolhido (foto ou vídeo) */
export async function abrirArquivo(arquivo: File): Promise<Fonte> {
  const blob = arquivo.type.startsWith('video/') ? await primeiroFrame(arquivo) : arquivo
  const url = URL.createObjectURL(blob)
  try {
    const imagem = await carregarImagem(url)
    return { imagem, largura: imagem.naturalWidth, altura: imagem.naturalHeight, url }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

function paraBlob(c: HTMLCanvasElement, qualidade: number) {
  return new Promise<Blob>((ok, falha) =>
    c.toBlob(
      (b) => {
        // (alguns navegadores não sabem gerar .webp: aí vai .jpg mesmo)
        if (b && b.type === 'image/webp') return ok(b)
        c.toBlob((j) => (j ? ok(j) : falha(new Error('salvar'))), 'image/jpeg', qualidade)
      },
      'image/webp',
      qualidade,
    ),
  )
}

/** Recorta e gera as duas versões da foto */
export async function gerarVersoes(fonte: Fonte, r: Recorte) {
  const grande = document.createElement('canvas')
  grande.width = LARGURA
  grande.height = ALTURA
  const g = grande.getContext('2d')!
  g.imageSmoothingEnabled = true
  g.imageSmoothingQuality = 'high'
  g.drawImage(fonte.imagem, r.x, r.y, r.largura, r.altura, 0, 0, LARGURA, ALTURA)

  const mini = document.createElement('canvas')
  mini.width = LARGURA / 2
  mini.height = ALTURA / 2
  const m = mini.getContext('2d')!
  m.imageSmoothingQuality = 'high'
  m.drawImage(grande, 0, 0, mini.width, mini.height)

  return { grande: await paraBlob(grande, 0.92), mini: await paraBlob(mini, 0.85) }
}

/** Foto pra colar como adesivo na cartinha: sem recorte, só diminui (o lado maior fica com `max` px) */
export async function fotoAdesivo(fonte: Fonte, max = 900) {
  const k = Math.min(1, max / Math.max(fonte.largura, fonte.altura))
  const c = document.createElement('canvas')
  c.width = Math.round(fonte.largura * k)
  c.height = Math.round(fonte.altura * k)
  const g = c.getContext('2d')!
  g.imageSmoothingQuality = 'high'
  g.drawImage(fonte.imagem, 0, 0, c.width, c.height)
  return { blob: await paraBlob(c, 0.86), largura: c.width, altura: c.height }
}
