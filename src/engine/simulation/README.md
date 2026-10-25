# Simulação

`Simulation` usa `FixedStepClock` em 60 Hz e não depende de Phaser. `advance` e `stepFrame` percorrem as mesmas regras. Snapshot copia estado, caixas, eventos do último frame e até 20 contatos dos últimos 180 frames; não expõe referências mutáveis ao motor.

A base contém locomoção, salto/gravidade, guarda, quatro básicos e rounds. Ataques não cancelam, não repetem por botão mantido e não aceitam entradas durante lock. Treino desativa encerramento por KO/tempo e pode restaurar vida após 90 frames sem golpe/stun, preservando registros; reset limpa estado e entradas e permite distância própria do treino.

Raiz de regras: [base.md](../../../base.md).
