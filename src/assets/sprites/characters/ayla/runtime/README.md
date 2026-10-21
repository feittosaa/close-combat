# Ayla — atlas usados na luta

Raiz: `base.md`. Manifesto: `src/assets/animations/ayla.json`. Livro: `src/engine/data/fighters/ayla.ts`.

## Limpeza e alinhamento

- A rasteira usa preparação/retorno baixos e um contato novo isolado. A investida tem contato novo isolado. A vitória usa quatro poses novas com as duas solas completas e margem inferior.
- Os recortes antigos da investida que incluíam pixels da pose vizinha foram excluídos. A levantada omite dois recortes contaminados da origem.
- O pacote contém **249 retângulos selecionados e verificados**, em oito PNGs RGBA. Cada retângulo selecionado contém uma única silhueta principal. O arquivo `validation.json` registra essa conferência.
- Os PNGs de origem são preservados sem edição de pixels; apenas os recortes selecionados dos atlas são expostos ao jogo. Poses não selecionadas na imagem de origem não são animações disponíveis. `frame-catalog.json` identifica cada desenho e seu recorte.
- O canvas lógico de 2048 × 2048 é preenchimento descrito por metadados de trim; não é a dimensão do corpo. O apoio é 1888. Escala e pivô são autorados nos dados, com cabeça/figurino preservados ao agachar. Não escalar a silhueta pela altura de cada pose.
- A verificação geométrica de exportação lê pixels apenas durante a preparação dos metadados. O jogo não usa silhuetas para calcular hitboxes ou hurtboxes.

`scripts/prepare-ayla-runtime.py` reproduz os metadados usando os PNGs preservados. Os novos arquivos selecionados já estão nesta pasta; a ferramenta não é necessária para jogar ou compilar. Para rodar a conferência de autoria, o script requer Pillow, numpy e scipy.

## Animação e combate

Todas as ações de estado e as três fases dos 18 golpes têm associação explícita. Intensidades de soco/chute aéreo compartilham desenhos, com duração, dano e caixas distintos. Erupção Rubra compartilha a conjuração da Onda Carmesim e usa outro efeito independente.

O relógio visual segue os frames lógicos da simulação. Subida/ápice/descida usam a velocidade física; projéteis possuem idade, trajetória e hitbox próprios. O efeito da onda está ancorado ao piso e o da erupção ocupa seu volume vertical. Agachamento mantém apenas poses baixas.

A erupção sustenta os desenhos de coluna completa desde o primeiro frame de dano. O pouso do chute com avanço pertence à recuperação. A revisão visual dos especiais, troca de lado e integração aos modos está registrada em `docs/ayla-gris-progresso.md`. Regenerar os metadados invalida a marca de revisão visual em `validation.json`, para exigir nova conferência após alterações de autoria.

| Comando | Especial |
| --- | --- |
| D,DF,F + 1 | Onda Carmesim, projétil rasteiro |
| D,DF,F + 2 | Investida Escarlate, avanço com soco |
| D,DB,B + 3 | Giro Ascendente, antiaéreo |
| D,DB,B + 4 | Chute de Avanço |
| D,DF,F + 1+2 | Erupção Rubra, coluna de energia à frente |

Direções relativas ao oponente. Os valores de combate são provisórios; não representam balanceamento final. As poses de captura e reação pertencem a corpos separados, sincronizados pela simulação. A arte foi gerada pela ferramenta integrada `image_gen`; os prompts selecionados estão em `sources/prompts.json`, e os prompts das pranchas originais em `../v01/sources/generation-prompts.json`.
