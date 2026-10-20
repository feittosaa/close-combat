# Dummy — entrega de sprites

Coloque aqui `dummy-atlas-v01.png` (spritesheet PNG RGBA transparente, com células fixas e sem trim/padding automático) e `dummy-source.*` (arquivo editável `.aseprite`, `.kra`, `.psd` ou equivalente). Mantenha escala única, personagem voltado para a direita, pés alinhados na mesma base e quadros ordenados da esquerda para a direita e de cima para baixo. Registre dimensões reais e índices inclusivos dos clipes em `src/assets/animations/dummy.json`; remova todos os `null` ao entregar a folha.

Forneça clipes para `idle`, `walk`, `crouch`, `defense`, `dash`, `jump`, `hit`, `blockstun`, `grabbed`, `knockdown` e `throw-recovery`, além das três fases `startup|active|recovery` para cada golpe no livro do Dummy. Avanço e recuo usam o mesmo `walk`, espelhado no recuo. `defense` é a guarda; `blockstun` é a reação após contato bloqueado. A lista de golpes e as hitboxes/hurtboxes são independentes do atlas. Não desenhe colisores dentro da arte.

O manifesto ainda é um modelo sem dimensões/índices válidos e não está disponível no menu. Siga [`docs/animacao.md`](../../../../../docs/animacao.md) para concluir a entrega; não carregar o JSON incompleto como se fosse um personagem com arte pronta.

O Dummy ainda usa formas provisórias no jogo; o diretório não contém sprites carregáveis.
