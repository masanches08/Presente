// Passo 1 da luz assada: monta a casa exatamente como o site monta e salva pro Blender.
// Saída: .luz/cena.json + .luz/cena.bin (posições e normais, triângulos soltos, coordenadas do three.js)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { BufferGeometry } from 'three'
import { geoTapete, montarCasa } from '../../src/casa/geometria'
import { SOL_CASA } from '../../src/casa/luzAssada'

const SAIDA = '.luz'
mkdirSync(SAIDA, { recursive: true })

// Andares que ganham luz assada (o quintal fica com a luz normal, mas entra no Blender pra fazer sombra)
export const ANDARES_ASSADOS = ['terreo', 'superior', 'teto'] as const

const FORA_DA_CENA = new Set(['vidro', 'voil', 'rede', 'fogo']) // transparentes: a luz passa
// fazem sombra, mas não recebem luz assada: metais e as coisinhas pequenas (livros, brinquedos, vasinhos…),
// que gastariam o mapa inteiro em pedacinhos e nem aparecem a diferença
export const SO_BLOQUEIA = new Set([
  'latao', 'metal', 'espelho', 'tela', 'livroA', 'livroB', 'livroC', 'livroD',
  'brinquedoA', 'brinquedoB', 'brinquedoC', 'brinquedoD', 'brinquedoE', 'brinquedoF',
  'ceramica', 'vaso', 'vasoPreto', 'vela',
])
const EMITE: Record<string, { cor: string; forca: number }> = {
  luz: { cor: '#FFE2C0', forca: 9 }, // lâmpadas
  cupula: { cor: '#FFEBD2', forca: 1.2 }, // cúpulas dos abajures, iluminadas por dentro
}

// cor média de cada material (os que têm foto de textura, com a cor média da foto)
const COR_TEXTURA: Record<string, string> = {
  piso: '#B8905F',
  madeira: '#A1774A',
  madeiraEscura: '#68371A',
  blocos: '#D8D0C2',
  fachada: '#E4DDD2',
  concreto: '#D9D3C8',
  telhado: '#3E4145',
  tijolo: '#644A3C',
  azulejo: '#EDEBE6',
  pisoBanho: '#E6E1D8',
  marmore: '#F0EEEA',
  degradeCeu: '#A6DCCF',
  degradeSol: '#FFD86E',
  degradeFlor: '#E4B4E0',
  areia: '#DDCCA8',
  juta: '#C9B08A',
  cerca: '#8E6A45',
  cercaEscura: '#6B4E36',
  pedra: '#A59D92',
}
const COR_TAPETE = { listrado: '#D9C7A8', persa: '#9C5A4A', juta: '#C9B08A', infantil: '#E8D6C4', redondo: '#E8DCC8' }

/** Lê as cores simples direto do materiais.ts (std('#...'), tecido('#...'), color: '#...') */
function coresDoArquivo() {
  const txt = readFileSync('src/casa/materiais.ts', 'utf8')
  const cores: Record<string, string> = {}
  for (const m of txt.matchAll(/^\s*(\w+):\s*(?:std|tecido|degrade)\('(#[0-9A-Fa-f]{6})'/gm)) cores[m[1]] = m[2]
  for (const m of txt.matchAll(/^\s*(\w+):\s*new MeshStandardMaterial\(\{[^}]*?color:\s*'(#[0-9A-Fa-f]{6})'/gm)) cores[m[1]] ??= m[2]
  return { ...cores, ...COR_TEXTURA }
}

type Papel = 'assar' | 'bloqueia' | 'emite'
interface Peca {
  nome: string
  andar: string
  papel: Papel
  cor: string
  emissao?: { cor: string; forca: number }
  offset: number // em vértices
  count: number
}

const cores = coresDoArquivo()
const casa = montarCasa()
const pecas: Peca[] = []
const posicoes: number[] = []
const normais: number[] = []

function juntar(nome: string, andar: string, papel: Papel, cor: string, geo: BufferGeometry, emissao?: Peca['emissao']) {
  const g = geo.index ? geo.toNonIndexed() : geo
  if (!g.attributes.normal) g.computeVertexNormals()
  const p = g.attributes.position.array
  const n = g.attributes.normal.array
  const count = g.attributes.position.count
  pecas.push({ nome, andar, papel, cor, emissao, offset: posicoes.length / 3, count })
  for (let i = 0; i < count * 3; i++) {
    posicoes.push(p[i])
    normais.push(n[i])
  }
}

for (const [andar, g] of Object.entries(casa)) {
  const assado = (ANDARES_ASSADOS as readonly string[]).includes(andar)
  for (const [mat, geo] of Object.entries(g.pecas)) {
    if (FORA_DA_CENA.has(mat)) continue
    if (mat in EMITE) {
      if (assado) juntar(`${andar}/${mat}`, andar, 'emite', cores[mat] ?? '#FFFFFF', geo, EMITE[mat])
      continue
    }
    const papel: Papel = assado && !SO_BLOQUEIA.has(mat) ? 'assar' : 'bloqueia'
    juntar(`${andar}/${mat}`, andar, papel, cores[mat] ?? '#CCCCCC', geo)
  }
  if (assado)
    g.tapetes.forEach((t, i) => juntar(`${andar}/tapete${i}`, andar, 'assar', t.tipo === 'redondo' && t.cor ? t.cor : COR_TAPETE[t.tipo], geoTapete(t)))
}

const bin = Buffer.alloc((posicoes.length + normais.length) * 4)
new Float32Array(bin.buffer, 0, posicoes.length).set(posicoes)
new Float32Array(bin.buffer, posicoes.length * 4, normais.length).set(normais)
writeFileSync(join(SAIDA, 'cena.bin'), bin)
writeFileSync(
  join(SAIDA, 'cena.json'),
  JSON.stringify({ vertices: posicoes.length / 3, sol: SOL_CASA.toArray(), andares: ANDARES_ASSADOS, pecas }, null, 1),
)
const porPapel = pecas.reduce<Record<string, number>>((a, p) => ((a[p.papel] = (a[p.papel] ?? 0) + p.count / 3), a), {})
console.log('peças', pecas.length, 'triângulos', posicoes.length / 9, porPapel)
