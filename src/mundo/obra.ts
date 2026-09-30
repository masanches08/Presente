import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * "Canteiro de obras": junta muitas peças que usam o mesmo material numa
 * geometria só. Menos peças = celular bem mais tranquilo.
 */
export class Obra {
  private partes = new Map<string, BufferGeometry[]>()

  add(material: string, g: BufferGeometry) {
    const ng = g.index ? g.toNonIndexed() : g
    if (!ng.attributes.uv) ng.setAttribute('uv', new Float32BufferAttribute(new Float32Array((ng.attributes.position.count * 2) | 0), 2))
    for (const nome of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv'].includes(nome)) ng.deleteAttribute(nome)
    if (!this.partes.has(material)) this.partes.set(material, [])
    this.partes.get(material)!.push(ng)
    return this
  }

  /** Caixa definida pelos limites: [x0,x1], [y0,y1], [z0,z1] */
  caixa(material: string, x: [number, number], y: [number, number], z: [number, number]) {
    const b = new BoxGeometry(x[1] - x[0], y[1] - y[0], z[1] - z[0])
    b.translate((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2)
    return this.add(material, b)
  }

  /** Junta tudo. `escalas` = tamanho (m) de um "azulejo" de textura por material. */
  finalizar(escalas: Record<string, number> = {}) {
    const saida: Record<string, BufferGeometry> = {}
    for (const [mat, lista] of this.partes) {
      const g = mergeGeometries(lista)!
      // escala 0 = mantém as coordenadas de textura originais da peça
      if (escalas[mat] !== 0) uvPlanar(g, escalas[mat] ?? 1)
      saida[mat] = g
    }
    return saida
  }
}

/**
 * Coordenadas de textura "do mundo": cada face recebe a textura na mesma escala,
 * alinhada com a parede (ou com o beiral, no telhado).
 */
export function uvPlanar(g: BufferGeometry, escala: number) {
  const pos = g.attributes.position
  const nor = g.attributes.normal
  const uv = new Float32Array(pos.count * 2)
  const n = new Vector3()
  const p = new Vector3()
  const t = new Vector3()
  const b = new Vector3()
  const cima = new Vector3(0, 1, 0)
  for (let i = 0; i < pos.count; i++) {
    n.fromBufferAttribute(nor, i)
    p.fromBufferAttribute(pos, i)
    if (Math.abs(n.y) > 0.97) t.set(1, 0, 0)
    else t.crossVectors(n, cima).normalize()
    b.crossVectors(t, n)
    uv[i * 2] = p.dot(t) / escala
    uv[i * 2 + 1] = p.dot(b) / escala
  }
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
}

/** Telhado de quatro águas (com cumeeira ao longo de x) */
export function telhadoQuatroAguas(meiaLargura: number, meiaProf: number, base: number, subida: number) {
  const rx = Math.max(0.01, meiaLargura - meiaProf)
  const A = [-meiaLargura, base, meiaProf]
  const B = [meiaLargura, base, meiaProf]
  const C = [meiaLargura, base, -meiaProf]
  const D = [-meiaLargura, base, -meiaProf]
  const R1 = [-rx, base + subida, 0]
  const R2 = [rx, base + subida, 0]
  const tris = [A, B, R2, A, R2, R1, C, D, R1, C, R1, R2, B, C, R2, D, A, R1]
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(tris.flat(), 3))
  g.computeVertexNormals()
  return g
}

/** Duas águas com frente virada pra +z: vai de zFrente até zFundo */
export function telhadoDuasAguas(largura: number, zFrente: number, zFundo: number, base: number, subida: number, espessura = 0.12) {
  const partes: BufferGeometry[] = []
  const meia = largura / 2
  const L = Math.hypot(meia, subida)
  const ang = Math.atan2(subida, meia)
  for (const lado of [-1, 1]) {
    const b = new BoxGeometry(L, espessura, zFrente - zFundo)
    b.rotateZ(-lado * ang)
    b.translate((lado * meia) / 2, base + subida / 2, (zFrente + zFundo) / 2)
    partes.push(b)
  }
  return { geo: mergeGeometries(partes)!, L, ang }
}
