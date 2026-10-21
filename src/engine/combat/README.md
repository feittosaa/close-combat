# Combate

Regras de ataques, defesa, agarrões, parry, vantagem e combos. `AttackResolver` resolve contatos e mantém a ordem determinística por frame. Consultar `base.md` antes de alterar semânticas.

## Frames e contexto

`frameData.ts` define a vantagem **do atacante** como `stun do defensor - recuperação restante do atacante`, excluindo o frame de contato das duas contagens. Positivo significa vantagem de quem atacou. A mesma convenção vale para bloqueios, acertos e arremessos.

`classifyHitContext` inspeciona o adversário antes de aplicar o acerto: golpe bloqueado ainda em atividade/recuperação, golpe que errou ainda em recuperação ou golpe em preparo/atividade. Só um strike que realmente colidiu pode receber os rótulos de punição/contra-ataque; esses rótulos não mudam o dano.

`combatGeometry.ts`, em `engine/collision/`, fornece hitboxes e hurtboxes usadas tanto pelo resolvedor quanto pela inspeção visual. Nenhum collider é inferido dos desenhos.

Recomendação de resposta garantida, buffer ao sair do stun, combos completos e quedas/levantadas continuam pendentes na pipeline.
