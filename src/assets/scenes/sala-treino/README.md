# Sala de Treino

Cenário original gerado pelo `image_gen` embutido a partir da referência de sala quadriculada enviada pelo usuário, com linhas de tinta, formas angulares e textura de pedra pintada. Prompt completo e origem em `generation.json`. Composição ajustada para mostrar a parede na proporção correta sob a câmera fixa, com junção parede/piso a 75% da imagem fonte. PNG nativo preservado, 1774 × 887, opaco, sem recorte ou deformação.

Uma camada coerente contém parede e piso: `layers/sala.png`, profundidade -300, parallax 1. Não há movimento independente entre os planos. Linha dos pés em Y=780, próxima ao guia horizontal escuro do piso; a escala-base é uniforme e a câmera permanece fixa em 1,6, acompanhando somente o eixo horizontal.

Sala fixa em Treino, Tutorial Básico e Tutorial de Combos. PvP e Arcade usam Bar ao Anoitecer. Esta sala permanece apenas nos modos de prática pela política explícita `stageForMatch`. Cais retirado dos assets ativos; sua versão anterior permanece no Git.

Os guias desenhados são decorativos. Não geram obstáculos ou alteram colisores, alcance, trajetória ou duração de movimentos. Testes da câmera usam automaticamente o catálogo real, incluindo limites do fundo e linha do piso.
