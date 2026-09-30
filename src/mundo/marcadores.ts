import type { PontoId } from './pontos'

/**
 * As etiquetas flutuantes são botões normais da página (fora do 3D).
 * O 3D guarda aqui a referência de cada uma e, a cada quadro, move ela
 * pra cima do objeto correspondente na tela.
 */
export const elementosMarcador = new Map<PontoId, HTMLElement>()
