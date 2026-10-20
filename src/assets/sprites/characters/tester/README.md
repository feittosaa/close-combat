# Tester — sprites

O jogo carrega `tester-atlas-v01.png`, um atlas PNG RGBA com células de 256×256. A lista de clipes e os intervalos estão em `src/assets/animations/tester.json`.

`tester_walk.png` alimenta `walk` ao avançar. `tester_defense.png` alimenta `defense` ao recuar e ao defender. Os demais clipes incluem `idle`, `dash`, `crouch`, `jump`, `light-punch`, `heavy-punch` e `test-electric-palm` (especial). `tester_turnaround.png` fica como referência estática e não entra no atlas. As sequências de dash e especial continuam da linha superior para a inferior.

As imagens-fonte estão preservadas neste diretório. Hitboxes e hurtboxes são dados de combate e não devem ser inferidas da arte.
