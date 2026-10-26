# Revisão canônica do Shoto — 26/10/2026

Mesma branch `codex/feature-shoto-golpes-guardas`, sem merge. O usuário rejeitou variações de rosto, proporção e cor nos seis clipes. Turnaround original preservado em `assets/art/characters/shoto/turnaround.png`; regra permanente em AGENTS.md, base.md e identidade-visual.md. Seis novas edições pelo image_gen embutido, referências e prompts integrais em `src/assets/sprites/characters/shoto/source/canonical-generation.json`. Fontes anteriores preservadas; runtime usa `*-canonical-v2.png` preparados em atlas.

## Revisão de arte e escala

Comparadas fontes ao turnaround e ao idle em altura corporal comum antes de empacotar. Revisados rosto maduro, bigode/cavanhaque, cabelo castanho, pele morena, roupa e botas escuras. Os quatro clipes em pé partem de altura opaca 631 px, igual ao idle; seus atlas têm células 1152×768 e renderização na mesma escala. Raízes apoiadas nos pés, sem deformação por partes nem quantização de cores. Nenhum novo filtro por material foi aplicado.

O verificador confirma 120 quadros RGBA sem magenta opaco/cortes, altura inicial 629–633 px e teto 650 px por pose de ataque (permite flexão/inclinação sem aumento de escala). O pé esquerdo da guarda agachada deriva 1,5 px entre poses, dentro do limite 3. Esses números detectam falhas de preparo, não provam identidade facial; a validação artística final continua manual pelo usuário.

## Conferência no jogo

Prévia de produção local 4190 atualizada. Capturas `soco-*` e `chute-*` mostram contato visual nas fases ativas, dos dois lados; `soco-forte-idle.png` permite comparar ao idle com distância 144 e sem reação técnica do alvo. Frames ativos 7/11/9/14, tempos/dano/caixas preservados. `guarda-agachada*.png` e `guarda-aerea*.png` mostram os clipes revisados em bloqueios reais com vida 1000 e dano 0, nos dois lados. `guarda-entrada.png` registra a primeira pose de postura, antes de descer/fechar os braços. `retorno-salto.png` registra saída aérea em andamento; a barra de inspeção cobre parte da cabeça no ápice, não é corte do atlas/câmera.

Guardas têm agora seis poses: duas intermediárias reversíveis e quatro de ciclo fechado. Revisados entradas, saídas, retorno ao idle/reset e espelhamento; nenhuma dissolução por alpha. A guarda baixa começa pela descida autorada se o personagem estava em pé. O instante inicial do salto passa pelas trocas de estado, evitando reiniciar a subida ao soltar a guarda aérea. A física não mudou.

## Verificações

167 testes em 22 arquivos, build, diff e verificação independente de pixels aprovados. Novas regressões percorrem a descida, fechamento/ciclo/abertura da guarda e retorno ao mesmo frame de salto do controle sem defesa; preservadas regressões de opacidade, fases reais, ambos os lados, pausa/reset e 30/60/120/144 FPS. A revisão não reintroduz corrida ou muda balanceamento.

Envio e CI da revisão são registrados na pipeline/relato final. Manter a branch local/remota para o usuário conferir; nenhum merge em development sem pedido explícito.

Regressão adicional: interromper a guarda após um único frame usa somente a profundidade alcançada; mantém a descida se D continuar, sem saltar para braços fechados.
