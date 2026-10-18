<!-- src/input/README.md -->

Entrada física e comandos de luta. A tradução de teclado/gamepad para direções e botões deve permanecer independente das regras de combate; consultar `base.md`, seções 3 e 17.1.

O buffer mantém os últimos 30 frames. A janela provisória de simultaneidade é de 3 frames. `resolveCommand` exige correspondência exata do conjunto de botões, prefere comandos com mais botões e depois variantes com direção explícita; empates mantêm a ordem declarada. O reconhecimento de chords entre frames ainda precisa ser ligado ao fluxo de ataque.
