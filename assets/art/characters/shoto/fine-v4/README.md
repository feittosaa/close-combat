# Shoto — ajustes finos v4

Base preservada: fontes auburn/canonical-v2 recuperadas em 2d5c8bd, não as fontes v3 rejeitadas. Turnaround canônico em `../turnaround.png`.

- `generations.json`: 20 retoques locais e oito intermediárias reais; idle registrado separadamente.
- `refinements.json`, `wrist-refinements.json`, `accessory-final.json`: correções localizadas de fivela, punhos e quinta pose do chute forte.
- `walk-outline-cleanup.json`, `walk-trouser-tones.json`, `walk-materials.json`: limpeza das bordas e ajuste de calça, pele e marfim das intermediárias.
- `baseline-*`: referência técnica anterior, preservada.
- `walk-keys/`: recortes de referência das oito poses mantidas, antes de inserir as intermediárias.

As imagens nativas selecionadas foram copiadas para `src/assets/sprites/characters/shoto/source/`; os arquivos finais ativos são declarados em `alignment.json`. Fontes brutas e etapas da caminhada ficam versionadas para rastreabilidade. Não há recoloração automática adicional nesta entrega; o preparo só extrai o alpha, escala uniformemente e alinha os desenhos. A correção contínua de cor já existente no runtime foi preservada.

Comparação de silhueta e evidências no jogo não equivalem à aprovação artística do usuário. O pedido incluiu o Bar ao Anoitecer nesta mesma branch, reaproveitando a implementação de 254b6af da outra conversa.
