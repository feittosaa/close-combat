# Cenários em camadas

As regras do projeto partem de [`base.md`](../../../base.md). Cada cenário possui seu próprio manifesto e imagens; o carregador e a câmera são compartilhados em `src/rendering/stages/`.

## Estrutura obrigatória

```text
scenes/
  README.md
  cais/
    README.md          # composição, ajustes e origem das imagens
    stage.json         # identificação, escala, linha dos pés e camadas
    sources/           # originais, preservados para novas exportações
      fundo.png
      caixas.png
      chao.png
    layers/            # PNGs usados pelo jogo, com transparência real
      fundo.png
      caixas.png
      chao.png
```

## Regras de entrega

1. Use uma pasta com ID único em minúsculas, sem espaços, e o mesmo `id` no manifesto. Nome visível em `name`.
2. Todas as camadas de um cenário devem ter **a mesma largura, altura e origem**, declaradas em `referenceSize`. Preserve a tela inteira na exportação; não recorte a imagem ao conteúdo.
3. Exporte PNG RGBA. Áreas vazias de props e chão precisam de alpha; fundos magenta não devem aparecer nos arquivos de `layers/`.
4. Todas as imagens recebem **uma escala-base comum e uniforme**. Não ajuste largura e altura separadamente. Se um prop precisar mudar de tamanho dentro da composição, declare `contentScale` e `scaleOrigin`; chão e prop continuam usando o mesmo fator de parallax para manter o encaixe.
5. `groundY` marca, em pixels da imagem original, a linha em que os pés dos lutadores tocam o chão. Ela é alinhada ao `floorY` da simulação. Não é necessariamente a borda superior da plataforma.
6. Ajuste o encaixe com `x` e `y` por camada, em pixels da referência, antes da escala. Para peças que precisam ficar registradas, mantenha também o mesmo fator de parallax.
7. As imagens são decorativas: limites da arena, colisões, hitboxes e hurtboxes continuam no motor de combate. Caixas desenhadas não viram obstáculos automaticamente.

## Manifesto

O Cais contém um exemplo funcional em [`cais/stage.json`](./cais/stage.json).

| Campo | Regra |
| --- | --- |
| `id` / `name` | ID de pasta único e nome exibido na partida |
| `referenceSize.width`, `height` | Dimensões originais comuns de todas as imagens |
| `groundY` | Linha dos pés, maior que zero e menor que a altura |
| `minimumScale` | Menor escala permitida; o enquadramento aumenta se necessário para cobrir a tela |
| `layers` | Lista com uma ou mais camadas; sem quantidade máxima fixa |
| `layers[].id` | Nome único dentro do cenário |
| `layers[].file` | Caminho `layers/nome.png`, usando letras, números, `_` ou `-` |
| `layers[].depth` | Ordem de desenho: valores menores atrás; lutadores usam `0`, hitboxes `20`, HUD `100` |
| `layers[].parallax` | Fração do deslocamento horizontal da câmera, entre `0` e `1` |
| `layers[].x`, `y` | Deslocamento relativo à origem comum; `0` quando não há ajuste |
| `layers[].contentScale` | Escala uniforme opcional do conteúdo, padrão `1`; útil para corrigir props desproporcionais |
| `layers[].scaleOrigin` | Ponto `{ x, y }` da referência que permanece fixo durante o ajuste de conteúdo; padrão `{ x: 0, y: 0 }` |

Use profundidades negativas para o cenário atrás dos lutadores. Camadas de primeiro plano podem usar profundidades entre `1` e `19`, sem cobrir a área de leitura do combate. Evite profundidades iguais quando a ordem importar.

## Câmera e parallax compartilhados

- A câmera acompanha o centro entre os dois lutadores, limitada à largura do cenário. O zoom é uniforme nos dois eixos, abre com a distância e respeita a área visível do cenário; a linha dos pés permanece fixa na tela. Chão e lutadores compartilham o scroll vertical. Os testes em `src/tests/StageCamera.test.ts` incluem automaticamente os cenários cadastrados.
- `parallax: 1` acompanha o chão: a imagem se desloca um pixel na tela para cada pixel de movimento da câmera.
- `parallax: 0.25` se desloca apenas um quarto dessa distância e parece mais distante. `0` mantém uma camada fixa na tela.
- Chão e objetos apoiados nele usam `1`; outros planos recebem valores menores conforme a distância. Preserve largura de imagem suficiente para não expor bordas durante o movimento.
- A interface permanece fixa na tela. A largura jogável e as regras de combate são preservadas; a arena é apenas centralizada no espaço visual do cenário.
- A escala comum cobre o enquadramento acima e abaixo da linha dos pés. Os deslocamentos individuais precisam respeitar essa cobertura; confira as extremidades após ajustá-los.
- A escala de conteúdo é um ajuste artístico do prop e não muda seu parallax. Ancore pela base para não fazê-lo flutuar. Camadas que preenchem a tela, como chão e fundo, devem manter escala `1`, salvo uma revisão explícita da cobertura.

## Adicionar outro cenário

1. Crie `scenes/<id>/`, `sources/`, `layers/` e um README próprio.
2. Entregue imagens com a tela comum e alpha, preenchendo o manifesto conforme a tabela.
3. Adicione quantas entradas forem necessárias em `layers`: quatro, cinco ou mais são processadas pelo mesmo renderizador.
4. O catálogo descobre automaticamente `*/stage.json` e `*/layers/*.png`; imagens de `sources/` não são carregadas na partida.
5. Abra `FightScene` com `{ stageId: '<id>' }`. O padrão do jogo está em `DEFAULT_STAGE_ID` no catálogo; ID desconhecido usa o padrão.

O carregamento recusa IDs duplicados, manifesto inválido, imagem ausente ou dimensões diferentes da referência. Mantenha instruções e proveniência no README do cenário, nunca dentro dos diretórios do motor.
