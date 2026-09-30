import { CircleGeometry, PlaneGeometry } from 'three'
import { criarArranjos } from '../mundo/arranjos'
import { criarFolhagem } from '../mundo/Arvore'
import { montarEstrutura, Y1, Y2 } from './construcao'
import { decorarSuperior, decorarTerreo } from './decoracao'
import { montarExterior, novoAndar } from './exterior'
import { ESCALAS } from './materiais'
import { em, type Andar, type Tapete } from './moveis'

const VERDES_VASO: [string, string, string] = ['#2F6B2A', '#4E9A3A', '#9CCD66']

/** Junta tudo de um andar em poucas peças (uma por material) */
function finalizar(a: Andar, semente: number) {
  // moldura de madeira de cada quadro (a pintura vai por cima, separada)
  for (const q of a.quadros) if (!q.desenho) em(a, q.pos, q.giro).caixa('madeira', -q.w / 2 - 0.04, q.w / 2 + 0.04, -q.h / 2 - 0.04, q.h / 2 + 0.04, 0, 0.035)
  return {
    pecas: a.o.finalizar(ESCALAS),
    folhas: a.tufos.length ? criarFolhagem(a.tufos, 20, semente, VERDES_VASO, 0.3) : null,
    arranjos: a.arranjos.length ? criarArranjos(a.arranjos, semente + 1) : null,
    tapetes: a.tapetes,
    quadros: a.quadros,
    modelos: a.modelos,
  }
}
export type GeoAndar = ReturnType<typeof finalizar>

/** Monta a casa inteira + o quintal. Roda uma vez só (é o passo mais "pesado"). */
export function montarCasa() {
  const est = montarEstrutura()
  const terreo: Andar = { ...novoAndar(0), o: est.terreo }
  const superior: Andar = { ...novoAndar(Y1), o: est.superior }
  const teto: Andar = { ...novoAndar(Y2), o: est.teto }
  const fora = novoAndar(0)
  decorarTerreo(terreo)
  decorarSuperior(superior)
  montarExterior(fora)
  return {
    terreo: finalizar(terreo, 11),
    superior: finalizar(superior, 22),
    teto: finalizar(teto, 33),
    fora: finalizar(fora, 44),
  }
}

/** A geometria de um tapete (a mesma no site e no Blender, pra luz assada bater certinho) */
export function geoTapete(t: Tapete) {
  const g = t.tipo === 'redondo' || t.tipo === 'infantil' ? new CircleGeometry(t.w / 2, 48) : new PlaneGeometry(t.w, t.d)
  g.rotateX(-Math.PI / 2)
  g.rotateY(t.giro)
  g.translate(...t.pos)
  return g
}
