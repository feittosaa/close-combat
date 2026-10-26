# Artes da tela inicial — propostas v1

Produção autorizada em 25/10/2026. Direção raiz: [identidade-visual.md](../../../identidade-visual.md).
Duas alternativas de fundo para avaliação artística; não estão carregadas pelo jogo.

| Arquivo | Dimensões | Direção |
| --- | --- | --- |
| arena-brasa-v1.png | 1672 × 941 | Carvão, vermelho e luz de brasa; portal urbano monumental |
| patio-jade-v1.png | 1672 × 941 | Azul noturno, jade e ouro discreto; portal circular |

PNG RGB opaco, quadro único, proporção aproximadamente 16:9. Preservar os originais; não esticar separadamente os eixos. Não são sprites, cenários jogáveis, camadas de parallax ou fontes vetoriais/editáveis.

## Uso previsto

- Compor com escala uniforme do tipo cover e conferir recorte em cada resolução.
- Reservar o lado esquerdo para título e seis modos do menu atual. A arte concentra luz e detalhe à direita.
- Renderizar títulos, opções, foco e comandos no jogo; não incorporar textos na imagem.
- As duas peças são alternativas, sem escolha de padrão homologada.
- Não definem aparência do Shoto ou narrativa/cenário oficial do jogo.
- A referência estética indicada pelo usuário orienta contorno, sombras gráficas e cor; os ambientes são originais.

## Revisão e limite da entrega

Inspeção das imagens geradas: composição panorâmica, ausência de textos/personagens e área escura para menu conferidas. Brasa possui mais textura pictórica; Jade tem massas de sombra e contornos mais gráficos. Não houve mudança no runtime. Nenhuma das propostas foi homologada dentro do jogo. Integração futura exige conferir legibilidade com todas as opções, foco por teclado, ajuda inferior e proporções de tela. A tela atual permanece como bancada técnica até essa integração.

## Geração

Ferramenta integrada de geração de imagens, sem CLI/API própria. Referências fornecidas na conversa: tela atual para distribuição de conteúdo; imagens de Hades para linguagem visual. Não foram copiadas para o repositório. Prompts completos abaixo.

### Arena de Brasa

Use case: stylized-concept. Create a finished original background illustration for the main menu of CLOSE COMBAT, a contemporary 2D fighting game. Landscape 16:9, aim 1920x1080 or higher. Art direction inspired by supplied Hades references: expressive variable-width black ink contours, angular cut-paper cel shadows, stylized hand-painted color fields, controlled dry-brush textures, striking silhouettes, sophisticated graphic composition. ORIGINAL ENVIRONMENT, no Hades characters, no Greek symbols, no copied logos. Concept A: ARENA DE BRASA. A dramatic urban underground fighting courtyard at dusk, monumental weathered concrete gateway on the RIGHT, dark iron structural beams, crimson fabric banners without symbols, distant city roofs and balconies, atmospheric smoke, a few glowing embers. Burnt coral and vermilion light emanates from beyond the gate, champagne-gold edge accents, charcoal and deep aubergine shadows. Very strong hero illustration on RIGHT HALF; LEFT 55 percent deliberately quiet near-black aubergine atmospheric shapes with subtle texture, usable for six vertically stacked menu items; top left dark quiet area for title, bottom 10 percent quiet for key hints. Floor perspective subtly leads toward the right gateway. Bold hand-drawn environment, dense detail only in right focal region, dramatic theatrical lighting, polished premium game key art. No people, no fighter silhouettes, no weapons, no skulls, no lettering, no UI, no frames, no watermarks. Full bleed single artwork, not a concept board.

### Pátio de Jade

Use case: stylized-concept. Deliver one finished 16:9 background illustration for CLOSE COMBAT main menu. Concept B: PÁTIO DE JADE. Original contemporary fighting-game world, a deserted urban martial-arts courtyard at night, tall dark angular concrete pillars and black iron lattice, a huge circular architectural opening on the RIGHT framing a moonlit distant city, jade luminous lamps recessed into stone, stylized wind ribbons and sparse floating turquoise motes. Hand-drawn 2D graphic novel game illustration referencing Hades art direction: VERY VISIBLE expressive black ink outlines, bold angular cel-shaded color shapes, limited flat color planes, dry brush edge texture only, exaggerated architecture silhouettes, intentional drawing. NOT realistic, NOT 3D render, NOT painterly photorealism. Deep ink navy, midnight violet, cool teal and jade-green, restrained antique gold trims, small coral-red cloth accent. RIGHT HALF carries the striking circular gate focal point and sculptural geometry; LEFT 55 percent remains low contrast near-black navy atmospheric wall and broad quiet negative space for six menu rows, no busy ornament there. Top left has space for title and bottom ten percent quiet for hints. Asymmetrical compelling panoramic composition, ground perspective toward right. Full bleed clean production background without interface. No people, no fighter design, no Greek iconography, no recognizable Hades assets, no text, no letters, no logos, no watermarks, no UI panels. Make it feel illustrated and sharply graphic with dramatic turquoise rim lighting.

## Fundo padrão aprovado — Pátio Solar

`patio-solar.png` (1672 × 941, PNG RGB) é a arte diurna da segunda rodada, aprovada manualmente em 25/10/2026 para aplicação no menu. É diferente de Arena de Brasa. Fonte: imagem gerada `exec-58f51a76-eb01-4a60-9fb4-49e9d9fd8aa4.png`. Traço com contornos de tinta, cores chapadas e sombras recortadas. Paleta quente desta peça não obriga a paleta de futuras artes.

O menu carrega a imagem pelo empacotador, cobre a tela com escala uniforme e margem para deslocamento lento em loop. Pequenas partículas de luz complementam o movimento; a preferência de movimento reduzido mantém tudo estático. Textos e controles continuam separados da imagem. As duas alternativas v1 acima não estão em uso.
