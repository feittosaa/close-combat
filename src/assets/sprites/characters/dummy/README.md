# Dummy — entrega de sprites

Coloque aqui `dummy-atlas-v01.png` (spritesheet PNG RGBA transparente, com células fixas e sem trim/padding automático) e `dummy-source.*` (arquivo editável `.aseprite`, `.kra`, `.psd` ou equivalente). Mantenha escala única, personagem voltado para a direita, pés alinhados na mesma base e quadros ordenados da esquerda para a direita e de cima para baixo. Registre dimensões reais e índices inclusivos dos clipes em `src/assets/animations/dummy.json`; remova todos os `null` ao entregar a folha.

Forneça clipes para `idle`, `walk`, `crouch`, `block`, `dash`, `jump`, `hit`, `blockstun`, `grabbed` e `knockdown`, além de `{fighterId}-{moveId}-{startup|active|recovery}` para cada golpe no livro do Dummy. A lista de golpes e as hitboxes/hurtboxes são independentes do atlas. Não desenhe colisores dentro da arte.

O Dummy ainda usa formas provisórias no jogo; o diretório não contém sprites carregáveis.
