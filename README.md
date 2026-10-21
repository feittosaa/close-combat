# Close Combat

> **Entrega e versionamento:** seguir o [manifesto de CI/CD](./docs/ci-cd.md): branches por objetivo, testes antes do push, integração em `development` e releases posteriores em `main` com tags.

Protótipo de jogo de luta 2D para navegador. O documento raiz de design e implementação é [`base.md`](./base.md); consulte-o antes de alterar regras, arquitetura ou escopo do jogo.

O roteiro de implementação por etapas está em [`pipeline.md`](./pipeline.md). Ele organiza o trabalho sem substituir as regras e decisões de `base.md`.

## Requisitos

- Node.js e npm

## Desenvolvimento

```sh
npm install
npm run dev
```

Escolha **Arcade**, **Luta PvP**, **Modo Treino** ou **Configurações**. Use clique ou setas/Enter; atalhos do menu: `A`, `V`, `T`, `C`. Depois escolha **Ayla**, **Gris** ou **Tester** para P1 e confirme o cenário **Cais**. P2 é definido pelo modo. Nos menus, **Esc** retorna à tela anterior. Durante a luta, **P** ou **Esc** abre o pause; o retorno ao menu fica dentro dele.

No **PvP**, P2 usa os controles do segundo jogador. No **Arcade**, o computador enfrenta P1 com comandos normais do próprio livro de golpes; vencer libera o próximo adversário com Enter. O **Treino** mantém pausa, avanço por frame, dados de golpes e adversário controlável. **Configurações** possui uma página reservada, ainda sem opções, como solicitado. Direções, sequência de entradas e colisões aparecem apenas no treino.

Ayla usa um livro de combate com as 135 entradas adaptadas da referência Kazuya/T8, posturas e 36 receitas de combo. O pause do treino permite consultar golpes por categoria, buscar comandos e fixar uma receita. Arte provisória e lacunas de dados estão registradas em [`docs/ayla-combate.md`](./docs/ayla-combate.md). Gris possui quatro especiais, com tesoura gigante dourada sempre empunhada e um projétil separado de energia de corte. Cada lutador tem livro, tamanho, hurtboxes e velocidades próprios; cada golpe e projétil tem sua hitbox. Quantidade de especiais é livre por personagem, de zero a N.

O primeiro cenário é **Cais**, composto de fundo, chão e caixas. A câmera acompanha os lutadores: o fundo se move mais lentamente, enquanto caixas e chão mantêm escala e movimento comuns. O sistema aceita qualquer quantidade de camadas por cenário; estrutura, manifesto e instruções de entrega estão em [`src/assets/scenes/README.md`](./src/assets/scenes/README.md).

Na revisão atual, as cargas foram reduzidas em 24% com apoio preservado no chão, e a célula visual do Tester passou de 220 para 256 (cerca de 16% maior), aproximando o corpo desenhado da hurtbox existente. Alcance, dano, velocidades e tempos dos golpes permanecem configurados no motor.

### Controles provisórios

- **Jogador 1:** mover/saltar/agachar com `A`, `D`, `W`, `S`; ataques `1`–`4` em `J`, `K`, `N`, `M`.
- **Jogador 2:** mover/saltar/agachar com as setas; ataques `1`–`4` no teclado numérico `1`–`4`.
- `F`/`B` duas vezes rapidamente no chão ativa dash; dash não funciona no ar. O recuo e o backdash usam clipes próprios mantendo a orientação ao oponente; Ayla diferencia `1` de `f+1` ao avançar. Segurar `B`/`DB` durante um golpe adversário ativa guarda parada a qualquer distância (`B` para altos/médios, `DB` para baixos). Agachar também impede a locomoção. O bloqueio de um golpe do Tester desloca o defensor 4 unidades; um golpe fora de alcance não o desloca.
- No Tester, `F/B+1`, `DF/DB+2`, `D+3` e `UF/UB+4` executam variantes direcionais. Gris mantém quatro ataques em pé, quatro agachados e quatro aéreos. Ayla usa o novo livro contextual (incluindo FC/WS, strings e elétrico); consulte-o no pause. `P`/`Esc` abre ou fecha o pause.
- `1+2` e `3+4` executam chords de teste; pressionamentos são agrupados se ocorrerem dentro de 3 frames. Golpes de um botão que possam formar esses chords aguardam o fim da janela; combinações sem golpe cadastrado são ignoradas.
- `F,F+2` e `D,DF+3` são sequências provisórias de Tester; `R` reinicia a luta depois do resultado final.
- Ayla e Gris usam `1+3` para agarrar e `2+4` para quebrar. Tester possui agarrões em `1+3` e `2+4`, com quebra pela combinação oposta. Segure `F` para lançar à frente ou `B` para lançar para trás; a janela de quebra é de 6 frames. No Tester, `F,N,DF+2` executa o especial de teste; pressionar `2` até um frame após `DF` ativa a variante precisa. Seu jab pode cancelar para o soco ascendente ou o especial depois de acertar.

O mapeamento, os golpes e seus valores são provisórios, conforme [`base.md`](./base.md). Combinações simultâneas sem variante cadastrada são ignoradas. O parry é testável contra o golpe elegível `test-jab`: pressione `B` no frame do contato para atordoar o atacante por 18 frames; fora da janela, o ataque resolve normalmente.

### Especiais de Ayla e Gris

Direções relativas ao adversário: `D` baixo, `DF` baixo/frente, `F` frente, `DB` baixo/trás e `B` trás. Na posição inicial de P1, `D,DF,F+1` corresponde a `S → S+D → D+J`. As diagonais fazem parte do comando.

| Comando | Ayla | Gris |
| --- | --- | --- |
| D,DF,F + 1 | Onda Carmesim — projétil baixo | Arco Dourado — energia de corte |
| D,DF,F + 2 | Investida Escarlate | Passo de Seda |
| D,DB,B + 3 | Giro Ascendente | Tesoura Ascendente |
| D,DB,B + 4 | Chute de Avanço | Corte Régio |
| D,DF,F + 1+2 | Erupção Rubra | Sem golpe cadastrado |

Projéteis continuam viajando depois da recuperação ou interrupção do emissor. Defesa, vida útil, colisão entre projéteis e caixas pertencem ao motor. Nenhum efeito decide o dano pela imagem. Os números atuais ainda precisam de balanceamento de jogo.

Atlas, nomes, prompts e instruções: [Ayla](src/assets/sprites/characters/ayla/README.md) e [Gris](src/assets/sprites/characters/gris/README.md). Com o servidor aberto, a [revisão de atlas](http://localhost:5173/src/dev/animation-review.html) permite conferir poses, fases e espelhamento sem modificar o combate.

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

### Controles e treino

Abra **Configurações** no menu ou **Controles** no pause para remapear direções e ataques dos dois jogadores. O jogo salva as teclas neste navegador; o catálogo mostra setas e as teclas escolhidas, com cores fixas por ação. O histórico do treino mostra as mudanças recentes, solturas, acordes e duração em frames. Após um dash para frente, manter avanço inicia corrida. O enquadramento amplia os lutadores no combate próximo. Detalhes em [fluidez e treino](./docs/fluidez-corrida-treino.md).
