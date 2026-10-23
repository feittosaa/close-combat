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

Escolha **Arcade**, **Luta PvP**, **Modo Treino**, **Tutorial Básico**, **Tutorial de Combos** ou **Configurações**. Use clique ou setas/Enter; atalhos do menu: `A`, `V`, `T`, `B`, `O`, `C`. Depois escolha **Ayla**, **Gris** ou **Tester** para P1 e confirme o cenário **Cais**. P2 é definido pelo modo. Nos menus, **Esc** retorna à tela anterior. Durante a luta, **P** ou **Esc** abre o pause; o retorno ao menu fica dentro dele.

No **PvP**, P2 usa os controles do segundo jogador. No **Arcade**, o computador enfrenta P1 com comandos normais do próprio livro de golpes; vencer libera o próximo adversário com Enter. O **Treino** mantém pausa, avanço por frame, dados de golpes e adversário controlável. **Configurações** possui uma página reservada, ainda sem opções, como solicitado. Direções, sequência de entradas e colisões aparecem apenas no treino.

Ayla tem um [catálogo autoral de 80 entradas](./docs/ayla-golpes.md). Ayla e Gris usam 18 bases (seis em pé, seis agachadas, seis aéreas), seis levantamentos, quatro especiais diretos, dois agarrões e ultimate. Andar para frente/trás não troca o golpe. Os livros, caixas, velocidades e números continuam próprios de cada personagem. O pause do treino permite buscar golpes e fixar uma receita; animações reaproveitadas e balanceamento são provisórios.

No **Tutorial Básico**, execute cada ação para avançar: movimento, ataques, defesa, launcher, projétil, agarrões e ultimate. No **Tutorial de Combos**, conecte `1,1,2 → 1+2` e depois `1,1,2 → 1,1,1+2`. Enter ou clique avança após sucesso; R repete a tentativa; Esc abre o pause. Os tutoriais oferecem Ayla e Gris, usam o mesmo motor e não aprovam combos só por digitar.

O primeiro cenário é **Cais**, composto de fundo, chão e caixas. A câmera acompanha os lutadores: o fundo se move mais lentamente, enquanto caixas e chão mantêm escala e movimento comuns. O sistema aceita qualquer quantidade de camadas por cenário; estrutura, manifesto e instruções de entrega estão em [`src/assets/scenes/README.md`](./src/assets/scenes/README.md).

Na revisão atual, as cargas foram reduzidas em 24% com apoio preservado no chão, e a célula visual do Tester passou de 220 para 256 (cerca de 16% maior), aproximando o corpo desenhado da hurtbox existente. Alcance, dano, velocidades e tempos dos golpes permanecem configurados no motor.

### Controles provisórios

- **Jogador 1:** mover/saltar/agachar com `A`, `D`, `W`, `S`; ataques `1`–`4` em `J`, `K`, `N`, `M`.
- **Jogador 2:** mover/saltar/agachar com as setas; ataques `1`–`4` no teclado numérico `1`–`4`.
- `F`/`B` duas vezes rapidamente no chão ativa dash; dash não funciona no ar. O recuo e o backdash usam clipes próprios mantendo a orientação ao oponente; Ayla e Gris mantêm o mesmo `1` ao avançar ou recuar. Segurar `B`/`DB` durante um golpe adversário ativa guarda parada a qualquer distância (`B` para altos/médios, `DB` para baixos). Agachar também impede a locomoção. O bloqueio de um golpe do Tester desloca o defensor 4 unidades; um golpe fora de alcance não o desloca.
- Ayla/Gris: `1`, `2`, `3`, `4`, `1+2`, `3+4` em cada postura. Baixo/diagonais baixas selecionam agachados; salte primeiro para usar aéreos. Strings pedem toques separados e permitem escolhas de conclusão.
- Acordes agrupam pressionamentos separados por até 3F; botão mantido não repete; combinações sem cadastro são ignoradas.
- `1+3` agarra à frente e quebra com `1`; `2+4` troca os lados e quebra com `2`. A janela de quebra é 14F. Direção mantida não muda o agarrão.
- Ultimate: `1+2+3+4`, com até 25% de vida e uma tentativa por round. Bloqueável, sem QTE.
- Tester preserva variantes e comandos históricos como ferramenta de diagnóstico, fora da baseline autoral.
O mapeamento, os golpes e seus valores são provisórios, conforme [`base.md`](./base.md). Combinações simultâneas sem variante cadastrada são ignoradas. O parry é testável contra o golpe elegível `test-jab`: pressione `B` no frame do contato para atordoar o atacante por 18 frames; fora da janela, o ataque resolve normalmente.

### Especiais de Ayla e Gris

Especiais usam acordes diretos; nenhuma sequência de direções é necessária.

| Comando | Ayla | Gris |
| --- | --- | --- |
| `1+4` | Onda rubra — projétil baixo | Arco dourado — energia de corte |
| `2+3` | Investida escarlate | Passo de seda |
| `1+2+3` | Ascensão rubra — launcher | Tesoura ascendente — launcher |
| `2+3+4` | Queda escarlate | Talho real |

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

Na regra atual, strikes só recuperam se forem bloqueados. Acerto ou erro liberam a próxima ação depois da atividade; as janelas de strings continuam independentes. Suspensão e queda foram ajustadas e verificadas em replays: veja [combos livres](./docs/combos-livres.md).
