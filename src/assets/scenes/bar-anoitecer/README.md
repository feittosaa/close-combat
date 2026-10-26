# Bar ao Anoitecer

Primeiro cenário geral de PvP e Arcade, aprovado para integração em 26/10/2026. Bar espanhol ao anoitecer com arquitetura e pavimento em uma pintura opaca contínua; não há parallax entre parede e chão. Contornos expressivos, sombras recortadas, vinho/índigo e iluminação âmbar seguem a arte interna.

Imagem nativa 1672 × 941. Junção parede/piso próxima de Y=795; linha dos pés Y=825. Câmera fixa 1,6 e escala uniforme do layout existente, sem mudar lutadores ou colisões. Na tela lógica, junção perto de Y=452 (78,4% da altura), pés Y=488: faixa de piso menor e apenas 36 pixels de profundidade atrás dos pés.

`layers/bar.png` contém chão e arquitetura. `caixa.png`, `vaso.png` e `banco.png` são três assets RGBA independentes, pequenos e apoiados junto à fachada, atrás da faixa de combate. Cada arquivo preserva a tela inteira e origem comum. Parallax 1 em todos, mantendo objetos presos ao lugar físico. Interações/quebra/colisão de objetos ainda não foram implementadas.

Fontes, medidas de preparação e prompts em `assets/art/stages/bar-anoitecer/`. A folha original de objetos foi apenas separada, redimensionada uniformemente e posicionada, sem repintura ou recoloração. Não usar a referência externa como asset. A Sala de Treino permanece exclusiva de Treino e tutoriais.
