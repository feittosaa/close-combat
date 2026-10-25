# Close Combat

Jogo de luta 2D para navegador, em reinício de design. Leia [base.md](./base.md) como raiz das regras, [pipeline.md](./pipeline.md) para execução e [docs/ci-cd.md](./docs/ci-cd.md) para entrega.

## Direção atual

Um shoto sem nome, identidade ou animações definidos será a referência de balanceamento dos nove arquétipos. O usuário criará os combos manualmente, um por um. Referência de combate: anime fighter, especialmente Guilty Gear Xrd Rev 2. Referência artística: Hades, em linguagem original descrita em [identidade-visual.md](./identidade-visual.md).

O novo design retira todos os personagens, combos e números de balanceamento anteriores, remove parry e prevê combo breaker, drive rush, rage e rage art. As regras dessas mecânicas ainda precisam ser definidas. O foco é treino, PvP local e Arcade PvE; manter a ferramenta de treino de combos com novas receitas homologadas.

**O runtime ainda executa o protótipo anterior**, com elenco, comandos e tutoriais antigos. Esta entrega atualiza documentação; não apresenta essas remoções ou mecânicas novas como implementadas. A migração é a primeira etapa da pipeline.

## Executar e validar

Requisitos: Node.js e npm.

```sh
npm ci
npm run dev
```

```sh
npm test -- --run
npm run build
git diff --check
```

O menu do protótipo oferece Arcade, Luta PvP, Modo Treino, tutoriais e configurações. Controles padrão atuais: P1 `WASD` e ataques `J/K/N/M`; P2 setas e numérico `1–4`. Há remapeamento em Configurações. Esses controles não fecham os comandos do novo shoto ou dos recursos novos.

No treino atual: pausa com `P`, passo com `.`, reset com `F2`, adversário com `G`, caixas com `H`, entradas com `I` e velocidade com `L`. O treino compartilha o motor da partida; adaptações do conteúdo permanecem pendentes.

## Documentação

- [Bancada do shoto](./docs/shoto-balanceamento.md): processo de recebimento e homologação de cada receita; sem catálogo novo.
- [Ideias futuras](./docs/ideias-futuras.md): história, loop temporal, roguelike, cartas, bênçãos e trinkets fora do escopo atual.
- Documentos auxiliares antigos têm aviso de histórico/protótipo. Números e aprovações antigos não validam a nova direção; versões anteriores dos documentos principais permanecem no Git.

## Arquitetura preservada

TypeScript, Vite, Phaser e Vitest. `src/engine/` contém simulação, combate, dados de personagens e colisões; `src/input/` trata entradas; `src/rendering/` e `src/scenes/` apresentam o jogo; `src/training/` e `src/ui/` fornecem treino e interface; `src/assets/` guarda recursos visuais.

A lógica roda em 60 Hz, independente da renderização. Colisões e tempos pertencem ao motor. Infraestrutura poderá ser reaproveitada, com conteúdo adaptado à nova base.
