# Manifestos de animação

Guarde um manifesto JSON por personagem (`tester.json`, `dummy.json`) nesta pasta; o atlas PNG correspondente fica em `../sprites/characters/{id}/`. Use dimensões reais e positivas em `frameSize`. Cada item de `clips` declara `key`, índices `start`/`end` inclusivos, `frameRate` em quadros por segundo e `repeat` (`-1` para loop, `0` para tocar uma vez).

As chaves de estado usam `{id}-idle`, `-walk-forward`, `-walk-backward`, `-dash`, `-jump`, `-crouch`, `-block`, `-hit`, `-blockstun`, `-grabbed` e `-knockdown`. `walk-forward` acompanha a caminhada na direção do oponente; `walk-backward`, o recuo. `block` representa a pose de defesa quando um ataque colide com a hurtbox durante a defesa ativa; `blockstun` representa a reação ao bloqueio. Para cada golpe no livro do personagem, cadastre `{id}-{moveId}-startup`, `-active` e `-recovery`. Deixe ausentes os clipes sem arte; não use índices vazios ou `null` em uma exportação pronta. As células do atlas têm tamanho uniforme, não são trimadas e conservam a origem alinhada aos pés. Consulte os READMEs em `../sprites/characters/` para detalhes de exportação.

O mapeamento entre animação e modo de combate pertence a `src/rendering/animations/`; o manifesto não pode alterar frames de combate, hitboxes ou hurtboxes.

O manifesto de Tester registra as faixas da folha-fonte sem nome como `tester-source-row-00` a `tester-source-row-30`. Os clipes de estado selecionam os quadros identificados visualmente para caminhada, guarda, agachamento, salto, queda e golpes.

Cada clipe pode declarar `frames` para uma sequência explícita, com precedência sobre `start`/`end`, e `sourceFacesLeft` para arte desenhada à esquerda. `moveClips` associa IDs de golpes do personagem aos nomes dos clipes. As fases de ataque usam os frames da simulação para distribuir suas poses durante toda a fase lógica.
