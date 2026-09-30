# Nosso Lar ♡

Um presente em código.

## Comandos

| Comando | O que faz |
|---|---|
| `npm install` | instala as dependências (só na primeira vez) |
| `npm run dev` | abre o site em modo desenvolvimento (http://localhost:5173) |
| `npm test` | roda os testes do contador |
| `npm run build` | gera a versão final em `dist/` |

## Supabase (login dos dois + datas sincronizadas)

Sem configurar nada, o site funciona em **modo local** (as datas ficam só no aparelho).
Pra ligar a sincronização:

1. Crie uma conta em https://supabase.com → **New project** (anote a senha do banco; região São Paulo).
2. No projeto: **SQL Editor → New query**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. **Authentication → Sign In / Providers**: desligue **"Allow new users to sign up"** (sem cadastro público).
4. **Authentication → Users → Add user → Create new user**: crie a sua conta e a dela (marque *Auto Confirm User*).
5. **Project Settings → API**: copie a *Project URL* e a chave *anon public*.
6. Na pasta do projeto, copie `.env.example` para `.env.local` e cole as duas chaves.
7. Pare e rode de novo o `npm run dev`. Agora aparece a tela de login.

## Fotos

**Pelo próprio site:** no fim da galeria tem a polaroid "adicionar momento". Escolhe uma foto (ou um vídeo: vira o primeiro frame), arrasta/aproxima pra escolher o recorte 3:4, escreve uma legenda se quiser e "guardar no varal". Dá pra apagar pela lixeirinha (só as fotos mandadas pelo site).
- Com o Supabase configurado: as fotos vão pra uma pasta privada na nuvem e aparecem nos dois celulares. (Rode o `supabase/schema.sql` inteiro de novo: ele cria a tabela `fotos` e a pasta.)
- Sem o Supabase: ficam guardadas só no aparelho que mandou (pra testar).

**Pelo computador (as fotos fixas do site):**

1. Coloque as fotos na pasta `fotos-originais/` (crie na raiz do projeto)
2. Rode `npm run fotos`: elas viram `.webp` em 3:4 (recortadas, sem borda) em `public/fotos/`, mais uma versão menor em `public/fotos/mini/` (galeria e varal). Recorte escolhido na mão: `RECORTES` em `scripts/converter-fotos.mjs`
3. Cole a lista que aparece no terminal em `src/data/fotos.ts` e escreva as legendas

## Onde editar

- `src/config.ts`: apelido dela, iniciais
- `src/data/datas.ts`: datas iniciais do calendário
- `src/data/cartas.ts`: as cartinhas e as "abra quando…" (troque os `TODO`)
- `src/data/tour.ts`: nome e frase de cada parada do tour da casa
- `src/data/casamento.ts`: nome e frase de cada parada do passeio pelo casamento
- `src/data/luademel.ts`: a lua de mel (tudo bloqueado: as 3 coisas escondidas, hoje "???", e o tempo de desbloqueio)
- `src/mundo/pontos.ts`: nome e frase de cada coisa do mundinho 3D (casa, altar, correio, árvore, relógio de sol, barquinho da lua de mel e a quadra de futevôlei, que é só pra olhar)

## Como o cenário 3D está organizado

- `src/mundo/Mundo.tsx`: o palco (câmera, efeitos de luz, qualidade automática)
- `src/mundo/Cena.tsx`: onde cada coisa fica no campo (casa, árvores, altar, correio...)
- `src/mundo/terreno.ts`: o formato do chão (colinas, praia, mar) e por onde passa o caminho
- `src/mundo/Grama.tsx`, `Flores.tsx`, `Arvore.tsx`: a natureza (grama e flores balançando com o vento, árvores, coqueiros, borboletas)
- `src/mundo/objetos/`: a casa, o altar do casamento, o correio, a árvore das fotos, o relógio de sol, a cerquinha, o barquinho da lua de mel e a quadra de futevôlei (`QuadraFtv.tsx`, na areia ao lado do casamento: 18 x 9 m, rede a 2,20 m, com cara de escolinha de praia: postes de eucalipto, fitas amarelas, bolas de futevôlei, tenda, cadeiras, bandeira do Brasil e bandeiras "FUTEVÔLEI")
- `src/mundo/texturas.ts`: todas as texturas (telhas, folhas, flores...) são desenhadas no próprio código
- `public/models/`: pássaros animados (modelos oficiais do three.js, licença MIT)

## A lua de mel

Hoje é só a tela "Bloqueado" (`src/pages/LuaDeMel.tsx`): tempo de desbloqueio "???", 3 cards trancados e "sem dicks".
Atrás dela fica, desfocado, o cenário 3D das casinhas sobre o mar (`src/luademel/`). Os outros cenários de lá (lagoa, templo, jardim das águas, mesa de comida) estão guardados, sem uso.

## Texturas de verdade (`public/texturas/`)

Fotos escaneadas do [Poly Haven](https://polyhaven.com) (licença CC0, uso livre): reboco, piso de madeira, carvalho, trama de tecido, telhado, tijolo, concreto, areia e grama.
Pra trocar ou adicionar: edite a lista em `scripts/baixar-texturas.mjs` e rode `node scripts/baixar-texturas.mjs` (baixa em 1k e converte pra `.webp`). No código, `texReal(id, 'diff' | 'nor' | 'rough')` em `src/lib/texturasReais.ts`.

## A casa por dentro (`src/casa/`)

- `construcao.ts`: a planta (paredes, portas, janelas, escada, mezanino, telhado)
- `decoracao.ts`: onde fica cada móvel, cômodo por cômodo
- `moveis.ts`: como cada móvel é feito (sofá, cama, sinuca, banheira…)
- `exterior.ts`: calçada com os pezinhos e o quintal americano (cerca, área coberta, piscina com hidromassagem, fogueira, cozinha externa, playground, cama elástica, horta, rede)
- `texturasInfantis.ts`: paredes em degradê e desenhos dos quartos das crianças
- `paradas.ts`: onde a câmera fica em cada parada do tour

## O casamento (`src/casamento/`)

- `montar.ts`: onde fica cada coisa (altar, corredor, cadeiras, tenda, mesas, pista, lounge, bar)
- `Ambiente.tsx`: céu do pôr do sol, mar, areia, morros e veleiro
- `CenaCasamento.tsx`: materiais, luzes e velas
- `CasamentoTour.tsx`: o passeio (câmeras de cada parada)
