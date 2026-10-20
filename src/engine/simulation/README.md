# Simulação

`Simulation` é independente do Phaser e usa `FixedStepClock` a 60 Hz. `advance` lê entradas a cada passo lógico; `stepFrame` executa o mesmo caminho uma única vez e limpa a fração acumulada do relógio para o treino pausado.

`CharacterState.stateStartedFrame` registra a entrada no modo/postura atual e reinicia em nova reação de contato. A apresentação usa esse número e o frame do snapshot para amostrar poses. Tempos de ataque continuam em `attack.elapsedFrames` e no livro do personagem.

O snapshot expõe eventos do último passo e um histórico limitado aos 32 contatos recentes. Cada entrada inclui frame e evento, evitando perder feedback quando a renderização avança mais de um passo de lógica. Reset de luta/round limpa o histórico.

`SimulationOptions.training` desativa encerramento por cronômetro/KO para exercícios; não muda dano, stun, geometria, comandos ou guarda. `initialDistance` permite spawn curto para treino; ausente, preserva o posicionamento da partida. Vida é restaurada por reset; recuperação automática ainda não existe.

Regras e critérios de evolução ficam em `base.md`; buffer de punição, combos completos e quedas/levantadas continuam pendentes na pipeline.
