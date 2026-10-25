# Renderização

`CombatantView` desenha Shoto com geometria neutra: corpo ancorado aos pés, marcador de frente, alcance durante atividade e indicador de defesa. Não carrega sprites do elenco retirado nem muda corpo por fase. `HitboxView` usa as mesmas caixas do resolvedor. Cenário e câmera continuam em `stages/`; HUD fica fixo. A simulação decide acertos, dano e tempo.

Raiz de regras: [base.md](../../base.md).
