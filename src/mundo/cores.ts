import { Vector3 } from 'three'

/** Direção do sol: se pondo sobre o mar (lado +x) */
export const DIRECAO_SOL = new Vector3(0.9, 0.13, 0.12).normalize()

/** De onde a luz do sol ilumina o campo (um pouco mais alta que o sol do céu, pra as sombras não ficarem compridas demais) */
export const DIRECAO_LUZ = new Vector3(0.72, 0.55, 0.42).normalize()

// Paleta do mundinho 3D (mesmas cores do site, com alguns tons a mais)
export const COR = {
  salvia: '#A1B79C', // um tiquinho mais frio, porque a luz do pôr do sol esquenta tudo
  terracota: '#C8643B',
  terracotaEscuro: '#A44F2E',
  dourado: '#C9A86A',
  creme: '#FAF7F2',
  branco: '#F6F1E7',
  madeira: '#9A6F4C',
  madeiraClara: '#B98C62',
  grama: '#ADC68E',
  gramaBorda: '#8BA66F',
  terra: '#B7805C',
  terraEscura: '#7E5443',
  areia: '#EBD8B7',
  pedra: '#E4D9C6',
  folha: ['#7FA36A', '#8DB077', '#6E955C', '#98B982'],
  luzJanela: '#FFD9A0',
  agua: '#8CC5C8',
}
