# Ayla — pacote de arte v01

**Raiz de regras:** `base.md`. **Produção:** `docs/animacao.md`. Data: 21/10/2026.

Seis PNGs RGBA com transparência real, **32 sequências corporais, duas sequências de efeitos e 270 poses/recortes catalogados**. A referência de movimento fornecida pelo usuário orienta as famílias de ações; esta entrega é uma adaptação da Ayla, não uma substituição de todos os quadros da folha original na mesma posição.

O visual preserva cabelo vermelho longo, top preto, jaqueta caída nos ombros com mangas claras, calça cargo preta opaca, tiras vermelhas, luvas e tênis. A geração foi feita pela ferramenta integrada `image_gen`. Os prompts completos, incluindo tentativas e correções, estão em `sources/generation-prompts.json`. Os PNGs selecionados foram copiados sem edição de pixels; recortes e compensações são metadados.

## Arquivos

| Prancha | Conteúdo | Dimensões reais | Sequências |
| --- | --- | --- | --- |
| `ayla-movement-v01.png` | Guarda, caminhada, avanço, recuo, agachamento, salto e defesas | 1254 × 1254 | 8 |
| `ayla-normals-v01.png` | Quatro ataques em pé e três agachados | 1254 × 1254 | 7 |
| `ayla-specials-v01.png` | Soco/chute aéreo, onda, investida, giro ascendente, chute de avanço e arremesso | 1254 × 1254 | 7 |
| `ayla-reactions-v01.png` | Dano alto/corpo/aéreo, queda, levantada, captura, provocação e vitória | 1254 × 1254 | 8 |
| `ayla-sweep-inverted-v01.png` | Rasteira forte e alternativa de giro invertido | 1774 × 887 | 2 |
| `ayla-effects-v01.png` | Onda rasteira e erupção vertical, sem corpo embutido | 2172 × 724 | 2 |

Cada PNG tem um `.atlas.json` com quadros nomeados e um `.animations.json` com sequências e fases. `catalog.json` reúne tudo, inclusive coordenadas, escalas iniciais de apresentação e observações. `mapeamento.csv` é a tabela de consulta em planilha.

## Consultar as animações

Com o servidor de desenvolvimento do projeto aberto, acesse `/src/assets/sprites/characters/ayla/v01/preview.html`. A prévia permite selecionar ação, pausar, avançar um desenho, espelhar, mudar velocidade e consultar preparação/contato/recuperação. Ela repete as sequências para inspeção, inclusive ações que futuramente deverão tocar uma única vez. Precisa de servidor HTTP porque lê o catálogo; abrir o HTML diretamente pelo gerenciador de arquivos pode bloquear essa leitura.

## Convenção de nomes

- Ação: `ayla-standing-lp`, `ayla-crimson-wave`, `ayla-forward-throw`.
- Quadro: `ayla-standing-lp-00`, `ayla-standing-lp-01` etc.; numeração começa em zero dentro da ação.
- Fase: `ayla-standing-lp-startup`, `ayla-standing-lp-active`, `ayla-standing-lp-recovery`.
- As linhas do CSV começam em um; **não** equivalem a índices de spritesheet do Phaser.
- LP/RP/LK/RK correspondem aos botões 1/2/3/4. Direções e comandos de especiais no catálogo são propostas locais da Ayla, ainda sem implementação ou balanceamento.

## Especiais propostos

| ID | Nome | Movimento / efeito |
| --- | --- | --- |
| `ayla-crimson-wave` | Onda Carmesim | Soco contra o chão e onda rasteira vermelha |
| `ayla-scarlet-rush` | Investida Escarlate | Avanço horizontal com soco estendido |
| `ayla-rising-kick` | Giro Ascendente | Giro com chute para interceptar o ar |
| `ayla-inverted-rising-kick` | Giro Invertido | Alternativa com inversão corporal mais acentuada |
| `ayla-leaping-kick` | Chute de Avanço | Impulso para frente com chute aéreo |
| `ayla-ruby-eruption` | Erupção Rubra | Conjuração reutilizada da onda + efeito vertical independente |

`ayla-ruby-eruption` é um alias declarado no catálogo: reutiliza `ayla-crimson-wave` para o corpo e `ayla-fx-ruby-eruption` para o efeito. Não há uma sequência corporal inédita de super. Arremesso só contém a atuação da atacante; a vítima usa sua própria reação e precisará de sincronização.

## Futuro carregamento no jogo

1. Usar os retângulos explícitos dos arquivos `.atlas.json` com um carregador de atlas por nomes, por exemplo `load.atlas(textureKey, png, atlasJson)` no Phaser. **Não usar `load.spritesheet` com células presumidas:** a saída gerada não obedeceu à grade exata pedida.
2. Cada quadro usa canvas lógico de 512 × 512, com preenchimento transparente descrito por `spriteSourceSize`. Esse canvas é metadado, não a resolução de cada desenho. O pivô inicial é `(0.5, 472/512)`. Confirmar o tratamento de pivô/trim no renderizador escolhido antes de integrar.
3. Aplicar `renderScale` do catálogo como ponto de partida por prancha. Não normalizar cada pose pela altura: agachar e esticar as pernas não podem aumentar a cabeça. As escalas entre pranchas ainda precisam de calibração no jogo.
4. O contrato atual do jogo é de um manifesto numérico/spritesheet por personagem. Estes atlas nomeados são uma **entrega de arte separada**, não um arquivo para colocar diretamente em `src/assets/animations/ayla.json`. A integração futura deverá adaptar o carregamento para múltiplas texturas nomeadas ou exportar um atlas consolidado revisado.
5. Criar o livro `moves` e o perfil `collision` específicos da Ayla. Associar os IDs aos três clipes de fase. Os oito desenhos de um golpe não significam oito frames de lógica; durações vêm do livro a 60 Hz. A divisão 3/2/3 é uma proposta visual a revisar por ação.
6. O corpo da conjuração e o efeito do projétil são elementos separados. Deslocamento, posição da vítima, trajetória de salto, spawn/despawn de efeitos, custo de super e colisões pertencem ao motor.
7. O recuo de caminhada continua usando o comportamento espelhado definido no projeto. Ter arte de backdash não introduz uma regra nova de movimento.

## Verificação e pendências reais

Os arquivos têm alpha, os 270 nomes são únicos, os retângulos cabem nos PNGs e as fases apontam para quadros existentes. O relatório está em `validation.json`. Isso verifica o pacote, não aprova fluidez ou combate.

- **Rasteira forte, quadros 03/04:** duas silhuetas encostam na origem. Os recortes são aproximados nessa borda; requer limpeza manual antes de uso final.
- Queda e reação de agarrão possuem **sete poses reais** por faixa. Os manifestos preservam essa quantidade, sem inventar uma oitava pose.
- Os pés da vitória chegam ao limite inferior do PNG. Conferir a sola e completar eventual pixel cortado.
- O agachamento de transição desce e volta a levantar. Sustentar os quadros 03–05 para a postura baixa; não repetir toda a faixa como agachamento.
- Figuras e cabelo variam discretamente de volume entre pranchas; os PNGs não são masters editáveis nem animação desenhada com controle manual. Revisar cabeça, roupa, pivô, bordas e continuidade com onion skin. Reações e arremessos precisam de correção específica quando sincronizados no jogo.
- Salto e arremesso no visualizador mostram poses ancoradas para revisão; não simulam a trajetória física. Nenhum desses movimentos foi implementado no motor nesta entrega.
- Super reutiliza conjuração; não há medidor, dano, frame data, balanceamento nem comandos definitivos aprovados.

**Estado de entrega:** base visual gerada, organizada e mapeada. A limpeza apontada acima e a validação dentro do jogo continuam pendentes; não tratar este pacote como arte final de produção.
