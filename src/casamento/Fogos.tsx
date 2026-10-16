import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Group,
  type PerspectiveCamera,
} from 'three'
import { CONFIG } from '../config'
import { NIVEL_MAR } from './Ambiente'
import { CLARAO as CLARAO_CENA, NOITE } from './noite'

// Show de fogos sobre o mar (parada "Quando a noite cair"): acontece sozinho, coreografado, quando escurece.
// Abre devagar com um salgueiro dourado, vai crescendo em ouro, rosa e champanhe, desenha um coração
// e as nossas iniciais no céu, e termina num final dourado. Acabou, acabou: fica só a noite, a lua e as estrelas (sem fogo infinito).
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

// (o shader escreve a cor direto na tela, então ela fica no padrão da tela, sRGB)
const corDe = (hex: string) => new Color(hex).convertLinearToSRGB()
const CORES = ['#FF6F9A', '#FFB8CF', '#FFD27A', '#FFE7C2', '#FFFFFF', '#D9A8FF', '#FF5C7A', '#FFB36B']
const ROSA = corDe('#FF6F9A')
const ROSA_CLARO = corDe('#FFB8CF')
const CHAMPANHE = corDe('#FFE7C2')
const LAVANDA = corDe('#D9A8FF')
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
  /** no fim, a faísca estala (crackling) */
  estala?: boolean
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

export function Fogos({ ativo, onFim }: { ativo: boolean; onFim: () => void }) {
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
      estala: new Uint8Array(MAX),
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
    s.estala[i] = o.estala ? 1 : 0
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
          estala: com && Math.random() < 0.5,
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
        soltar(FAISCA, p, v.x, v.y + 3, v.z, kam ? OURO_CLARO : OURO, { dur: sorteio(3.6, 4.6), tam: kam ? 0.95 : 0.8, rastro: 0.14, arrasto: 0.975, grav: 5.5, cauda: 0.26, corCauda: OURO, pisca: kam, estala: kam && Math.random() < 0.35 })
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


  /** O show inteiro, marcado no relógio a partir de agora (uns 20 s) */
  const show = () => {
    const t0 = s.relogio
    const em = (d: number, fazer: () => void) => s.fila.push({ quando: t0 + d, fazer })
    const P = (x: number, y: number) => new Vector3(x, y, Z_CEU)
    // (uns 20 s no total)
    // abertura: um salgueiro dourado, e logo dois rosas, um de cada lado
    em(0.3, () => lancar(P(0, 33), 'salgueiro', OURO, 0.95))
    em(1.6, () => lancar(P(-24, 27), 'peonia', ROSA, 0.85))
    em(2.0, () => lancar(P(24, 27), 'peonia', ROSA, 0.85))
    // vai crescendo: champanhe, rosa, ouro, lavanda, anel
    const meio: [number, number, Estouro, Color][] = [
      [0, 36, 'crisantemo', CHAMPANHE],
      [-30, 24, 'peonia', ROSA_CLARO],
      [20, 32, 'crisantemo', OURO],
      [-12, 30, 'anel', ROSA],
      [32, 25, 'peonia', LAVANDA],
    ]
    meio.forEach(([x, y, tipo, cor], k) => em(3.2 + k * 0.45, () => lancar(P(x, y), tipo, cor, 0.85)))
    // o coração (com dois anéis rosinha dos lados)
    em(6.3, () => forma(P(0, 30), pontosDoCoracao(13), [corDe('#FF4F78'), corDe('#FF7A9A'), corDe('#FF3060')]))
    for (const x of [-34, 34]) em(6.6, () => lancar(P(x, 25), 'anel', ROSA_CLARO, 0.75))
    // as nossas iniciais, em dourado (depois que o coração desmancha)
    em(10.6, () => {
      s.texto ??= pontosDoTexto()
      forma(P(0, 32.5), s.texto, [corDe('#FFD27A'), corDe('#FFE7A8'), corDe('#FFC45C')])
    })
    for (let k = 0; k < 4; k++) em(11.1 + k * 0.4, () => lancar(P((k % 2 ? 1 : -1) * sorteio(28, 40), sorteio(19, 26)), 'purpurina', CHAMPANHE, 0.6))
    // o final: cascata dourada, uma salva rápida e a coroa de ouro
    em(14.4, () => {
      s.fontes.push({ ate: s.relogio + 3, x0: -44, x1: 44, y: 40 })
      acender(OURO, 0.8)
    })
    for (let k = 0; k < 9; k++) em(14.6 + k * 0.22, () => lancar(pontoAleatorio(), qualquer(['peonia', 'crisantemo', 'anel', 'purpurina'] as const), qualquer([ROSA, OURO, CHAMPANHE, ROSA_CLARO, LAVANDA]), 0.85))
    for (let k = 0; k < 5; k++) em(16.6 + k * 0.08, () => lancar(P(-34 + k * 17, 35), 'kamuro', OURO_CLARO, 1))
    em(17.4, () => lancar(P(0, 30), 'bombao', ROSA, 1.05))
    em(21, () => onFim())
  }

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

    // escureceu: começa o show (uma vez só por visita à parada)
    if (ativo && noite > 0.8 && !s.salvaInicial) {
      s.salvaInicial = true
      show()
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
      if (tipo === FAISCA && k > 0.45) {
        const esfria = 1 - dt * 0.9 * (k - 0.45)
        s.cor[j + 1] *= esfria
        s.cor[j + 2] *= esfria * esfria
      }
      let a = k < 0.62 ? 1 : 1 - (k - 0.62) / 0.38
      // estalinho: perto do fim a faísca vira um flash branquinho e some
      if (s.estala[i] && k > 0.78) {
        s.estala[i] = 0
        p.set(s.pos[j], s.pos[j + 1], s.pos[j + 2])
        for (let q = 0; q < 3; q++) soltar(FAISCA, p, sorteio(-3, 3), sorteio(-3, 3), sorteio(-3, 3), PRATA, { dur: 0.18, tam: 0.42, rastro: 0.03 })
        s.tipo[i] = MORTA
        s.alfa[i] = 0
        continue
      }
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
