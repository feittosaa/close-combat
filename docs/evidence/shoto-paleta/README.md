# Paleta única e locomoção sem corrida — 26/10/2026

Conferência no build de produção em 127.0.0.1:4190, com a paleta final comum aos 84 quadros. PNGs de origem preservados; transformação RGB na preparação das texturas usadas tanto pelo menu quanto pelo combate.

- idle.png: ambos os lados, cabelo castanho discretamente avermelhado, pele morena, jaqueta marfim, vinho, carvão e couro castanho.
- andar.png/recuo.png: 15F de caminhada sustentada após reset, sem duplo toque; mesma paleta, incluindo bota levantada.
- agachado.png: frame 12, proporção e apoio preservados.
- salto.png: frame 19; a barra de inspeção cobre parte da cabeça na captura, sem alteração do enquadramento do jogo.
- dash.png/backstep.png: frame 12 após dois toques físicos curtos, direção solta.
- apos-dash-sem-corrida.png: frame 30, direção mantida, modo MOVIMENTO em vez de corrida.
- defesa-transicao.png/defesa.png: guarda de P2 no preparo/atividade de ataque distante; P1 permanece retângulo técnico porque ataques não têm arte aprovada.
- transicao-andar.png: entrada de caminhada no frame 3, durante a mistura lógica de poses.

Revisão visual distingue cores de material de suas sombras: a mesma rampa atende todas as folhas, sem cores próprias por ação. Dobras marfim quentes não devem virar pele; sombras avermelhadas das mãos não devem virar camisa. Esses casos, cor da bota levantada, alpha, limites de células e retorno à caminhada são cobertos por regressões.

Validação: instalação reproduzível, 147 testes/20 arquivos, build e diff aprovados. A conferência no jogo complementa os testes. A revisão de cores não produz desenhos novos, não modifica fontes e não usa geração de imagens; aplica uma tabela compartilhada de materiais na renderização.
