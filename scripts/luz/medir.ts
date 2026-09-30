import { montarCasa } from '../../src/casa/geometria'
const casa = montarCasa()
for (const [andar, g] of Object.entries(casa)) {
  let tot = 0
  const linhas: string[] = []
  for (const [mat, geo] of Object.entries(g.pecas)) {
    const n = geo.index ? geo.index.count : geo.attributes.position.count
    tot += n
    linhas.push(`${mat}:${n / 3}`)
  }
  console.log(andar, 'triângulos', tot / 3, '|', linhas.join(' '))
}
