> **Transição de design — 25/10/2026.** Este README descreve o protótipo ainda presente no código/assets. Referências a elenco, combos, balanceamento, parry e etapas antigas não definem o novo design. Seguir [base.md](../../../base.md) e [pipeline.md](../../../pipeline.md); preservar infraestrutura útil, retirar o conteúdo anterior e não produzir novos assets para o elenco removido.

# Sprites

Guarde aqui imagens-fonte e spritesheets originais. Organize por categoria:

- `characters/`: spritesheets dos lutadores e seus quadros de animação.
- `effects/`: impactos, poeira, rastros e efeitos visuais.
- `interface/`: ícones e elementos gráficos do HUD.

O diretório `characters/tester/` contém o atlas normalizado do Tester e o README com o mapeamento das sequências.

Preserve arquivos-fonte editáveis quando disponíveis e não misture recursos de personagens diferentes em uma mesma folha sem necessidade. Para lutadores, entregue um atlas PNG RGBA separado por personagem, com frames em grade fixa sem trim/padding, escala e base dos pés consistentes; registre tamanho de frame e intervalos inclusivos em `src/assets/animations/{id}.json`. Os READMEs em `characters/tester/` e `characters/dummy/` descrevem os nomes e clipes esperados. Hitboxes e hurtboxes são configuradas nos dados de combate, nunca pintadas no atlas.
