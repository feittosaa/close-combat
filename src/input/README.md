> **Transição de design — 25/10/2026.** Este README descreve o protótipo ainda presente no código/assets. Referências a elenco, combos, balanceamento, parry e etapas antigas não definem o novo design. Seguir [base.md](../../base.md) e [pipeline.md](../../pipeline.md); preservar infraestrutura útil, retirar o conteúdo anterior e não produzir novos assets para o elenco removido.

<!-- src/input/README.md -->

Entrada física e comandos de luta. A tradução de teclado/gamepad para direções e botões deve permanecer independente das regras de combate; consultar `base.md`, seções 3 e 17.1.

O buffer mantém os últimos 30 frames. A janela provisória de simultaneidade é de 3 frames e a janela de sequências é de 12 frames. `CommandParser` reconhece chords cadastrados, aguarda a janela antes de disparar um golpe simples que possa formar chord e consome combinações sem golpe cadastrado. As sequências direcionais relativas também são reconhecidas; variantes com execução precisa têm prioridade quando o último botão chega dentro da janela configurada. `resolveCommand` é reservado à seleção sem histórico de sequência.


`controlSettings.ts` valida/persiste os layouts dos dois jogadores; `KeyboardInput` lê esses layouts sem alterar IDs de botões do motor. `CombatCommandParser` atende livros ricos por personagem; Ayla tem buffer de fim de recuperação de 8F, sem cancelar o ataque em andamento. `ui/commandNotation.ts` formata somente a apresentação. `training/InputHistory` é um histórico separado por mudanças, com duração e facing; não substituir o parser por esse histórico.
