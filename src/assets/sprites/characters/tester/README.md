# Tester — entrega de sprites

Coloque os arquivos deste personagem somente neste diretório:

- `tester-atlas-v01.png`: spritesheet PNG RGBA transparente usada pelo jogo.
- `tester-source.*`: arquivo editável original (`.aseprite`, `.kra`, `.psd` ou equivalente).

O atlas deve usar células de tamanho fixo, sem trim automático e sem padding entre células. Organize os frames da esquerda para a direita e de cima para baixo; declare dimensões da célula e intervalos inclusivos em `src/assets/animations/tester.json`. Use a mesma escala em todas as poses, mantenha o personagem voltado para a direita e alinhe os pés à mesma base em todas as células. Não inclua fundo, hitboxes ou hurtboxes na arte.

Inclua loops `idle`, `walk`, `crouch` e `block`; poses/trechos para `dash`, `jump`, `hit`, `blockstun`, `grabbed` e `knockdown`; e três clipes por golpe do livro de Tester, com chaves `{fighterId}-{moveId}-{startup|active|recovery}`. Se uma ação ainda não tiver arte, deixe o clipe sem cadastro para usar o placeholder.

Atualize o manifesto com dimensões reais, índices dos frames, velocidade em FPS e repetição. Não deixe `null` em uma exportação pronta. Hitboxes de ataque e hurtboxes são dados de combate em `src/engine/data/characters.ts` e `moves.ts`; não são inferidas dos pixels.

O atlas inicial `tester-atlas-v01.png` contém os clipes `idle`, `walk` e `test-jab` recortados das três fontes PNG incluídas. As imagens de origem foram preservadas como `tester-source-idle.png`, `tester-source-walk.png` e `tester-source-lp.png`. O restante das ações ainda usa o placeholder.
