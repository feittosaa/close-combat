# Manifestos de animação

Guarde um manifesto JSON por personagem (`tester.json`, `dummy.json`, `guilty-gear.json`) nesta pasta; o atlas PNG correspondente fica em `../sprites/characters/{id}/`. Use dimensões reais e positivas em `frameSize`. Cada item de `clips` declara `key`, índices `start`/`end` inclusivos, `frameRate` em quadros por segundo e `repeat` (`-1` para loop, `0` para tocar uma vez).

As chaves de estado usam `{id}-idle`, `-walk-forward`, `-walk-backward`, `-dash`, `-jump`, `-crouch`, `-block`, `-hit`, `-blockstun`, `-grabbed` e `-knockdown`. `walk-forward` acompanha a caminhada na direção do oponente; `walk-backward`, o recuo. `block` representa a pose de defesa quando um ataque colide com a hurtbox durante a defesa ativa; `blockstun` representa a reação ao bloqueio. Para cada golpe no livro do personagem, cadastre `{id}-{moveId}-startup`, `-active` e `-recovery`. Deixe ausentes os clipes sem arte; não use índices vazios ou `null` em uma exportação pronta. As células do atlas têm tamanho uniforme, não são trimadas e conservam a origem alinhada aos pés. Consulte os READMEs em `../sprites/characters/` para detalhes de exportação.

O mapeamento entre animação e modo de combate pertence a `src/rendering/animations/`; o manifesto não pode alterar frames de combate, hitboxes ou hurtboxes.

`guilty-gear.json` é um manifesto experimental para validar o pipeline com a folha fornecida pelo usuário. Como ela não nomeia as sequências, as ações associadas às linhas são provisórias; mantenha esse uso isolado do personagem padrão.
