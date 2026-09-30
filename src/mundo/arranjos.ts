import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, MeshStandardMaterial, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { criarFolhagem, type Tufo } from './Arvore'
import { texPampa, texRosa } from './texturas'
import { sorteador } from './util'
import { aplicarVento } from './vento'

export interface Arranjo {
  centro: Vector3
  raio: number
  /** Quantas rosas */
  flores: number
  /** Achatado (centro de mesa) ou redondo */
  achatado?: number
  /** Cores das flores (padrão: branco e blush) */
  cores?: string[]
}

const PALETA = ['#FFFFFF', '#FFF9F4', '#FFE1D8', '#FBCBBE', '#FFEBD6', '#FFFFFF', '#FFF1E6']

/** Rosas: cartõezinhos com textura de rosa, virados pra fora do arranjo */
function criarRosas(arranjos: Arranjo[], semente: number) {
  const rand = sorteador(semente)
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const cor: number[] = []
  const c = new Color()
  const a = new Vector3()
  const b = new Vector3()
  const n = new Vector3()
  const p = new Vector3()
  for (const ar of arranjos) {
    for (let i = 0; i < ar.flores; i++) {
      n.set(rand() * 2 - 1, rand() * 1.4 - 0.3, rand() * 2 - 1).normalize()
      p.copy(ar.centro).addScaledVector(n, ar.raio * (0.75 + rand() * 0.3))
      if (ar.achatado) p.y = ar.centro.y + (p.y - ar.centro.y) * ar.achatado
      // a rosa "olha" pra fora
      a.set(0, 1, 0).cross(n)
      if (a.lengthSq() < 0.01) a.set(1, 0, 0)
      a.normalize()
      b.crossVectors(n, a).normalize()
      const s = (0.07 + rand() * 0.05) * (ar.raio > 0.4 ? 1.25 : 1)
      const paleta = ar.cores ?? PALETA
      c.set(paleta[Math.floor(rand() * paleta.length)])
      for (const [x, y, u, v] of [
        [-1, -1, 0, 0],
        [1, -1, 1, 0],
        [1, 1, 1, 1],
        [-1, 1, 0, 1],
      ]) {
        pos.push(p.x + (a.x * x + b.x * y) * s, p.y + (a.y * x + b.y * y) * s, p.z + (a.z * x + b.z * y) * s)
        nor.push(n.x, n.y, n.z)
        uv.push(u, v)
        cor.push(c.r, c.g, c.b)
      }
    }
  }
  // cada quad vira 2 triângulos (sem índice, pra juntar fácil)
  const g = new BufferGeometry()
  const P: number[] = []
  const N: number[] = []
  const U: number[] = []
  const C: number[] = []
  for (let q = 0; q < pos.length / 12; q++) {
    for (const k of [0, 1, 2, 0, 2, 3]) {
      const i = q * 4 + k
      P.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
      N.push(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2])
      U.push(uv[i * 2], uv[i * 2 + 1])
      C.push(cor[i * 3], cor[i * 3 + 1], cor[i * 3 + 2])
    }
  }
  g.setAttribute('position', new Float32BufferAttribute(P, 3))
  g.setAttribute('normal', new Float32BufferAttribute(N, 3))
  g.setAttribute('uv', new Float32BufferAttribute(U, 2))
  g.setAttribute('color', new Float32BufferAttribute(C, 3))
  return g
}

/** Todos os arranjos de uma vez: 1 peça de folhagem + 1 peça de rosas */
export function criarArranjos(arranjos: Arranjo[], semente = 1) {
  const tufos: Tufo[] = []
  for (const ar of arranjos) {
    const n = Math.max(1, Math.round(ar.raio / 0.18))
    for (let i = 0; i < n; i++) {
      const off = new Vector3((i / n - 0.5) * ar.raio, 0, ((i * 0.37) % 1 - 0.5) * ar.raio)
      tufos.push({ centro: ar.centro.clone().add(off.multiplyScalar(0.8)), raio: ar.raio * 0.75 })
    }
  }
  const folhas = criarFolhagem(tufos, 22, semente, ['#2C6A28', '#4E9B3C', '#A7D27A'], 0.3)
  return { folhas, rosas: criarRosas(arranjos, semente + 7) }
}

let matRosas: MeshStandardMaterial | null = null
export function materialRosas() {
  if (!matRosas) matRosas = new MeshStandardMaterial({ map: texRosa(), vertexColors: true, alphaTest: 0.45, side: DoubleSide, roughness: 0.55, emissive: '#FFE6D8', emissiveIntensity: 0.28, envMapIntensity: 0.3 })
  return matRosas
}

/** Plumas de capim-dos-pampas (2 planos cruzados cada) */
export function criarPampas(pontos: { base: Vector3; altura: number; giro: number; incl: number }[]) {
  const partes: BufferGeometry[] = []
  for (const p of pontos) {
    for (const r of [0, Math.PI / 2]) {
      const g = new BufferGeometry()
      const w = 0.16
      const h = p.altura
      g.setAttribute('position', new Float32BufferAttribute([-w, 0, 0, w, 0, 0, w, h, 0, -w, 0, 0, w, h, 0, -w, h, 0], 3))
      g.setAttribute('normal', new Float32BufferAttribute(Array(6).fill([0, 0, 1]).flat(), 3))
      g.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2))
      g.rotateZ(p.incl)
      g.rotateY(p.giro + r)
      g.translate(p.base.x, p.base.y, p.base.z)
      partes.push(g)
    }
  }
  return mergeGeometries(partes)!
}

let matPampas: MeshStandardMaterial | null = null
export function materialPampas() {
  if (!matPampas) {
    matPampas = new MeshStandardMaterial({ map: texPampa(), alphaTest: 0.35, side: DoubleSide, roughness: 0.9 })
    aplicarVento(matPampas, { altura: 1.4, forca: 0.8 })
  }
  return matPampas
}
