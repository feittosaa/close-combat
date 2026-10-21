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

Pressione **Enter** para uma partida local ou **T** para o treino. Na cena, **Esc** retorna ao menu. **Tester** é o personagem provisório dos dois jogadores, com atlas e animações próprios. Os botões `1`–`4` executam golpes de teste; direções, botões e sequência recente aparecem apenas no treino. A partida normal mantém a interface de luta limpa. No treino, as hitboxes/hurtboxes mostram a geometria real da simulação e podem ser ocultadas.

O primeiro cenário é **Cais**, composto de fundo, chão e caixas. A câmera acompanha os lutadores: o fundo se move mais lentamente, enquanto caixas e chão mantêm escala e movimento comuns. O sistema aceita qualquer quantidade de camadas por cenário; estrutura, manifesto e instruções de entrega estão em [`src/assets/scenes/README.md`](./src/assets/scenes/README.md).

Na revisão atual, as cargas foram reduzidas em 24% com apoio preservado no chão, e a célula visual do Tester passou de 220 para 256 (cerca de 16% maior), aproximando o corpo desenhado da hurtbox existente. Alcance, dano, velocidades e tempos dos golpes permanecem configurados no motor.

### Controles provisórios

- **Jogador 1:** mover/saltar/agachar com `A`, `D`, `W`, `S`; ataques `1`–`4` em `J`, `K`, `N`, `M`.
- **Jogador 2:** mover/saltar/agachar com as setas; ataques `1`–`4` no teclado numérico `1`–`4`.
- `F`/`B` duas vezes rapidamente no chão ativa dash; dash não funciona no ar. O recuo usa a caminhada espelhada. Segurar `B`/`DB` durante um golpe adversário ativa guarda parada a qualquer distância (`B` para altos/médios, `DB` para baixos). Agachar também impede a locomoção. O bloqueio de um golpe do Tester desloca o defensor 4 unidades; um golpe fora de alcance não o desloca.
- `F/B+1`, `DF/DB+2`, `D+3` e `UF/UB+4` executam variantes direcionais; `D+1`, `D+2` e `D+4` são golpes abaixados. Pressione `1`–`4` durante o salto para golpes aéreos. `Esc` volta ao menu.
- `1+2` e `3+4` executam chords de teste; pressionamentos são agrupados se ocorrerem dentro de 3 frames. Golpes de um botão que possam formar esses chords aguardam o fim da janela; combinações sem golpe cadastrado são ignoradas.
- `F,F+2` e `D,DF+3` são sequências provisórias de Tester; `R` reinicia a luta depois do resultado final.
- `1+3` e `2+4` iniciam agarrões; segure `F` para lançar à frente ou `B` para lançar para trás (sem direção, lança à frente), e quebre com a combinação oposta em até 6 frames. `F,N,DF+2` executa o especial de teste; pressionar `2` até um frame após `DF` ativa a variante precisa. O jab pode cancelar para o soco ascendente ou o especial depois de acertar.

O mapeamento, os golpes e seus valores são provisórios, conforme [`base.md`](./base.md). Combinações simultâneas sem variante cadastrada são ignoradas. O parry é testável contra o golpe elegível `test-jab`: pressione `B` no frame do contato para atordoar o atacante por 18 frames; fora da janela, o ataque resolve normalmente.

### Treino

| Tecla | Ação |
| --- | --- |
| `T` no menu | Abrir treino com cronômetro livre e distância curta |
| `P` | Pausar/retomar lógica e animações |
| `.` | Avançar exatamente um frame enquanto pausado |
| `F2` | Reiniciar vida, posições, comandos e histórico |
| `G` | Alternar adversário manual, guardas e repetição dos socos `1`/`2` ou chute `4` |
| `H` | Mostrar/ocultar hitboxes, hurtboxes e pivô dos pés |
| `I` | Mostrar/ocultar painéis de entrada |
| `L` | Velocidade 100%, 50% ou 25%, preservando a lógica de 60 Hz |
| `F3` | Alternar vida automática após 90 frames lógicos sem ataque/stun |
| `F4` | Reiniciar com distância 96, 144 ou 220 |

O treino mostra preparo/atividade/recuperação, distância, stun e vantagem **do atacante**: positivo favorece quem atacou. Contatos reais podem indicar punição de bloqueio, punição de erro ou contra-ataque; o rótulo não acrescenta dano. O treino usa os mesmos dados e regras da partida e não encerra rounds por tempo ou vida zero. `F2` restaura a vida e conserva as opções. A vida automática começa ligada; não interrompe golpes nem limpa o histórico. O último golpe conserva comando, tempos, altura e dano no painel, mesmo depois de terminar. Ainda não há gravação livre de sequências.

O agachamento tem correção uniforme de escala, o chute forte em pé usa o chute alto escolhido e socos aéreos reutilizam um soco de punho fechado. Os strikes têm mais preparo, +1F ativo e recuperação maior; a vantagem muda junto. As cores do corpo e a geometria não pulsam por fase. Loops, reações e golpes seguem frames da simulação. O atlas ainda contém poses aproximadas e reutilizações declaradas em `provisionalMoves`; a cobertura de todos os golpes não significa animação final aprovada. Processo e matriz de revisão: [`docs/animacao.md`](./docs/animacao.md).

## Comandos

- `npm run dev` — servidor de desenvolvimento Vite.
- `npm run test` — executa os testes da lógica pura.
- `npm run build` — verificação TypeScript e build web de produção.
- `npm run preview` — prévia local do build.

## Estrutura inicial

```text
src/
  assets/             # recursos visuais e sonoros originais
    animations/       # sequências de quadros exportadas
    sprites/          # folhas de personagens, efeitos e interface
    scenes/           # fundos e objetos de cenários
  engine/
    characters/       # estado dos lutadores
    combat/           # regras de combate
    collision/        # hitboxes, hurtboxes e interseções
    data/             # tipos e dados de personagens/golpes
    simulation/       # relógio e orquestração em passo fixo
  input/              # teclado, buffer e entradas abstratas
  rendering/          # representação Phaser separada da lógica
    animations/       # associação de estados de combate às animações Phaser
    stages/           # catálogo de cenários, camadas e câmera com parallax
  scenes/             # classes Phaser de menu e luta
  training/           # comportamentos de treino que produzem entradas normais
  tests/              # testes da lógica pura
  ui/                 # HUD e interface
  main.ts             # configuração e inicialização do Phaser
```

A lógica de combate permanece separada das cenas e da renderização, seguindo a arquitetura e o plano de fases de `base.md`.

## Estado e próximos passos

A pipeline atual preserva a fundação existente e prioriza animação coerente e punições, seguidas de combos/recuperação e fluxo de jogo. Consulte [`pipeline.md`](./pipeline.md) para dependências e critérios de saída e [`docs/revisao-2026-10-20.md`](./docs/revisao-2026-10-20.md) para o registro desta entrega.
