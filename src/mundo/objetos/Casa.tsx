import type { ThreeElements } from '@react-three/fiber'
import { useMemo } from 'react'
import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, MeshStandardMaterial, Shape, type Texture } from 'three'
import { Obra, telhadoDuasAguas, telhadoQuatroAguas } from '../obra'
import { texBlocos, texMadeira, texPedra, texReboco, texTelhadoEscuro } from '../texturas'
import { Arbusto } from '../Arvore'

type Props = ThreeElements['group']

// ---------- medidas (metros). A frente da casa olha pra +z ----------
const BASE = 0.25 // alicerce
const Y2 = BASE + 3.0 // chão do 2º andar
const TOPO = Y2 + 2.8 // onde começa o telhado
const MX = 5.6 // meia largura
const FUNDO = -3.5
const FRENTE2 = 3.5 // fachada do 2º andar
const FRENTE1 = 4.6 // fachada do térreo (as alas avançam)
const BAY = 1.9 // meia largura do bloco central
const FRENTE_BAY = 5.0
const BEIRAL = 0.45

/** Janela de caixilho preto, com divisões e (opcional) bandeira quadriculada em cima */
function janela(o: Obra, x: number, y: number, z: number, w: number, h: number, { cols = 2, bandeira = false, giro = 0 } = {}) {
  const e = 0.08
  const pecas: BoxGeometry[] = []
  const barra = (bw: number, bh: number, bx: number, by: number, prof = 0.12) => {
    const b = new BoxGeometry(bw, bh, prof)
    b.translate(bx, by, 0)
    pecas.push(b)
  }
  barra(w + e * 2, e, 0, h / 2 + e / 2)
  barra(w + e * 2, e, 0, -h / 2 - e / 2)
  barra(e, h + e * 2, -w / 2 - e / 2, 0)
  barra(e, h + e * 2, w / 2 + e / 2, 0)
  for (let i = 1; i < cols; i++) barra(0.05, h, -w / 2 + (i * w) / cols, 0, 0.08)
  if (bandeira) {
    const yb = h / 2 - h * 0.26
    barra(w, 0.05, 0, yb, 0.08)
    for (let i = 1; i < cols * 2; i++) barra(0.03, h * 0.26, -w / 2 + (i * w) / (cols * 2), yb + h * 0.13, 0.06)
  }
  // peitoril
  barra(w + 0.3, 0.06, 0, -h / 2 - e - 0.03, 0.2)
  // o vidro aceso fica 1–3 cm À FRENTE da parede (antes encostava nela e as duas "brigavam", piscando ao girar)
  const vidro = new BoxGeometry(w, h, 0.02)
  vidro.translate(0, 0, 0)
  for (const g of [...pecas, vidro]) {
    g.rotateY(giro)
    g.translate(x, y, z)
  }
  pecas.forEach((p) => o.add('escuro', p))
  o.add('vidro', vidro)
}

/** Frontão (empena) virado pra frente: parede triangular, telhado, testeiras pretas e forro de madeira */
function frontao(o: Obra, x: number, larguraParede: number, zParede: number, zFundo: number, subida: number) {
  const largura = larguraParede + BEIRAL * 1.4
  const zFrente = zParede + BEIRAL
  const base = TOPO - 0.08
  const { geo, L, ang } = telhadoDuasAguas(largura, zFrente, zFundo, base, subida)
  geo.translate(x, 0, 0)
  o.add('telhado', geo)
  // parede do triângulo
  const alturaTri = subida * (larguraParede / largura)
  const s = new Shape()
  s.moveTo(-larguraParede / 2, 0)
  s.lineTo(larguraParede / 2, 0)
  s.lineTo(0, alturaTri)
  s.closePath()
  const tri = new ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false })
  tri.translate(x, TOPO, zParede - 0.2)
  o.add('reboco', tri)
  // testeiras pretas e forro de madeira nas beiradas
  for (const lado of [-1, 1]) {
    const t = new BoxGeometry(L + 0.06, 0.24, 0.07)
    t.rotateZ(-lado * ang)
    t.translate(x + (lado * largura) / 4, base + subida / 2 - 0.06, zFrente + 0.02)
    o.add('escuro', t)
    const forro = new BoxGeometry(L, 0.03, BEIRAL + 0.02)
    forro.rotateZ(-lado * ang)
    forro.translate(x + (lado * largura) / 4, base + subida / 2 - 0.12, zFrente - BEIRAL / 2)
    o.add('madeira', forro)
  }
  // viga escura na base do triângulo
  o.caixa('escuro', [x - larguraParede / 2 - 0.1, x + larguraParede / 2 + 0.1], [TOPO - 0.05, TOPO + 0.12], [zParede, zParede + 0.12])
}

/** Arandela de parede (caixinha preta com vidro aceso) */
function arandela(o: Obra, x: number, y: number, z: number) {
  o.caixa('escuro', [x - 0.09, x + 0.09], [y - 0.2, y + 0.2], [z, z + 0.16])
  o.caixa('luz', [x - 0.065, x + 0.065], [y - 0.15, y + 0.13], [z + 0.1, z + 0.17])
}

/** Spot embutido no forro (bolinha de luz) */
function spot(o: Obra, x: number, y: number, z: number) {
  const c = new CylinderGeometry(0.07, 0.07, 0.02, 12)
  c.translate(x, y, z)
  o.add('luz', c)
}

function montarCasa() {
  const o = new Obra()

  // alicerce e volumes
  o.caixa('concreto', [-MX - 0.15, MX + 0.15], [0, BASE], [FUNDO - 0.15, FRENTE1 + 0.15])
  o.caixa('blocos', [-MX, MX], [BASE, Y2], [FUNDO, FRENTE1]) // térreo em blocos de pedra
  o.caixa('reboco', [-MX, MX], [Y2, TOPO], [FUNDO, FRENTE2]) // 2º andar em reboco claro
  o.caixa('reboco', [-BAY, BAY], [Y2, TOPO], [FRENTE2 - 0.01, FRENTE_BAY]) // bloco central avançado
  o.caixa('escuro', [-BAY - 0.05, BAY + 0.05], [Y2 - 0.08, Y2 + 0.04], [FRENTE1, FRENTE_BAY + 0.05])

  // telhado principal (quatro águas) + forro + testeira
  o.add('telhado', telhadoQuatroAguas(MX + BEIRAL, (FRENTE2 - FUNDO) / 2 + BEIRAL, TOPO - 0.1, 2.3).translate(0, 0, 0))
  o.caixa('madeira', [-MX - BEIRAL, MX + BEIRAL], [TOPO - 0.14, TOPO - 0.1], [FUNDO - BEIRAL, FRENTE2 + BEIRAL])
  for (const [x, z] of [
    [[-MX - BEIRAL, MX + BEIRAL], [FRENTE2 + BEIRAL - 0.07, FRENTE2 + BEIRAL]],
    [[-MX - BEIRAL, MX + BEIRAL], [FUNDO - BEIRAL, FUNDO - BEIRAL + 0.07]],
    [[MX + BEIRAL - 0.07, MX + BEIRAL], [FUNDO - BEIRAL, FRENTE2 + BEIRAL]],
    [[-MX - BEIRAL, -MX - BEIRAL + 0.07], [FUNDO - BEIRAL, FRENTE2 + BEIRAL]],
  ] as [number, number][][])
    o.caixa('escuro', x, [TOPO - 0.3, TOPO - 0.08], z)

  // três frontões: o do meio (maior) e os das pontas
  frontao(o, 0, BAY * 2, FRENTE_BAY, 0, 2.2)
  frontao(o, -4.0, 3.1, FRENTE2, 0.8, 1.75)
  frontao(o, 4.0, 3.1, FRENTE2, 0.8, 1.75)

  // telhadinhos das alas do térreo (caem pra frente)
  const run = FRENTE1 + BEIRAL - FRENTE2
  const rise = 0.62
  const L = Math.hypot(run, rise)
  const ang = Math.atan2(rise, run)
  for (const lado of [-1, 1]) {
    const x0 = BAY
    const x1 = MX + BEIRAL
    const cx = lado * (x0 + x1) / 2
    const t = new BoxGeometry(x1 - x0, 0.12, L)
    t.rotateX(ang)
    t.translate(cx, Y2 + rise / 2 + 0.02, FRENTE2 + run / 2)
    o.add('telhado', t)
    o.caixa('escuro', lado > 0 ? [x0, x1] : [-x1, -x0], [Y2 - 0.16, Y2 + 0.06], [FRENTE1 + BEIRAL - 0.06, FRENTE1 + BEIRAL])
    o.caixa('madeira', lado > 0 ? [x0, x1] : [-x1, -x0], [Y2 - 0.05, Y2 - 0.02], [FRENTE1, FRENTE1 + BEIRAL])
    for (const f of [0.25, 0.5, 0.75]) spot(o, lado * (x0 + (x1 - x0) * f), Y2 - 0.06, FRENTE1 + 0.22)
  }

  // ---------- entrada: portal com teto de madeira, pilares e porta de madeira ----------
  const zPortal = 6.5
  o.caixa('concreto', [-2.3, 2.3], [0, BASE + 0.02], [FRENTE1, zPortal]) // piso da entrada
  o.caixa('concreto', [-2.5, 2.5], [0, 0.17], [zPortal, zPortal + 0.42]) // degraus
  o.caixa('concreto', [-2.7, 2.7], [0, 0.08], [zPortal + 0.42, zPortal + 0.84])
  for (const lado of [-1, 1]) o.caixa('reboco', [lado * 1.78 - 0.3, lado * 1.78 + 0.3], [BASE, 3.0], [zPortal - 0.62, zPortal - 0.02])
  o.caixa('escuro', [-2.3, 2.3], [3.0, 3.32], [FRENTE1, zPortal + 0.1]) // teto do portal
  o.caixa('madeira', [-2.22, 2.22], [2.97, 3.0], [FRENTE1, zPortal + 0.04]) // forro de madeira
  spot(o, -0.8, 2.96, 5.6)
  spot(o, 0.8, 2.96, 5.6)
  // porta de madeira com vidros e laterais de vidro
  o.caixa('escuro', [-1.35, 1.35], [BASE, BASE + 2.65], [FRENTE1, FRENTE1 + 0.05])
  o.caixa('porta', [-0.55, 0.55], [BASE, BASE + 2.5], [FRENTE1 + 0.04, FRENTE1 + 0.1])
  for (const y of [0.7, 1.25, 1.8]) o.caixa('vidro', [-0.32, 0.32], [BASE + y, BASE + y + 0.16], [FRENTE1 + 0.1, FRENTE1 + 0.12])
  o.caixa('escuro', [0.38, 0.42], [BASE + 0.9, BASE + 1.6], [FRENTE1 + 0.1, FRENTE1 + 0.16]) // puxador
  for (const lado of [-1, 1]) o.caixa('vidro', lado > 0 ? [0.65, 1.22] : [-1.22, -0.65], [BASE + 0.1, BASE + 2.5], [FRENTE1 + 0.05, FRENTE1 + 0.07])
  arandela(o, -1.35, 2.2, FRENTE1 + 0.05)
  arandela(o, 1.35, 2.2, FRENTE1 + 0.05)
  arandela(o, -MX + 0.4, 2.5, FRENTE1)
  arandela(o, MX - 0.4, 2.5, FRENTE1)

  // ---------- janelas ----------
  for (const lado of [-1, 1]) {
    janela(o, lado * 3.75, BASE + 1.55, FRENTE1 + 0.02, 2.7, 2.0, { cols: 3, bandeira: true })
    janela(o, lado * 2.45, BASE + 2.2, FRENTE1 + 0.02, 0.8, 0.55)
    janela(o, lado * 4.0, Y2 + 1.55, FRENTE2 + 0.02, 2.1, 1.3, { cols: 3 })
    // laterais
    for (const z of [-1.6, 2.0]) {
      janela(o, lado * (MX + 0.02), BASE + 1.55, z, 1.5, 1.6, { cols: 2, giro: (lado * Math.PI) / 2 })
      janela(o, lado * (MX + 0.02), Y2 + 1.4, z, 1.2, 1.3, { cols: 2, giro: (lado * Math.PI) / 2 })
    }
    // fundos
    janela(o, lado * 3.9, BASE + 1.55, FUNDO - 0.02, 1.6, 1.6, { cols: 2, giro: Math.PI })
    janela(o, lado * 3.2, Y2 + 1.4, FUNDO - 0.02, 1.3, 1.3, { cols: 2, giro: Math.PI })
  }
  janela(o, 0, Y2 + 1.4, FRENTE_BAY + 0.02, 2.5, 2.0, { cols: 3, bandeira: true })
  janela(o, 0, BASE + 1.35, FUNDO - 0.02, 3.6, 2.4, { cols: 3, giro: Math.PI }) // porta de vidro pro quintal
  janela(o, 0, Y2 + 1.4, FUNDO - 0.02, 1.3, 1.3, { cols: 2, giro: Math.PI })

  return o.finalizar({ reboco: 2.2, blocos: 1.7, telhado: 1.6, madeira: 1.2, porta: 1.4, concreto: 2 })
}

// materiais criados uma vez só
let mats: Record<string, MeshStandardMaterial> | null = null
function materiais() {
  if (mats) return mats
  const rep = (t: Texture) => {
    const c = t.clone()
    c.repeat.set(1, 1)
    c.needsUpdate = true
    return c
  }
  mats = {
    reboco: new MeshStandardMaterial({ color: '#EDE7DD', map: rep(texReboco()), roughness: 0.92 }),
    blocos: new MeshStandardMaterial({ map: rep(texBlocos()), roughness: 0.9 }),
    telhado: new MeshStandardMaterial({ map: rep(texTelhadoEscuro()), roughness: 0.85 }),
    escuro: new MeshStandardMaterial({ color: '#2A2D31', roughness: 0.5 }),
    madeira: new MeshStandardMaterial({ color: '#E0A36A', map: rep(texMadeira()), roughness: 0.6 }),
    porta: new MeshStandardMaterial({ color: '#A85A2E', map: rep(texMadeira()), roughness: 0.45 }),
    concreto: new MeshStandardMaterial({ color: '#E9E4DB', map: rep(texPedra()), roughness: 0.9 }),
    // janelas acesas por dentro, bem aconchegante
    vidro: new MeshStandardMaterial({ color: '#FFD59A', emissive: '#FFA64D', emissiveIntensity: 1.25, roughness: 0.2, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    luz: new MeshStandardMaterial({ color: '#FFF1D6', emissive: '#FFB45A', emissiveIntensity: 3.2 }),
  }
  return mats
}

/** A casa da foto: paredes claras, térreo em pedra, caixilhos pretos, telhado cinza e janelas acesas. */
export function Casa(props: Props) {
  const partes = useMemo(() => montarCasa(), [])
  const m = materiais()
  return (
    <group {...props}>
      {Object.entries(partes).map(([nome, geo]) => (
        <mesh key={nome} geometry={geo} material={m[nome]} castShadow={nome !== 'vidro' && nome !== 'luz'} receiveShadow={nome !== 'vidro' && nome !== 'luz'} />
      ))}
      {/* vasos pretos com topiárias na entrada */}
      {[-1, 1].map((lado) => (
        <group key={lado} position={[lado * 1.05, BASE, 6.0]}>
          <mesh position-y={0.36} castShadow>
            <boxGeometry args={[0.5, 0.72, 0.5]} />
            <meshStandardMaterial color="#1F2023" roughness={0.4} />
          </mesh>
          <Arbusto semente={60 + lado} largura={0.55} profundidade={0.55} alturaArbusto={0.6} position-y={0.62} />
        </group>
      ))}
    </group>
  )
}
