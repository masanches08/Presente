import type { ThreeElements } from '@react-three/fiber'
import { useMemo } from 'react'
import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  MeshStandardMaterial,
  PlaneGeometry,
  QuadraticBezierCurve3,
  TubeGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { texCasca, texFolhas, texPalmeira } from './texturas'
import { sorteador } from './util'
import { aplicarVento } from './vento'

type Props = ThreeElements['group']

export interface Tufo {
  centro: Vector3
  raio: number
}

/**
 * Folhagem "fofa": vários tufos, cada um com dezenas de cartões de folhas.
 * As normais apontam pra fora da copa, então a luz fica macia e redonda.
 */
export function criarFolhagem(tufos: Tufo[], cartoesPorTufo: number, semente: number, verdes: [string, string, string], tamCartao = 1.1) {
  const rand = sorteador(semente)
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const cor: number[] = []
  const idx: number[] = []
  const centroCopa = tufos.reduce((acc, t) => acc.add(t.centro), new Vector3()).divideScalar(tufos.length)
  const baixo = Math.min(...tufos.map((t) => t.centro.y - t.raio))
  const alto = Math.max(...tufos.map((t) => t.centro.y + t.raio))
  const escuro = new Color(verdes[0])
  const medio = new Color(verdes[1])
  const claro = new Color(verdes[2])
  const c = new Color()
  const eixoA = new Vector3()
  const eixoB = new Vector3()
  const n = new Vector3()
  const p = new Vector3()

  for (const t of tufos) {
    for (let k = 0; k < cartoesPorTufo; k++) {
      // ponto perto da superfície do tufo
      const dir = new Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize()
      p.copy(t.centro).addScaledVector(dir, t.raio * (0.55 + rand() * 0.45))
      n.copy(p).sub(centroCopa).normalize().lerp(dir, 0.5).normalize()
      // cartão numa orientação aleatória
      eixoA.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize()
      eixoB.crossVectors(eixoA, dir).normalize()
      const s = tamCartao * (0.7 + rand() * 0.6) * 0.5
      const inicio = pos.length / 3
      for (const [a, b, u, v] of [
        [-1, -1, 0, 0],
        [1, -1, 1, 0],
        [1, 1, 1, 1],
        [-1, 1, 0, 1],
      ]) {
        pos.push(p.x + (eixoA.x * a + eixoB.x * b) * s, p.y + (eixoA.y * a + eixoB.y * b) * s, p.z + (eixoA.z * a + eixoB.z * b) * s)
        nor.push(n.x, n.y, n.z)
        uv.push(u, v)
        // mais claro em cima e por fora; mais escuro embaixo e por dentro
        const altura = (p.y - baixo) / Math.max(0.01, alto - baixo)
        const fora = p.distanceTo(t.centro) / t.raio
        c.copy(escuro).lerp(medio, Math.min(1, altura * 0.8 + fora * 0.4)).lerp(claro, Math.max(0, altura - 0.55) * 1.6 * fora)
        const tom = 0.9 + rand() * 0.2
        cor.push(c.r * tom, c.g * tom, c.b * tom)
      }
      idx.push(inicio, inicio + 1, inicio + 2, inicio, inicio + 2, inicio + 3)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setAttribute('color', new Float32BufferAttribute(cor, 3))
  g.setIndex(idx)
  return g
}

export const materiais = new Map<string, MeshStandardMaterial>()
export function matFolhas(alturaVento: number) {
  const chave = 'f' + alturaVento
  if (!materiais.has(chave)) {
    const m = new MeshStandardMaterial({ map: texFolhas(), vertexColors: true, alphaTest: 0.5, side: DoubleSide, roughness: 0.75 })
    aplicarVento(m, { altura: alturaVento, forca: 0.35 })
    materiais.set(chave, m)
  }
  return materiais.get(chave)!
}
function matCasca() {
  if (!materiais.has('casca')) {
    const t = texCasca().clone()
    t.repeat.set(2, 3)
    t.needsUpdate = true
    materiais.set('casca', new MeshStandardMaterial({ map: t, roughness: 1 }))
  }
  return materiais.get('casca')!
}

const VERDES: [string, string, string][] = [
  ['#1E5A16', '#3F9A2B', '#9BD64A'],
  ['#245F1A', '#4CA532', '#B4E05A'],
  ['#1B4F1F', '#35893A', '#86CC54'],
]

/** Árvore frondosa. `semente` muda o formato; `altura` em metros. */
export function Arvore({ semente = 1, altura = 6, cartoes = 70, ...props }: Props & { semente?: number; altura?: number; cartoes?: number }) {
  const { tronco, folhas } = useMemo(() => {
    const rand = sorteador(semente * 31)
    const incl = new Vector3((rand() - 0.5) * 0.5, 0, (rand() - 0.5) * 0.5)
    const topo = new Vector3(incl.x, altura * 0.62, incl.z)
    const troncoPrincipal = new TubeGeometry(
      new CatmullRomCurve3([new Vector3(0, -0.2, 0), new Vector3(incl.x * 0.2, altura * 0.25, incl.z * 0.2), topo]),
      10,
      altura * 0.045,
      8,
    )
    // afina o tronco lá em cima
    const pp = troncoPrincipal.attributes.position
    for (let i = 0; i < pp.count; i++) {
      const y = pp.getY(i)
      const f = 1 - (Math.max(0, y) / (altura * 0.62)) * 0.55
      const cx = incl.x * (y / (altura * 0.62))
      const cz = incl.z * (y / (altura * 0.62))
      pp.setX(i, cx + (pp.getX(i) - cx) * f)
      pp.setZ(i, cz + (pp.getZ(i) - cz) * f)
    }
    troncoPrincipal.computeVertexNormals()

    const galhos: BufferGeometry[] = [troncoPrincipal]
    const tufos: Tufo[] = [{ centro: new Vector3(topo.x, altura * 0.78, topo.z), raio: altura * 0.26 }]
    const nGalhos = 5
    for (let i = 0; i < nGalhos; i++) {
      const a = (i / nGalhos) * Math.PI * 2 + rand() * 0.8
      const inicioY = altura * (0.38 + rand() * 0.22)
      const alcance = altura * (0.28 + rand() * 0.12)
      const fim = new Vector3(Math.cos(a) * alcance + incl.x, inicioY + altura * (0.18 + rand() * 0.15), Math.sin(a) * alcance + incl.z)
      const inicio = new Vector3(incl.x * (inicioY / altura), inicioY, incl.z * (inicioY / altura))
      const meio = inicio.clone().lerp(fim, 0.5).add(new Vector3(0, altura * 0.05, 0))
      galhos.push(new TubeGeometry(new QuadraticBezierCurve3(inicio, meio, fim), 6, altura * 0.018, 5))
      tufos.push({ centro: fim.clone().add(new Vector3(0, altura * 0.05, 0)), raio: altura * (0.17 + rand() * 0.07) })
    }
    const folhas = criarFolhagem(tufos, cartoes, semente, VERDES[semente % VERDES.length], altura * 0.2)
    return { tronco: mergeGeometries(galhos)!, folhas }
  }, [semente, altura, cartoes])

  return (
    <group {...props}>
      <mesh geometry={tronco} material={matCasca()} castShadow receiveShadow />
      <mesh geometry={folhas} material={matFolhas(altura)} castShadow receiveShadow />
    </group>
  )
}

/** Arbusto / cerca-viva: um tufo largo e baixinho. `largura` e `profundidade` em metros. */
export function Arbusto({ semente = 1, largura = 1, profundidade = 1, alturaArbusto = 0.9, ...props }: Props & { semente?: number; largura?: number; profundidade?: number; alturaArbusto?: number }) {
  const folhas = useMemo(() => {
    const rand = sorteador(semente * 13)
    const tufos: Tufo[] = []
    const nx = Math.max(1, Math.round(largura / 0.7))
    const nz = Math.max(1, Math.round(profundidade / 0.7))
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++)
        tufos.push({
          centro: new Vector3((i + 0.5) * (largura / nx) - largura / 2, alturaArbusto * (0.5 + rand() * 0.1), (j + 0.5) * (profundidade / nz) - profundidade / 2),
          raio: alturaArbusto * (0.5 + rand() * 0.12),
        })
    return criarFolhagem(tufos, 38, semente + 100, VERDES[(semente + 1) % VERDES.length], 0.45)
  }, [semente, largura, profundidade, alturaArbusto])
  return <mesh {...props} geometry={folhas} material={matFolhas(alturaArbusto * 4)} castShadow receiveShadow />
}

/** Cipreste / conífera em forma de cone (como os da entrada da casa) */
export function Cipreste({ semente = 1, altura = 2.4, ...props }: Props & { semente?: number; altura?: number }) {
  const folhas = useMemo(() => {
    const tufos: Tufo[] = []
    const n = 6
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1)
      tufos.push({ centro: new Vector3(0, 0.35 + t * altura * 0.8, 0), raio: altura * 0.24 * (1 - t * 0.75) })
    }
    return criarFolhagem(tufos, 34, semente + 300, ['#123D17', '#23602A', '#4E8F3A'], altura * 0.14)
  }, [semente, altura])
  return <mesh {...props} geometry={folhas} material={matFolhas(altura * 3)} castShadow receiveShadow />
}

// Um coqueiro inteiro vira 2 peças (tronco + folhas), pra ficar levinho
const cacheCoqueiro = new Map<string, { tronco: BufferGeometry; folhas: BufferGeometry }>()
function geoCoqueiro(altura: number, curva: number) {
  const chave = `${altura}-${curva}`
  if (cacheCoqueiro.has(chave)) return cacheCoqueiro.get(chave)!
  const topo = new Vector3(curva, altura, 0)
  const tronco = new TubeGeometry(new QuadraticBezierCurve3(new Vector3(0, -0.2, 0), new Vector3(curva * 0.05, altura * 0.55, 0), topo), 16, 0.17, 7)
  const p = tronco.attributes.position
  for (let i = 0; i < p.count; i++) {
    const anel = 1 + Math.max(0, Math.sin(p.getY(i) * 9)) * 0.08
    const f = 1 - (p.getY(i) / altura) * 0.35
    const t = p.getY(i) / altura
    const cx = curva * t * t
    p.setX(i, cx + (p.getX(i) - cx) * anel * f)
    p.setZ(i, p.getZ(i) * anel * f)
  }
  tronco.computeVertexNormals()
  const folha = new PlaneGeometry(1.1, 3.4, 1, 10)
  const fp = folha.attributes.position
  for (let i = 0; i < fp.count; i++) {
    const lx = fp.getX(i)
    const t = (fp.getY(i) + 1.7) / 3.4
    fp.setXYZ(i, t * 3.1, 0.9 * t - 1.9 * t * t, lx * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, t * 1.1))))
  }
  const copias: BufferGeometry[] = []
  for (let i = 0; i < 11; i++) {
    const f = folha.clone()
    const s = 0.85 + (i % 4) * 0.08
    f.scale(s, s, s)
    f.rotateZ(i % 2 ? 0.25 : -0.05)
    f.rotateX(((i % 3) - 1) * 0.12)
    f.rotateY((i / 11) * Math.PI * 2)
    f.translate(topo.x, topo.y, topo.z)
    copias.push(f)
  }
  const folhas = mergeGeometries(copias)!
  folhas.computeVertexNormals()
  const r = { tronco, folhas }
  cacheCoqueiro.set(chave, r)
  return r
}

let matsCoqueiro: { folha: MeshStandardMaterial; tronco: MeshStandardMaterial } | null = null
function materiaisCoqueiro() {
  if (!matsCoqueiro) {
    const folha = new MeshStandardMaterial({ map: texPalmeira(), alphaTest: 0.4, side: DoubleSide, color: '#4FA535', roughness: 0.7 })
    aplicarVento(folha, { altura: 7, forca: 0.6 })
    matsCoqueiro = { folha, tronco: new MeshStandardMaterial({ color: '#B08560', map: texCasca(), roughness: 1 }) }
  }
  return matsCoqueiro
}

/**
 * Um coqueiral inteiro numa peça só (todos os troncos juntos + todas as folhas juntas):
 * pra encher o fundo de coqueiros gastando o mesmo que um coqueiro. Sem sombra (fica longe).
 */
export function Coqueiral({ itens }: { itens: { pos: [number, number, number]; alt: number; giro: number; curva?: number }[] }) {
  const { tronco, folhas } = useMemo(() => {
    const troncos: BufferGeometry[] = []
    const copas: BufferGeometry[] = []
    for (const c of itens) {
      const g = geoCoqueiro(c.alt, c.curva ?? 1.3)
      for (const [lista, base] of [
        [troncos, g.tronco],
        [copas, g.folhas],
      ] as const) {
        const k = base.clone()
        k.rotateY(c.giro)
        k.translate(...c.pos)
        lista.push(k)
      }
    }
    return { tronco: mergeGeometries(troncos)!, folhas: mergeGeometries(copas)! }
  }, [itens])
  const m = materiaisCoqueiro()
  return (
    <>
      <mesh geometry={tronco} material={m.tronco} receiveShadow />
      <mesh geometry={folhas} material={m.folha} />
    </>
  )
}

/** Coqueiro de praia, com folhas compridas de verdade. */
export function Coqueiro({ altura = 7, curva = 1.4, ...props }: Props & { altura?: number; curva?: number }) {
  const { tronco, folhas } = useMemo(() => geoCoqueiro(altura, curva), [altura, curva])
  const m = materiaisCoqueiro()
  return (
    <group {...props}>
      <mesh geometry={tronco} material={m.tronco} castShadow receiveShadow />
      <mesh geometry={folhas} material={m.folha} castShadow />
    </group>
  )
}
