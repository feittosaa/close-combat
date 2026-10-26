# Transições sem piscadas

Reprodução automatizada no código anterior: frame 2 da caminhada gerava duas camadas de alpha 2/3 e 1/3. A cobertura efetiva source-over era 1 − (1 − 2/3) × (1 − 1/3) = 7/9, portanto 77,78%, mesmo sobre uma região opaca compartilhada pelas duas poses. Isso deixava o cenário aparecer através do corpo e criava uma pulsação/contorno duplo. AnimationOpacity.test.ts falhou com esse valor antes da correção.

Correção: uma única pose totalmente opaca por frame. Os conectores autorados de entrada/saída e retorno parcial continuam; somente a dissolução por alpha foi removida. Cores, escala, câmera e simulação preservadas.

Conferência real no build de produção: andar-frame2.png e dash-frame2.png mostram os instantes antes afetados; saida-andar.png, agachar-frame2.png e saida-agachar.png mostram saídas/interrupção curta. salto.png registra salto em execução no frame 20. Também conferidos caminhada/recuo e agachamento com comandos sustentados, seguida de salto, na mesma prévia atualizada. Capturas estáticas complementam a conferência em movimento e a regressão de cobertura.

Validação: instalação reproduzível, 150 testes/21 arquivos, build e diff aprovados. Regressão usa snapshots reais de ambos os lutadores, entradas/saídas, interrupções, salto/aterrissagem e dash/backstep. Testes de determinismo em 30/60/120/144 FPS, pausa e retorno parcial preservados; as expectativas de duas camadas foram substituídas pelo contrato opaco.
