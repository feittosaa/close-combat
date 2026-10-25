> **Transição de design — 25/10/2026.** Este README descreve o protótipo ainda presente no código/assets. Referências a elenco, combos, balanceamento, parry e etapas antigas não definem o novo design. Seguir [base.md](../../base.md) e [pipeline.md](../../pipeline.md); preservar infraestrutura útil, retirar o conteúdo anterior e não produzir novos assets para o elenco removido.

# Treino

`TrainingSession` guarda opções locais de inspeção e transforma comportamentos simples do segundo jogador em `FrameInput`. Não causa contato, força bloqueio, altera alcance ou ignora recuperação.

O estado, o passo único, o reset e a distância inicial são oferecidos pela própria `Simulation`. `FightScene` conecta teclado e renderização; `TrainingHud` apenas lê o snapshot. Todos os comportamentos usam o livro do personagem e o parser normal.

Opções atuais: alvo parado com recuperação automática (padrão), segundo jogador manual, guarda alta, guarda baixa e repetições dos socos `1`/`2` ou chute `4` a cada 120 frames lógicos. O modo de guarda só envia direção defensiva enquanto há ataque e evita manter `B` depois da recuperação, para não recuar sem contato. Alterar a opção não interrompe ataques já iniciados.

O treino não encerra rounds por KO ou tempo; reset restaura vida e posições. A vida automática pode ser alternada e restaura a saúde após 90 frames lógicos com ambos no chão, sem ataque, agarrão ou stun; conserva estados e contatos. `F4` alterna distância de reinício entre 96/144/220; reset descarta comandos e exige soltar teclas mantidas.

`L` alterna 100%/50%/25% de velocidade de apresentação, sem alterar frames do livro. O passo único descarta reprocessamento de um mesmo evento DOM. `lastMoves` conserva os dados do último golpe para inspeção depois da ação. HUD técnico e entradas só são criados/exibidos no treino.

Gravação, respostas automáticas no primeiro frame legal, buffer de punição, posições nas bordas e exercícios guiados permanecem pendentes na Etapa 4 de `pipeline.md`.

## Pause e catálogo

P/Esc pausa todos os modos locais. No treino, `PauseMenu` lê `fighterMoveList`: categorias disponíveis, busca, escolha de P1/P2, ficha e receita fixada. A UI não força acertos nem despacha strings automaticamente. Ao retomar, limpar teclado e histórico de reconhecimento sem alterar o estado de combate. Novos personagens devem declarar seus próprios livros e receitas.


## Histórico de entradas

`InputHistory` conserva até 24 mudanças por jogador; a UI mostra 10, mais recente primeiro. Cada mudança guarda frame inicial, duração, direção, conjunto de botões e facing. A grade e histórico mostram direção física; o catálogo usa setas relativas ao oponente. Solturas/neutros e acordes ficam explícitos. O relógio parado não cria entradas; reset limpa o histórico. Cores seguem a ação, teclas seguem o layout configurado.


`TutorialSession.ts` define as lições básicas e desafios por personagem. Observa frames lógicos, entradas e contatos reais; aprova uma receita somente na ordem e no mesmo combo. A interface em `TutorialHud` apenas apresenta o progresso. R reinicia a tentativa; Enter avança após sucesso. Progresso não é persistido entre sessões.

Depois de uma queda, todos os comportamentos automáticos enviam uma nova entrada de `B` para levantar em guarda, respeitando a proteção da simulação. Soltam a direção entre tentativas para não depender de uma guarda já mantida. Retomam guarda/repetição após levantar. O modo segundo jogador permanece manual.

O alvo parado volta ao idle depois da levantada e aceita novos acertos normalmente. `G` alterna comportamentos; “Segundo jogador” precisa ser selecionado explicitamente para usar o teclado de P2 e preservar a levantada manual. O clipe de queda de Tester termina na pose de chão (108); os quadros 109/110 de levantada não são reproduzidos enquanto o estado ainda é caído.
