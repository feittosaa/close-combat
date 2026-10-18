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

Pressione **Enter** ou clique no menu para abrir a cena de luta provisória. Na cena de luta, **Esc** retorna ao menu. Os bonecos e o HUD são formas temporárias; o combate ainda não está implementado.

## Comandos

- `npm run dev` — servidor de desenvolvimento Vite.
- `npm run test` — executa os testes da lógica pura (ainda não há casos implementados).
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
