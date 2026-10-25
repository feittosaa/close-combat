# Identidade visual — Close Combat

> Revisão de 25/10/2026. Escopo e regras em [base.md](./base.md); execução em [pipeline.md](./pipeline.md).

## Direção

A referência estética passa a ser **Hades**, traduzida em arte original: ilustração 2D expressiva, contornos marcantes, sombras recortadas, contraste forte e textura pictórica controlada. Essa decisão substitui Guilty Gear Strive como referência visual global. **Guilty Gear Xrd Rev 2 é a referência de ritmo e balanceamento do combate.**

A linguagem deve unir personalidade visual e leitura imediata em um jogo de luta. Personagens, cenários, retratos, interface e efeitos precisam parecer parte do mesmo universo, com desenho próprio, sem reproduzir personagens, figurinos, logotipos ou interfaces das referências.

## Etapa atual

O único personagem a desenvolver primeiro é um shoto de nome provisório **Shoto**, sem aparência, características ou animações finais definidas. A anotação temática hitman/John Wick não aprova seu figurino, arma ou identidade. Não produzir arte final nesta revisão documental.

Todo o elenco anterior está retirado do novo design. Seus sprites, retratos e manifestos foram removidos do runtime e dos assets nesta migração; não são modelos para o novo personagem. A bancada inicial deve usar representação neutra para inspeção de regras. Pixel art antiga não é a direção final nem uma obrigação para a nova produção.

## Princípios de produção

- Silhuetas e poses que comuniquem ação, direção, altura e peso no tamanho real da luta.
- Contorno com variação de espessura, sombras em massas gráficas e cor de destaque com propósito.
- Textura e detalhe concentrados onde não disputem atenção com contato, guarda e recursos.
- Cenário com profundidade sugerida por camadas, faixa de luta limpa e contraste favorável aos lutadores.
- HUD legível, com tipografia simples para números/comandos e ornamentos contidos nas bordas.
- Feedback distinto para acerto, bloqueio, combo breaker, drive rush, rage e rage art quando suas regras forem aprovadas. Parry não terá efeito ou indicador novo.
- Estados comunicados por forma/texto além de cor; evitar flashes prolongados e efeitos que escondam o defensor.

## Animação e contrato técnico

A animação acompanha a simulação de 60 Hz. Startup, contato e recuperação precisam de poses legíveis; pausa e passo único devem manter correspondência com o frame lógico. Desenhos não definem dano, colisão ou duração de estado.

Entregar PNG RGBA com células uniformes, enquadramento fixo, pés e pivô alinhados; preservar fontes editáveis. Documentar tamanho, intervalos, holds, orientação, escala, clipes e limitações no manifesto. Conferir os dois lados e o espelhamento de acessórios/assimetrias. Não embutir hitboxes, HUD ou fundo nos sprites.

Produzir uma ação completa e revisá-la antes de ampliar o conjunto. Fallbacks devem ser explícitos e nunca confundidos com animações finais aprovadas. A matriz antiga de Tester não é uma lista de produção do shoto.

## Aprovação visual

Conferir no jogo em velocidade normal, câmera lenta e passo único: silhueta, contato, contraste, escala, apoio dos pés, transições, espelhamento, câmera e correspondência com caixas. Revisar sobre fundos claros/escuros e nos extremos da arena.

Registrar evidência por ação. Testes de manifesto, build e associações de clipes não substituem essa conferência. Nome definitivo, visual e personalidade serão definidos posteriormente com o usuário.
