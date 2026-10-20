# Treino

`TrainingSession` guarda opções locais de inspeção e transforma comportamentos simples do segundo jogador em `FrameInput`. Não causa contato, força bloqueio, altera alcance ou ignora recuperação.

O estado, o passo único, o reset e a distância inicial são oferecidos pela própria `Simulation`. `FightScene` conecta teclado e renderização; `TrainingHud` apenas lê o snapshot. Todos os comportamentos usam o livro do personagem e o parser normal.

Opções atuais: segundo jogador manual, guarda alta, guarda baixa e repetição do soco `2` a cada 120 frames. O modo de guarda só envia direção defensiva enquanto há ataque e evita manter `B` depois da recuperação, para não recuar sem contato. Alterar a opção não interrompe ataques já iniciados.

O treino não encerra rounds por KO ou tempo; reset restaura vida e posições. Gravação, respostas automáticas no primeiro frame legal, buffer de punição, recuperação automática e exercícios guiados são tarefas pendentes da Etapa 4 de `pipeline.md`.
