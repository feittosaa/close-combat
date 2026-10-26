# Cenários

Regras em `base.md`; catálogo/validação em `src/rendering/stages/`. Atualmente só existe `sala-treino/`, com manifesto, PNG opaco da sala e registro da geração. Cais foi retirado dos assets ativos e permanece no histórico Git.

Cada pasta de cenário contém `stage.json`, `README.md` e `layers/*.png`. O ID coincide com a pasta; `name` é o título visível. Todas as camadas compartilham dimensões/origem declaradas em `referenceSize`. Preserve a tela completa, sem recortes independentes. Fundos opacos podem manter seu PNG RGB; camadas recortadas precisam de alpha verdadeiro.

`groundY` é a linha de apoio dos pés em pixels da imagem, alinhada ao `floorY` da simulação. `minimumScale` limita a escala-base comum; o layout aumenta uniformemente para cobrir a tela, sem esticar eixos separadamente. `layers` declara arquivo, profundidade, parallax e deslocamentos; `contentScale`/`scaleOrigin` permitem ajustes autorados com pivô compartilhado.

Profundidades negativas ficam atrás dos personagens; HUD usa profundidade 100 ou maior. Cenários são decorativos: eixos e objetos desenhados não alteram arena, colisão, golpes ou trajetórias.

A câmera tem escala fixa 1,6 e acompanha somente o centro horizontal, dentro da área válida. O piso e personagens usam a mesma projeção. A Sala de Treino usa uma única camada com `parallax: 1`, preservando toda a grade como uma sala estática. O catálogo real entra automaticamente nos testes de câmera/piso.

A sala é fixa em treino, tutorial e tutorial de combos, por política explícita de modo. É a única opção temporária de PvP e Arcade; quando houver novos cenários gerais, restringi-la aos modos de prática. Não depender somente do default geral para manter o cenário do treino.
