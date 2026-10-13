import { parede, Y1, Y2, TETO1, type Abertura, type Eixo } from './construcao'
import {
  abajur,
  aparador,
  araraRoupas,
  banheira,
  banqueta,
  bandeirinhas,
  brinquedos,
  camaCasinha,
  cortina,
  estanteInfantil,
  lareira,
  lustre,
  lustreNuvem,
  painelCabeceira,
  type Desenho,
  type V3,
  cadeira,
  cama,
  casinhaBoneca,
  chuveiro,
  criado,
  em,
  escrivaninha,
  estante,
  estanteMetal,
  gabinete,
  luminariaPe,
  maquinaLavar,
  mesaLateral,
  mesaRedonda,
  pendente,
  modelo,
  poltrona,
  pufe,
  sinuca,
  sofa,
  tenda,
  tvRack,
  ursinho,
  vasoSanitario,
  type Andar,
} from './moveis'
import { enfermeiraNaSala, enfermeiraNaSuite } from './enfermeira'

const PI = Math.PI
const X9 = 8.93 // face de dentro da parede da direita (com um respiro)
// giros: a frente do móvel olha pra...
const P_Z = 0 // +z (frente da casa)
const N_Z = PI // -z (fundos)
const P_X = PI / 2 // +x (direita)
const N_X = -PI / 2 // -x (esquerda)

// ======================= TÉRREO =======================
export function decorarTerreo(a: Andar) {
  const y = 0

  // ---------- hall de entrada ----------
  a.tapetes.push({ pos: [0, 0.006, 5.1], w: 1.3, d: 3.1, giro: 0, tipo: 'listrado' })
  const console1 = em(a, [3.73, y, 5.5], N_X)
  aparador(console1, 1.6, 0.8, 0.4)
  console1.flores(0.45, 0.98, 0, 0.2, 14)
  console1.cil('vidro', 0.45, 0.8, 0.98, 0, 0.07, 0.09)
  abajur(em(a, [3.73, 0.8, 6.05], N_X), 0)
  const espelho = em(a, [3.93, 0, 5.4], N_X)
  espelho.disco('espelho', 0, 1.75, 0, 0.45, 0.015)
  espelho.aro('latao', 0, 1.75, 0.005, 0.45, 0.02)
  modelo(a, 'planta-costela', -2.25, 3.0, 1.35, 0.6)

  // ---------- sala (pé-direito duplo) ----------
  a.tapetes.push({ pos: [0.9, 0.006, 0.7], w: 3.6, d: 4.2, giro: 0, tipo: 'juta' })
  sofa(em(a, [-1.55, y, 0.7], P_X), 2.7, 'tecidoCreme', ['tecidoSalvia', 'tecidoTerracota', 'tecidoCreme', 'tecidoSalvia'])
  poltrona(em(a, [2.95, y, -0.45], N_X - 0.35), 'linho', 'tecidoSalvia')
  poltrona(em(a, [2.95, y, 1.85], N_X + 0.35), 'linho', 'tecidoTerracota')
  const centro = em(a, [0.75, y, 0.7])
  mesaRedonda(centro, 0.6, 0.42)
  centro.caixa('livroC', 0.1, 0.4, 0.42, 0.46, -0.25, -0.05)
  centro.caixa('livroB', 0.12, 0.38, 0.46, 0.49, -0.23, -0.07)
  centro.cil('luz', 0.25, 0.42, 0.52, 0.2, 0.035)
  enfermeiraNaSala(a, [0.75, y, 0.7], 0.42) // o crachá dela, esquecido na mesinha
  const lat = em(a, [-1.55, y, 2.45])
  mesaLateral(lat)
  lat.modelo('suculenta', 0.1, 0.55, -0.08, 0.2)
  abajur(lat, 0.55)
  luminariaPe(em(a, [-2.45, y, -1.9]))
  modelo(a, 'planta-arvore', 3.45, 3.35, 1.85, 2.2)
  pendente(em(a, [0.6, 4.7, 0.9]), 0, Y2 - 4.7, 0.36)
  // cortinas de linho do chão até lá em cima, emoldurando o janelão
  const frente = em(a, [0, y, 6.86], N_Z)
  cortina(frente, -3.55, 0, 0.75, 0.05, Y2 - 0.12)
  cortina(frente, 3.55, 0, 0.75, 0.05, Y2 - 0.12)
  a.quadros.push({ pos: [3.93, 1.65, 1.5], w: 0.75, h: 0.95, giro: N_X, variante: 0 })
  // embaixo do mezanino

  // ---------- sala de jantar ----------
  a.tapetes.push({ pos: [0, 0.006, -7], w: 3.2, d: 3.3, giro: 0, tipo: 'persa' })
  const jantar = em(a, [0, y, -7])
  mesaRedonda(jantar, 0.8, 0.76)
  jantar.cil('ceramica', 0, 0.76, 0.98, 0, 0.08, 0.06)
  jantar.flores(0, 1.02, 0, 0.24, 20)
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * PI * 2 + PI / 6
    cadeira(em(a, [Math.sin(ang) * 1.15, y, -7 + Math.cos(ang) * 1.15], ang + PI), 'tecidoSalvia')
  }
  pendente(em(a, [0, 2.3, -7]), 0, TETO1 - 2.3, 0.3)
  const buffet = em(a, [-3.72, y, -7], P_X)
  aparador(buffet, 1.8)
  buffet.modelo('vaso-alto', -0.5, 0.82, 0, 0.42)
  buffet.modelo('suculenta', 0.2, 0.82, 0.02, 0.22, 1)
  abajur(em(a, [-3.72, 0.82, -7.55], P_X), 0)
  a.quadros.push({ pos: [-3.93, 1.75, -6.8], w: 0.6, h: 0.8, giro: P_X, variante: 1 })

  // ---------- cozinha ----------
  a.o.caixa('branco', [8.35, X9], [0.1, 0.88], [-8.2, -1.1])
  a.o.caixa('preto', [8.4, X9], [0, 0.1], [-8.2, -1.1])
  a.o.caixa('marmore', [8.3, X9], [0.88, 0.92], [-8.25, -1.07])
  for (let z = -7.9; z < -1.3; z += 0.6) a.o.caixa('latao', [8.33, 8.35], [0.72, 0.75], [z - 0.08, z + 0.08])
  a.o.caixa('metal', [8.45, 8.85], [0.9, 0.925], [-5.7, -4.9]) // cuba
  a.o.caixa('latao', [8.8, 8.85], [0.92, 1.25], [-5.32, -5.28])
  a.o.caixa('latao', [8.6, 8.85], [1.22, 1.25], [-5.32, -5.28])
  a.o.caixa('tela', [8.4, 8.85], [0.92, 0.935], [-3.5, -2.9]) // cooktop
  a.o.caixa('metal', [8.28, X9], [0, 2.05], [-8.98, -8.28]) // geladeira
  for (const zs of [
    [-3.8, -1.3],
    [-8.1, -6.6],
  ])
    for (const yy of [1.55, 2.05]) {
      a.o.caixa('madeira', [8.68, X9], [yy, yy + 0.04], [zs[0], zs[1]])
      const l = em(a, [8.82, 0, (zs[0] + zs[1]) / 2])
      l.cil('vidro', -0.02, yy + 0.04, yy + 0.24, -0.3, 0.06)
      l.cil('ceramica', 0, yy + 0.04, yy + 0.2, 0.25, 0.06, 0.05)
    }
  // ilha
  a.o.caixa('madeira', [5.7, 6.8], [0, 0.88], [-6.1, -3.7])
  a.o.caixa('marmore', [5.55, 6.95], [0.88, 0.93], [-6.25, -3.55])
  for (const z of [-5.55, -4.9, -4.25]) banqueta(em(a, [5.2, y, z]))
  const ilha = em(a, [6.3, 0.93, -4.9])
  ilha.cil('madeira', 0, 0, 0.05, 0.3, 0.2, 0.22)
  for (const [dx, dz, m] of [
    [0.05, 0.25, 'brinquedoA'],
    [-0.06, 0.34, 'tecidoTerracota'],
    [0.08, 0.36, 'brinquedoB'],
  ] as [number, number, string][])
    ilha.esfera(m, dx, 0.1, dz, 0.055)
  for (const z of [-5.5, -4.3]) pendente(em(a, [6.25, 2.15, z]), 0, TETO1 - 2.15, 0.17)

  // ---------- sala de jogos ----------
  a.tapetes.push({ pos: [-6.5, 0.006, -5.2], w: 3.1, d: 4.0, giro: 0, tipo: 'juta' })
  sinuca(em(a, [-6.5, y, -5.2]))
  const lustre = em(a, [-6.5, 0, -5.2])
  lustre.caixa('preto', -0.35, 0.35, 1.95, 2.05, -0.75, 0.75)
  lustre.caixa('luz', -0.3, 0.3, 1.93, 1.95, -0.7, 0.7)
  for (const z of [-0.6, 0.6]) lustre.caixa('preto', -0.005, 0.005, 2.05, TETO1, z - 0.005, z + 0.005)
  tvRack(em(a, [-8.75, y, 0.8], P_X), 2.2)
  a.tapetes.push({ pos: [-7.3, 0.006, 0.8], w: 2.6, d: 2.6, giro: 0, tipo: 'redondo', cor: '#D9C3A0' })
  pufe(em(a, [-7.2, y, 0.25]), 'tecidoMostarda')
  pufe(em(a, [-7.0, y, 1.45]), 'tecidoTerracota')
  pufe(em(a, [-6.4, y, -0.55]), 'tecidoSalvia')
  estante(em(a, [-4.27, y, -7.3], N_X), 1.8, 2.1)
  a.quadros.push({ pos: [-5.25, 1.6, 3.42], w: 0.8, h: 0.6, giro: N_Z, variante: 3 })

  // ---------- lavabo ----------
  a.o.caixa('azulejo', [-6.43, -4.07], [0, 1.6], [6.985, 7])
  gabinete(em(a, [-5.25, y, 6.73], N_Z), 0.9)
  vasoSanitario(em(a, [-6.1, y, 4.3], P_X))

  // ---------- lavanderia ----------
  maquinaLavar(em(a, [8.65, y, -0.55], N_X))
  maquinaLavar(em(a, [8.65, y, 0.15], N_X))
  a.o.caixa('madeira', [8.65, X9], [1.55, 1.58], [-0.95, 1.43])
  for (const z of [-0.6, 0.0, 0.6]) em(a, [8.82, 1.58, z]).cil('juta', 0, 0, 0.26, 0, 0.13, 0.15)
  em(a, [8.55, y, 1.0]).cil('juta', 0, 0, 0.55, 0, 0.22, 0.25, 18)

  // ---------- banheiro do térreo ----------
  chuveiro(a, 7.9, X9, 1.57, 2.65, 'x1', 'z0')
  vasoSanitario(em(a, [8.62, y, 3.35], N_X))
  gabinete(em(a, [6.3, y, 3.68], N_Z), 1.0)

  // ---------- depósito ----------
  estanteMetal(em(a, [8.72, y, 5.5], N_X), 2.6)
  estanteMetal(em(a, [6.3, y, 6.72], N_Z), 2.0)
}


// ======================= 2º ANDAR =======================
export function decorarSuperior(a: Andar) {
  const y = Y1

  // ---------- mezanino ----------
  estante(em(a, [-2.0, y, -4.77], P_Z), 2.2, 2.3)
  poltrona(em(a, [2.9, y, -3.8], N_X - 0.5), 'tecidoCreme', 'tecidoSalvia')
  luminariaPe(em(a, [3.55, y, -4.6]))
  a.tapetes.push({ pos: [0.6, y + 0.006, -3.7], w: 1.1, d: 3.2, giro: PI / 2, tipo: 'listrado' })
  // corredores
  a.tapetes.push({ pos: [-4.6, y + 0.006, 1.2], w: 0.85, d: 9, giro: 0, tipo: 'juta' })
  a.tapetes.push({ pos: [4.6, y + 0.006, 1.2], w: 0.85, d: 9, giro: 0, tipo: 'juta' })

  // ---------- a nossa suíte (a ala nova, virada pro quintal) ----------
  // cama king com painel estofado do tamanho da parede
  painelCabeceira(em(a, [0.5, y, -9.3], N_Z), 3.9, 2.4, 'tecidoCreme')
  a.tapetes.push({ pos: [0.5, y + 0.006, -11.1], w: 4.4, d: 3.4, giro: 0, tipo: 'persa' })
  cama(em(a, [0.5, y, -10.45], N_Z), 2.0, 2.2, 'linho', 'tecidoCreme', ['tecidoSalvia', 'tecidoCreme', 'tecidoTerracota', 'tecidoCreme'])
  criado(em(a, [-0.95, y, -9.6], N_Z))
  criado(em(a, [1.95, y, -9.6], N_Z))
  for (const x of [-0.95, 1.95]) pendente(em(a, [x, y + 1.65, -9.75]), 0, Y2 - (y + 1.65), 0.12)
  const pe = em(a, [0.5, y, -11.85])
  pe.caixa('tecidoSalvia', -0.9, 0.9, 0.3, 0.48, -0.22, 0.22)
  for (const x of [-0.82, 0.82]) pe.caixa('latao', x - 0.02, x + 0.02, 0, 0.3, -0.2, 0.2)
  // ela acabou de chegar do plantão: pijama cirúrgico jogado no banco, estetoscópio e tamancos
  enfermeiraNaSuite(a, [0.5, y, -11.85])
  lustre(em(a, [0.5, 0, -11.2]), Y2 - 0.9, Y2)

  // lareira de mármore com um quadro grande em cima, e a salinha de frente pra ela
  lareira(em(a, [-4.95, y, -12.4], P_X))
  a.quadros.push({ pos: [-4.83, y + 2.2, -12.4], w: 1.3, h: 0.9, giro: P_X, variante: 2 })
  a.tapetes.push({ pos: [-2.9, y + 0.006, -12.4], w: 2.6, d: 3.0, giro: 0, tipo: 'juta' })
  sofa(em(a, [-1.75, y, -12.4], N_X), 2.1, 'tecidoCreme', ['tecidoSalvia', 'tecidoTerracota'])
  poltrona(em(a, [-3.2, y, -14.2], 0.4), 'linho', 'tecidoSalvia')
  poltrona(em(a, [-3.2, y, -10.6], PI - 0.4), 'linho', 'tecidoTerracota')
  const centro = em(a, [-3.15, y, -12.4])
  mesaRedonda(centro, 0.45, 0.4)
  centro.flores(0, 0.52, 0, 0.16, 14)
  luminariaPe(em(a, [-1.6, y, -14.1]))

  // banheira de frente pro vidro (a vista mais bonita da casa)
  banheira(em(a, [3.1, y, -14.6]))
  const banqueta = em(a, [4.3, y, -13.9])
  banqueta.cil('madeira', 0, 0, 0.45, 0, 0.2, 0.2, 18)
  banqueta.cil('vela', 0.05, 0.45, 0.6, 0, 0.05)

  // penteadeira embaixo da janela lateral
  const pent = em(a, [4.72, y, -10.4], N_X)
  aparador(pent, 1.5, 0.78, 0.42)
  pent.modelo('vaso-branco', -0.45, 0.78, 0.02, 0.3)
  abajur(em(a, [4.72, 0.78 + y, -10.95], N_X), 0)
  const espelhoPent = em(a, [4.98, y, -10.3], N_X)
  espelhoPent.disco('espelho', 0, 1.65, 0, 0.42, 0.015)
  espelhoPent.aro('latao', 0, 1.65, 0.01, 0.43, 0.02)
  cadeira(em(a, [4.1, y, -10.4], P_X), 'tecidoCreme')

  // cortinas de linho do chão ao teto em volta da parede de vidro
  const vidroFundo = em(a, [0, y, -15.84], P_Z)
  for (const x of [-3.2, 3.2]) cortina(vidroFundo, x, 0, 0.8, 0.05, Y2 - Y1 - 0.14)

  // varanda: duas cadeiras juntinhas olhando a piscina (um pouco viradas uma pra outra) e a mesinha do lado
  cadeira(em(a, [-0.4, y, -17.2], N_Z - 0.2), 'tecidoCreme')
  cadeira(em(a, [0.4, y, -17.2], N_Z + 0.2), 'tecidoCreme')
  mesaRedonda(em(a, [1.1, y, -17.3]), 0.3, 0.55)
  modelo(a, 'planta-arvore', -2.9, -17.6, 1.6, 4.1)

  // banheiro do casal: duas cubas, chuveiro amplo e mármore
  a.o.caixa('marmore', [-3.95, -0.3], [y, y + 1.25], [-5.08, -5.065])
  gabinete(em(a, [-2.95, y, -5.32], N_Z), 1.1)
  gabinete(em(a, [-1.25, y, -5.32], N_Z), 1.1)
  chuveiro(a, -3.93, -2.6, -8.83, -7.3, 'x0', 'z0')
  vasoSanitario(em(a, [-0.6, y, -8.2], N_X))
  a.tapetes.push({ pos: [-2.1, y + 0.02, -6.4], w: 1.6, d: 0.7, giro: 0, tipo: 'juta' })

  // closet com ilha
  araraRoupas(em(a, [-0.05, y, -6.95], P_X), 3.4)
  araraRoupas(em(a, [1.2, y, -8.6], P_Z), 2.4)
  const ilha = em(a, [1.45, y, -6.6])
  ilha.caixa('madeira', -0.4, 0.4, 0, 0.88, -0.75, 0.75)
  ilha.caixa('marmore', -0.44, 0.44, 0.88, 0.92, -0.79, 0.79)
  for (const z of [-0.5, 0, 0.5]) ilha.caixa('latao', 0.4, 0.42, 0.62, 0.64, z - 0.12, z + 0.12)
  em(a, [1.4, y, -5.5]).cil('tecidoRosa', 0, 0, 0.42, 0, 0.3, 0.3, 20)

  // corredor de entrada da suíte
  a.tapetes.push({ pos: [3.3, y + 0.006, -7.0], w: 0.8, d: 3.4, giro: 0, tipo: 'listrado' })
  a.quadros.push({ pos: [3.93, y + 1.6, -7.0], w: 0.6, h: 0.8, giro: N_X, variante: 3 })

  // ---------- quartos das crianças ----------
  // cada quarto tem 2 paredes pintadas em degradê (uma cor se misturando na outra) + desenhos na parede
  const janela = (em: number): Abertura => ({ em, larg: 1.6, y0: 0.9, y1: 2.5, tipo: 'janela' })
  const pintar = (mat: string, eixo: Eixo, fixo: number, de: number, ate: number, abs: Abertura[] = []) =>
    parede(a.o, mat, eixo, fixo, de, ate, y + 0.12, Y2 - 0.1, 0.01, abs)
  const desenho = (d: Desenho, pos: V3, w: number, h: number, giro: number) => a.quadros.push({ pos, w, h, giro, variante: 0, desenho: d })

  // ---------- quarto do menino 1: azul-céu que vira verde-menta ----------
  pintar('degradeCeu', 'x', -1.078, -8.99, -5.28)
  pintar('degradeCeu', 'z', -8.994, -6.8, -1.08, [janela(-4.9)])
  desenho('montanhas', [-7.25, y + 1.95, -1.084], 2.7, 1.6, N_Z)
  desenho('balao', [-8.99, y + 1.95, -3.1], 1.2, 1.2, P_X)
  desenho('foguete', [-8.99, y + 1.75, -6.2], 0.85, 0.85, P_X)
  camaCasinha(em(a, [-7.95, y, -1.65], P_X), 1.0, 2.0, 'tecidoCeu', ['tecidoMenta', 'brinquedoA'])
  escrivaninha(em(a, [-7.9, y, -6.45], P_Z), 1.2, 'tecidoMenta')
  a.tapetes.push({ pos: [-7.1, y + 0.006, -3.9], w: 2.5, d: 2.5, giro: 0, tipo: 'infantil', cores: ['#8FD3E8', '#FFFFFF', '#A6DCCF', '#FFE08A', '#FFFFFF'] })
  pufe(em(a, [-6.0, y, -2.4]), 'tecidoAmarelo')
  estanteInfantil(em(a, [-5.45, y, -3.4], N_X), 1.6)
  brinquedos(em(a, [-7.1, y, -4.1], 0.4))
  ursinho(em(a, [-6.6, y, -3.4], -0.6))
  lustreNuvem(em(a, [-7.1, 0, -3.9]), Y2 - 0.42, Y2)
  bandeirinhas(a, [-8.95, y + 2.6, -5.8], [-5.35, y + 2.6, -1.15], ['brinquedoC', 'brinquedoA', 'brinquedoD', 'linho'])
  cortina(em(a, [-8.88, y, -4.9], P_X), -1.0, 0, 0.5, 0.05, 2.75)
  cortina(em(a, [-8.88, y, -4.9], P_X), 1.0, 0, 0.5, 0.05, 2.75)
  chuveiro(a, -X9, -7.95, -8.93, -7.95, 'x0', 'z0')
  vasoSanitario(em(a, [-8.62, y, -7.25], P_X))
  gabinete(em(a, [-7.4, y, -7.12], N_Z), 0.8)

  // ---------- quarto do menino 2: pêssego que vira amarelo-sol ----------
  pintar('degradeSol', 'x', -0.922, -8.99, -5.28)
  pintar('degradeSol', 'z', -8.994, -0.92, 4.8, [janela(1.5)])
  desenho('sol', [-8.99, y + 2.05, 3.65], 1.3, 1.3, P_X)
  desenho('nuvem', [-8.99, y + 2.3, -0.3], 0.8, 0.8, P_X)
  camaCasinha(em(a, [-7.95, y, 3.65], P_X), 1.0, 2.0, 'tecidoAmarelo', ['tecidoPessego', 'tecidoCeu'])
  tenda(em(a, [-6.0, y, 0.15]))
  const bau = em(a, [-6.1, y, 4.35], N_Z)
  bau.caixa('madeiraBranca', -0.4, 0.4, 0, 0.45, -0.22, 0.22)
  brinquedos(em(a, [-6.4, y + 0.45, 4.35], PI))
  escrivaninha(em(a, [-5.9, y, 6.72], N_Z), 1.0, 'tecidoAmarelo')
  a.tapetes.push({ pos: [-7.1, y + 0.006, 1.9], w: 2.5, d: 2.5, giro: 0, tipo: 'infantil', cores: ['#FFD86E', '#FFFFFF', '#FFB77A', '#9FD9C4', '#FFF3C4'] })
  estanteInfantil(em(a, [-5.45, y, 2.5], N_X), 1.2)
  pufe(em(a, [-7.3, y, 1.1]), 'tecidoCeu')
  lustreNuvem(em(a, [-7.1, 0, 1.9]), Y2 - 0.42, Y2)
  bandeirinhas(a, [-8.95, y + 2.6, -0.97], [-5.35, y + 2.45, 2.2], ['brinquedoA', 'brinquedoB', 'linho', 'brinquedoD'])
  cortina(em(a, [-8.88, y, 1.5], P_X), -1.0, 0, 0.5, 0.05, 2.75)
  cortina(em(a, [-8.88, y, 1.5], P_X), 1.0, 0, 0.5, 0.05, 2.75)
  chuveiro(a, -X9, -7.95, 5.95, 6.98, 'x0', 'z1')
  vasoSanitario(em(a, [-8.62, y, 5.3], P_X))
  gabinete(em(a, [-7.4, y, 5.12], P_Z), 0.8)

  // ---------- quarto da menina: rosa que vira lilás ----------
  pintar('degradeFlor', 'x', -1.078, 5.28, 8.99)
  pintar('degradeFlor', 'z', 8.994, -6.8, -1.08, [janela(-4.9)])
  desenho('lua', [6.55, y + 1.95, -1.084], 1.5, 1.5, N_Z)
  desenho('estrelas', [8.99, y + 2.15, -2.65], 1.7, 1.1, N_X)
  desenho('borboletas', [8.99, y + 1.85, -6.25], 0.8, 0.8, N_X)
  cama(em(a, [8.0, y, -2.6], N_X), 1.1, 2.0, 'tecidoRosa', 'madeiraBranca', ['tecidoLilas', 'linho', 'tecidoRosa'])
  const dossel = em(a, [8.55, y, -2.6])
  dossel.cil('voil', 0, 1.2, 2.55, 0, 0.85, 0.12, 20, true)
  dossel.aro('latao', 0, 2.55, 0, 0.12, 0.015)
  ursinho(em(a, [8.45, y + 0.62, -2.35], N_X))
  criado(em(a, [8.7, y, -1.5], N_X))
  casinhaBoneca(em(a, [5.75, y, -1.5], P_X))
  escrivaninha(em(a, [7.8, y, -6.45], P_Z), 1.1, 'tecidoLilas')
  const esp = em(a, [7.8, y, -6.72])
  esp.disco('espelho', 0, 1.55, 0.01, 0.32, 0.015)
  esp.aro('latao', 0, 1.55, 0.02, 0.33, 0.02)
  a.tapetes.push({ pos: [7.0, y + 0.006, -3.9], w: 2.5, d: 2.5, giro: 0, tipo: 'infantil', cores: ['#F2A6C1', '#FFFFFF', '#DCCDF5', '#FFE3EC', '#FFFFFF'] })
  pufe(em(a, [6.1, y, -4.9]), 'tecidoLilas')
  estanteInfantil(em(a, [5.45, y, -3.35], P_X), 1.2)
  lustreNuvem(em(a, [7.0, 0, -3.9]), Y2 - 0.42, Y2)
  bandeirinhas(a, [5.35, y + 2.6, -5.8], [8.95, y + 2.6, -1.15], ['brinquedoE', 'linho', 'brinquedoF', 'brinquedoA'])
  cortina(em(a, [8.88, y, -4.9], N_X), -1.0, 0, 0.5, 0.05, 2.75)
  cortina(em(a, [8.88, y, -4.9], N_X), 1.0, 0, 0.5, 0.05, 2.75)
  chuveiro(a, 7.95, X9, -8.93, -7.95, 'x1', 'z0')
  vasoSanitario(em(a, [8.62, y, -7.25], N_X))
  gabinete(em(a, [7.4, y, -7.12], N_Z), 0.8)

  // ---------- quarto de hóspedes ----------
  a.tapetes.push({ pos: [7.0, y + 0.006, 3.3], w: 2.4, d: 2.8, giro: PI / 2, tipo: 'persa' })
  cama(em(a, [7.9, y, 3.3], N_X), 1.6, 2.1, 'linho', 'tecidoCreme', ['tecidoSalvia', 'tecidoCreme'])
  criado(em(a, [8.7, y, 2.2], N_X))
  criado(em(a, [8.7, y, 4.4], N_X))
  poltrona(em(a, [5.95, y, 0.0], P_X + 0.5), 'tecidoCreme', 'tecidoTerracota')
  luminariaPe(em(a, [5.6, y, -0.6]))
  a.quadros.push({ pos: [8.93, y + 1.85, 3.3], w: 0.9, h: 0.6, giro: N_X, variante: 0 })
  chuveiro(a, 7.95, X9, 5.95, 6.98, 'x1', 'z1')
  vasoSanitario(em(a, [8.62, y, 5.3], N_X))
  gabinete(em(a, [7.4, y, 5.12], P_Z), 0.8)
}
