# Treino

`TrainingSession` produz entradas legais para alvo parado, segundo jogador, guardas e repetição dos básicos 1/2/4. O alvo usa Shoto. `G` alterna comportamento, `L` velocidade 100/50/25%, `F3` vida automática, `F4` distância 96/144/220, `H` caixas e `I` entradas. Pausa e passo único compartilham a simulação normal. Reset limpa comandos e exige soltura das teclas mantidas.

`MoveList` lê os quatro golpes e receitas declaradas por personagem; o Shoto não tem combos. `TutorialSession` ensina movimento, quatro básicos e defesa, exigindo contato real. O treino de combos abre vazio, com mensagem de espera pelas receitas manuais; não reutiliza lições antigas. Não somar acertos separados por retorno do defensor ao neutro como uma receita contínua.

`InputHistory` mantém até 24 mudanças com frame, duração e orientação. O pause permite buscar e fixar um dos quatro comandos; alternar P1/P2 mostra teclas remapeadas.

Raiz de regras: [base.md](../../base.md).
