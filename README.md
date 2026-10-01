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
4. **Entrar sem e-mail e senha**: o site pergunta "Nome do amor da minha vida:". Pra isso, crie o usuário `nos@nossolar.app` em **Authentication → Users → Add user** (qualquer senha provisória, *Auto Confirm User*) e depois rode `supabase/entrar-sem-senha.sql` no SQL Editor. As respostas aceitas ficam na função `chave_do_lar` desse arquivo (dá pra mudar e rodar de novo).
5. **Project Settings → API**: copie a *Project URL* e a chave *anon public*.
6. Na pasta do projeto, copie `.env.example` para `.env.local` e cole as duas chaves.
7. Pare e rode de novo o `npm run dev`. Agora aparece a tela de login.

## Fotos

**Pelo próprio site:** no fim da galeria tem a polaroid "adicionar lembrança". Escolhe uma foto (ou um vídeo: vira o primeiro frame), arrasta/aproxima pra escolher o recorte 3:4, escreve uma legenda se quiser e "guardar no varal". Dá pra apagar pela lixeirinha (só as fotos mandadas pelo site).
- Com o Supabase configurado: as fotos vão pra uma pasta privada na nuvem e aparecem nos dois celulares. (Rode o `supabase/schema.sql` inteiro de novo: ele cria a tabela `fotos` e a pasta.)
- Sem o Supabase: ficam guardadas só no aparelho que mandou (pra testar).

**Pelo computador (as fotos fixas do site):**

1. Coloque as fotos na pasta `fotos-originais/` (crie na raiz do projeto)
2. Rode `npm run fotos`: elas viram `.webp` em 3:4 (recortadas, sem borda) em `public/fotos/`, mais uma versão menor em `public/fotos/mini/` (galeria e varal). Recorte escolhido na mão: `RECORTES` em `scripts/converter-fotos.mjs`
3. Cole a lista que aparece no terminal em `src/data/fotos.ts` e escreva as legendas

## Onde editar

- `src/config.ts`: apelido dela, iniciais, dia do aniversário dela (29/10)
- Dias especiais: no aniversário dela (29/10) e em todo dia 24, o site abre com uma comemoração (`src/components/Celebracao.tsx` e `CeuDeFesta.tsx`). Pra ver sem esperar o dia: `http://localhost:5173/?hoje=2026-10-29` ou `?hoje=2026-10-24`
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

A tela "Bloqueado" tem 3 segredos pra ela achar pelo site, sem dica nenhuma (`src/data/luademel.ts`: o que cada um revela e onde fica escondido).
- **Segredo 1, a arara:** de vez em quando passa uma arara no mundo com uma cartinha amarrada no pezinho (`src/mundo/AraraPista.tsx`). Tocou nela: festa e "um segredo foi desbloqueado" (`src/components/PistaEncontrada.tsx`). Na próxima vez que ela entra na lua de mel, o cadeado daquele card quebra e mostra o passeio.
- **Chance da arara aparecer:** `CHANCE_ARARA` em `src/data/luademel.ts` (⚠️ está 0.9 pra testar; o combinado é 0.1)
- **Testar de novo do zero:** abra o site com `?resetar-pistas` (apaga os achados deste aparelho e do Supabase)
- O que foi achado fica salvo no aparelho e no Supabase (tabela `desbloqueios`, em `supabase/desbloqueios.sql`)

## Texturas de verdade (`public/texturas/`)

Fotos escaneadas do [Poly Haven](https://polyhaven.com) (licença CC0, uso livre): reboco, piso de madeira, carvalho, trama de tecido, telhado, tijolo, concreto, areia e grama.
Pra trocar ou adicionar: edite a lista em `scripts/baixar-texturas.mjs` e rode `node scripts/baixar-texturas.mjs` (baixa em 1k e converte pra `.webp`). No código, `texReal(id, 'diff' | 'nor' | 'rough')` em `src/lib/texturasReais.ts`.

## Luz "assada" da casa (Blender)

Dentro de casa é sempre **dia claro**: todo o interior recebe uma luz branca forte e por igual (não é realista de propósito: tudo tem que aparecer bem). Por cima entram dois "temperos" calculados no **Blender** e guardados em imagens (`public/luz/`): um pouco da luz de verdade (o sol no chão, os abajures acesos) e uma sombrinha suave nos cantos e embaixo dos móveis (pra ter noção de espaço). O lado de fora (paredes externas, telhado) fica com o sol de verdade.

- **Sempre que mudar a casa** (paredes, móveis em `src/casa/`), rode `npm run luz` (uns 30 min, precisa do Blender instalado). Se esquecer, nada quebra: as peças que mudaram só voltam pra luz normal.
- Rascunho rápido pra testar: `npm run luz -- 2048 16`
- Os passos ficam em `scripts/luz/`: `exportar.ts` (casa → Blender), `assar.py` (calcula a luz), `limpar.py` (tira o chuvisco), `finalizar.mjs` (gera os arquivos do site)
- Claridade: `DIA` (luz de dia nas paredes/chão), `DIA_OBJETOS` (móveis e objetos) e `TEMPERO` (quanto da luz do Blender entra) em `src/casa/luzAssada.ts`

## Modelos de verdade

- `public/modelos/`: plantas e vasos escaneados (Poly Haven, CC0), baixados e comprimidos (malha simplificada, texturas pequenas) por `node scripts/baixar-modelos.mjs`. Na casa, são posicionados com `modelo(...)` em `src/casa/decoracao.ts`

## Leve de propósito (`src/lib/leve.tsx`)

O site tem que rodar liso no celular dela, então:
- **Sem pós-processamento**: a cor viva e as bordas escurecidas são feitas pelo navegador (CSS), não pelo 3D
- **Resolução contida**: no máximo 1,25x no celular e 1,5x no computador (baixa sozinha se o aparelho sofrer)
- **30 quadros por segundo no celular** (60 no computador): fica suave e esquenta bem menos
- **Sombra congelada**: o sol não se mexe, então a sombra só é redesenhada quando a câmera muda de cômodo
- **Texturas pequenas** (`public/texturas`, ~0,4 MB no total) e **luz da casa já calculada** (`public/luz`, ~0,6 MB)
- A tela da lua de mel usa uma **foto** do cenário 3D desfocada (`public/luademel/fundo.webp`), sem 3D rodando
- Pra medir: abra com `?debug` e rode `__gl.at(-1).info.render` no console (desenhos e triângulos por quadro)

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
