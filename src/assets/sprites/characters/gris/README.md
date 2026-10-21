# Gris

Personagem original conforme a ficha fornecida pelo usuário: cabelo preto curto, vestido vermelho com detalhes dourados, luvas e botas escuras e uma tesoura gigante dourada. A tesoura permanece empunhada; Arco Dourado emite energia independente.

- Arte usada no jogo: `runtime/`.
- Manifesto: `src/assets/animations/gris.json`.
- Livro de golpes e colisões: `src/engine/data/fighters/gris.ts`.
- Pranchas de origem e prompts da ferramenta integrada `image_gen`: `sources/`.
- Revisão de poses, espelhamento e fases: `/src/dev/animation-review.html?fighter=gris`, com o servidor do projeto aberto.

## Entrega e limpeza

São 28 sequências corporais, um efeito independente e associações explícitas de estado/fase para 17 golpes. O pacote usado no jogo seleciona **110 recortes isolados**, em 13 PNGs RGBA. A transparência e os limites foram conferidos. Os recortes selecionados têm uma única silhueta principal e presença da paleta dourada; a continuidade da arma também foi inspecionada nas pranchas geradas. A conferência dentro da luta está registrada em `docs/ayla-gris-progresso.md`.

Os cinco cortes mais largos receberam quatro poses novas em quadrantes maiores. Poses que incluíam a vizinha ou tocavam a borda da origem foram excluídas. A tesoura não é omitida durante chutes, defesa, dano ou queda. Chutes fortes baixo/aéreo compartilham contatos isolados de suas famílias; tempo, dano e hitbox continuam próprios de cada golpe.

Os PNGs são preservados sem edição de pixels. Somente os recortes selecionados nos `.atlas.json` são expostos ao jogo; desenhos descartados presentes no PNG de origem não fazem parte da animação jogável. Não carregar esses recursos como uma grade presumida.

`runtime/frame-catalog.json` lista nomes, coordenadas, escala e pivô por quadro. `runtime/validation.json` registra os descartes. `scripts/prepare-gris-runtime.py` reproduz os metadados a partir das fontes, sem alterar imagens; requer Pillow, numpy e scipy apenas para autoria/conferência, não para jogar ou compilar.

O canvas lógico é 2048 × 2048, com apoio em 1600 para comportar o efeito centrado e a arma. Isso é preenchimento de trim, não o tamanho do corpo. Escala permanece uniforme; colisões não são extraídas de pixels.

Os pivôs horizontais seguem o eixo do corpo autorado em cada pose, não o pé que toca o pixel mais baixo. Os mapas `BODY_AXES` e `CLEAN_AXES` do script preservam esse alinhamento. Chutes usam extensão no contato e recolhimento na recuperação. A revisão no jogo, incluindo espelhamento, arma, especiais e vitória, foi concluída em 21/10/2026; os valores de combate continuam provisórios.

## Golpes especiais

| Comando | ID | Nome |
| --- | --- | --- |
| D,DF,F + 1 | golden-arc | Arco Dourado — energia de corte |
| D,DB,B + 3 | rising-shear | Tesoura Ascendente — antiaéreo |
| D,DF,F + 2 | silk-step | Passo de Seda — avanço com a arma fechada |
| D,DB,B + 4 | royal-cleave | Corte Régio — corte amplo com giro |

Quatro botões em pé, agachada e no ar; `1+3` para agarrão. Nomes/fases seguem `gris-{golpe}-{startup|active|recovery}`. Direções são relativas ao oponente. Todos os valores de combate são provisórios, locais da Gris e ajustáveis no livro.

## Cadência revisada

Idle de 0,8 s; caminhada, dash e agachamento retornam pelas poses intermediárias. `frameDurations` é respeitado no menu e na arena. Cortes fortes e especiais sustentam o desenho de contato e o seguimento da arma antes do recolhimento. Os pesos da recuperação controlam somente a apresentação: uma tesoura ainda estendida nessa fase não mantém a hitbox ativa. Tempos, dano e colisões permanecem no livro da Gris.
