# Close Combat — Pipeline de implementação

> **Raiz:** [base.md](./base.md), design 0.5.1 · revisão de 25/10/2026.
> **Entrega:** [docs/ci-cd.md](./docs/ci-cd.md).
> **Estado:** Shoto inicial implementado; apenas quatro básicos, com representação neutra e modos adaptados. Novos recursos e combos manuais continuam pendentes.

## Revisão documental anterior — redefinir o design

Branch: `codex/chore-reinicio-design-shoto`.

- [x] Substituir a direção antiga por shoto único como referência de balanceamento.
- [x] Retirar elenco, catálogos, combos e balanceamento anteriores da especificação ativa.
- [x] Registrar nove arquétipos, sem iniciar os demais personagens.
- [x] Remover parry do design; registrar combo breaker, drive rush, rage e rage art com regras pendentes.
- [x] Reservar a autoria de combos ao usuário, um por um, sem gerar receitas.
- [x] Preservar treino de combos como ferramenta, exigindo substituição do conteúdo antigo.
- [x] Atualizar direção artística para referência Hades e separar referência de combate Xrd Rev 2.
- [x] Separar ideias futuras de história/roguelike do escopo PvP/PvE/treino.
- [x] Atualizar README e indicar o caráter histórico dos documentos auxiliares anteriores.
- [x] Validar instalação, testes, build, links locais e diff desta revisão documental.
- [x] Enviar branch, confirmar CI e integrar em `development`; registrar estado real abaixo.

**Critério de conclusão deste objetivo:** documentação coerente, sem apresentar migrações como implementadas, validada e entregue pelo manifesto. Não envolve alteração visual no jogo nem produção de assets.

## Etapa 1 — retirar o protótipo de conteúdo

Branch: `codex/feature-shoto-inicial`. Objetivo autorizado em 25/10/2026: remover o código anterior e criar Shoto com socos/chutes fracos e fortes. Valores técnicos provisórios estão em `base.md` §10; não criar combos ou mecânicas ainda indefinidas.

- [x] Inventariar dependências de Ayla, Gris, Tester e Dummy em dados, assets, seleção, Arcade, treino, tutoriais, renderização, ferramentas e testes.
- [x] Remover todos do runtime e do conteúdo ativo, incluindo importadores e catálogos antigos. Não manter Tester como exceção de treino ou Arcade.
- [x] Remover combos, strings, receitas e balanceamento antigos; definir com o usuário o mínimo necessário para a bancada neutra, sem gerar combos.
- [x] Retirar parry, comandos, dados, feedback e exercícios associados.
- [x] Disponibilizar uma única base neutra com nome provisório Shoto, sem identidade/animação final; permitir confronto espelhado e alvo de treino sem restaurar personagens antigos.
- [x] Adaptar PvP local, Arcade PvE, treino e estrutura do treino de combos. Não oferecer lições antigas como conteúdo novo.
- [x] Atualizar testes de conteúdo conforme a regra revogada, preservando cobertura técnica; conferir menu → modo → luta/treino → saída.

**Saída:** nenhum personagem ou receita anterior acessível; modos executáveis com a nova base; nenhuma dependência residual de parry. Mudança visual e de controles exige revisão no jogo.

Validação local concluída: `npm ci`, 109 testes em 13 arquivos, build, links locais e diff aprovados. Conferidos no jogo os quatro golpes, guarda sem dano, catálogo com quatro entradas, PvP, Arcade, tutorial básico completo e estado vazio do treino de combos. No build de produção, verificados pausa e avanço único do frame 3 para o 4, sem erros de console. Evidências e rastreabilidade dos testes em [docs/shoto-migracao.md](./docs/shoto-migracao.md). Implementação integrada por fast-forward em `development`, commit `7a60ea985d34a79fa422af17d9a4cd9f4a765a93`. CI da [branch](https://github.com/feittosaa/close-combat/actions/runs/40204017166) e da [integração](https://github.com/feittosaa/close-combat/actions/runs/40204102774) aprovadas. Este fechamento documental segue o mesmo fluxo de CI/integração; sem promoção para `main` ou tag.

## Etapa 2 — especificar sistemas e kit mínimo

Pode ser documentada antes da migração; a implementação depende da base limpa.

- [x] Receber e implementar o kit mínimo de quatro básicos.
- [ ] Receber a primeira receita manual do usuário.
- [ ] Definir comandos, vida, movimento, ataque, guarda, agarrões e recuperação do shoto, sem herdar números antigos como aprovados.
- [ ] Especificar combo breaker: comando, estados elegíveis, janela, custo, efeito, risco e retorno ao controle.
- [ ] Especificar drive rush: ativação, avanço, custo, cancelamentos, risco e defesa.
- [ ] Especificar rage e esclarecer sua relação com drive rush; definir ganho, ativação, consumo e persistência.
- [ ] Especificar rage art como ultimate, sem presumir regras da ultimate anterior.
- [ ] Definir escala de dano, limites de combo, juggle/canto e retorno de controle conforme o kit necessário.
- [ ] Implementar e testar as regras aprovadas no mesmo motor para todos os modos; mostrar recursos/estados no treino.

**Saída:** contratos verificáveis e implementados para as mecânicas aprovadas; lacunas não podem ser escondidas por valores copiados de outro jogo.

## Etapa 3 — equilibrar o shoto, uma receita por vez

- [ ] Registrar a receita recebida em [docs/shoto-balanceamento.md](./docs/shoto-balanceamento.md).
- [ ] Implementar somente os passos e propriedades definidos; não expandir “etc.” em catálogo.
- [ ] Medir dano por abertura, duração, alcance, risco em erro/bloqueio, transporte, gasto de recurso e resposta do defensor.
- [ ] Conferir ambos os lados, centro/canto aplicável, diferentes distâncias, contato/erro/bloqueio e combo breaker.
- [ ] Detectar loops, combos que não encerram e recursos que não consomem corretamente.
- [ ] Conferir no treino, ajustar individualmente com o usuário e registrar aprovação da receita.
- [ ] Alimentar o treino de combos apenas com receitas aprovadas e contatos reais no mesmo combo.
- [ ] Consolidar a ficha e os critérios mensuráveis de aprovação do shoto.

**Saída:** primeiro personagem pré-definido e equilibrado com aprovação do usuário. Não há quantidade mínima de receitas inventada nesta revisão.

## Etapa 4 — consolidar modos e apresentação

### Artes para tela inicial — 25/10/2026

Branch: `codex/feature-artes-tela-inicial`. Objetivo: produzir duas propostas de fundo para o menu atual com contorno expressivo, sombras gráficas e textura controlada. Escopo: artes estáticas, sem integração da interface ou definição visual do Shoto.

- [x] Gerar e inspecionar Arena de Brasa e Pátio de Jade, com área de baixo contraste à esquerda para as seis opções.
- [x] Salvar PNGs originais, dimensões, prompts e orientação de uso em [assets/art/menu/README.md](./assets/art/menu/README.md).
- [x] Validar instalação, 109 testes em 13 arquivos, build e diff.
- [x] Enviar branch, confirmar CI e integrar o pacote de propostas em `development`.

Critério artístico desta entrega: duas alternativas originais sem texto incorporado ou personagens, disponíveis para avaliação. Não equivale à aplicação do guia no jogo. Seleção de fundo, integração e revisão visual no menu continuam pendentes; as imagens foram inspecionadas isoladamente.

Validação local aprovada com `npm ci`, `npm test -- --run`, `npm run build` e `git diff --check`. Ambas as imagens são PNG RGB de 1672 × 941. Nenhuma mudança no runtime: revisão dentro do jogo não se aplica ao pacote de alternativas, mas permanece obrigatória para sua integração visual futura.

Pacote integrado por fast-forward em `development`, commit `ed802341655d6d8a7a959ecd37ed167013d4fb6d`. CI da [branch](https://github.com/feittosaa/close-combat/actions/runs/40208532085) e da [integração](https://github.com/feittosaa/close-combat/actions/runs/40208596497) aprovadas. A primeira execução identificou uma linha vazia ao fim do guia, corrigida antes da integração. Este fechamento documental segue o mesmo fluxo de CI e integração. Sem promoção para `main` ou tag.

### Sprites básicos do Shoto — integração autorizada

Branch: `codex/feature-shoto-sprites`, criada de `origin/development` para não misturar o menu diurno pendente. Objetivo: aplicar as três folhas wide escolhidas, sem produzir ou simular arte de outros estados.

- [x] Preservar fontes magenta; preparar 22 quadros RGBA (8 idle, 8 caminhada e 6 agachado), cada animação em uma faixa horizontal, células 512 × 768, pés em Y=720.
- [x] Carregar atlas em luta e menu, espelhar direção e alinhar pés ao estado físico; manter escala uniforme e proporções alongadas.
- [x] Amostrar clipes pelo frame lógico; recuo usa caminhada invertida. Preview de menu usa idle e remove listener ao ser destruído.
- [x] Manter fallback geométrico para ações sem arte; nenhuma alteração nas regras ou colisores.
- [x] Validar preparação, testes de integração/determinismo, instalação, build e diff.
- [ ] Conferir arena nos dois lados, centro/cantos, caminhada/recuo, agachado, pausa/reset e transições entre sprite/geometria.
- [x] Enviar implementação e confirmar CI da branch.
- [ ] Integrar em `development` somente após revisão visual.

**Estado:** implementação local pronta; 115 testes em 14 arquivos aprovados. As tiras preparadas foram inspecionadas isoladamente, e a preparação verifica transparência, limites de célula e pé opaco em Y=719 para todos os quadros. O navegador de inspeção volta a expirar ao abrir o jogo em `127.0.0.1:5176`; não há evidência de reprodução na arena nesta entrega. Não confundir inspeção de PNGs/testes com homologação visual. Limites das folhas de origem e reprodução em [src/assets/sprites/characters/shoto/README.md](./src/assets/sprites/characters/shoto/README.md).

Estado remoto: commit de implementação `2e72438a7044ccc160a3cf2659ea6c1c00ebe494` enviado; [CI da branch aprovada](https://github.com/feittosaa/close-combat/actions/runs/40254140672). Sem integração em `development`, promoção para `main` ou tag enquanto a revisão visual estiver pendente. O registro documental final acompanha a mesma branch.

### Menu diurno aprovado — 25/10/2026

Branch: `codex/feature-menu-diurno`. Aval manual recebido para aplicar a primeira arte diurna da segunda rodada como fundo padrão. As propostas anteriores permanecem históricas; não são o fundo aprovado.

- [x] Adotar `patio-solar.png`, com movimento lento sem expor bordas e partículas de luz; respeitar movimento reduzido.
- [x] Ajustar menu e CSS das configurações ao traço e paleta da peça; liberar a direita para o portal e o sol.
- [x] Registrar em `base.md` e `identidade-visual.md` o padrão de desenho e liberdade de paleta; exigir aval manual para novas imagens exploratórias.
- [x] Validar instalação, 109 testes em 13 arquivos, build e diff.
- [ ] Conferir no jogo os modos, configurações, retorno e animação.
- [x] Enviar implementação na branch e confirmar CI remota.
- [ ] Integrar em `development` após conferência visual.

Critérios: arte correta, opções legíveis, foco claro, movimento discreto, navegação preservada. O personagem continua com representação neutra.

Validação local: `npm ci`, `npm test -- --run`, `npm run build` e `git diff --check` aprovados. Conferência visual bloqueada: o navegador de inspeção reconhece as páginas locais, mas navegação, foco e captura de tela expiram, inclusive em aba nova. Servidor local restrito a `127.0.0.1:5174`. Não há captura ou homologação visual desta alteração; manter a feature fora de `development` até conferir o jogo. O movimento usa ciclo suave de 36 segundos com margem de 4,5% e nove partículas discretas, sem alterar a simulação de combate.

Estado remoto: implementação enviada no commit `473239ba86a15dab887b032efc695831280c1f80`; [CI da branch aprovada](https://github.com/feittosaa/close-combat/actions/runs/40212901225). Sem integração, promoção ou tag. Este registro documental acompanha a branch e não substitui a revisão visual pendente.



### Apresentação conjunta em Full HD

Branch: `codex/feature-apresentacao-1080p`, criada de `origin/development` e reunindo os commits das branches de sprites e menu conforme o novo pedido. As branches originais foram preservadas. Este objetivo inclui aplicar o menu diurno já aprovado, não apenas trocar a resolução do canvas.

- [x] Reunir menu diurno animado, CSS e sprites do Shoto; preservar conteúdo e documentação das duas entregas.
- [x] Canvas 1920 × 1080, ajuste FIT 16:9, antialiasing e textos em resolução 2.
- [x] Preservar coordenadas lógicas 1024 × 576 para arena/HUD/menu e regras de combate; projetar câmeras em escala uniforme 1,875.
- [x] Aumentar zoom próximo de 1,55 para 1,95 (+25,8%) com abertura por distância e piso compartilhado.
- [x] Validar testes de cantos do menu, piso/tamanho do personagem/HUD e ambos os extremos em Full HD; manter demais regressões.
- [x] Concluir instalação, 119 testes, build e diff finais.
- [x] Enviar branch e confirmar CI remota.
- [x] Conferir visualmente menu animado, configurações, seleção, treino/luta, escala, pés, pausa/reset em 1080p. Conferência concluída na entrega conjunta de HUD abaixo; o bloqueio anterior foi superado.

Validação final: 119 testes em 15 arquivos e build aprovados. O teste do limite anterior de zoom foi atualizado para a nova regra de 1,95; testes novos verificam a projeção 1920 × 1080, preservação da arena e altura projetada de 526,5 pixels para um corpo de 144 unidades no enquadramento próximo. Na conferência inicial no navegador, o menu diurno, a seleção de personagem/cenário e os sprites dos dois jogadores apareceram corretamente. A arena revelou um deslocamento do HUD devido ao scrollFactor zero: a câmera da interface foi corrigida para origem superior esquerda, zoom 1,875 e scroll zero, e um teste específico foi adicionado. A prévia de seleção também foi ampliada de 1,04 para 1,6. Após o recarregamento, o navegador perdeu a conexão com o servidor e voltou a expirar em foco/captura, inclusive em aba nova. A revisão visual da versão final continua pendente; não homologar a correção do HUD apenas pelo teste. Manter esta branch fora de development até a conferência final. Prévia de desenvolvimento em `127.0.0.1:5177` e build de produção em `127.0.0.1:4180`. A tentativa com produção também expirou na captura automática; a revisão final permanece pendente.

Estado remoto: commit `bf4fc90aad09fa6959494239f43f008fab5dee55` enviado na branch conjunta, [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40259013522). Nenhuma integração em development, promoção para main ou tag nesta entrega. O fechamento documental segue na mesma branch.

### HUD, enquadramento e propostas de novas animações

Branch: `codex/feature-hud-enquadramento`, criada de origin/development e reunindo a apresentação Full HD pendente como dependência. O objetivo inclui concluir a conferência visual da apresentação, aumentar a presença do personagem, corrigir o tamanho aparente do agachado e alinhar os HUDs ao menu. As novas imagens são somente para avaliação e não fazem parte dos assets carregados pelo jogo.

- [x] Zoom próximo 2,25 (+15,4% sobre 1,95), com limite por altura do salto e abertura por distância; piso compartilhado.
- [x] Correção uniforme 0,9 nos seis quadros agachados, mesmos pés/pivô e caixas originais.
- [x] HUD de luta e treino com tema comum ao menu: painéis de tinta, ouro/coral/jade, serifas, barras segmentadas, vida numérica, marcadores de rounds, dados de frames/contato e teclas remapeadas.
- [x] Gerar cinco folhas preview em faixa horizontal com fundo magenta: salto (8), defesa (6), recuo (8), dash (6), backstep (6). Sem copiar novas imagens para o repositório ou importar no runtime; aguardam aprovação manual.
- [x] Auditar branches e remover 20 branches locais/remotas já integradas, sem PR aberto nem checkout ativo. Registro em docs/branches-encerradas.md.
- [x] Registrar encerramento de branches após merge/CI em docs/ci-cd.md e AGENTS.md.
- [x] Validar instalação, testes, build, diff e HUD/enquadramento no jogo; salvar evidências.
- [ ] Confirmar CI, integrar a entrega em development e encerrar suas branches dependentes.

Não considerar as novas animações aprovadas ou inseridas. A retirada das branches de sprites/menu/Full HD depende da integração desta entrega; seus commits serão preservados. A antiga branch de gravidade tem apenas um fechamento documental único do protótipo: preservar esse commit no histórico sem reaplicar conteúdo antigo antes de encerrar a referência.

### Consolidação funcional

Manter os modos utilizáveis nas etapas anteriores; consolidar aqui o conjunto homologado.

- [ ] PvP local: espelhamento, rounds, vitória, revanche e retorno ao menu.
- [ ] Treino: pausa, passo único, reset sem entradas residuais, dados de frame, caixas, histórico e recursos novos.
- [ ] Treino/tutorial de combos: receita, instrução, confirmação por acertos ordenados, repetição e saída.
- [ ] Arcade PvE: IA por entradas legais do novo kit, recuperação e progressão sem elenco descartado.
- [ ] Especificar identidade do shoto somente quando solicitada; validar uma ação antes de produzir o conjunto de arte.
- [ ] Aplicar o guia visual inspirado em Hades quando a produção for autorizada; conferir legibilidade do combate anime fighter no jogo.

**Saída:** fluxo completo e dados iguais entre PvP, PvE e treino, com evidência funcional e visual.

## Etapa 5 — expandir elenco após homologação

- [ ] Escolher com o usuário o próximo dos oito arquétipos restantes.
- [ ] Criar identidade e kit próprios, com golpes, colisão e rotas individuais.
- [ ] Comparar cada confronto com o shoto de referência; medir vantagens, respostas e recursos.
- [ ] Aprovar um personagem por vez antes de ampliar a produção.

Composite e história/roguelike não pertencem a esta etapa. Consultar [docs/ideias-futuras.md](./docs/ideias-futuras.md), sem iniciar implementação.

## Validação da revisão documental anterior e histórico

As pipelines anteriores, números de testes e aprovações de Ayla/Gris/Tester ficam no histórico do Git e nos registros auxiliares identificados como históricos. Não indicam avanço nas etapas novas. Infraestrutura existente poderá ser aproveitada após verificação; não reabrir automaticamente tarefas antigas de arte ou combos.

Validação local: `npm ci`, 419 testes em 24 arquivos, `npm run build`, links locais dos seis documentos ativos e `git diff --check` aprovados. Nenhum código de jogo ou teste foi alterado. Conferência visual no jogo não se aplica a esta entrega exclusivamente documental. Entrega integrada por fast-forward em `development`: commit `3ebb4097a96747056794a3780708ff6413f6d7f7`. CI da [branch](https://github.com/feittosaa/close-combat/actions/runs/40199645834) e da [integração](https://github.com/feittosaa/close-combat/actions/runs/40199715568) aprovadas. O fechamento deste registro documental segue o mesmo fluxo de CI e integração. Sem promoção para `main` ou tag nesta entrega.

Conferência conjunta concluída no build de produção: menu diurno, configurações, seleção, treino e PvP; agachado inspecionado por frame nos dois lados; salto preserva espaço do HUD; P2 apresenta 980/1000 após contato. Rodapé ajustado após revisão para separar contato e atalhos. Evidências em [docs/evidence/hud-enquadramento/README.md](./docs/evidence/hud-enquadramento/README.md). Validação final: 124 testes em 16 arquivos, build e diff aprovados. A conferência atual substitui a pendência visual das entregas de menu, sprites e Full HD; os relatos anteriores descrevem o estado histórico. Integração e CI desta branch ainda pendentes neste registro.

Revisão solicitada após a primeira conferência: substituir zoom dinâmico por câmera fixa em escala 1, apenas deslocamento horizontal, incluindo saltos; HUD minimalista com barras contínuas no topo, sem segmentação vertical e sem grandes molduras. As evidências anteriores do enquadramento serão substituídas pela conferência desta revisão antes da integração.

Revisão visual da câmera fixa concluída: treino, salto por frame e PvP, barras contínuas no topo e ausência de mudanças de escala/altura. O zoom 2,25 mencionado no primeiro checklist foi substituído pelo pedido posterior de câmera fixa. Menu diurno e configurações conferidos nesta mesma entrega.
