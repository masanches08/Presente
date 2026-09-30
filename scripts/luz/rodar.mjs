// Refaz a luz assada da casa inteira (precisa do Blender instalado).
// Uso: npm run luz            → qualidade final (2048 px, 128 amostras; uns 30 min)
//      npm run luz -- 2048 16 → rascunho rápido
// Rode de novo sempre que mudar a casa (paredes, móveis…): senão o site volta pra luz normal sozinho.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const [res = '2048', amostras = '128'] = process.argv.slice(2)
const blender =
  process.env.BLENDER ??
  ['C:/Program Files/Blender Foundation/Blender 5.2/blender.exe', '/Applications/Blender.app/Contents/MacOS/Blender', 'blender'].find(
    (c) => c === 'blender' || fs.existsSync(c),
  )

const rodar = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', shell: false })
const t0 = Date.now()
console.log('1/4 exportando a casa…')
rodar(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/luz/exportar.ts'])
console.log(`2/4 assando a luz no Blender (${res} px, ${amostras} amostras)…`)
rodar(blender, ['--background', '--factory-startup', '--python', 'scripts/luz/assar.py', '--', res, amostras])
console.log('3/4 tirando o chuvisco…')
rodar(blender, ['--background', '--factory-startup', '--python', 'scripts/luz/limpar.py'])
console.log('4/4 gerando os arquivos do site…')
rodar(process.execPath, ['scripts/luz/finalizar.mjs'])
console.log(`pronto em ${Math.round((Date.now() - t0) / 1000)} s`)
