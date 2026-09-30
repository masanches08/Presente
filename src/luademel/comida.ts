import {
  BoxGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from 'three'
import type { Obra } from '../mundo/obra'
import { sorteador } from '../mundo/util'

type V3 = [number, number, number]

/**
 * Mesa de jantar sobre o mar com comidas típicas da Indonésia.
 * Tudo em coordenadas locais (o centro da mesa fica em x = 0, z = 0; o chão em y = 0).
 * Devolve onde ficam as florzinhas de frangipani (desenhadas à parte, com textura).
 */
export function montarMesa(o: Obra, ox: number, oy: number, oz: number) {
  const rand = sorteador(62)
  const put = (m: string, g: BufferGeometry, p: V3, rx = 0, ry = 0, rz = 0) => {
    if (rx) g.rotateX(rx)
    if (rz) g.rotateZ(rz)
    if (ry) g.rotateY(ry)
    g.translate(ox + p[0], oy + p[1], oz + p[2])
    o.add(m, g)
  }
  const Y = 0.765 // tampo da mesa

  // ---------- mesa com toalha e cadeiras ----------
  put('toalha', new CylinderGeometry(0.8, 0.86, 0.56, 40, 1, true), [0, 0.48, 0])
  put('toalha', new CylinderGeometry(0.8, 0.8, 0.02, 40), [0, 0.755, 0])
  put('madeiraEscura', new CylinderGeometry(0.06, 0.1, 0.2, 12), [0, 0.1, 0])
  for (const lado of [-1, 1]) {
    const z = lado * 1.05
    put('madeira', new BoxGeometry(0.5, 0.05, 0.48), [0, 0.45, z])
    put('almofada', new BoxGeometry(0.46, 0.06, 0.44), [0, 0.5, z])
    put('madeira', new BoxGeometry(0.5, 0.5, 0.05), [0, 0.72, z + lado * 0.22])
    for (const dx of [-0.21, 0.21]) for (const dz of [-0.2, 0.2]) put('madeira', new CylinderGeometry(0.02, 0.02, 0.45, 6), [dx, 0.225, z + dz])
  }

  // ---------- tumpeng: o cone de arroz amarelo das celebrações, no centro ----------
  put('palha', new CylinderGeometry(0.36, 0.34, 0.03, 32), [0, Y + 0.015, 0])
  put('bananeira', new CylinderGeometry(0.34, 0.34, 0.006, 24), [0, Y + 0.033, 0])
  put('arrozAmarelo', new ConeGeometry(0.13, 0.32, 24), [0, Y + 0.036 + 0.16, 0])
  put('sambal', new ConeGeometry(0.018, 0.07, 8), [0, Y + 0.036 + 0.35, 0])
  put('verdura', new ConeGeometry(0.012, 0.03, 6), [0, Y + 0.036 + 0.395, 0])
  const acomp = ['frango', 'ovo', 'urap', 'tempeh', 'pepino', 'sambal']
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const x = Math.cos(a) * 0.24
    const z = Math.sin(a) * 0.24
    const y = Y + 0.04
    const tipo = acomp[i % acomp.length]
    if (tipo === 'frango') put('frango', new SphereGeometry(0.045, 10, 8).scale(1.4, 0.75, 1), [x, y + 0.02, z], 0, a)
    if (tipo === 'ovo') {
      put('claraOvo', new SphereGeometry(0.034, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), [x, y, z])
      put('gema', new CylinderGeometry(0.017, 0.017, 0.004, 12), [x, y + 0.034, z])
    }
    if (tipo === 'urap') for (let k = 0; k < 6; k++) put('verdura', new BoxGeometry(0.045, 0.008, 0.008), [x + (rand() - 0.5) * 0.05, y + 0.006 + k * 0.004, z + (rand() - 0.5) * 0.05], 0, rand() * 3)
    if (tipo === 'tempeh') for (let k = 0; k < 2; k++) put('tempeh', new BoxGeometry(0.07, 0.022, 0.035), [x, y + 0.012 + k * 0.022, z], 0, a + k * 0.3)
    if (tipo === 'pepino') for (let k = 0; k < 3; k++) put('pepino', new CylinderGeometry(0.022, 0.022, 0.006, 14), [x + k * 0.012, y + 0.004 + k * 0.004, z], 0.2)
    if (tipo === 'sambal') put('sambal', new SphereGeometry(0.03, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), [x, y, z])
  }

  // ---------- nasi goreng: arroz frito com ovo e krupuk ----------
  const prato = (x: number, z: number, r = 0.16) => {
    put('ceramica', new CylinderGeometry(r, r * 0.75, 0.02, 32), [x, Y + 0.01, z])
    put('ceramica', new TorusGeometry(r, 0.008, 6, 32), [x, Y + 0.02, z], Math.PI / 2)
  }
  prato(-0.45, 0.15)
  put('arrozFrito', new SphereGeometry(0.09, 20, 12).scale(1, 0.55, 1), [-0.47, Y + 0.02, 0.14])
  for (let k = 0; k < 40; k++) {
    const a = rand() * 6.28
    const d = rand() * 0.08
    put('arrozFrito', new SphereGeometry(0.008, 5, 4).scale(1, 0.6, 1.5), [-0.47 + Math.cos(a) * d, Y + 0.02 + (0.05 - d * 0.5), 0.14 + Math.sin(a) * d], 0, rand() * 3)
  }
  const clara = new CircleGeometry(0.065, 20)
  const cp = clara.attributes.position
  for (let i = 1; i < cp.count; i++) {
    const f = 0.85 + rand() * 0.3
    cp.setXYZ(i, cp.getX(i) * f, cp.getY(i) * f, 0)
  }
  put('claraOvo', clara, [-0.44, Y + 0.075, 0.11], -Math.PI / 2 + 0.25)
  put('gema', new SphereGeometry(0.024, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), [-0.44, Y + 0.08, 0.11], 0.25)
  for (let k = 0; k < 2; k++) put('krupuk', new CylinderGeometry(0.05, 0.05, 0.006, 10), [-0.36 - k * 0.03, Y + 0.05, 0.25 - k * 0.04], 1.1 - k * 0.3, k)
  for (let k = 0; k < 3; k++) put('pepino', new CylinderGeometry(0.02, 0.02, 0.006, 14), [-0.55 + k * 0.02, Y + 0.03, 0.24], 0.3)
  put('tomate', new CylinderGeometry(0.022, 0.022, 0.008, 14), [-0.58, Y + 0.03, 0.06], 0.25)

  // ---------- satay: espetinhos com molho de amendoim na folha de bananeira ----------
  put('bananeira', new BoxGeometry(0.36, 0.004, 0.16), [0.4, Y + 0.004, 0.24], 0, -0.4)
  for (let s = 0; s < 5; s++) {
    const off = (s - 2) * 0.028
    const cx = 0.4 + Math.sin(0.4) * off
    const cz = 0.24 + Math.cos(0.4) * off
    put('palito', new CylinderGeometry(0.003, 0.003, 0.3, 5), [cx, Y + 0.018, cz], 0, -0.4, Math.PI / 2)
    for (let k = 0; k < 4; k++) {
      const t = (k - 1.5) * 0.045
      put('espetinho', new BoxGeometry(0.035, 0.026, 0.03), [cx + Math.cos(-0.4) * t, Y + 0.018, cz - Math.sin(-0.4) * t], 0, -0.4 + rand() * 0.4, 0)
    }
  }
  put('ceramicaAzul', new LatheGeometry([0, 0.03, 0.045, 0.05].map((r, i) => new Vector2(r, i * 0.012)), 20), [0.56, Y, 0.37])
  put('molhoAmendoim', new CylinderGeometry(0.044, 0.044, 0.004, 20), [0.56, Y + 0.03, 0.37])

  // ---------- rendang: carne cozida no leite de coco e especiarias ----------
  put('ceramica', new LatheGeometry([0.001, 0.05, 0.08, 0.09].map((r, i) => new Vector2(r, i * 0.025)), 24), [0.32, Y, -0.3])
  for (let k = 0; k < 8; k++) put('rendang', new DodecahedronGeometry(0.026, 0), [0.32 + (rand() - 0.5) * 0.08, Y + 0.06 + rand() * 0.02, -0.3 + (rand() - 0.5) * 0.08], rand(), rand())

  // ---------- cocos verdes com canudo e hibisco ----------
  for (const [x, z, flor] of [
    [-0.28, -0.45, true],
    [0.06, -0.52, false],
  ] as [number, number, boolean][]) {
    put('coco', new SphereGeometry(0.095, 18, 14).scale(1, 1.1, 1), [x, Y + 0.1, z])
    put('cocoDentro', new CylinderGeometry(0.05, 0.05, 0.01, 16), [x, Y + 0.2, z])
    put('fitaB', new CylinderGeometry(0.005, 0.005, 0.22, 6), [x + 0.02, Y + 0.28, z], 0, 0, -0.3)
    if (flor) for (let p = 0; p < 5; p++) put('hibisco', new SphereGeometry(0.03, 8, 6).scale(1, 0.25, 1.8), [x - 0.04 + Math.cos(p * 1.26) * 0.025, Y + 0.2, z + Math.sin(p * 1.26) * 0.025], 0, p * 1.26)
  }

  // ---------- frutas tropicais ----------
  prato(0.55, -0.02, 0.14)
  for (let k = 0; k < 3; k++) {
    const x = 0.5 + k * 0.05
    const z = -0.06 + (k % 2) * 0.05
    put('mangostao', new SphereGeometry(0.03, 14, 10), [x, Y + 0.05, z])
    put('verdura', new ConeGeometry(0.02, 0.015, 6), [x, Y + 0.082, z])
  }
  for (let k = 0; k < 4; k++) {
    const x = 0.58 + (k % 2) * 0.05
    const z = 0.02 + Math.floor(k / 2) * 0.05 - 0.1
    put('rambutan', new IcosahedronGeometry(0.026, 1), [x, Y + 0.05, z])
    for (let e = 0; e < 8; e++) put('rambutan', new ConeGeometry(0.004, 0.014, 4), [x + Math.cos(e) * 0.026, Y + 0.05 + Math.sin(e * 1.7) * 0.02, z + Math.sin(e) * 0.026], e, e)
  }
  put('pitaya', new SphereGeometry(0.05, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), [0.66, Y + 0.075, 0.06])
  put('pitayaDentro', new CircleGeometry(0.048, 20), [0.66, Y + 0.076, 0.06], -Math.PI / 2)
  const banana = new TubeGeometry(new CatmullRomCurve3([new Vector3(-0.07, 0.02, 0), new Vector3(0, 0, 0.02), new Vector3(0.07, 0.02, 0)]), 10, 0.014, 8)
  put('banana', banana, [0.5, Y + 0.035, 0.05])

  // ---------- velas em copos de vidro ----------
  for (const [x, z] of [
    [-0.2, 0.52],
    [0.16, 0.5],
    [-0.58, -0.22],
  ]) {
    put('vidro', new CylinderGeometry(0.035, 0.035, 0.11, 14, 1, true), [x, Y + 0.055, z])
    put('vela', new CylinderGeometry(0.028, 0.028, 0.05, 12), [x, Y + 0.025, z])
  }

  // florzinhas de frangipani espalhadas (posição + giro)
  return [
    [-0.12, Y + 0.004, 0.42, 0.3],
    [0.24, Y + 0.004, 0.1, 1.2],
    [-0.36, Y + 0.004, -0.14, 2.2],
    [0.14, Y + 0.004, -0.36, 0.7],
    [-0.6, Y + 0.004, -0.02, 2.8],
    [0.45, Y + 0.004, -0.4, 1.9],
    [0.02, Y + 0.24, 0.1, 0.4],
  ].map(([x, y, z, g]) => [ox + x, oy + y, oz + z, g] as [number, number, number, number])
}
