// Baixa modelos 3D escaneados de verdade (Poly Haven, licença CC0) e deixa leves pro celular:
// texturas em .webp de no máximo 1024 px, malha simplificada e comprimida (meshopt).
// Uso: node scripts/baixar-modelos.mjs
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// id do Poly Haven → [nome no site, quanto simplificar a malha (1 = nada), tamanho máx. da textura]
const LISTA = {
  potted_plant_01: ['planta-arvore', 0.35, 1024], // planta grande num vaso de barro (sala)
  potted_plant_02: ['planta-costela', 0.45, 1024], // folhas grandes num vaso de barro (hall)
  potted_plant_04: ['suculenta', 1, 512], // suculenta num vasinho branco (em cima dos móveis)
  ceramic_vase_01: ['vaso-branco', 1, 512], // vaso de cerâmica branco
  ceramic_vase_03: ['vaso-alto', 1, 512], // vaso de cerâmica alto
}

const tmp = path.resolve('.modelos')
const destino = path.resolve('public/modelos')
fs.mkdirSync(tmp, { recursive: true })
fs.mkdirSync(destino, { recursive: true })

for (const [id, [nome, simplificar, textura]] of Object.entries(LISTA)) {
  const final = path.join(destino, `${nome}.glb`)
  if (fs.existsSync(final)) continue
  const info = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json()
  const g = info.gltf['1k'].gltf
  const pasta = path.join(tmp, id)
  fs.mkdirSync(pasta, { recursive: true })
  const baixar = async (url, arq) => {
    const alvo = path.join(pasta, arq)
    fs.mkdirSync(path.dirname(alvo), { recursive: true })
    fs.writeFileSync(alvo, Buffer.from(await (await fetch(url)).arrayBuffer()))
  }
  await baixar(g.url, `${id}.gltf`)
  for (const [arq, f] of Object.entries(g.include ?? {})) await baixar(f.url, arq)

  const cli = ['node_modules/@gltf-transform/cli/bin/cli.js']
  const entrada = path.join(pasta, `${id}.gltf`)
  const passo = path.join(pasta, `${id}.passo.glb`)
  const args = ['optimize', entrada, passo, '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', String(textura)]
  if (simplificar < 1) args.push('--simplify', 'true', '--simplify-ratio', String(simplificar), '--simplify-error', '0.002')
  else args.push('--simplify', 'false')
  execFileSync(process.execPath, [...cli, ...args], { stdio: 'inherit' })
  fs.copyFileSync(passo, final)
  console.log('✓', `${nome}.glb`, Math.round(fs.statSync(final).size / 1024) + ' KB')
}
