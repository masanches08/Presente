import { DoubleSide, Material, MeshStandardMaterial, RepeatWrapping, type Texture } from 'three'
import { texMadeira, texPedra, texTijolo, texTelhas, texChao, texReboco } from '../mundo/texturas'
import { texBananeira, texEntalhe, texEscamas, texFibras, texIjukCor, texPalhaCor, texPoleng, texToldo } from './texturas'

const rep = (t: Texture) => {
  const c = t.clone()
  c.wrapS = c.wrapT = RepeatWrapping
  c.needsUpdate = true
  return c
}
const std = (cor: string, extra: ConstructorParameters<typeof MeshStandardMaterial>[0] = {}) => new MeshStandardMaterial({ color: cor, roughness: 0.85, ...extra })

function polengRep() {
  const t = rep(texPoleng())
  t.repeat.set(2.5, 1.2)
  return t
}

/** Tamanho (m) de um "azulejo" de textura em cada material (pra Obra.finalizar) */
export const ESCALAS: Record<string, number> = {
  pedraVulc: 1.4,
  pedraClara: 1.4,
  pedraMusgo: 0.9,
  tijolo: 1.1,
  ijuk: 1.1,
  palha: 1.4,
  madeira: 1.1,
  madeiraEscura: 1.1,
  deck: 1.3,
  poleng: 0,
  escamas: 0.6,
  telhaVermelha: 1.6,
  areia: 3,
  grama: 3,
  toldo: 1.2,
  bananeira: 0.6,
  reboco: 2,
}

/** Todos os materiais dos cenários da lua de mel */
export function materiaisLuaDeMel(): Record<string, Material> {
  const fibras = rep(texFibras())
  return {
    pedraVulc: std('#76706A', { map: rep(texPedra()), roughness: 0.95 }),
    pedraClara: std('#D8D2C4', { map: rep(texPedra()), roughness: 0.9 }),
    pedraMusgo: std('#737564', { map: rep(texPedra()), roughness: 0.95 }),
    pedraEntalhada: std('#FFFFFF', { map: texEntalhe(), roughness: 0.9 }),
    tijolo: std('#FFFFFF', { map: rep(texTijolo()), roughness: 0.9 }),
    ijuk: std('#FFFFFF', { map: rep(texIjukCor()), bumpMap: fibras, bumpScale: 2, roughness: 1 }),
    palha: std('#FFFFFF', { map: rep(texPalhaCor()), bumpMap: fibras, bumpScale: 2, roughness: 1 }),
    madeira: std('#B98A5E', { map: rep(texMadeira()), roughness: 0.7 }),
    madeiraEscura: std('#6A4630', { map: rep(texMadeira()), roughness: 0.7 }),
    deck: std('#C49A70', { map: rep(texMadeira()), roughness: 0.65 }),
    ouro: std('#E2B653', { metalness: 0.9, roughness: 0.3 }),
    branco: std('#F6F2EA', { roughness: 0.6 }),
    reboco: std('#F4EEE2', { map: rep(texReboco()), roughness: 0.9 }),
    vidro: new MeshStandardMaterial({ color: '#CFE8F0', transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.3, depthWrite: false, side: DoubleSide }),
    metal: std('#C9CDD0', { metalness: 0.8, roughness: 0.3 }),
    almofada: std('#FFFDF7', { roughness: 1 }),
    bordaPiscina: std('#EDE8DE', { roughness: 0.8 }),
    aguaPiscina: new MeshStandardMaterial({ color: '#4FD6E2', emissive: '#1A9FB0', emissiveIntensity: 0.35, roughness: 0.05, metalness: 0.2 }),
    poleng: std('#FFFFFF', { map: polengRep(), roughness: 1 }),
    escamas: std('#FFFFFF', { map: rep(texEscamas()), roughness: 0.45, metalness: 0.2 }),
    telhaVermelha: std('#FFFFFF', { map: rep(texTelhas()), roughness: 0.8 }),
    areia: std('#F3E6C9', { map: rep(texPedra()), roughness: 1 }),
    grama: std('#5E9A3E', { map: rep(texChao()), roughness: 1 }),
    toldo: std('#FFFFFF', { map: rep(texToldo()), roughness: 0.9, side: DoubleSide }),
    fitaA: std('#E94B3C', { side: DoubleSide }),
    fitaB: std('#F2C14E', { side: DoubleSide }),
    fitaC: std('#3FA7D6', { side: DoubleSide }),
    fitaD: std('#7BC47F', { side: DoubleSide }),
    flores: std('#FF6FA0', { roughness: 0.7 }),
    bananeira: std('#FFFFFF', { map: rep(texBananeira()), roughness: 0.6, side: DoubleSide }),
    // comidas
    arrozAmarelo: std('#F2C23A', { roughness: 0.9 }),
    arrozFrito: std('#A0643A', { roughness: 0.95 }),
    claraOvo: std('#FFFDF6', { roughness: 0.4 }),
    gema: std('#FFB21E', { roughness: 0.3 }),
    frango: std('#9A5324', { roughness: 0.55 }),
    espetinho: std('#7A3A18', { roughness: 0.35 }),
    molhoAmendoim: std('#A3642E', { roughness: 0.4 }),
    rendang: std('#4A2412', { roughness: 0.5 }),
    sambal: std('#C8321E', { roughness: 0.35 }),
    verdura: std('#3E8E2E', { roughness: 0.7 }),
    tempeh: std('#C9A06A', { roughness: 0.8 }),
    pepino: std('#DDEBC3', { roughness: 0.5 }),
    tomate: std('#E0442E', { roughness: 0.4 }),
    krupuk: std('#FBF1DA', { roughness: 0.9 }),
    palito: std('#D9C08F', { roughness: 0.9 }),
    coco: std('#6F9E3A', { roughness: 0.6 }),
    cocoDentro: std('#FFFBF0', { roughness: 0.6 }),
    mangostao: std('#4A1E3A', { roughness: 0.35 }),
    rambutan: std('#D12A2A', { roughness: 0.6 }),
    pitaya: std('#F0368A', { roughness: 0.5 }),
    pitayaDentro: std('#FFFFFF', { roughness: 0.7 }),
    banana: std('#F5D24A', { roughness: 0.6 }),
    ceramica: std('#FFFFFF', { roughness: 0.25 }),
    ceramicaAzul: std('#2C5E8C', { roughness: 0.3 }),
    toalha: std('#FBF6EC', { map: rep(texReboco()), roughness: 1 }),
    vela: new MeshStandardMaterial({ color: '#FFF3DC', emissive: '#FFA548', emissiveIntensity: 1.8 }),
    hibisco: std('#E8243A', { roughness: 0.6, side: DoubleSide }),
  }
}
