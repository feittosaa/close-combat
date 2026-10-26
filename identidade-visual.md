# Identidade visual — Close Combat

> Revisão de 25/10/2026. Escopo e regras em [base.md](./base.md); execução em [pipeline.md](./pipeline.md).

## Direção

A referência estética passa a ser **Hades**, traduzida em arte original: ilustração 2D expressiva, contornos marcantes, sombras recortadas, contraste forte e textura pictórica controlada. Essa decisão substitui Guilty Gear Strive como referência visual global. **Guilty Gear Xrd Rev 2 é a referência de ritmo e balanceamento do combate.**

A linguagem deve unir personalidade visual e leitura imediata em um jogo de luta. Personagens, cenários, retratos, interface e efeitos precisam parecer parte do mesmo universo, com desenho próprio, sem reproduzir personagens, figurinos, logotipos ou interfaces das referências.

## Referência interna aprovada

A [arte diurna do menu](./assets/art/menu/patio-solar.png) estabelece o padrão de traço: tinta preta expressiva, formas angulares, cores chapadas e sombras duras, com textura controlada. A paleta é livre para acompanhar ambientes e personagens; não é obrigatório repetir as cores da referência externa. O fundo aprovado tem movimento lento e partículas discretas, desativados com preferência por movimento reduzido. O menu combina serifas nos títulos, sombras de tinta e acentos de ouro/coral.

Imagens exploratórias só entram no projeto após aval manual. A autorização de 25/10/2026 cobre a arte diurna e sua aplicação no menu; não aprova as outras variantes nem define a aparência do Shoto.

## Etapa atual

O único personagem em desenvolvimento é o shoto de nome provisório **Shoto**. O usuário escolheu a proposta 5, “Anfitrião”: homem alto e esguio, cabelo castanho-avermelhado preso com mecha solta, bigode e cavanhaque, paletó marfim, camisa vinho, calça preta e botas marrons. O nome de conceito não altera seu nome no jogo.

O aval manual autoriza idle, caminhada, agachado, salto, defesa, recuo, dash e backstep. Fontes originais e edições de cabelo avermelhado ficam preservadas; cópias RGBA usam células fixas, raiz autorada e escala uniforme. Menu e três clipes iniciais foram integrados em development após revisão no jogo e CI. Ataques e reações de acerto ainda usam representação técnica explícita; corrida reutiliza poses aprovadas do dash. Espelhamento também espelha o relógio e outras assimetrias; versões direcionais independentes não foram entregues. Novas propostas exploratórias dependem de aval manual antes da inclusão.

Todo o elenco anterior está retirado do novo design. Seus sprites, retratos e manifestos foram removidos do runtime e dos assets nesta migração; não são modelos para o novo personagem. A geometria neutra permanece para estados sem arte e inspeção de regras. Pixel art antiga não é a direção final nem uma obrigação para a nova produção.

## Princípios de produção

- Silhuetas e poses que comuniquem ação, direção, altura e peso no tamanho real da luta.
- Contorno com variação de espessura, sombras em massas gráficas e cor de destaque com propósito.
- Textura e detalhe concentrados onde não disputem atenção com contato, guarda e recursos.
- Cenário com profundidade sugerida por camadas, faixa de luta limpa e contraste favorável aos lutadores.
- HUD legível, com tipografia simples para números/comandos e ornamentos contidos nas bordas.
- Feedback distinto para acerto, bloqueio, combo breaker, drive rush, rage e rage art quando suas regras forem aprovadas. Parry não terá efeito ou indicador novo.
- Estados comunicados por forma/texto além de cor; evitar flashes prolongados e efeitos que escondam o defensor.

## Resolução de apresentação

Canvas Full HD 1920 × 1080 com composição lógica 1024 × 576 e escala uniforme de câmera. Câmera fixa em escala 1,6, sem zoom dinâmico nem deslocamento vertical; apenas acompanhamento lateral. O salto inteiro cabe no enquadramento. Texto rasterizado em resolução 2 e filtragem linear para a ilustração. O agachado recebe escala uniforme autorada na preparação para manter a proporção em relação ao idle; a câmera não aproxima por causa do agachamento. A altura do salto não altera a câmera. O HUD usa barras contínuas no topo, sem divisões verticais ou grandes molduras, dourado discreto, títulos com serifa e acentos coral/jade; valores, vida, rounds e timelines são dados reais da simulação. O menu usa a arte diurna aprovada com movimento lento, respeitando movimento reduzido, e interface com serifas, sombras escuras e acentos quentes.

## Animação e contrato técnico

A animação acompanha a simulação de 60 Hz. Startup, contato e recuperação precisam de poses legíveis; pausa e passo único devem manter correspondência com o frame lógico. Desenhos não definem dano, colisão ou duração de estado.

Entregar PNG RGBA com células uniformes, enquadramento fixo, pés e pivô alinhados; preservar fontes editáveis. Documentar tamanho, intervalos, holds, orientação, escala, clipes e limitações no manifesto. Conferir os dois lados e o espelhamento de acessórios/assimetrias. Não embutir hitboxes, HUD ou fundo nos sprites.

Produzir uma ação completa e revisá-la antes de ampliar o conjunto. Fallbacks devem ser explícitos e nunca confundidos com animações finais aprovadas. A matriz antiga de Tester não é uma lista de produção do shoto.

## Aprovação visual

Conferir no jogo em velocidade normal, câmera lenta e passo único: silhueta, contato, contraste, escala, apoio dos pés, transições, espelhamento, câmera e correspondência com caixas. Revisar sobre fundos claros/escuros e nos extremos da arena.

Registrar evidência por ação. Testes de manifesto, build e associações de clipes não substituem essa conferência. Nome definitivo, visual e personalidade serão definidos posteriormente com o usuário.

As folhas adicionais de salto, defesa, caminhada para trás, dash e backstep receberam aval de integração após correção do tom do cabelo e alinhamento.

As oito folhas do Shoto mantêm cabelo vermelho acobreado escuro, coque e mecha com a mesma paleta. Raiz X autorada por quadro, com os apoios estabilizados; não centralizar pela caixa total da silhueta, que varia com braços, abas e passos. Células 768 × 768 e raiz 384/720; o ciclo agachado volta pelas poses intermediárias. A escala fixa 1,6 deixa o corpo em pé com cerca de 40% da altura da tela e preserva o salto inteiro.

Sete conectores de quatro poses ligam os estados de locomoção e guarda, com entrada/retorno gradual. Raízes e paleta permanecem comuns; transições não podem produzir deriva de X nem alterar o tamanho do corpo. A apresentação combina poses por três frames lógicos em interrupções, sem depender do FPS ou atrasar o movimento físico.

## Paleta atual do Shoto

A paleta única de materiais documentada em base.md substitui o vermelho acobreado intenso das fontes anteriores: cabelo castanho discretamente avermelhado, pele morena quente, calça carvão, jaqueta marfim, camisa vinho e couro castanho. Valores e rampas em `src/rendering/animations/shotoPalette.ts`; aplicados também aos conectores e à seleção do personagem, preservando desenho e alinhamento.
