# Assets de cenários

Cada cenário possui um identificador de pasta, `stage.json` e as imagens declaradas em `layers/`. Nome e ID são definidos no manifesto; detalhes e aprovação da peça ficam na pipeline.

Camadas compartilham dimensões e origem de `referenceSize`. `groundY` identifica o apoio dos pés; escala e deslocamentos são autorados, preservando proporções. Fundos opacos podem ser RGB e recortes usam alpha verdadeiro. Não recortar camadas de forma que percam a origem comum.

Profundidade e parallax pertencem à apresentação. Um objeto desenhado não ganha colisão ou interação implicitamente. A câmera e os personagens devem compartilhar a projeção do piso. A política de cenário por modo é explícita e independente do cenário padrão. Catálogo, arquivos, piso e câmera devem ser validados juntos.
