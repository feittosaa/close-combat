# Close Combat

Protótipo de jogo de luta 2D para navegador. O documento raiz de design e implementação é [`base.md`](./base.md); consulte-o antes de alterar regras, arquitetura ou escopo do jogo.

O roteiro de implementação por etapas está em [`pipeline.md`](./pipeline.md). Ele organiza o trabalho sem substituir as regras e decisões de `base.md`.

## Requisitos

- Node.js e npm

## Desenvolvimento

```sh
npm install
npm run dev
```

Pressione **Enter** ou clique no menu para abrir a cena de luta. Na cena, **Esc** retorna ao menu. Os lutadores são formas provisórias. Os botões `1`–`4` executam golpes de teste; direções, botões e sequência recente aparecem nos indicadores de cada jogador. As hitboxes piscam durante os frames ativos e usam a geometria da simulação.

### Controles provisórios

- **Jogador 1:** mover/saltar/agachar com `A`, `D`, `W`, `S`; ataques `1`–`4` em `J`, `K`, `N`, `M`.
- **Jogador 2:** mover/saltar/agachar com as setas; ataques `1`–`4` no teclado numérico `1`–`4`.
- `F`/`B` duas vezes rapidamente no chão ativa dash; dash não funciona no ar. `B` defende altos/médios e `DB` defende baixos.
- `F/B+1`, `DF/DB+2`, `D+3` e `UF/UB+4` executam variantes direcionais; `D+1`, `D+2` e `D+4` são golpes abaixados. Pressione `1`–`4` durante o salto para golpes aéreos. `Esc` volta ao menu.

O mapeamento, os golpes e seus valores são provisórios, conforme [`base.md`](./base.md). Combinações simultâneas sem variante cadastrada e comandos especiais ainda não estão implementados.

## Comandos

- `npm run dev` — servidor de desenvolvimento Vite.
- `npm run test` — executa os testes da lógica pura.
- `npm run build` — verificação TypeScript e build web de produção.
- `npm run preview` — prévia local do build.

## Estrutura inicial

```text
src/
  assets/             # recursos visuais e sonoros originais
  engine/
    characters/       # estado dos lutadores
    combat/           # regras de combate
    collision/        # hitboxes, hurtboxes e interseções
    data/             # tipos e dados de personagens/golpes
    simulation/       # relógio e orquestração em passo fixo
  input/              # teclado, buffer e entradas abstratas
  rendering/          # representação Phaser separada da lógica
  scenes/             # menu e cena provisória de luta
  tests/              # testes da lógica pura
  ui/                 # HUD e interface
  main.ts             # configuração e inicialização do Phaser
```

A lógica de combate será implementada separada das cenas e da renderização, seguindo a arquitetura e o plano de fases de `base.md`.
