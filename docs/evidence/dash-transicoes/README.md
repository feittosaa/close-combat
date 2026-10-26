# Dash e transições — conferência no jogo

Build de produção, câmera fixa 1,6, Sala de Treino. Revisão com pausa e avanço de frames, além da navegação normal pelos modos.

- dash-sem-segurar.png: frame 9, dash ativo, distância 179 partindo de 220, direção já solta.
- dash-frame24.png: fim da janela de 24 frames.
- backstep-sem-segurar.png: frame 12, distância 263, direção solta; folha própria de recuo.
- entrada-andar-1.png, entrada-andar-5.png e saida-andar.png: amostras da passagem entre idle/caminhada. O contador visível é a referência para o instante capturado.
- agachado.png: pose sustentada no frame 10, proporção e apoio preservados.
- salto.png: frame 19, corpo inteiro e câmera sem mudança de escala/altura.
- treino-final.png: composição geral durante revisão.

28 desenhos novos em sete conectores; 84 quadros totais com raízes autoradas. Verificação independente de pixels aprovada. Testes cobrem duplo toque físico entre ticks, duração, interrupções, retorno parcial, pausa e determinismo em 30/60/120/144 FPS. Ataques/hitstun seguem com representação provisória, sem arte aprovada.
