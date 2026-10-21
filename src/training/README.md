# Treino

`TrainingSession` guarda opções locais de inspeção e transforma comportamentos simples do segundo jogador em `FrameInput`. Não causa contato, força bloqueio, altera alcance ou ignora recuperação.

O estado, o passo único, o reset e a distância inicial são oferecidos pela própria `Simulation`. `FightScene` conecta teclado e renderização; `TrainingHud` apenas lê o snapshot. Todos os comportamentos usam o livro do personagem e o parser normal.

Opções atuais: segundo jogador manual, guarda alta, guarda baixa e repetições dos socos `1`/`2` ou chute `4` a cada 120 frames lógicos. O modo de guarda só envia direção defensiva enquanto há ataque e evita manter `B` depois da recuperação, para não recuar sem contato. Alterar a opção não interrompe ataques já iniciados.

O treino não encerra rounds por KO ou tempo; reset restaura vida e posições. A vida automática pode ser alternada e restaura a saúde após 90 frames lógicos com ambos no chão, sem ataque, agarrão ou stun; conserva estados e contatos. `F4` alterna distância de reinício entre 96/144/220; reset descarta comandos e exige soltar teclas mantidas.

`L` alterna 100%/50%/25% de velocidade de apresentação, sem alterar frames do livro. O passo único descarta reprocessamento de um mesmo evento DOM. `lastMoves` conserva os dados do último golpe para inspeção depois da ação. HUD técnico e entradas só são criados/exibidos no treino.

Gravação, respostas automáticas no primeiro frame legal, buffer de punição, posições nas bordas e exercícios guiados permanecem pendentes na Etapa 4 de `pipeline.md`.
