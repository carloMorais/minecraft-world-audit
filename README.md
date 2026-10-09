# mcx — extrator de dados de mundos Minecraft Bedrock

**Use online:** https://minecraft-world-audit.vercel.app — arraste seu `.mcworld` na página. O arquivo não sai do seu computador.

Lê arquivos `.mcworld` (ou a pasta de um mundo) e extrai tudo o que o Bedrock grava no save. São duas formas de uso, com o mesmo código de leitura:

- **Interface web** (React + Vite): roda **100% no navegador**. O arquivo é processado localmente num Web Worker e nada é enviado a servidor nenhum.
- **CLI** em Node.js, sem dependências em tempo de execução.

## Interface web

```bash
npm install
npm run dev        # http://localhost:5173 — arraste o .mcworld na página
npm run build      # gera web/dist/: site estático, pode ser aberto em qualquer hospedagem estática
npm run preview    # serve o build localmente
```

Páginas: visão geral, mapa aéreo interativo (terreno renderizado bloco a bloco, com jogadores, camas, mortes, portais, vilas e pets marcados), jogadores (inventário no estilo do jogo com tooltips, ender chest, vida, fome, XP), mobs e entidades (pets e donos, aldeões e trocas), baús e containers, busca de itens pelo mundo inteiro, censo e busca de blocos, biomas, vilas, mapas de papel renderizados, scoreboard, estruturas, explorador NBT e exportação em JSON.

Análises: detecção automática de bases (com o que cada uma guarda), patrimônio estimado por jogador e por base, coleções (discos, moldes, fragmentos, cores, mobs domados, biomas), aldeões e as trocas mais baratas, organização dos baús, equipamento gasto ou sem Remendo, lag e farms por chunk, minérios por altura, rede de portais do Nether, camadas de calor no mapa e comparação entre dois saves do mesmo mundo.

## CLI

```bash
node bin/mcx.js summary "samples/Lua Minguante.mcworld"
node bin/mcx.js inventory mundo.mcworld
node bin/mcx.js find-item mundo.mcworld "netherite|elytra"
node bin/mcx.js find-block mundo.mcworld "beacon" --dim overworld
node bin/mcx.js blocks mundo.mcworld --box -100,-64,-100,100,320,100
node bin/mcx.js export mundo.mcworld ./saida          # tudo em JSON
node bin/mcx.js map mundo.mcworld mapa.png --dim nether   # mapa aéreo em PNG
node bin/mcx.js players mundo.mcworld --json --raw    # NBT completo
```

`node bin/mcx.js --help` lista todos os comandos (`level`, `players`, `inventory`, `entities`, `containers`, `signs`, `blocks`, `find-block`, `find-item`, `items`, `biomes`, `chunks`, `chunk`, `maps`, `villages`, `portals`, `scoreboard`, `structures`, `misc`, `keys`, `raw`, `export`, e as análises `bases`, `lag`, `ores`, `storage`, `gear`, `wealth`, `portal-links`).

## O que é extraído

| Fonte | Informações |
|---|---|
| `level.dat` | nome, seed, modo, dificuldade, hardcore, dias jogados (`Time/24000`), tempo de jogo aproximado (`currentTick/20`), última vez jogado, vezes aberto, versão, regras de jogo, experimentos, clima, se as conquistas estão bloqueadas (cheats/criativo) |
| `~local_player`, `player_server_*`, `player_*` | inventário, armadura, mão secundária, ender chest (com encantamentos, nomes, durabilidade, conteúdo de shulkers), posição, dimensão, vida, fome, XP, efeitos, ponto de spawn, local da última morte, permissões, receitas desbloqueadas, tags, IDs de conta (MSA) |
| `actorprefix*` + `digp*` | todas as entidades: tipo, posição, dimensão, nome, vida, dono (pets), profissões e trocas de aldeões, equipamento, itens dropados |
| chunk tag 49 (block entities) | baús, barris, shulkers, funis, fornalhas, placas, estantes, spawners, beacons, camas, baús de loot nunca abertos |
| chunk tag 47 (subchunks) | censo completo de blocos por dimensão, busca de blocos com coordenadas, blocos tipicamente colocados por jogadores (heurística) |
| chunk tag 43 (Data3D) | censo de biomas, área explorada |
| outras chaves | scoreboard (inclui estatísticas de addons), mapas, vilas, portais do Nether, luta contra o Ender Dragon, estruturas salvas, ticking areas, eventos de mobs, wandering trader, packs |

### O que **não** existe no arquivo

- **Mobs mortos, blocos minerados/colocados e outras estatísticas vanilla**: o Bedrock não grava estatísticas no mundo. Só aparecem quando um addon as registra no scoreboard (`mcx scoreboard`).
- **Progresso de conquistas**: fica na conta Xbox/Microsoft. O mundo só indica se elas ainda podem ser obtidas.
- **Quem colocou cada bloco**: não é registrado. `blocks` mostra uma estimativa baseada em blocos que a geração natural não produz.

## Como funciona

O núcleo (`src/`) é compartilhado entre a CLI e o navegador. Tudo é implementado em `src/format/`: leitor ZIP, LevelDB no formato da Mojang (blocos zlib e raw-deflate, MANIFEST e WAL), NBT little-endian e decodificadores de subchunk e Data3D. No navegador, `zlib` é substituído por `fflate` (`web/src/shims/zlib.js`) e `Buffer` pelo pacote `buffer`. Testes: `npm test`.

Referências do formato: [Bedrock Edition level format (Minecraft Wiki)](https://minecraft.wiki/w/Bedrock_Edition_level_format), [rbedrock](https://cran.r-universe.dev/rbedrock/doc/manual.html).
