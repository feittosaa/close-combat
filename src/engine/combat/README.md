# Combate

`AttackResolver` resolve um contato por golpe, guarda e trades com geometria compartilhada com a visualização. Não contém parry, agarrões, projéteis, recursos ou reações do elenco anterior. Contatos são coletados antes de alterar os dois jogadores.

`frameData.ts` calcula vantagem como stun do defensor menos frames futuros de ataque, excluindo o contato. Recuperação é integral em acerto, erro e bloqueio. Punição/contra-ataque exige colisão real; rótulos não alteram dano. `ArcadeController` gera entradas legais do livro do Shoto, sem acerto forçado.

Raiz de regras: [base.md](../../../base.md).
