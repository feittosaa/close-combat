> **Transição de design — 25/10/2026.** Este README descreve o protótipo ainda presente no código/assets. Referências a elenco, combos, balanceamento, parry e etapas antigas não definem o novo design. Seguir [base.md](../../../../../base.md) e [pipeline.md](../../../../../pipeline.md); preservar infraestrutura útil, retirar o conteúdo anterior e não produzir novos assets para o elenco removido.

# Tester — sprites

O jogo usa `tester-atlas.png`, um atlas RGBA de 256×256 por quadro com 399 quadros recortados da folha enviada. A ordem dos quadros por faixa e o mapeamento dos estados estão em `src/assets/animations/tester.json`.

O manifesto preserva as 31 faixas originais como clipes `tester-source-row-00` a `tester-source-row-30`. Os estados reconhecidos usam: faixa 18 para idle e caminhada; faixa 21 para guarda; faixa 30 para agachamento; faixa 23 para salto; faixa 12 para reação ao acerto; faixa 9 para queda e captura; faixas 4 e 5 para os socos leve e forte. Cada clipe registra índices inclusivos e taxa de reprodução.

Os quadros foram separados do fundo branco, normalizados em células fixas e alinhados pela base da faixa para conservar a leitura de movimento. O atlas substitui os antigos sprites provisórios do Tester. Hitboxes e hurtboxes continuam sendo dados de combate e não são inferidas da arte.

`sourceFacesLeft` declara a orientação de origem por clipe. Idle, caminhada, dash, guarda e chutes baixos usam arte voltada à esquerda; a renderização aplica o espelhamento relativo ao adversário. Não inverta o atlas inteiro, pois os socos e chutes altos usam a direção oposta.

O pulo também usa `sourceFacesLeft`, preservando o espelhamento entre os lados da arena. A reação ao bloqueio em pé reutiliza as poses de guarda 268–270; os antigos quadros baixos 256–259 não fazem parte dessa reação. A defesa baixa conserva a pose agachada.

O hitstun normal usa a reação em pé 144–145–144, sem repetir. Os quadros invertidos de giro ficam no clipe de queda; não representam a reação a um acerto comum.

`frames` permite escolher poses fora de ordem numérica. Idle, guarda e agachamento retornam pelas poses intermediárias sem repetir os extremos; a caminhada mantém seu ciclo de seis passos a 10 FPS. As células desses loops conservam a cabeça alinhada horizontalmente e os pés na mesma linha de chão. `loopFrameAlignment` registra os deslocamentos aplicados às células.

`moveClips` liga todos os chutes cadastrados às fases correspondentes: leve, forte, rasteira/agachado e aéreo. As poses de startup, ativo e recuperação são distribuídas pela duração real da fase no livro de golpes do Tester. A cadência visual não altera dano, hitboxes ou tempos da simulação.

Avanço e recuo usam o mesmo clipe `tester-walk`: a direção de locomoção espelha o desenho no recuo sem trocar a orientação lógica do combate. Guarda usa seu clipe apenas com `B`/`DB` durante um ataque do adversário, mesmo fora de alcance; defesa baixa mantém a pose agachada. Defesa e agachamento ficam imóveis, salvo deslocamento por contato de ataque.

## Revisão de 20/10/2026

`displaySize` agora usa 256×256 no mundo (antes 220×220). Com as margens do atlas, a pose de idle ocupa cerca de 153 unidades de altura, próxima da hurtbox em pé de 152. O pivô permanece nos pés; a alteração é visual e não muda os dados de combate.

Todos os 26 golpes têm associação explícita às três fases. `provisionalMoves` registra variações que reutilizam poses aproximadas: chords/direcionais, captura, socos agachados/aéreos e soco ascendente. Isso corrige o fallback silencioso em idle, mas ainda exige revisão e autoria específica.

A captura reutiliza alcance das mãos em 12–16 e recuperação 16–17–12; socos agachados agora usam 255–258 para permanecer baixos; aéreos reutilizam o soco de punho fechado 52–54–56. Os antigos 313–314 levantavam o corpo e 17–20 pareciam outro movimento. A vítima e seu reposicionamento continuam sob controle do motor. Não considerar essa sincronia final de arremesso.

Holds por pose e todas as reações seguem o relógio lógico. Subida, ápice e descida usam poses selecionadas pela velocidade vertical. Processo, limitações e aprovação por ação estão em [`docs/animacao.md`](../../../../../docs/animacao.md).

### Correção de volume e cadência

`footAnchorY` e `frameTransforms` corrigem a apresentação sem editar o PNG: 393–395 e 392 recebem escala 0.78; o contato de rasteira 81 usa 0.90 (aproximadamente 95 unidades de altura); a família baixa 255–259 usa 1.04; algumas poses têm âncora própria para manter apoio. Não aplicar essas escalas às hitboxes nem normalizar desenhos pela caixa delimitadora em tempo de execução. A pose agachada passa de 124 para cerca de 97 unidades de altura.

Chute forte em pé: 64–57–58 / 69 / 69–58–57–64. Forte aéreo: 121–122 / 123 / 123–122–121. Os holds seguram o ápice e recolhem gradualmente. Os golpes continuam provisórios, sobretudo os socos aéreos que compartilham arte terrestre; faltam desenhos próprios de pernas recolhidas e aterrissagem.
