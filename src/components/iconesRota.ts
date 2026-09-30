import type { RotaId } from '../lib/rotas'
import { IconeAliancas, IconeAviao, IconeCalendario, IconeCarta, IconeCasa, IconeCoracao, IconeFotos } from './Icons'

/** Qual ícone representa cada seção */
export const ICONES_ROTA: Record<RotaId, typeof IconeCasa> = {
  inicio: IconeCoracao,
  lar: IconeCasa,
  casamento: IconeAliancas,
  cartas: IconeCarta,
  fotos: IconeFotos,
  dias: IconeCalendario,
  luademel: IconeAviao,
}
