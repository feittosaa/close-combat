# Simulação

Simulação determinística em 60 Hz, independente de Phaser e do FPS de renderização. Avanço contínuo e passo único usam as mesmas regras. Snapshots são cópias e não expõem referências mutáveis do motor.

Tempo de combate/animação e tempo decorrido são distintos: uma pausa de contato congela a ação sem parar o relógio do round. Pausa manual e reset devem preservar ou limpar esses estados conforme sua função, sem carregar entradas de outro contexto.

Partidas, IA, treino e tutoriais compartilham o mesmo motor. Exceções de ferramentas não podem alterar regras competitivas silenciosamente.
