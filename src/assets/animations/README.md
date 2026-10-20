# Manifestos de animação

Um manifesto por personagem; o atlas correspondente fica em `../sprites/characters/<id>/`. O contrato completo e a matriz de produção estão em [`docs/animacao.md`](../../../docs/animacao.md).

- Células reais e uniformes em `frameSize`; `displaySize` mantém escala uniforme nos dois eixos.
- `start`/`end` inclusivos; `frames` explícito tem precedência e determina a ordem das poses.
- `frameRate` define cadência padrão; `frameDurations` permite holds em frames lógicos. Em fases de ataque, os valores funcionam como pesos dentro do tempo definido pelo golpe.
- `repeat: -1` repete; `0` toca uma vez e mantém a pose final. A reprodução depende do frame da simulação, sem temporizador independente do Phaser.
- `sourceFacesLeft` declara a direção original de cada clipe. Não inverter o atlas inteiro: há clipes com orientações diferentes.
- `airbornePoses` liga a pose à subida, ao ápice e à descida da trajetória lógica.
- `moveClips` associa cada golpe a um conjunto de três fases. Golpes sem cobertura são recusados pela validação; aproximações são declaradas em `provisionalMoves`.

Estados atuais: `idle`, `walk`, `dash`, `jump`, `crouch`, `defense`, `hit`, `blockstun`, `grabbed`, `knockdown` e `throw-recovery`. O recuo usa `walk` espelhado. Defesa baixa reutiliza `crouch`. Chaves de ataque: `{id}-{nomeDoClipe}-{startup|active|recovery}`.

O Tester preserva 31 faixas de origem como `tester-source-row-00` a `tester-source-row-30`, com 399 quadros válidos. Esses clipes servem à revisão e não são escolhidos aleatoriamente durante a luta. O Dummy possui apenas dados mínimos de desenvolvimento; sua arte e sua seleção no menu ainda não estão integradas.

Tempo de combate, dano, hitboxes, hurtboxes, deslocamento e regras de stun pertencem ao motor, nunca a este manifesto.
