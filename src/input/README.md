<!-- src/input/README.md -->

Entrada física e comandos de luta. A tradução de teclado/gamepad para direções e botões deve permanecer independente das regras de combate; consultar `base.md`, seções 3 e 17.1.

O buffer mantém os últimos 30 frames. A janela provisória de simultaneidade é de 3 frames e a janela de sequências é de 12 frames. `CommandParser` reconhece chords cadastrados, aguarda a janela antes de disparar um golpe simples que possa formar chord e consome combinações sem golpe cadastrado. As sequências direcionais relativas também são reconhecidas; variantes com execução precisa têm prioridade quando o último botão chega dentro da janela configurada. `resolveCommand` é reservado à seleção sem histórico de sequência.
