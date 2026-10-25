> **Transição de design — 25/10/2026.** Este README descreve o protótipo ainda presente no código/assets. Referências a elenco, combos, balanceamento, parry e etapas antigas não definem o novo design. Seguir [base.md](../../../base.md) e [pipeline.md](../../../pipeline.md); preservar infraestrutura útil, retirar o conteúdo anterior e não produzir novos assets para o elenco removido.

# Animações em frames lógicos

Este módulo amostra poses do atlas a partir do estado e do frame da simulação. O Phaser apenas desenha o frame escolhido: não há relógio visual separado que continue tocando durante a pausa.

`AnimationPlayback.ts` resolve sequências explícitas, holds, loops, reações ajustadas ao stun e poses aéreas pela velocidade vertical. Os pesos das fases de ataque são distribuídos pelo startup/atividade/recuperação do livro de golpes, sem mudar a lógica.

`CharacterAnimationMap.ts` associa modos e IDs de golpes a chaves visuais. O manifesto pode fornecer `moveClips`; a validação recusa índices/durações inválidos ou cobertura ausente dos golpes antes da partida. Reutilizações provisórias precisam ficar explícitas no manifesto.

Contrato completo, matriz de produção e roteiro de revisão: [`docs/animacao.md`](../../../docs/animacao.md). Arte e animação não alteram dano, hitboxes ou duração de stun.

`CombatantView` aplica `footAnchorY` e correções uniformes de `frameTransforms` ao quadro amostrado. Não aplica tint por fase. Correções visuais não alteram a geometria, e não devem ser confundidas com o ajuste de tempos no livro de golpes.

Reações de juggle usam clipe `*-juggle` enquanto a vítima está no ar em hitstun. Seu `bodyAnchor` é um pivô autorado na célula, alinhado visualmente ao centro da hurtbox existente, com origem X/Y respeitada após espelhamento. Ayla usa a pose recolhida 192, Gris a pose de tombo 59 e Tester a pose horizontal 108. São poses provisórias sustentadas; substituir por animações dedicadas preservando o pivô. O salto livre e reações no chão continuam com suas âncoras anteriores. A renderização lê a caixa, nunca a modifica.
