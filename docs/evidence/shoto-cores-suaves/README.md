# Cores contínuas e ampliação discreta

A correção anterior usava classificação discreta de material e faixas rígidas de cor; pixels semelhantes podiam virar cores muito diferentes, criando manchas na jaqueta e na pele. Agora os ajustes RGB são contínuos e preservam os detalhes/sombras do original, com cores de referência em vez de posterização. Fontes e alpha não mudam.

Revisão no jogo: idle.png, andar.png, recuo.png, agachado.png, dash.png, backstep.png e defesa.png. Na guarda, P1 usa geometria técnica de ataque sem sprite aprovado; P2 demonstra a defesa. salto.png captura o frame 19 em execução, sem painel de pausa, corpo inteiro abaixo do HUD. resultado.png registra a composição final.

Aumento uniforme de 3% em todas as poses e no menu; pivô dos pés preservado. Câmera fixa 1,6, margem lateral 92 e afastamento máximo 456 em 1024 × 576. Colisores não mudam.

149 testes/20 arquivos, instalação reproduzível, build e diff aprovados. Regressões verificam continuidade nos antigos limiares, preservação de gradientes/marfim/tinta, alpha, células de alturas diferentes, aumento uniforme e espaço no salto. A revisão visual complementa os testes.
