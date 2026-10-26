# Conferência do Bar ao Anoitecer — 26/10/2026

Prévia local da branch `codex/feature-bar-anoitecer`, viewport 1280×720, canvas interno 1920×1080. Nenhuma mudança de escala dos lutadores, câmera, arena física ou modos de prática.

- `selecao.jpg`: miniatura do bar com escala uniforme e altura limitada ao cartão.
- `pvp.jpg`, `arcade.jpg`: bar nos dois modos gerais.
- `esquerda.jpg`, `direita.jpg`: deslocamento de ambos os lutadores até cada extremo; sem bordas vazias, chão contínuo e objetos no lugar.
- `salto.jpg`: salto de P1 inteiro no enquadramento.
- `treino.jpg`, `tutorial.jpg`, `combos.jpg`: sala de treino preservada nos três modos, sem escolha de cenário; receitas de combos continuam vazias.

Faixa de chão próxima de 22% da altura visível, com junção perto de Y=452 e pés Y=488 na composição lógica 1024×576. Caixa, vaso e banco pequenos atrás da faixa de combate, em PNGs separados com alpha. São decorativos; nenhuma interação foi adicionada por inferência. Console da conferência sem erros ou avisos.

Regressões automatizadas cobrem política de cenário por modo, rejeição da sala em modos gerais, faixa projetada do chão, pés fixos, escala 1,6 e contrato de câmera de ambos os cenários em quatro resoluções. Testes não substituem a conferência visual registrada acima.
