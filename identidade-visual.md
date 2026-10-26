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

O aval posterior autoriza integrar somente idle, caminhada e idle agachado das folhas wide aprovadas. PNGs magenta originais ficam preservados; cópias RGBA preparadas usam células fixas, pés/pivô comuns e escala uniforme. A branch conjunta `codex/feature-apresentacao-1080p` reúne sprites e menu aprovado e permanece sem integração enquanto a revisão no jogo estiver pendente. Arte de ataques, saltos, dash/corrida, guarda/reação e transições ainda não foi produzida; esses estados usam a representação técnica explícita. Espelhamento também espelha o relógio e outras assimetrias; versões direcionais independentes não foram entregues. Novas propostas exploratórias dependem de aval manual para inclusão no projeto.

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

Canvas Full HD 1920 × 1080 com composição lógica 1024 × 576 e escala uniforme de câmera. Zoom próximo 1,95 para aumentar a presença do personagem; câmera abre por distância. Texto rasterizado em resolução 2 e filtragem linear para a ilustração. O menu usa a arte diurna aprovada com movimento lento, respeitando movimento reduzido, e interface com serifas, sombras escuras e acentos quentes.

## Animação e contrato técnico

A animação acompanha a simulação de 60 Hz. Startup, contato e recuperação precisam de poses legíveis; pausa e passo único devem manter correspondência com o frame lógico. Desenhos não definem dano, colisão ou duração de estado.

Entregar PNG RGBA com células uniformes, enquadramento fixo, pés e pivô alinhados; preservar fontes editáveis. Documentar tamanho, intervalos, holds, orientação, escala, clipes e limitações no manifesto. Conferir os dois lados e o espelhamento de acessórios/assimetrias. Não embutir hitboxes, HUD ou fundo nos sprites.

Produzir uma ação completa e revisá-la antes de ampliar o conjunto. Fallbacks devem ser explícitos e nunca confundidos com animações finais aprovadas. A matriz antiga de Tester não é uma lista de produção do shoto.

## Aprovação visual

Conferir no jogo em velocidade normal, câmera lenta e passo único: silhueta, contato, contraste, escala, apoio dos pés, transições, espelhamento, câmera e correspondência com caixas. Revisar sobre fundos claros/escuros e nos extremos da arena.

Registrar evidência por ação. Testes de manifesto, build e associações de clipes não substituem essa conferência. Nome definitivo, visual e personalidade serão definidos posteriormente com o usuário.
