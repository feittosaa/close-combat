# Revisão conjunta Shoto v4 + Bar ao Anoitecer

Conferência local no Fedora, prévia 4190, branch `codex/feature-shoto-golpes-guardas`, canvas interno 1920×1080 exibido em 1280×720. O pedido incluiu trazer o primeiro cenário da conversa «Gerar três imagens de cenário» para a mesma branch; implementação/arte do bar proveniente de 254b6af, sem merge da outra branch.

## Escopo conferido

- `walk-09.png` até `walk-57.png`: oito chaves preservadas, oito intermediárias e fechamento do período de 48F; `walk-review.jpg` compara poses consecutivas. A última conferência usa a correção de materiais das intermediárias.
- `heavy-punch-*`, `heavy-kick-*`, `strongs-review.jpg`: preparo, contato, recolhimento e retorno. Na quinta pose do chute, o joelho continua do mesmo lado e a perna de apoio permanece plantada; também conferido espelhado.
- `backward-*`, `crouch-*`, `jump-*`, `dash-*`, `backstep-*`: recuo, ciclo baixo, salto completo e deslocamentos. Os conectores antigos e retorno parcial foram preservados.
- `light-punch.png`, `light-kick.png`, `mirrored-*`: básicos e lados.
- `crouch-guard.png`, `air-guard.png`: bloqueios reais contra P2 manual; geometria oculta para observar a arte.
- `bar-selecao.png`, `bar-pvp.png`: miniatura e bar com Shoto v4, chão reduzido e objetos apoiados atrás da luta.
- `tutorial.png`, `combos.png`: sala de treino fixa; receitas continuam vazias. A sala também foi conferida no treino livre.

## Verificações técnicas

Instalação reproduzível, 174 testes/22 arquivos, build e diff aprovados. Verificador independente conferiu todos os 128 quadros: alpha, ausência de magenta opaco/recorte, pés e escala corporal; apoio agachado varia 1,5 px. Caminhada continua 48F, agora 16 desenhos a 20 FPS; não houve mudança de física, velocidade, câmera ou displaySize.

`silhouette-comparison.json` compara as fontes retocadas às recuperadas; mede preservação geral dos desenhos, não rosto, cor ou aprovação artística. Chute forte tem alteração intencional de perna na quinta pose. Raízes e escalas finais estão em alignment.json; algumas fontes editadas exigiram compensação uniforme inferior a 1% nos ataques e pequenos ajustes de sola.

Fontes e prompts em assets/art/characters/shoto/fine-v4. A v3 permanece rejeitada e fora do runtime. Aprovação artística final depende da revisão manual do usuário. Evidências do bar feitas na outra branch continuam identificadas separadamente em docs/evidence/bar-anoitecer.
