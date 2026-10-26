# Shoto — sprites básicos do Anfitrião

Conceito visual 5 e três folhas wide aprovados manualmente na conversa em 25/10/2026. Nome no jogo continua Shoto. Esta integração não altera combate nem conclui seu conjunto de animações.

| Ação | Quadros lógicos | Cadência | Arquivo RGBA |
| --- | --- | --- | --- |
| Idle | 0–7 | 6 FPS, loop | idle.png |
| Andar | 8–15 | 10 FPS, loop | walk.png |
| Recuar | 15–8 | 8 FPS, loop invertido da caminhada | walk.png |
| Idle agachado | 16–21 | 6 FPS, loop; todos baixos | crouch.png |

Cada ação é uma única faixa horizontal. Células uniformes 512 × 768, sem trim; idle/walk 4096 × 768 e crouch 3072 × 768. Pivô X=256, pés Y=720. Escala de exibição 0,225 nos dois eixos (altura desenhada em pé aproximadamente 142–143 unidades). A origem é a mesma no agachado, sem ampliar a pose para preencher a célula. Atlas JSON mantêm nomes lógicos globais. Cadências são apresentação provisória, sem alterar a simulação de 60 Hz.

## Fontes e preparação

`source/*-magenta.png` preserva as folhas originais geradas, cada uma 2172 × 724, sem retoque artístico. Fontes editáveis em camadas/vetores não foram entregues. Identificadores na conversa:

- Idle: `exec-0f5e0f7d-f888-4391-8192-1e0b718b7091.png`.
- Walk: `exec-93dccd94-ae69-4a13-84ff-da968fdf8211.png`.
- Crouch: `exec-a4fa7b87-afd5-4a22-961a-fb44b1e392f1.png`.

Reproduzir na raiz com `python scripts/prepare-shoto-sprites.py`, usando Pillow, NumPy e SciPy. O jogo/build não dependem de Python. A preparação remove magenta por chave cromática, separa os desenhos com divisores autorados e costuras em fundo, elimina fragmentos desconectados de vizinhos, alinha pés e raiz e exporta RGBA/atlas. `preparation.json` registra recortes e correções de escala: idle/crouch 1,0, walk 1,025 para compensar escala da fonte. Não há escala diferente por quadro. O importador verifica que não há recorte nas bordas da célula e que os pés opacos ficam no mesmo Y.

## Reprodução e limites

`shotoSprites.ts` define manifesto e seleção dos três estados aprovados; `CombatantView` amostra a pose pelo frame lógico e espelha no sentido do adversário. Pausa segura o mesmo frame, reset retorna à primeira pose. O menu usa a mesma cadência do idle. A filtragem linear evita tratar a ilustração como pixel art.

A caminhada de origem possui sobreposição entre pontas de botas de quadros vizinhos e poses semelhantes. A separação preserva o material disponível, mas contornos dessas pontas e alternância das pernas precisam de revisão na reprodução; não reconstruir anatomia nem declarar fluidez final por haver oito imagens. O relógio troca de lado no espelhamento, pois não existem desenhos direcionais independentes. Agachado é um loop baixo: não inclui descer/levantar.

Ataques, salto, dash, corrida, defesa, hitstun e blockstun não receberam arte. Nesses estados, e se a textura falhar, o sprite some e volta a geometria técnica anterior, com alcance somente na fase ativa. Não usar idle como animação falsa de ataque. Hitbox/hurtbox continuam nos dados do motor. Os dois jogadores compartilham a mesma arte; HUD, lado e direção identificam os participantes.

## Validação

115 testes em 14 arquivos, incluindo seleção, atlas, pivô, espelhamento, pausa/reset, FPS 30/60/120/144 e retorno à geometria. PNGs preparados inspecionados isoladamente. Revisão dentro do jogo ainda pendente: ferramenta de navegador expira ao abrir a prévia local. A branch deve permanecer fora de development até verificar animações em velocidade normal/lenta, ambos os lados, pausa/passo único/reset, pé/escala no cenário e troca entre estados com e sem arte.

## Apresentação Full HD

A branch `codex/feature-apresentacao-1080p` reúne estes sprites ao menu diurno aprovado. Canvas 1920 × 1080, coordenadas lógicas preservadas e zoom próximo 1,95 (+25,8% sobre 1,55); a imagem e a geometria crescem juntas pela câmera. O sprite continua com escala uniforme 0,225 no mundo. A prévia na seleção usa zoom 1,6. Não há mudança de resolução dos PNGs nem ampliação isolada dos colisores.
