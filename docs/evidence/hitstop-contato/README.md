# Micro pausa de contato — 26/10/2026

Branch `codex/feature-hitstop-contato`, baseada na revisão visual `850ac79`, sem integração em development. Prévia local no Fedora: 127.0.0.1:4190, canvas interno 1920×1080, capturas 1280×720.

## Conferência no jogo

- Acerto: aproximar P1 de 96 para 64 unidades, jab contra alvo parado. `hit-contact.png` mostra contato no frame de combate 23; `hit-1.png` a `hit-5.png` mantêm o frame, posição e pose; `hit-6.png` já mostra frame 24 e stun/ataque retomando. Dano aplicado uma única vez.
- Bloqueio: soco forte contra guarda alta a 64 unidades. `block-contact.png` mostra frame 27 e vida preservada; os cinco ticks seguintes mantêm contato/guarda. O sexto retoma no frame 28. Nenhuma troca de desenho para produzir a pausa.
- Erro: soco forte a 144 unidades. `whiff-contact-time.png` mostra frame 11, `whiff-after-5.png` frame 16 com retração normal; sem pausa.
- `pixel-comparison.json`: recorte dos lutadores idêntico nos cinco ticks congelados de hit e block. No sexto o combate já avançou, embora a pose ativa ainda possa ser a mesma por sua duração autorada.

O treino usa relógio infinito. A independência do relógio de round foi comprovada pelos testes do motor em modo normal: ele perde um tick por passo inclusive durante a pausa, igual ao golpe que erra. Testes cobrem os quatro golpes, dois lados, hit/block, pose máxima, física/stun/recuperação congelados, retomada, dano único, trades, reset, KO, time-up e determinismo em 30/60/120/144 FPS. A pausa dura cinco ticks (aproximadamente 83 ms) após o contato.

Nenhum asset, clipe ou parâmetro de golpe foi alterado. `frame` segue tempo de combate/animação; `elapsedFrames` conta todos os ticks e `roundFramesRemaining` continua independente do hitstop. A pausa manual do treino segue independente da micro pausa de contato.
