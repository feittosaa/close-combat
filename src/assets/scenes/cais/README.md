# Cais

Primeiro cenário do jogo: porto ao entardecer com armazéns, cargas e plataforma de embarque. As três imagens foram fornecidas pelo usuário; os originais estão preservados em `sources/`.

## Composição

Todas as imagens têm **3168 × 1344 px**. A escala mínima comum é `0.5`; em uma tela lógica de 1024 × 576, o cenário ocupa 1584 × 672 e a origem vertical é `-72`. A linha de pés `groundY: 1120` coincide com o piso lógico em `488`.

| Camada | Profundidade | Parallax | Ajuste da referência | Escala de conteúdo |
| --- | --- | --- | --- | --- |
| Fundo: céu, água e armazéns | -300 | 0.25 | x: 0, y: 0 | 1 |
| Chão do cais | -200 | 1 | x: 0, y: 0 | 1 |
| Caixas, barris e cargas | -100 | 1 | x: 0, y: -120 | 0.76 |

O chão é desenhado antes das caixas para não ocultar suas bases. O deslocamento posiciona as cargas atrás da linha dos lutadores. Na revisão de 20/10/2026, o conteúdo das caixas foi reduzido em 24%, preservando a base pelo pivô `{ x: 1584, y: 1208 }`. A transformação usa os dois eixos uniformemente e não modifica os originais. Chão e cargas se movem juntos, enquanto o fundo se desloca mais lentamente.

O Tester passou de célula visual 220 para 256, cerca de 16% maior, aproximando a silhueta em idle da hurtbox já existente. Essa correção de escala visual e o tamanho menor das cargas priorizam os lutadores na composição; alcance, dano e tempos não foram alterados.

## Preparação das imagens

- `sources/fundo.png`: primeira imagem enviada, fundo do porto.
- `sources/caixas.png`: segunda imagem enviada, cargas em fundo magenta.
- `sources/chao.png`: terceira imagem enviada, plataforma em fundo magenta.
- `layers/fundo.png`: cópia sem alteração de cores.
- `layers/caixas.png` e `layers/chao.png`: conversão para RGBA e remoção do magenta, mantendo a tela e as posições originais.

A máscara de importação remove pixels com `R > 180`, `B > 170`, `G < 110`, `R - G > 100` e `B - G > 90`. Os pixels removidos ficam transparentes; os demais preservam a cor original. Essa regra descreve apenas a preparação destas imagens, não um filtro aplicado durante a partida. Em entregas futuras, prefira exportar alpha diretamente no editor.

Para ajustar o encaixe, edite [`stage.json`](./stage.json), seguindo as [regras gerais](../README.md). Não recorte os PNGs nem trate caixas e barris como colisões de gameplay.
