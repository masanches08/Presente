import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Plane,
  Raycaster,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Group,
  type PerspectiveCamera,
} from 'three'
import { CONFIG } from '../config'
import { NIVEL_MAR } from './Ambiente'
import { CLARAO as CLARAO_CENA, NOITE } from './noite'

// Show de fogos sobre o mar (parada "Quando a noite cair").
// Cada faísca é desenhada como um risco de luz na direção em que ela anda (mais comprido quanto mais rápida):
// assim dá pra ver a dinâmica toda — o foguete subindo, o estouro abrindo, as faíscas fazendo a curva e caindo.
// Tipos: peônia (que troca de cor), crisântemo (com rastro), salgueiro e kamuro (ouro caindo devagar),
// palmeira, crossette (que se divide no ar), anel, purpurina e a cascata dourada do grande final,
// além do coração e das nossas iniciais escritas no céu. Tudo numa peça só, com o reflexo no mar.

const MAX = 9000
const MORTA = 0
const FOGUETE = 1
const FAISCA = 2
const RASTRO = 3
const FORMA = 4
const CLARAO = 5

/** A balsa de onde os fogos saem, lá no mar */
/** A distância do "céu" dos fogos (o painel onde eles estouram) */
const Z_CEU = -82
const BALSA = new Vector3(0, NIVEL_MAR + 0.7, Z_CEU)
/** O "céu" onde os toques viram estouros */
const CEU = new Plane(new Vector3(0, 0, 1), -Z_CEU)
/** Quanto tempo segurando pra carga total (s) */
const CARREGAR = 1.4

// (o shader escreve a cor direto na tela, então ela fica no padrão da tela, sRGB)
const corDe = (hex: string) => new Color(hex).convertLinearToSRGB()
const CORES = ['#FF2E63', '#FFB020', '#2E9BFF', '#9D4DFF', '#22E37A', '#FF4A3D', '#FF5CC8', '#FFE03D', '#3DE0FF']
const OURO = corDe('#FFC870')
const OURO_CLARO = corDe('#FFE6B0')
const PRATA = corDe('#EAF2FF')
const COR_RASTRO = corDe('#FFB36B')
const COR_FOGUETE = corDe('#FFE2B0')
const sorteio = (a: number, b: number) => a + Math.random() * (b - a)
const qualquer = <T,>(l: readonly T[]) => l[Math.floor(Math.random() * l.length)]
const corQualquer = () => corDe(qualquer(CORES))

type Estouro = 'peonia' | 'crisantemo' | 'salgueiro' | 'kamuro' | 'palmeira' | 'crossette' | 'anel' | 'purpurina' | 'bombao'
const SORTIDOS: Estouro[] = ['peonia', 'peonia', 'crisantemo', 'crisantemo', 'salgueiro', 'palmeira', 'crossette', 'anel', 'purpurina']

interface Foguete {
  i: number
  de: Vector3
  para: Vector3
  t: number
  dur: number
  estouro: Estouro
  cor: Color
  fator: number
}
interface Opcoes {
  dur: number
  tam: number
  rastro?: number
  arrasto?: number
  grav?: number
  pisca?: boolean
  cauda?: number
  corCauda?: Color
  troca?: number
  cor2?: Color
  divide?: number
}

/** Pontos do coração e das iniciais (desenhados num canvas e "amostrados"), em metros, centrados em 0 */
function pontosDoTexto(): [number, number][] {
  const c = document.createElement('canvas')
  c.width = 640
  c.height = 220
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.font = 'italic 600 150px "Cormorant Garamond", Georgia, serif'
  g.textBaseline = 'middle'
  const { pai, mae } = CONFIG.iniciais
  const wp = g.measureText(pai).width
  const wm = g.measureText(mae).width
  const coracao = 110
  const espaco = 26
  let x = (640 - (wp + espaco + coracao + espaco + wm)) / 2
  g.fillText(pai, x, 116)
  x += wp + espaco
  const cx = x + coracao / 2
  const cy = 112
  g.beginPath()
  g.moveTo(cx, cy + 42)
  g.bezierCurveTo(cx - 70, cy - 2, cx - 34, cy - 58, cx, cy - 22)
  g.bezierCurveTo(cx + 34, cy - 58, cx + 70, cy - 2, cx, cy + 42)
  g.fill()
  x += coracao + espaco
  g.fillText(mae, x, 116)
  const dados = g.getImageData(0, 0, 640, 220).data
  const pts: [number, number][] = []
  for (let py = 0; py < 220; py += 5)
    for (let px = 0; px < 640; px += 5) if (dados[(py * 640 + px) * 4 + 3] > 128) pts.push([(px - 320) * 0.072, (110 - py) * 0.072])
  const passo = Math.max(1, pts.length / 600)
  return pts.filter((_, k) => k % passo < 1)
}

/** Pontos de um coração grandão (em metros) */
function pontosDoCoracao(tamanho: number): [number, number][] {
  const pts: [number, number][] = []
  for (let k = 0; k < 200; k++) {
    const t = (k / 200) * Math.PI * 2
    const x = 16 * Math.sin(t) ** 3
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
    pts.push([(x / 16) * tamanho, (y / 16) * tamanho])
  }
  return pts
}

const VERTICE = /* glsl */ `
  attribute vec3 iPos;
  attribute vec3 iVel;
  attribute vec3 iCor;
  attribute float iAlfa;
  attribute float iTam;
  attribute float iRastro;
  uniform vec2 tela;
  uniform float escala;
  varying vec3 vCor;
  varying float vAlfa;
  varying vec2 vLocal;
  varying float vComp;
  varying float vLarg;
  void main() {
    vCor = iCor;
    vAlfa = iAlfa;
    vLocal = vec2(0.0);
    vComp = 0.0;
    vLarg = 1.0;
    if (iAlfa < 0.004) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec4 c0 = projectionMatrix * modelViewMatrix * vec4(iPos, 1.0);
    vec4 c1 = projectionMatrix * modelViewMatrix * vec4(iPos - iVel * iRastro, 1.0);
    if (c0.w < 0.1 || c1.w < 0.1) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec2 s0 = c0.xy / c0.w * tela * 0.5;
    vec2 s1 = c1.xy / c1.w * tela * 0.5;
    float larg = max(1.6, iTam * escala / c0.w);
    vec2 d = s0 - s1;
    float comp = length(d);
    vec2 dir = comp > 0.001 ? d / comp : vec2(0.0, 1.0);
    vec2 perp = vec2(-dir.y, dir.x);
    // do rabo (y = 0) até a cabeça (y = 1), com meia largura sobrando nas pontas (pontas redondas)
    float ao = mix(-larg * 0.5, comp + larg * 0.5, position.y);
    vec2 p = s1 + dir * ao + perp * position.x * larg;
    vLocal = vec2(position.x * larg, ao);
    vComp = comp;
    vLarg = larg;
    gl_Position = vec4(p / (tela * 0.5) * c0.w, c0.z, c0.w);
  }
`
const FRAGMENTO = /* glsl */ `
  uniform float forca;
  varying vec3 vCor;
  varying float vAlfa;
  varying vec2 vLocal;
  varying float vComp;
  varying float vLarg;
  void main() {
    // distância até o risco (uma "cápsula"): brilho no meio, apagando na borda
    float ao = clamp(vLocal.y, 0.0, vComp);
    float d = length(vec2(vLocal.x, vLocal.y - ao)) / (vLarg * 0.5);
    if (d > 1.0) discard;
    float brilho = (1.0 - d) * (1.0 - d);
    float cabeca = vComp > 0.5 ? mix(0.22, 1.0, ao / vComp) : 1.0;
    float miolo = smoothstep(0.4, 0.0, d) * 0.22;
    vec3 c = (vCor * 1.15 * brilho + mix(vCor, vec3(1.0), 0.6) * miolo) * cabeca;
    gl_FragColor = vec4(c * vAlfa * forca, 1.0);
  }
`

export function Fogos({ ativo, finale }: { ativo: boolean; finale: number }) {
  const { gl, camera } = useThree()
  const balsa = useRef<Group>(null)

  // o "estoque" de faíscas: vetores fixos (nada é criado durante o show)
  const s = useMemo(() => {
    const pos = new Float32Array(MAX * 3)
    const vel = new Float32Array(MAX * 3)
    const cor = new Float32Array(MAX * 3)
    const alfa = new Float32Array(MAX)
    const tam = new Float32Array(MAX)
    const rastro = new Float32Array(MAX)
    const geo = new InstancedBufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, -0.5, 1, 0, 0.5, 1, 0]), 3))
    geo.setIndex([0, 1, 2, 2, 1, 3])
    const atr = {
      iPos: new InstancedBufferAttribute(pos, 3),
      iVel: new InstancedBufferAttribute(vel, 3),
      iCor: new InstancedBufferAttribute(cor, 3),
      iAlfa: new InstancedBufferAttribute(alfa, 1),
      iTam: new InstancedBufferAttribute(tam, 1),
      iRastro: new InstancedBufferAttribute(rastro, 1),
    }
    for (const [nome, a] of Object.entries(atr)) geo.setAttribute(nome, a)
    geo.instanceCount = MAX
    return {
      geo,
      atr,
      pos,
      vel,
      cor,
      alfa,
      tam,
      rastro,
      cor2: new Float32Array(MAX * 3),
      corCauda: new Float32Array(MAX * 3),
      orig: new Float32Array(MAX * 3),
      alvo: new Float32Array(MAX * 3),
      vida: new Float32Array(MAX),
      dur: new Float32Array(MAX),
      tamBase: new Float32Array(MAX),
      arrasto: new Float32Array(MAX),
      grav: new Float32Array(MAX),
      cauda: new Float32Array(MAX),
      troca: new Float32Array(MAX),
      divide: new Float32Array(MAX),
      semente: new Float32Array(MAX),
      tipo: new Uint8Array(MAX),
      pisca: new Uint8Array(MAX),
      cursor: 0,
      foguetes: [] as Foguete[],
      fontes: [] as { ate: number; x0: number; x1: number; y: number }[],
      fila: [] as { quando: number; fazer: () => void }[],
      relogio: 0,
      /** quantas faíscas estavam vivas no quadro anterior (sem nenhuma, não precisa mandar nada pra placa de vídeo) */
      vivasAntes: 0,
      /** quando ela lançou o último (enquanto ela brinca, o show sozinho dá um tempo) */
      ultimoToque: -99,
      proximoAuto: 0,
      salvaInicial: false,
      texto: null as [number, number][] | null,
    }
  }, [])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        // (o risco é montado na tela e pode ficar "de costas": desenha os dois lados)
        side: DoubleSide,
        uniforms: { tela: { value: new Vector2(1, 1) }, escala: { value: 800 }, forca: { value: 1 } },
        vertexShader: VERTICE,
        fragmentShader: FRAGMENTO,
      }),
    [],
  )
  // o reflexo no mar: as mesmas faíscas, de ponta-cabeça e bem mais fracas
  const reflexo = useMemo(() => {
    const m = material.clone()
    m.uniforms.forca.value = 0.24
    return m
  }, [material])

  /** Pega uma faísca livre */
  const nova = () => {
    for (let k = 0; k < MAX; k++) {
      const i = (s.cursor + k) % MAX
      if (s.tipo[i] === MORTA) {
        s.cursor = (i + 1) % MAX
        return i
      }
    }
    return -1
  }
  const soltar = (tipo: number, p: Vector3, vx: number, vy: number, vz: number, c: Color, o: Opcoes) => {
    const i = nova()
    if (i < 0) return -1
    const j = i * 3
    s.tipo[i] = tipo
    s.pos[j] = p.x
    s.pos[j + 1] = p.y
    s.pos[j + 2] = p.z
    s.vel[j] = vx
    s.vel[j + 1] = vy
    s.vel[j + 2] = vz
    s.cor[j] = c.r
    s.cor[j + 1] = c.g
    s.cor[j + 2] = c.b
    s.vida[i] = 0
    s.dur[i] = o.dur
    s.tamBase[i] = o.tam
    s.tam[i] = o.tam
    s.alfa[i] = 1
    s.rastro[i] = o.rastro ?? 0
    s.arrasto[i] = o.arrasto ?? 0.966
    s.grav[i] = o.grav ?? 3.5
    s.pisca[i] = o.pisca ? 1 : 0
    s.cauda[i] = o.cauda ?? 0
    const cc = o.corCauda ?? c
    s.corCauda[j] = cc.r
    s.corCauda[j + 1] = cc.g
    s.corCauda[j + 2] = cc.b
    s.troca[i] = o.troca ?? -1
    if (o.cor2) {
      s.cor2[j] = o.cor2.r
      s.cor2[j + 1] = o.cor2.g
      s.cor2[j + 2] = o.cor2.b
    }
    s.divide[i] = o.divide ?? -1
    s.semente[i] = Math.random()
    return i
  }

  /** Direção "direita" da câmera (pra desenhar formas viradas pra ela) */
  const direita = () => {
    const d = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
    d.y = 0
    return d.lengthSq() < 1e-6 ? new Vector3(1, 0, 0) : d.normalize()
  }
  const acender = (cor: Color, forca = 1) => {
    CLARAO_CENA.forca = Math.max(CLARAO_CENA.forca, forca)
    CLARAO_CENA.cor.copy(cor)
  }

  const estourar = (p: Vector3, tipo: Estouro, cor: Color, f = 0.9) => {
    // clarão no meio + um brilho que fica no ar (como a fumaça acesa) + a cena acendendo
    soltar(CLARAO, p, 0, 0, 0, cor.clone().lerp(new Color(1, 1, 1), 0.4), { dur: 0.4, tam: 20 })
    soltar(CLARAO, p, 0, -0.6, 0, cor, { dur: 1.8, tam: 40 })
    acender(cor)
    const v = new Vector3()
    const cor2 = corQualquer()
    if (tipo === 'peonia' || tipo === 'crisantemo' || tipo === 'purpurina') {
      const com = tipo === 'crisantemo'
      const pur = tipo === 'purpurina'
      const trocaCor = !pur && Math.random() < 0.45
      const n = com ? 150 : 175
      for (let k = 0; k < n; k++) {
        v.randomDirection().multiplyScalar(sorteio(com ? 30 : 32, com ? 34 : 37) * f)
        soltar(FAISCA, p, v.x, v.y, v.z, pur ? qualquer([OURO_CLARO, PRATA]) : cor, {
          dur: sorteio(2.0, 2.6),
          tam: 0.85,
          rastro: com ? 0.07 : 0.045,
          pisca: pur,
          cauda: com ? 0.32 : 0,
          corCauda: OURO,
          troca: trocaCor ? sorteio(0.85, 1.05) : -1,
          cor2,
        })
      }
    } else if (tipo === 'bombao') {
      estourar(p, 'kamuro', OURO_CLARO, f)
      estourar(p, 'anel', cor, f * 1.05)
      s.fila.push({ quando: s.relogio + 0.5, fazer: () => estourar(p, 'peonia', cor2, f * 0.75) })
      s.fila.push({ quando: s.relogio + 1.1, fazer: () => estourar(p, 'purpurina', OURO, f * 0.55) })
      acender(OURO_CLARO, 1.6)
    } else if (tipo === 'salgueiro' || tipo === 'kamuro') {
      // ouro que cai devagar, deixando rastro (o kamuro é maior e termina piscando)
      const kam = tipo === 'kamuro'
      for (let k = 0; k < (kam ? 170 : 120); k++) {
        v.randomDirection().multiplyScalar(sorteio(kam ? 28 : 24, kam ? 32 : 28) * f)
        soltar(FAISCA, p, v.x, v.y + 3, v.z, kam ? OURO_CLARO : OURO, { dur: sorteio(3.6, 4.6), tam: kam ? 0.95 : 0.8, rastro: 0.14, arrasto: 0.975, grav: 5.5, cauda: 0.26, corCauda: OURO, pisca: kam })
      }
    } else if (tipo === 'palmeira') {
      // poucos cometas grossos subindo e caindo em arco, como folhas de palmeira
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + sorteio(-0.2, 0.2)
        v.set(Math.cos(a), sorteio(0.25, 0.75), Math.sin(a) * 0.5).normalize().multiplyScalar(sorteio(25, 29) * f)
        soltar(FAISCA, p, v.x, v.y, v.z, OURO, { dur: 2.9, tam: 1.9, rastro: 0.11, arrasto: 0.972, grav: 6.5, cauda: 0.9, corCauda: OURO })
      }
      for (let k = 0; k < 50; k++) {
        v.randomDirection().multiplyScalar(sorteio(10, 14) * f)
        soltar(FAISCA, p, v.x, v.y, v.z, cor, { dur: 1.3, tam: 0.7, rastro: 0.04 })
      }
    } else if (tipo === 'crossette') {
      // cometas que, no meio do caminho, se dividem em quatro
      for (let k = 0; k < 14; k++) {
        v.randomDirection().multiplyScalar(sorteio(25, 28) * f)
        soltar(FAISCA, p, v.x, v.y, v.z, cor, { dur: 3, tam: 1.15, rastro: 0.06, cauda: 0.5, corCauda: OURO, divide: sorteio(0.6, 0.8) })
      }
    } else {
      // anel (faíscas separadinhas, um pouco desencontradas) com um miolinho de outra cor
      const dir = direita()
      const cima = new Vector3(0, 1, 0).applyAxisAngle(dir, sorteio(-0.5, 0.5))
      for (let k = 0; k < 80; k++) {
        const a = (k / 80) * Math.PI * 2 + sorteio(-0.02, 0.02)
        v.copy(dir).multiplyScalar(Math.cos(a)).addScaledVector(cima, Math.sin(a)).multiplyScalar(sorteio(35, 39) * f)
        soltar(FAISCA, p, v.x, v.y, v.z, cor, { dur: sorteio(1.8, 2.2), tam: 0.8, rastro: 0.04, grav: 3 })
      }
      for (let k = 0; k < 50; k++) {
        v.randomDirection().multiplyScalar(sorteio(12, 15) * f)
        soltar(FAISCA, p, v.x, v.y, v.z, cor2, { dur: 1.6, tam: 0.7, rastro: 0.035 })
      }
    }
  }

  /** Uma forma (coração ou as iniciais): as faíscas saem do centro e "desenham" a forma, cintilam e caem como purpurina */
  const forma = (centro: Vector3, pontos: [number, number][], cores: Color[]) => {
    soltar(CLARAO, centro, 0, 0, 0, COR_FOGUETE, { dur: 0.5, tam: 30 })
    soltar(CLARAO, centro, 0, 0, 0, cores[0], { dur: 2.4, tam: 60 })
    acender(cores[0], 1.3)
    const dir = direita()
    for (const [x, y] of pontos) {
      const i = soltar(FORMA, centro, 0, 0, 0, qualquer(cores), { dur: 4.2, tam: 0.92 })
      if (i < 0) break
      s.orig.set([centro.x, centro.y, centro.z], i * 3)
      s.alvo.set([dir.x * x, y, dir.z * x], i * 3)
    }
  }

  const lancar = (para: Vector3, estouro: Estouro = qualquer(SORTIDOS), cor = corQualquer(), fator = 0.9) => {
    const de = BALSA.clone().add(new Vector3(sorteio(-4.5, 4.5), 0, sorteio(-1.5, 1.5)))
    // o "tum" da saída: um clarãozinho na balsa
    soltar(CLARAO, de, 0, 0, 0, COR_FOGUETE, { dur: 0.25, tam: 7 })
    const i = soltar(FOGUETE, de, 0, 0, 0, COR_FOGUETE, { dur: 99, tam: 1.1, rastro: 0.09 })
    if (i < 0) return
    s.foguetes.push({ i, de, para: para.clone(), t: 0, dur: sorteio(1.5, 1.9), estouro, cor, fator })
  }
  const pontoAleatorio = () => new Vector3(sorteio(-38, 38), sorteio(20, 36), Z_CEU)

  // o gesto: segurar o dedo no céu carrega o fogo (chafariz na balsa + a mira brilhando lá em cima),
  // arrastar muda o lugar, e soltar lança — quanto mais carregado, maior (carga total = bombão)
  const carga = useRef<{ t0: number; alvo: Vector3 } | null>(null)
  /** Lança o fogo com a carga (0..1) */
  const disparar = (alvo: Vector3, k: number) => {
    s.ultimoToque = s.relogio
    if (k >= 0.97) lancar(alvo, 'bombao', corQualquer(), 1.15)
    else if (k < 0.25) lancar(alvo, qualquer(['peonia', 'anel'] as const), corQualquer(), 0.62)
    else lancar(alvo, qualquer(['crisantemo', 'peonia', 'crossette', 'palmeira', 'salgueiro', 'anel'] as const), corQualquer(), 0.75 + 0.3 * k)
  }
  useEffect(() => {
    if (!ativo) {
      carga.current = null
      return
    }
    const el = gl.domElement
    const ray = new Raycaster()
    const ponto = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      ray.setFromCamera(new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera)
      const p = new Vector3()
      if (!ray.ray.intersectPlane(CEU, p)) return null
      return p.set(Math.max(-66, Math.min(66, p.x)), Math.max(16, Math.min(48, p.y)), Z_CEU)
    }
    const desce = (e: PointerEvent) => {
      const p = ponto(e)
      if (p) carga.current = { t0: s.relogio, alvo: p }
    }
    const move = (e: PointerEvent) => {
      if (!carga.current) return
      const p = ponto(e)
      if (p) carga.current.alvo.copy(p)
    }
    const sobe = () => {
      const c = carga.current
      if (!c) return
      carga.current = null
      disparar(c.alvo, Math.min(1, (s.relogio - c.t0) / CARREGAR))
    }
    el.addEventListener('pointerdown', desce)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', sobe)
    window.addEventListener('pointercancel', sobe)
    return () => {
      el.removeEventListener('pointerdown', desce)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', sobe)
      window.removeEventListener('pointercancel', sobe)
    }
  }, [ativo, gl, camera]) // eslint-disable-line react-hooks/exhaustive-deps

  // o grande final: abertura, cascata dourada com palmeiras, coração, as iniciais, a coroa de ouro e a purpurina
  useEffect(() => {
    if (!finale || !ativo) return
    const t0 = s.relogio
    const f = s.fila
    const em = (d: number, fazer: () => void) => f.push({ quando: t0 + d, fazer })
    const abertura: Estouro[] = ['peonia', 'crossette', 'anel', 'crisantemo', 'peonia', 'crossette', 'crisantemo', 'anel', 'peonia', 'purpurina', 'crisantemo', 'peonia']
    abertura.forEach((tipo, k) => em(k * 0.26, () => lancar(new Vector3((k % 2 ? 1 : -1) * sorteio(6, 38), sorteio(22, 37), Z_CEU), tipo)))
    em(3.4, () => {
      s.fontes.push({ ate: s.relogio + 4.2, x0: -44, x1: 44, y: 40 })
      acender(OURO, 0.8)
    })
    for (const x of [-36, 0, 36]) em(3.6 + Math.abs(x) * 0.008, () => lancar(new Vector3(x * 0.82, 31, Z_CEU), 'palmeira'))
    em(6.8, () => forma(new Vector3(0, 30, Z_CEU), pontosDoCoracao(14), [corDe('#FF4F78'), corDe('#FF7A9A'), corDe('#FF3060')]))
    for (const x of [-40, 40]) em(7.1, () => lancar(new Vector3(x * 0.82, 28, Z_CEU), 'anel', corDe('#FFC2E2')))
    em(9.8, () => {
      s.texto ??= pontosDoTexto()
      forma(new Vector3(0, 32.5, Z_CEU), s.texto, [corDe('#FFD27A'), corDe('#FFE7A8'), corDe('#FFC45C')])
    })
    for (let k = 0; k < 6; k++) em(10.2 + k * 0.35, () => lancar(new Vector3((k % 2 ? 1 : -1) * sorteio(28, 44), sorteio(19, 29), Z_CEU), 'purpurina'))
    for (let k = 0; k < 5; k++) em(13.2 + k * 0.12, () => lancar(new Vector3(-36 + k * 18, 35, Z_CEU), 'kamuro'))
    for (let k = 0; k < 10; k++) em(15.6 + k * 0.18, () => lancar(pontoAleatorio(), qualquer(['purpurina', 'peonia', 'crisantemo'] as const)))
  }, [finale]) // eslint-disable-line react-hooks/exhaustive-deps

  const p = useMemo(() => new Vector3(), [])
  const tmp = useMemo(() => new Color(), [])
  const tamTela = useMemo(() => new Vector2(), [])
  useFrame((_, dtBruto) => {
    const dt = Math.min(0.05, dtBruto)
    s.relogio += dt
    const noite = NOITE.valor

    // tamanho da tela e do ângulo da câmera (os riscos ficam do tamanho certo em qualquer aparelho)
    const cam = camera as PerspectiveCamera
    gl.getDrawingBufferSize(tamTela)
    const escala = tamTela.y / (2 * Math.tan((cam.fov * Math.PI) / 360))
    for (const m of [material, reflexo]) {
      m.uniforms.tela.value.copy(tamTela)
      m.uniforms.escala.value = escala
    }
    if (balsa.current) balsa.current.visible = noite > 0.05

    // o show sozinho (pra ela ver mesmo sem tocar) + uma salva de boas-vindas quando escurece
    if (ativo && noite > 0.75) {
      if (!s.salvaInicial) {
        s.salvaInicial = true
        ;(['crisantemo', 'palmeira', 'peonia'] as const).forEach((tipo, k) => s.fila.push({ quando: s.relogio + k * 0.8, fazer: () => lancar(pontoAleatorio(), tipo) }))
        s.proximoAuto = s.relogio + 5.5
      } else if (s.relogio > s.proximoAuto && s.fila.length === 0 && !carga.current && s.relogio - s.ultimoToque > 6) {
        lancar(pontoAleatorio())
        s.proximoAuto = s.relogio + sorteio(2.4, 4.2)
      }
    }
    if (!ativo) {
      s.salvaInicial = false
      s.fila.length = 0
      s.fontes.length = 0
    }
    for (let k = s.fila.length - 1; k >= 0; k--)
      if (s.fila[k].quando <= s.relogio) {
        const f = s.fila[k]
        s.fila.splice(k, 1)
        f.fazer()
      }

    // carregando: chafariz de faíscas na balsa (cada vez mais alto) e a mira brilhando no céu
    const c = carga.current
    if (c && ativo) {
      const k = Math.min(1, (s.relogio - c.t0) / CARREGAR)
      const n = Math.max(1, Math.round(dt * 30 * (1 + 5 * k)))
      for (let i = 0; i < n; i++) {
        p.copy(BALSA).add(new Vector3(sorteio(-3, 3), 0.4, sorteio(-1, 1)))
        soltar(FAISCA, p, sorteio(-1.5, 1.5), sorteio(8, 10) + 16 * k, sorteio(-1, 1), Math.random() < 0.5 ? OURO : COR_RASTRO, { dur: 0.7 + 0.6 * k, tam: 0.55, rastro: 0.06, grav: 9 })
      }
      const pulso = 0.5 + 0.5 * Math.sin(s.relogio * (k >= 1 ? 26 : 8))
      tmp.copy(k >= 1 ? OURO_CLARO : PRATA)
      soltar(CLARAO, c.alvo, 0, 0, 0, tmp, { dur: 0.07, tam: 3 + 9 * k + pulso * (2 + 4 * k) })
      // faíscas girando em volta da mira (mais faíscas e mais juntinhas conforme carrega)
      const m = 3 + Math.floor(7 * k)
      for (let i = 0; i < m; i++) {
        const a = s.relogio * (2.5 + 4 * k) + (i / m) * Math.PI * 2
        const r = 4.2 - 2.2 * k
        p.set(c.alvo.x + Math.cos(a) * r, c.alvo.y + Math.sin(a) * r, c.alvo.z)
        soltar(FAISCA, p, 0, 0, 0, k >= 1 ? OURO_CLARO : OURO, { dur: 0.07, tam: 0.7 })
      }
    }

    // a cascata dourada (grande final): uma linha lá no alto "chovendo" ouro
    for (let k = s.fontes.length - 1; k >= 0; k--) {
      const f = s.fontes[k]
      if (s.relogio > f.ate) {
        s.fontes.splice(k, 1)
        continue
      }
      const n = Math.round(26 * dt * 30)
      for (let i = 0; i < n; i++) {
        p.set(sorteio(f.x0, f.x1), f.y + sorteio(-0.6, 0.6), Z_CEU + sorteio(-1, 1))
        soltar(FAISCA, p, sorteio(-0.6, 0.6), sorteio(-2, 0), sorteio(-0.4, 0.4), Math.random() < 0.3 ? OURO_CLARO : OURO, { dur: sorteio(2.2, 2.8), tam: 0.75, rastro: 0.12, arrasto: 0.985, grav: 4.2, pisca: Math.random() < 0.15 })
      }
    }

    // foguetes subindo (devagar no fim, como os de verdade), soltando faísca
    for (let k = s.foguetes.length - 1; k >= 0; k--) {
      const f = s.foguetes[k]
      f.t += dt
      const u = Math.min(1, f.t / f.dur)
      const e = 1 - (1 - u) * (1 - u)
      p.lerpVectors(f.de, f.para, e)
      p.x += Math.sin(f.t * 9 + k) * 0.25
      const j = f.i * 3
      s.vel[j] = (p.x - s.pos[j]) / Math.max(dt, 1e-3)
      s.vel[j + 1] = (p.y - s.pos[j + 1]) / Math.max(dt, 1e-3)
      s.vel[j + 2] = (p.z - s.pos[j + 2]) / Math.max(dt, 1e-3)
      s.pos[j] = p.x
      s.pos[j + 1] = p.y
      s.pos[j + 2] = p.z
      if (Math.random() < dt * 40) soltar(RASTRO, p, sorteio(-1, 1), sorteio(-2.5, -0.5), sorteio(-1, 1), COR_RASTRO, { dur: sorteio(0.4, 0.7), tam: 0.45, rastro: 0.05, arrasto: 0.94, grav: 2 })
      if (u >= 1) {
        s.tipo[f.i] = MORTA
        s.alfa[f.i] = 0
        estourar(f.para, f.estouro, f.cor, f.fator)
        s.foguetes.splice(k, 1)
      }
    }

    // todas as faíscas
    let vivas = s.foguetes.length
    for (let i = 0; i < MAX; i++) {
      const tipo = s.tipo[i]
      if (tipo === MORTA || tipo === FOGUETE) continue
      vivas++
      s.vida[i] += dt
      const k = s.vida[i] / s.dur[i]
      if (k >= 1) {
        s.tipo[i] = MORTA
        s.alfa[i] = 0
        continue
      }
      const j = i * 3
      if (tipo === FORMA) {
        const t = s.vida[i]
        if (t < 0.9) {
          const e = 1 - (1 - t / 0.9) ** 3
          const r = 3 * (1 - t / 0.9) ** 2
          s.pos[j] = s.orig[j] + s.alvo[j] * e
          s.pos[j + 1] = s.orig[j + 1] + s.alvo[j + 1] * e
          s.pos[j + 2] = s.orig[j + 2] + s.alvo[j + 2] * e
          // (o "risco" mostra a forma se abrindo)
          s.vel[j] = s.alvo[j] * r
          s.vel[j + 1] = s.alvo[j + 1] * r
          s.vel[j + 2] = s.alvo[j + 2] * r
          s.rastro[i] = 0.06
        } else if (t < 2.7) {
          s.vel[j] = s.vel[j + 1] = s.vel[j + 2] = 0
          s.alfa[i] = 0.72 + Math.sin(t * 22 + s.semente[i] * 40) * 0.28 // cintilando
        } else {
          // desmancha e cai como purpurina
          s.tipo[i] = FAISCA
          s.vida[i] = 0
          s.dur[i] = sorteio(1.3, 1.9)
          s.vel[j] = sorteio(-1.2, 1.2)
          s.vel[j + 1] = sorteio(-0.5, 0.8)
          s.vel[j + 2] = sorteio(-1.2, 1.2)
          s.arrasto[i] = 0.98
          s.grav[i] = 2.6
          s.rastro[i] = 0.08
          s.pisca[i] = 1
        }
        continue
      }
      // física: freia no ar e cai
      const freio = Math.pow(s.arrasto[i], dt * 60)
      s.vel[j] *= freio
      s.vel[j + 1] = s.vel[j + 1] * freio - s.grav[i] * dt
      s.vel[j + 2] *= freio
      s.pos[j] += s.vel[j] * dt
      s.pos[j + 1] += s.vel[j + 1] * dt
      s.pos[j + 2] += s.vel[j + 2] * dt
      // peônia que troca de cor no meio do caminho
      if (s.troca[i] >= 0 && s.vida[i] >= s.troca[i]) {
        s.cor[j] = s.cor2[j]
        s.cor[j + 1] = s.cor2[j + 1]
        s.cor[j + 2] = s.cor2[j + 2]
        s.troca[i] = -1
      }
      // crossette: se divide em quatro, em cruz
      if (s.divide[i] >= 0 && s.vida[i] >= s.divide[i]) {
        p.set(s.pos[j], s.pos[j + 1], s.pos[j + 2])
        const ve = new Vector3(s.vel[j], s.vel[j + 1], s.vel[j + 2]).normalize()
        const u1 = new Vector3(0, 1, 0).cross(ve).normalize()
        const u2 = ve.clone().cross(u1).normalize()
        tmp.setRGB(s.cor[j], s.cor[j + 1], s.cor[j + 2])
        for (const [a, b] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ])
          soltar(FAISCA, p, (u1.x * a + u2.x * b) * 15 + ve.x * 4, (u1.y * a + u2.y * b) * 15 + ve.y * 4, (u1.z * a + u2.z * b) * 15 + ve.z * 4, tmp, { dur: 1.4, tam: 0.85, rastro: 0.06, cauda: 0.35, corCauda: OURO })
        soltar(CLARAO, p, 0, 0, 0, tmp, { dur: 0.2, tam: 5 })
        s.tipo[i] = MORTA
        s.alfa[i] = 0
        continue
      }
      let a = k < 0.62 ? 1 : 1 - (k - 0.62) / 0.38
      if (s.pisca[i] && k > 0.45) a *= Math.sin(s.vida[i] * 31 + s.semente[i] * 50) > 0.1 ? 1.25 : 0.08
      if (tipo === CLARAO) a = (1 - k) * (s.tamBase[i] > 35 ? 0.16 : 0.85)
      s.alfa[i] = a
      s.tam[i] = tipo === CLARAO ? s.tamBase[i] * (0.6 + k * 0.7) : s.tamBase[i] * (1 - k * 0.3)
      // rastrinho que fica pra trás (crisântemo, salgueiro, palmeira…)
      if (s.cauda[i] > 0 && Math.random() < s.cauda[i] * dt * 30) {
        p.set(s.pos[j], s.pos[j + 1], s.pos[j + 2])
        tmp.setRGB(s.corCauda[j] * 0.8, s.corCauda[j + 1] * 0.7, s.corCauda[j + 2] * 0.6)
        soltar(RASTRO, p, s.vel[j] * 0.05 + sorteio(-0.3, 0.3), s.vel[j + 1] * 0.05 - 0.4, s.vel[j + 2] * 0.05 + sorteio(-0.3, 0.3), tmp, { dur: sorteio(0.5, 0.9), tam: s.tamBase[i] * 0.5, rastro: 0.03, arrasto: 0.92, grav: 1.6 })
      }
    }
    // (céu vazio há mais de um quadro: nada mudou, não manda nada)
    if (vivas > 0 || s.vivasAntes > 0) for (const a of Object.values(s.atr)) a.needsUpdate = true
    s.vivasAntes = vivas

    // o clarão do estouro vai apagando (quem acende a cena com ele é a CenaCasamento)
    CLARAO_CENA.forca *= Math.exp(-dt * 4.5)
  })

  return (
    <>
      <mesh geometry={s.geo} material={material} frustumCulled={false} renderOrder={3} />
      {/* reflexo: espelhado na altura do mar */}
      <group position-y={NIVEL_MAR * 2} scale-y={-1}>
        <mesh geometry={s.geo} material={reflexo} frustumCulled={false} renderOrder={2} />
      </group>
      {/* a balsa dos fogos, lá no mar (só aparece de noite) */}
      <group ref={balsa} position={BALSA} visible={false}>
        <mesh position-y={-0.2}>
          <boxGeometry args={[12, 0.9, 4.5]} />
          <meshStandardMaterial color="#1D1E26" roughness={0.8} />
        </mesh>
        {[-4, -2, 0, 2, 4].map((x) => (
          <mesh key={x} position={[x, 0.55, 0]}>
            <cylinderGeometry args={[0.22, 0.25, 0.9, 10]} />
            <meshStandardMaterial color="#3A3A44" roughness={0.6} />
          </mesh>
        ))}
        {[-5.8, 5.8].map((x) => (
          <mesh key={x} position={[x, 0.45, 2.1]}>
            <sphereGeometry args={[0.12, 8, 6]} />
            <meshBasicMaterial color={[3, 0.6, 0.4]} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </>
  )
}
