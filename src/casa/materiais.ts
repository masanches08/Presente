import { ClampToEdgeWrapping, Color, DoubleSide, Material, MeshStandardMaterial, type Texture } from 'three'
import { materialRosas } from '../mundo/arranjos'
import { relevoReal, texReal } from '../lib/texturasReais'
import { texBlocos, texFolhas, texJuta, texMadeira, texPedra, texReboco } from '../mundo/texturas'
import { Y1, Y2 } from './construcao'
import { texAzulejo, texMarmore, texPisoBanho } from './texturas'
import { COR_ESTETO, texCracha, texPijama } from './texturasEnfermeira'
import { texDegrade } from './texturasInfantis'

/** Tamanho (m) de um "azulejo" de textura em cada material (usado pelo uvPlanar) */
export const ESCALAS: Record<string, number> = {
  piso: 1.7,
  azulejo: 0.8,
  pisoBanho: 1.2,
  marmore: 1.4,
  parede: 2,
  teto: 2,
  fachada: 2.2,
  blocos: 1.7,
  madeira: 1.8,
  madeiraEscura: 1.8,
  juta: 0.9,
  telhado: 1.5,
  concreto: 2,
  tijolo: 3,
  cerca: 1.2,
  cercaEscura: 1.2,
  pedra: 0.7,
  areia: 1.8,
  degradeCeu: Y2 - Y1,
  degradeSol: Y2 - Y1,
  degradeFlor: Y2 - Y1,
  // (peças com desenho próprio: mantêm as coordenadas que vieram com elas)
  pijama: 0,
  cracha: 0,
}

// tecidos: a trama vira um relevinho (não fica com cara de plástico)
for (const t of ['linho', 'tecidoCreme', 'tecidoSalvia', 'tecidoTerracota', 'tecidoRosa', 'tecidoAzul', 'tecidoMostarda', 'tecidoMenta', 'tecidoAmarelo', 'tecidoLilas', 'tecidoCeu', 'tecidoPessego', 'tecidoMarinho', 'cortina']) ESCALAS[t] = 0.27

const rep = (t: Texture) => {
  const c = t.clone()
  c.needsUpdate = true
  return c
}

// fotos escaneadas (Poly Haven, CC0): relevo do reboco, madeira, trama de tecido…
// (cor acima de 1 = clarear a foto até o tom que a gente quer; as contas são em cor linear)
const relevo = (id: string, forca = 1) => relevoReal(id, forca)
const reboco = (cor: string) => new MeshStandardMaterial({ color: cor, roughness: 0.95 })

/** Parede em degradê: a textura vai do chão (Y1) até o teto (Y2) do 2º andar */
function degrade(baixo: string, meio: string, cima: string) {
  const t = texDegrade(baixo, meio, cima).clone()
  t.wrapS = t.wrapT = ClampToEdgeWrapping
  t.offset.set(0, -Y1 / (Y2 - Y1))
  t.needsUpdate = true
  return new MeshStandardMaterial({ map: t, roughness: 0.95 })
}

const tecido = (cor: string) => new MeshStandardMaterial({ color: cor, roughness: 1, ...relevo('poly_wool_herringbone', 0.9) })

/** Tábuas de madeira em pé (a textura de madeira girada 90°) */
function tabuasEmPe() {
  const t = texMadeira().clone()
  t.center.set(0.5, 0.5)
  t.rotation = Math.PI / 2
  t.needsUpdate = true
  return t
}

const std = (cor: string, extra: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {}) =>
  new MeshStandardMaterial({ color: cor, roughness: 0.8, ...extra })

/** Um jogo completo de materiais (cada andar tem o seu, pra poder "esconder" um andar sozinho) */
export function criarMateriais() {
  const m: Record<string, Material> = {
    // estrutura
    parede: reboco('#FBF6EE'),
    // quartos das crianças: cada um é uma cor que vai se misturando na outra
    // (tons suaves, "empoeirados", como tinta de parede de verdade: combinam com a madeira clara e o branco da casa)
    // tinta das meias-paredes e dos arcos dos quartos das crianças (cores de verdade, mas elegantes)
    tintaCeu: reboco('#A2BBC7'), // azul-céu acinzentado
    tintaSol: reboco('#E0BD74'), // amarelo-mostarda quentinho
    tintaFlor: reboco('#E2C2C3'), // rosa antigo
    tintaJeans: reboco('#7E97A7'), // azul-jeans (o quarto do menino maior)
    tintaBranca: reboco('#F7F1E6'), // a parte de cima das paredes dos quartos (branco-creme da casa)
    degradeCeu: degrade('#B9CDD2', '#CBDACF', '#F0F3EE'), // azul-céu que vira verde-menta
    degradeSol: degrade('#E8CDB4', '#EDDDB8', '#F8F2E4'), // pêssego que vira amarelo-sol
    degradeFlor: degrade('#E6CDCC', '#DDD1DA', '#F2EDEF'), // rosa que vira lilás
    fachada: std('#EDE7DD', { map: rep(texReboco()), roughness: 0.92 }),
    blocos: std('#FFFFFF', { map: rep(texBlocos()), roughness: 0.9 }),
    teto: reboco('#FBF8F3'),
    // (cor acima de 1 clareia e esquenta a foto: madeira clarinha como na referência)
    piso: std('#FFFFFF', { color: new Color(1.45, 1.26, 1.0), map: texReal('laminate_floor_02', 'diff'), roughness: 0.75, ...relevo('laminate_floor_02') }),
    pisoBanho: std('#FFFFFF', { map: rep(texPisoBanho()), roughness: 0.4 }),
    azulejo: std('#FFFFFF', { map: rep(texAzulejo()), roughness: 0.25 }),
    marmore: std('#FFFFFF', { map: rep(texMarmore()), roughness: 0.25 }),
    concreto: std('#FFFFFF', { color: new Color(3.8, 4.37, 5.78), map: texReal('concrete_floor_01', 'diff'), roughness: 0.9, ...relevo('concrete_floor_01') }),
    telhado: std('#9AA0A8', { map: texReal('grey_roof_tiles_02', 'diff'), roughness: 0.8, ...relevo('grey_roof_tiles_02') }),
    tijolo: std('#FFFFFF', { map: texReal('brick_wall_001', 'diff'), roughness: 0.9, ...relevo('brick_wall_001') }),
    azulPiscina: std('#4FB4CF', { roughness: 0.3 }),
    cerca: std('#C9A075', { map: tabuasEmPe(), roughness: 0.85 }),
    cercaEscura: std('#8C6647', { map: rep(texMadeira()), roughness: 0.85 }),
    pedra: std('#A59D92', { map: rep(texPedra()), roughness: 0.95 }),
    areia: std('#FFFFFF', { color: new Color(2.5, 2.8, 3.1), map: texReal('dense_sand', 'diff'), roughness: 1, ...relevo('dense_sand') }),
    terra: std('#4A3526', { roughness: 1 }),
    pedraEscura: std('#3A3633', { roughness: 0.6 }),
    fogo: new MeshStandardMaterial({ color: '#FFB347', emissive: '#FF7A1A', emissiveIntensity: 3.5, transparent: true, opacity: 0.9, depthWrite: false }),
    rede: new MeshStandardMaterial({ color: '#1C1C1C', transparent: true, opacity: 0.22, side: DoubleSide, depthWrite: false }),
    toalha: tecido('#8FC9E8'),
    // acabamentos
    branco: std('#FBF8F2', { roughness: 0.5 }),
    madeira: std('#FFF1E0', { map: texReal('oak_veneer_01', 'diff'), roughness: 0.55, ...relevo('oak_veneer_01', 0.5) }),
    madeiraEscura: std('#A87650', { map: texReal('oak_veneer_01', 'diff'), roughness: 0.5, ...relevo('oak_veneer_01', 0.5) }),
    preto: std('#26282B', { roughness: 0.45, metalness: 0.3 }),
    metal: std('#C9C4BA', { roughness: 0.3, metalness: 0.7 }),
    latao: std('#D8B25A', { roughness: 0.28, metalness: 0.9 }),
    espelho: std('#DDE6EA', { roughness: 0.05, metalness: 1 }),
    vidro: new MeshStandardMaterial({ color: '#E8F3F7', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, depthWrite: false, side: DoubleSide }),
    voil: new MeshStandardMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.45, roughness: 1, depthWrite: false, side: DoubleSide }),
    ceramica: std('#F3F1EC', { roughness: 0.2 }),
    // tecidos
    linho: tecido('#F6F1E7'),
    tecidoCreme: tecido('#EDE3D1'),
    tecidoSalvia: tecido('#93A882'),
    tecidoTerracota: tecido('#C8643B'),
    tecidoRosa: tecido('#E6BDB8'),
    tecidoAzul: tecido('#93AFC2'),
    tecidoMostarda: tecido('#D4A85A'),
    tecidoMenta: tecido('#A9C3AF'),
    tecidoAmarelo: tecido('#EDCF86'),
    tecidoLilas: tecido('#C4B5D3'),
    tecidoCeu: tecido('#B0C7D3'),
    tecidoMarinho: tecido('#4F6378'),
    tecidoPessego: tecido('#E6AE8B'),
    cortina: new MeshStandardMaterial({ color: '#F5EFE4', roughness: 1, ...relevo('poly_wool_herringbone', 0.6), side: DoubleSide, transparent: true, opacity: 0.9 }),
    juta: std('#E9D2A6', { map: rep(texJuta()), roughness: 1 }),
    feltro: std('#2E6E45', { roughness: 1 }),
    // objetos
    vaso: std('#C0693F', { roughness: 0.8 }),
    vasoPreto: std('#1F2023', { roughness: 0.4 }),
    livroA: std('#B55D3A'),
    livroB: std('#7E9A6C'),
    livroC: std('#E4D6BC'),
    livroD: std('#4F6D84'),
    // brinquedos de madeira pintada, em tons suaves (nada de plástico berrante)
    brinquedoA: std('#E6B858', { roughness: 0.6 }),
    brinquedoB: std('#D98A68', { roughness: 0.6 }),
    brinquedoC: std('#7FA5BF', { roughness: 0.6 }),
    brinquedoD: std('#93B287', { roughness: 0.6 }),
    brinquedoE: std('#DB9AA6', { roughness: 0.6 }),
    brinquedoF: std('#A998C9', { roughness: 0.6 }),
    madeiraBranca: std('#F4EFE6', { roughness: 0.6 }),
    tela: std('#101214', { roughness: 0.15, metalness: 0.4 }),
    luz: new MeshStandardMaterial({ color: '#FFF1D6', emissive: '#FFB45A', emissiveIntensity: 2.8 }),
    cupula: new MeshStandardMaterial({ color: '#FFF6E6', emissive: '#FFC47A', emissiveIntensity: 1.1, roughness: 0.9 }),
    // coisinhas de enfermeira (enfermeira.ts)
    pijama: new MeshStandardMaterial({ map: texPijama(), alphaTest: 0.5, side: DoubleSide, roughness: 0.95, ...relevoReal('poly_wool_herringbone', 0.25, [5, 5]) }),
    esteto: std(COR_ESTETO, { roughness: 0.35 }),
    estetoMetal: std('#D7DADC', { roughness: 0.18, metalness: 0.85 }),
    tamanco: std('#E7A9B6', { roughness: 0.5, side: DoubleSide }),
    tamancoSola: std('#F5F0EA', { roughness: 0.7 }),
    cracha: new MeshStandardMaterial({ map: texCracha(), roughness: 0.3 }),
    crachaCorpo: std('#F3F2EE', { roughness: 0.3 }),
    // plantas e flores (versões sem vento, porque aqui dentro não venta)
    folhas: new MeshStandardMaterial({ map: texFolhas(), vertexColors: true, alphaTest: 0.5, side: DoubleSide, roughness: 0.75 }),
    rosas: materialRosas().clone(),
  }
  return m
}

/** Esconde (ou mostra) um andar inteiro, mas ele continua fazendo sombra */
export function ocultar(mats: Record<string, Material>, oculto: boolean) {
  for (const m of Object.values(mats)) {
    m.colorWrite = !oculto
    m.depthWrite = !oculto && !m.transparent
    m.needsUpdate = true
  }
}
