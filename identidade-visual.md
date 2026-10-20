# Identidade visual — Close Combat

Este guia define a linguagem visual de todo o jogo: personagens, animações, cenários, efeitos, interface, retratos e materiais promocionais. Deve orientar a criação de arte original e manter as partes do projeto visualmente coesas.

## Direção em uma frase

Um jogo de luta 2D de ritmo clássico, apresentado com ilustração de alta definição, personagens de traço anime adulto, poses fortes e efeitos de impacto gráficos. A imagem deve combinar acabamento detalhado com leitura instantânea durante a luta.

## Princípios visuais

1. **Leitura antes do detalhe:** silhueta, direção, altura e intenção do movimento são reconhecidas em um instante, mesmo em tamanho reduzido.
2. **Desenho original e expressivo:** proporções estilizadas, rostos marcantes, gestos amplos e atitudes distintas. Cada personagem tem uma forma própria de ocupar o espaço.
3. **Acabamento HD, ritmo clássico:** contornos e pintura têm detalhe e resolução altos; a animação permanece feita de poses desenhadas em quadros, com aceleração, pausas e impacto claramente ritmados.
4. **Contraste com propósito:** cor, luz, composição e efeitos guiam o olhar para os lutadores e para o instante importante do combate.
5. **Consistência entre sistemas:** retratos, sprites, tela de seleção, HUD, cenários e efeitos pertencem ao mesmo universo visual.

## Personagens

- Desenhar cada lutador com uma silhueta identificável em preto sólido, sem depender de cor ou acessórios pequenos.
- Usar proporções estilizadas, anatomia convincente e poses que comuniquem personalidade, peso e intenção. Evitar corpos genéricos com apenas roupa ou cor diferente.
- Construir figurinos em camadas de formas grandes e médias; reservar pequenos detalhes para close-ups e retratos.
- Separar valores de luz entre cabeça, tronco, braços e pernas. Mãos, pés e extremidades devem continuar legíveis durante golpes rápidos.
- Definir uma paleta curta e característica por personagem. As cores de identificação devem manter contraste com os cenários e entre os dois jogadores.
- Criar retratos com o mesmo desenho, contorno e tratamento de luz dos sprites. Expressões intensas são bem-vindas; texto ou símbolos não devem carregar a identidade sozinhos.

## Linha, cor e luz

- Usar contornos desenhados e firmes, com variação de espessura para separar planos e enfatizar a pose. Evitar contorno uniforme excessivamente fino.
- Aplicar sombras em blocos de cel shading, com formas gráficas claras; usar textura pictórica com moderação para dar profundidade sem sujar a leitura.
- Reservar brilhos especulares e cores luminosas para materiais, energia e momentos de impacto. O brilho não deve apagar a forma do personagem.
- Trabalhar com paletas saturadas e valores bem separados. Cenários podem ser mais contidos para dar prioridade aos lutadores.
- Manter iluminação e direção de sombra coerentes dentro de cada personagem e cenário. Um golpe pode acrescentar luz própria, sem alterar a iluminação de forma arbitrária.

## Animação e apresentação do combate

- Animar em poses desenhadas quadro a quadro, com preparação, antecipação, contato e recuperação distintos.
- Dar aos golpes fortes uma pose de preparação legível, um quadro de contato marcante e uma saída clara. A duração visual deve acompanhar os frames de combate configurados; a arte nunca pode mudar a regra do golpe.
- Usar deformação e exagero em poucos quadros para acelerar, frear ou acentuar um impacto. Preservar a identidade da silhueta em todas as poses.
- Evitar movimento contínuo sem acentos. Pausas curtas ajudam o jogador a ler a decisão, o contato e a recuperação.
- Espelhar horizontalmente a animação quando apropriado. Desenhar a pose base voltada para a direita e verificar que acessórios, letras e assimetrias não ficam invertidos de forma incorreta.
- Separar os clipes por personagem e por ação. Golpes devem ter poses/trechos correspondentes a preparação, frames ativos e recuperação; estados sem arte podem continuar usando o placeholder.
- Distribuir o tempo entre as poses com holds, antecipações e retornos próprios. Loops, reações e trajetórias aéreas devem seguir o frame lógico, para que a pose permaneça estável durante pausa e avanço de um frame.
- Tratar o fallback como material provisório declarado, sem apresentar uma pose de parado como se fosse a animação de um golpe. A matriz de produção e o processo de aprovação por ação estão em `docs/animacao.md`.

## Cenários e composição

- Usar arenas 2D com profundidade sugerida por planos, perspectiva, escala e iluminação, sem criar um plano de movimento lateral.
- Dar prioridade visual aos lutadores: conferir altura aparente e volume de caixas, portas e outras referências de tamanho. Ajustes de props preservam seu apoio e não mudam o enquadramento ou o collider do personagem por acidente.
- Criar cenários estilizados com arquitetura e objetos de formas reconhecíveis, atmosfera forte e detalhes que não se confundam com os lutadores.
- Manter a faixa de luta limpa: nenhum objeto importante deve cobrir corpos, pés ou efeitos de contato.
- Organizar elementos em primeiro plano, plano de luta e fundo. O primeiro plano deve ser discreto; o fundo pode ter movimento lento, desde que não concorra com a ação.
- Reservar áreas relativamente escuras ou uniformes atrás das barras de vida e de outros elementos de interface.

## Impactos e efeitos

- Desenhar efeitos em formas gráficas direcionais: arcos, riscos, faíscas, poeira, ondas e fragmentos abstratos.
- Usar poucos quadros de alto contraste para o contato, com cor distinta para acerto, bloqueio, parry e golpe preciso.
- Manter os efeitos próximos ao ponto de contato e curtos o suficiente para não esconder a pose nem a hitbox real.
- Associar cada família de efeitos a uma paleta e forma recorrentes. Efeitos de personagens podem ter assinatura própria, mas devem continuar legíveis em fundos diferentes.
- Evitar ruído visual constante, partículas excessivas, flashes longos e tremor de câmera que prejudique a leitura ou o conforto.

## Interface e tipografia

- Tratar o HUD como parte de uma apresentação competitiva: estrutura firme, hierarquia nítida e ornamentos concentrados nas bordas.
- Usar tipografia de impacto nos títulos e uma fonte simples e muito legível para vida, tempo, comandos e frames.
- Exibir estados do combate com texto, símbolo ou forma além da cor. Manter números e informações importantes separados dos efeitos de fundo.
- Usar textura, desgaste e ângulos como detalhes de acabamento, sem sacrificar alinhamento, contraste, escala ou leitura em telas pequenas.
- As cores do HUD não substituem feedback sonoro ou visual de combate e não devem ser a única forma de distinguir estados.

## Especificação para criação de sprites

- Entregar uma spritesheet PNG RGBA de alta resolução por personagem e preservar o arquivo-fonte editável.
- Organizar os quadros em grade uniforme, sem trim automático e sem padding variável. Registrar largura e altura exatas de cada célula no manifesto do personagem.
- Manter escala, proporção, ponto de pivô e base dos pés consistentes em todas as poses.
- Ordenar quadros por clipe e documentar os intervalos inclusivos, FPS e repetição no manifesto em `src/assets/animations/`.
- Fornecer poses de idle, caminhada, dash, salto, agachamento, bloqueio, hitstun, blockstun, agarrado, queda e cada golpe do livro do personagem.
- Não desenhar hitboxes, hurtboxes, HUD, fundo de cenário ou marcas de alinhamento dentro da arte final. Colisores e dados de combate são definidos no motor.
- Verificar cada pose sobre fundo claro e escuro, em escala de luta e na escala nativa do arquivo, antes de considerar a spritesheet pronta.

## Controle de qualidade

Antes de aprovar qualquer recurso visual, verificar:

- a silhueta identifica a ação e o personagem sem cor;
- a pose e o ponto de contato continuam legíveis no tamanho real da luta;
- pés, escala e pivô permanecem estáveis entre quadros;
- o contraste separa personagem, adversário, cenário e efeitos;
- os detalhes não introduzem informação de combate falsa;
- a animação corresponde ao clipe registrado e não altera a duração lógica;
- o arquivo é original, editável quando possível e está guardado na pasta correta.

## O que evitar

- Reprodução de personagens, figurinos, logotipos, poses, cenários, efeitos ou layouts reconhecíveis de outras obras.
- Acabamento pixelado de baixa resolução como aparência final; a linguagem é ilustrada em alta definição, mesmo mantendo ritmo e organização de quadros clássicos.
- Realismo fotográfico, materiais uniformemente brilhantes ou excesso de textura que apague o desenho.
- Animações que escondam antecipação, contato, recuperação ou estado do oponente.
- Cenários, interface e efeitos mais chamativos do que os personagens durante a luta.

## Material provisório existente

O atlas do Tester e o Cais permitem desenvolver a apresentação e revisar movimentos. O Cais atual usa pixel art; essa base não muda a direção final de ilustração em alta definição. A harmonização de cenário, personagens e efeitos, a revisão de proporções e a substituição das aproximações de animação são entregas da pipeline. Não tratar o material provisório como identidade final aprovada.

## Regra de precedência

Este documento é a referência para decisões de identidade e acabamento visual. `base.md` continua sendo a raiz das regras e do escopo do projeto; quando a implementação ou um asset de arte tratar de apresentação, deve seguir este guia. Se uma nova decisão mudar a identidade visual, atualize este arquivo e registre a relação em `base.md`.
