// Enquadramento que se adapta à tela.
// As cenas foram desenhadas olhando numa tela deitada (notebook, 16:10). Num celular em pé a tela é estreita:
// com a mesma câmera, as laterais somem e parece que está tudo "com zoom".
// A ideia: mostrar quase a mesma LARGURA de cena em qualquer tela.
//  1) abre o ângulo da câmera (até um limite, pra não distorcer como olho de peixe)
//  2) o que ainda faltar, a câmera recua um pouco (só onde dá: dentro de casa recuar atravessaria parede)

export const ASPECTO_REFERENCIA = 16 / 10

const grausParaRad = (g: number) => (g * Math.PI) / 180
const radParaGraus = (r: number) => (r * 180) / Math.PI

export interface Enquadre {
  /** ângulo vertical da câmera (graus) */
  fov: number
  /** quanto afastar a câmera do ponto que ela olha (1 = nada) */
  recuo: number
}

/**
 * @param aspecto largura/altura da tela
 * @param fovBase o ângulo que a cena usa no notebook
 * @param fovMax o máximo que pode abrir (mais que isso deforma)
 * @param recuoMax o máximo que pode afastar
 */
export function enquadrar(aspecto: number, fovBase: number, fovMax: number, recuoMax: number): Enquadre {
  if (aspecto >= ASPECTO_REFERENCIA) return { fov: fovBase, recuo: 1 }
  // largura de cena que o notebook mostra
  const meiaLarguraRef = Math.atan(Math.tan(grausParaRad(fovBase) / 2) * ASPECTO_REFERENCIA)
  // no celular em pé mostramos uns 90% da largura do notebook
  const t = Math.min(1, Math.max(0, (ASPECTO_REFERENCIA - aspecto) / (ASPECTO_REFERENCIA - 0.45)))
  const meiaLarguraAlvo = meiaLarguraRef * (1 - 0.1 * t)
  // 1) abre o ângulo
  const fovNecessario = radParaGraus(2 * Math.atan(Math.tan(meiaLarguraAlvo) / aspecto))
  const fov = Math.min(fovMax, Math.max(fovBase, fovNecessario))
  // 2) recua o que faltar
  const meiaLarguraObtida = Math.atan(Math.tan(grausParaRad(fov) / 2) * aspecto)
  const recuo = Math.min(recuoMax, Math.max(1, Math.tan(meiaLarguraAlvo) / Math.tan(meiaLarguraObtida)))
  return { fov, recuo }
}

/** Afasta a posição da câmera do alvo (mantendo a direção do olhar) */
export function recuar(pos: [number, number, number], alvo: [number, number, number], recuo: number): [number, number, number] {
  return [alvo[0] + (pos[0] - alvo[0]) * recuo, alvo[1] + (pos[1] - alvo[1]) * recuo, alvo[2] + (pos[2] - alvo[2]) * recuo]
}

/**
 * Quanto "subir" a imagem (fração da altura da tela) pra o assunto ficar no meio da parte livre,
 * acima do cartão que fica embaixo.
 */
export const subidaPainel = (aspecto: number, painelGrande: boolean) => (painelGrande ? (aspecto < 1 ? 0.13 : 0.09) : aspecto < 1 ? 0.06 : 0.04)
