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

### Animações aprovadas, cabelo e alinhamento

Branch: `codex/feature-shoto-animacoes-alinhadas`, criada de development após a integração anterior `a35e1ba`. [CI da feature anterior](https://github.com/feittosaa/close-combat/actions/runs/40263439670) e [CI de development](https://github.com/feittosaa/close-combat/actions/runs/40263559525) aprovadas. As cinco branches absorvidas foram removidas localmente e no remoto, somando 25 branches encerradas nesta sessão. Menu diurno, sprites iniciais e HUD estão integrados; as pendências históricas acima foram resolvidas.

Novo aval manual: inserir salto, defesa, caminhada para trás, dash e backstep, com cabelo avermelhado uniforme em todas as folhas. Revisar alinhamento X, pés e loops, especialmente agachado. Aumentar presença do personagem pela referência de proporção fornecida, mantendo câmera fixa.

- [x] Editar cabelo nas oito folhas sem redesenhar poses, preservar fontes e registrar preparação.
- [x] Preparar atlas com raiz X autorada, escala comum, pés alinhados e ciclo agachado sem teleporte.
- [x] Integrar estados pela lógica real, sem inventar ataques ou animações não aprovadas.
- [x] Escala fixa 1,6 (corpo de cerca de 40% da altura); manter salto inteiro. Limitar afastamento ao espaço visível, com margem lateral de 64 unidades por lutador, para evitar desaparecimento sem zoom dinâmico.
- [x] Validar preparação, testes, build, diff e jogo em ambos os lados, pausa/reset, canto e salto.
- [x] Enviar, conferir CI, integrar e encerrar branch concluída.

Conferência da revisão de animações: 56 desenhos em oito atlas, cabelo editado pelo image_gen embutido; verificação independente de pixels sem corte/magenta opaco, pés alinhados e desvio X agachado de 1,5 pixel. Ciclo agachado em ida/volta, entrada de guarda sem reinício a cada volta e guarda fechada durante blockstun. Salto de P1/P2, recuo, dash, backstep, afastamento máximo e canto conferidos no jogo; capturas em docs/evidence/shoto-animacoes-alinhadas. A arte de ataques/hitstun continua provisória, conforme escopo aprovado. Estado remoto desta nova branch: envio/CI ainda pendentes neste registro.

Validação final desta revisão: instalação reproduzível concluída, 129 testes em 17 arquivos, build, diff e verificação dos pixels aprovados. Evidências de P2 no ápice confirmam espelhamento; revisão no afastamento máximo mantém ambos na tela, sem mudanças de escala. O cenário de treino solicitado depois será entregue em branch independente.

### Sala de treino — substituição do Cais

Branch: `codex/feature-sala-treino`, criada de development após integração das animações `de97cce`. CI da feature 40265537116 e CI de development 40265888943 aprovadas; branch de animações encerrada local/remotamente.

- [x] Gerar sala ilustrada neutra próxima da referência quadriculada, sem personagens/props/texto, e registrar prompt/origem.
- [x] Retirar Cais do catálogo e dos assets ativos; preservar histórico Git e evidências antigas.
- [x] Fixar sala no treino e dois tutoriais, sem etapa de escolha; única opção temporária nos modos gerais.
- [x] Validar testes, instalação, build, diff e jogo; conferir solo, enquadramento e todos os modos.
- [x] Enviar e confirmar CI; integração conjunta registrada abaixo, encerramento após CI de development.

Pedido posterior de dashs mais longos e transições suaves segue em objetivo separado; a geração dos conectores já começou sem misturar sua implementação nesta branch.

Sala final conferida no treino e capturada em docs/evidence/sala-treino/treino.png. Instalação, 135 testes em 18 arquivos, build e diff aprovados; PNG final preservado em tamanho nativo. Conferência da navegação dos demais modos ficou pendente após timeouts de foco/CDP no navegador; servidor de produção segue ativo e responde HTTP. Preservar a branch sem integração até completar essa conferência. O objetivo de dash/transições prossegue separadamente a partir de development.

### Dash imediato e transições suaves

Branch: `codex/feature-dash-transicoes`, criada de origin/development após as animações alinhadas. Pedido: dois toques imediatos com dash mais visível e demorado, mais sprites intermediários para evitar saltos de pose.

- [x] Capturar dois toques físicos entre ticks; pedido único, relativo ao facing; respeitar reset, blur, soltura e auto-repeat.
- [x] Dash/backstep iniciam no segundo toque e completam 24 frames após soltar; corrida somente ao manter avanço depois do dash.
- [x] Gerar sete conectores de quatro desenhos (28 novos, 84 no total), preservando cabelo/identidade, raízes e proporções.
- [x] Entradas/saídas autoradas, retorno parcial em interrupção e mistura lógica de três frames entre ações; pausa/FPS determinísticos.
- [x] Margem lateral 88 para manter as poses largas dentro do quadro, sem zoom dinâmico.
- [x] 137 testes em 18 arquivos, build e diff aprovados; verificação independente dos 84 quadros aprovada.
- [x] Conferir duração/loops/transições no jogo e registrar evidências; acesso recuperado após os timeouts.
- [x] Enviar e confirmar CI; integração conjunta registrada abaixo, encerramento após CI de development.


Dependência reunida para revisão conjunta: a branch de dash mantém o commit próprio `c616f68` e incorpora a sala pelo merge da branch `72cc275`, preservando ambos os objetivos. Integração em development aguarda a conferência visual conjunta e a CI do conjunto.

Conferência conjunta concluída após recuperar a prévia: treino, tutorial básico, tutorial de combos, PvP e Arcade usam a Sala de Treino. Tutoriais entram diretamente após escolher personagem; modos gerais mostram a sala como única opção. Evidências em docs/evidence/sala-treino. A pendência visual anterior está resolvida.

Dash e backstep conferidos após dois toques curtos e soltura: dash no frame 9, backstep no frame 12 e avanço até frame 24; entradas/saídas de caminhada, agachado e salto revisadas com avanço por frame, sem mudança de câmera. Capturas em docs/evidence/dash-transicoes. Correção adicional preserva o relógio de stun ao limpar direção residual. Validação conjunta: 144 testes em 19 arquivos, build, diff e verificação independente dos 84 quadros aprovados; instalação reproduzível executada nesta entrega.

Estado remoto antes do fechamento: sala `72cc275`, CI 40267614680 aprovada; conjunto `1d0e555`, CI 40269742462 aprovada. O commit de fechamento registra a revisão e segue novamente CI de feature, integração e CI de development; as duas branches serão encerradas somente após confirmação. Sem promoção para main.

Fechamento: código e evidências `5026ec3180b40ae1576ef5f49e4e7cfb41ea52e4` enviados e integrados por fast-forward em development. [CI da feature 40271546638](https://github.com/feittosaa/close-combat/actions/runs/40271546638) aprovada; [CI de integração 40271628696](https://github.com/feittosaa/close-combat/actions/runs/40271628696) aprovada no mesmo commit. Este último ajuste é somente documental e seguirá a mesma validação remota antes do encerramento das duas branches. A conferência no jogo e os 144 testes pertencem ao código integrado.

### Paleta uniforme e remoção da corrida — 26/10/2026

Branch `codex/feature-shoto-paleta-sem-corrida`, a partir de development. Padronizar seis materiais em todos os 84 desenhos e nas prévias do menu: cabelo castanho discretamente avermelhado, pele um pouco mais morena, calça escura, paletó marfim, camisa vinho e sapatos castanhos. Aplicar a tabela compartilhada na preparação das texturas do jogo, mantendo fontes, alpha, células e raízes intactos. Remover corrida da simulação, dados, seleção de clipes e HUD; ao terminar o dash, manter direção deve resultar em caminhada.

- [x] Paleta comum documentada e aplicada a todos os atlas.
- [x] Remover corrida e cobrir retorno à caminhada nos dois sentidos.
- [x] Instalação, testes, build, diff e conferência visual de todas as ações.
- [x] Código enviado e CI da feature aprovada; fechamento segue integração/CI de development e remoção da branch conforme docs/ci-cd.md.

Validação local concluída: npm ci, 147 testes em 20 arquivos, build e diff aprovados. Corrida removida do tipo de estado, dados de movimento, simulação, rótulos e clipes; testes verificam caminhada por 60F adicionais após completar o dash. Paleta RGB aplicada uma vez por atlas, com alpha e quadros preservados. Regressões cobrem pele/cabelo/camisa, botas levantadas e dobras marfim ao nível da cabeça durante dash, além de células com alturas diferentes.

Conferência no build de produção concluída: seleção, idle nos dois lados, caminhada/recuo, agachado, salto, dash, retorno à caminhada no frame 30, backstep, guarda e conectores. Corrigidas sombras quentes da manga que inicialmente eram confundidas com pele. Capturas e procedimento em docs/evidence/shoto-paleta/README.md. A prévia foi recuperada por nova aba após timeout ao recarregar. Envio/CI e integração seguem a etapa final abaixo; não confundir esta validação local com resultado remoto.

Entrega de código `8d7abf1f42494b7a83b2c2c723a3802cc669b027`: [CI da feature 40325219320](https://github.com/feittosaa/close-combat/actions/runs/40325219320) aprovada. Registro final acrescenta resultado.png e documentação; não altera código nem invalida a conferência. Integração por fast-forward e encerramento somente após CI do commit final e de development, sem promoção para main. O relato de conclusão confirma o resultado remoto dessas etapas.

Último ajuste de tom: a faixa média de pele foi escurecida para `#966344` (amostra de origem RGB 182/109/64 passa a 150/99/68), reservando a luz mais clara a valores acima de 190. Isso evita clarear a pele ao padronizar. Seleção e treino dos dois lados reconferidos; resultado.png atualizado. 147 testes, build e diff novamente aprovados. As capturas por ação registram a conferência anterior de classificação dos materiais; resultado.png registra a intensidade final da pele.

### Cores contínuas sem recortes e presença +3%

Branch `codex/fix-shoto-cores-suaves`, criada de development. Feedback do usuário rejeita os artefatos na jaqueta/pele da correção de cores anterior. Causa: classificação por limiares e troca por cores discretas; medianas por linha também mudavam a classificação de pixels vizinhos. Substituir por correção RGB contínua, preservar contornos/sombras/alpha e marfim original. Manter cabelo castanho discreto e pele um pouco mais morena. Ampliar o desenho uniformemente em 3%, com pés/raízes preservados, câmera fixa e sem alterar colisores; ajustar margem lateral para o desenho completo.

- [x] Validar continuidade em vizinhos RGB e coordenadas, transparência e ausência de quantização.
- [x] Conferir cores de todas as ações, salto inteiro e aumento discreto no jogo.
- [x] Instalação, testes, build, diff e push; CI da feature aprovada. Fechamento documental segue CI própria, integração/CI de development e remoção da branch conforme manifesto.

Conferência no build de produção concluída: seleção/idle nos dois lados, caminhada/recuo, agachado, dash/backstep, guarda e salto em execução. Salto capturado no frame 19 sem o painel de pausa, personagem inteiro e abaixo do HUD. Jaqueta e pele preservam as sombras originais, sem o mosaico de cores criado pela classificação anterior. Evidências em docs/evidence/shoto-cores-suaves. Escala do desenho +3%, margem 92, afastamento máximo 456 em 1024 × 576; câmera continua fixa em 1,6 e colisores inalterados. Instalação reproduzível, 149 testes/20 arquivos, build e diff aprovados. Fechamento remoto segue CI do commit final antes de integração e encerramento; sem promoção para main.

Código/evidências enviados em `4758f3045c39d47c2e3c255f78c060eed1747c7d`, [CI da feature 40340414066](https://github.com/feittosaa/close-combat/actions/runs/40340414066) aprovada. Este fechamento é somente documental. Integrar após CI do commit final, verificar CI de development e encerrar `codex/fix-shoto-cores-suaves` local/remotamente; o relato final confirma essas etapas do remoto. Sem alteração de main ou tags.

### Transições sem piscadas de opacidade

Branch `codex/fix-shoto-piscadas`, criada de development. Feedback: animações parecem piscar após correção das cores. Reprodução com snapshots reais: no frame 2 da entrada de caminhada, duas camadas com alpha 2/3 e 1/3 produzem cobertura composta 7/9 (77,78%) em composição source-over, deixando o cenário aparecer através do corpo. Regressão adicionada e confirmada falhando antes da correção.

Retirar a dissolução por alpha entre poses; renderizar uma pose sempre opaca. Preservar os conectores autorados de entrada/saída, seus tempos, cores, escala +3%, física, raízes e pausa determinística.

- [x] Regressão de cobertura opaca em ambos os lados, entradas/saídas, interrupções, salto/aterrissagem e dash/backstep.
- [x] Conferir movimentos e interrupções no jogo, registrar evidências.
- [x] Instalação reproduzível, 150 testes em 21 arquivos, build e diff aprovados.

Conferência no build de produção concluída com a mesma aba atualizada: caminhada e saída, entrada/interrupção curta de agachamento, dash no frame 2, reversão em movimento real e salto. Capturas em docs/evidence/shoto-sem-piscadas; o frame 2 que antes apresentava cobertura de 77,78% agora desenha uma única pose com alpha 1. Os conectores e seus tempos continuam ativos, assim como as verificações de pausa/FPS 30/60/120/144. Ajustadas somente as expectativas antigas de duas camadas que descreviam o comportamento defeituoso; testes de retorno parcial e determinismo permanecem.

Fechamento remoto desta entrega segue docs/ci-cd.md: envio, CI da feature, integração em development somente com CI verde do commit enviado, CI de development e remoção da branch após confirmar ancestralidade. O relato final registra o resultado efetivo dessas etapas. Sem promoção para main.

### Quatro básicos ilustrados e guardas por postura

Branch `codex/feature-shoto-golpes-guardas`, criada de origin/development. Criar e implementar soco fraco/forte, chute fraco/forte, defesa agachada e aérea no mesmo personagem/traço, sem modificar o balanceamento dos quatro básicos. Sincronizar poses com preparo, atividade e recuperação reais; raízes, proporções, cores naturais e opacidade preservadas. Guardas devem ser alcançáveis na postura correspondente.

Regra persistente atualizada em AGENTS.md, docs/ci-cd.md e base.md: commits/push autorizados; nenhum merge em development sem pedido explícito do usuário. Esta entrega termina na branch validada/enviada, mantida para revisão.

- [x] Gerar seis folhas e preservar fontes/prompts/proveniência.
- [x] Preparar atlas e raízes, integrar os quatro ataques por fase e duas guardas por postura.
- [x] Verificar preparação, transparência, enquadramento, ambos os lados, impactos/defesas, pausa/reset e FPS.
- [x] Instalação, testes, build, diff, conferência visual, commit/push e CI da branch.
- [x] Auditoria final: nenhuma integração em development, branch mantida.

Validação local desta branch: npm ci, 164 testes/22 arquivos, build, verificador dos 116 frames e diff aprovados. Revisão no jogo dos seis clipes em ambos os lados, com impactos, bloqueios reais, retorno e reset. Evidências em docs/evidence/shoto-golpes-guardas. Os ataques usam células 1152×768 com a mesma altura/escala; guardas 768×768. Novo módulo amostra as fases reais; guarda aérea passa a ser alcançável com B/DB, sem suspender gravidade, sem novos golpes ou mudança dos básicos. Código/arte enviados em `4b6eeebe97b4416919df5dc6bdafab60ee973bb4`, com [CI da feature 40351472690](https://github.com/feittosaa/close-combat/actions/runs/40351472690) aprovada. Branch local/remota mantida para revisão; development permanece `a5930d901654feb419570ff642acc6025d20daed` e main `77a4c939c9ccdf028eed5f334132f65368dbae30`. Nenhum merge, promoção ou tag. Este fechamento altera apenas o registro documental e terá a própria CI verificada antes da conclusão; resultado do commit final no relato ao usuário.

### Revisão de identidade dos seis clipes — mesma branch

Feedback do usuário: rosto/traço divergentes do turnaround, cabeça/corpo maiores nos socos, pele mais vermelha e sapatos mudando de tom. Revisar socos/chutes fraco/forte e guardas agachada/aérea usando o turnaround original como autoridade; comparar à locomoção e preservar transições. Pedido explícito para continuar em `codex/feature-shoto-golpes-guardas`, sem merge.

- [x] Preservar turnaround no projeto e registrar regra permanente por personagem em AGENTS.md/base.md.
- [x] Corrigir seis fontes com a referência canônica e preservar prompts/proveniência.
- [x] Repreparar raízes/escala; conferir identidade, cores e continuidade no jogo.
- [x] Validar testes/build/diff/verificador e enviar a mesma branch, conferindo CI sem merge.

Revisão local concluída: seis fontes canônicas v2 preservadas, 120 quadros em 21 atlas, mesma escala corporal. Guardas recebem duas intermediárias adicionais; ligação de postura reaproveita conectores autorados, ataques usam fechamento/reabertura sem atrasar contatos. Corrigido relógio visual do salto para sobreviver à guarda/stun. 167 testes/22 arquivos, build, diff e verificador aprovados; seis clipes conferidos nos dois lados e evidências em docs/evidence/shoto-identidade-canonica. Sem novo filtro rígido de cor, sem física/balanceamento alterados. Revisão enviada em `56f32de5a07129b6a1c87658cbf905d60c94e818`, com [CI 40373356429](https://github.com/feittosaa/close-combat/actions/runs/40373356429) aprovada. A branch local/remota continua mantida para conferência manual. Auditoria do remoto: development segue `a5930d901654feb419570ff642acc6025d20daed`, main `77a4c939c9ccdf028eed5f334132f65368dbae30`; nenhum merge ou tag. Este fechamento é somente documental; sua CI própria será conferida antes do relato final.

Regressão adicional: interromper a guarda após um único frame usa somente a profundidade alcançada; mantém a descida se D continuar, sem saltar para braços fechados.

### Figurino de todas as animações, caminhada 16F e golpes fortes v3 — REPROVADA

Pedido: padronizar mangas três quartos/um relógio esquerdo/sem braceletes/sem cinto/calça escura em TODAS as folhas antigas e novas; regenerar soco/chute fortes com proporções do idle e ampliar desenhos de caminhada para frente. Continuar na mesma branch sem merge.

- [x] Registrar regras definitivas e preservar referência de figurino complementar.
- [ ] Corrigir todas as folhas e conectores, preservar fontes/prompts e conferir peças/acessórios. — Tentativa v3 reprovada.
- [ ] Integrar caminhada de 16 desenhos reais e dois golpes fortes regenerados, sem crescimento de cabeça/corpo. — Integração v3 retirada.
- [ ] Conferir jogo, testes, build, preparo/verificação e diff; enviar/CI na mesma branch, sem merge. — Checagens técnicas passaram, arte reprovada.

Validação local desta revisão: npm ci, 168 testes/22 arquivos, build, preparo dos 128 quadros e verificador de pixels aprovados. Cabeça dos fortes comparada ao idle na mesma escala (largura superior 97–105 px, referência mediana 100 px); pés agachados dentro de 3 px. Conferência no jogo e capturas em docs/evidence/shoto-figurino-v3, incluindo quatro ataques nos dois lados e guardas reais. As 22 fontes v3, referência de figurino, prompts e seleção final foram preservados. Escala de exibição, câmera fixa e regras de combate mantidas. Revisão enviada em `cb7c3de4971cc8a09e0bcd052253c933081c3e3c`, com [CI 40383532409](https://github.com/feittosaa/close-combat/actions/runs/40383532409) aprovada. Auditoria remota: development permanece `a5930d901654feb419570ff642acc6025d20daed` e main `77a4c939c9ccdf028eed5f334132f65368dbae30`; nenhum merge ou tag. Branch local/remota mantida para validação manual. Este fechamento é documental; sua própria CI será conferida antes do relato final.


### Rejeição visual da v3 e recuperação da base anterior

O usuário reprovou a v3: dedos rosados, relógio intermitente, marcha incoerente, agachado pequeno, blazer excessivamente branco, cabelo/estilo divergentes, soco brusco e troca da perna no chute. As marcações técnicas da seção anterior não representam aprovação artística; a v3 não está concluída nem aprovada.

- [x] Identificar a troca em lote e preservar o histórico rejeitado sem reescrever commits.
- [x] Restaurar sprites, raízes, preparo e reprodução de 61ccbf9, anterior à v3; retirar intermediárias rejeitadas do runtime.
- [x] Conferir restauração no jogo, testes, build, verificação e diff; enviar a mesma branch e verificar CI, sem merge.

Objetivo desta recuperação: voltar à base anterior, sem nova geração ou tentativa de corrigir todas as folhas ao mesmo tempo. Os ajustes artísticos solicitados continuam pendentes e serão tratados pontualmente; não declarar que a restauração os resolveu.

Restauração local conferida: 44 arquivos ativos idênticos byte a byte a 61ccbf9 (imagens, atlas, raízes e reprodução), 120 desenhos/21 atlas, sem as intermediárias rejeitadas. npm ci, 168 testes/22 arquivos, build, verificador e diff aprovados. Capturas/relatório em docs/evidence/shoto-restauracao-v3. Nenhuma arte nova gerada. Restauração enviada em `b05c86c52503f70bfb83275112ee93e17ead9072`, com [CI 40388103035](https://github.com/feittosaa/close-combat/actions/runs/40388103035) aprovada. Nenhuma integração; a aprovação técnica comprova a execução da recuperação, não os ajustes artísticos pendentes. Este fechamento documental terá a própria CI conferida antes do relato final.


### Ajustes localizados v4 nas folhas existentes

Pedido atual: remover cinto/fivela de todas as folhas, uma pulseira de ouro em cada braço, cavanhaque marrom igual ao cabelo e calça no cinza mais escuro. Preservar desenhos existentes, rosto, blazer creme, pele, sapatos, altura e alinhamento. Somente caminhada frontal recebe novas intermediárias entre as poses atuais; chute forte deve preparar, estender, recolher e pousar a mesma perna. Não usar a v3 rejeitada. Mesma branch, sem merge.

- [x] Editar e comparar uma primeira folha, sem trocar os desenhos que já funcionam.
- [x] Aplicar somente os detalhes pedidos às demais folhas e conectores, conferindo poses/cores/acessórios.
- [x] Criar intermediárias da caminhada entre pares dos oito desenhos existentes, mantendo as chaves; corrigir continuidade da perna no chute forte.
- [x] Preparar sem deformar/recolorir os desenhos, conferir ciclos no jogo, testes/build/diff e registrar estado real do remoto.

O pedido atual inclui trazer o Bar ao Anoitecer da conversa «Gerar três imagens de cenário» para ESTA mesma branch. Arte e implementação de 254b6af reaproveitadas, com chão reduzido, Arcade/PvP no bar e treino/tutoriais na sala. Não altera câmera nem escala dos personagens. A validação conjunta será refeita com as animações v4.


Revisão v4 concluída localmente: 21 folhas existentes retocadas e oito intermediárias individuais, total 128 quadros em 22 atlas. Os oito desenhos antigos de caminhada continuam presentes; somente o quinto desenho do chute forte muda a perna de retorno para manter a continuidade. Figurino vigente documentado (sem cinto, duas pulseiras, cavanhaque marrom e calça carvão). Preparo técnico sem repintura/quantização; câmera, escala de exibição, física e tempos de golpes mantidos. Fontes/prompts e comparação de silhueta preservados.

Bar ao Anoitecer trazido de 254b6af para esta mesma branch por pedido explícito: PvP/Arcade no bar, treino e ambos os tutoriais na sala. Miniatura proporcional e piso reduzido preservados. Conferência conjunta no jogo em docs/evidence/shoto-fine-v4: ciclo completo de caminhada, recuo/agachado/salto, dash/backstep, quatro ataques, fortes dos dois lados, bloqueios agachado/aéreo reais, seleção/bar/PvP e tutoriais. Nenhuma homologação artística inferida dos testes.

npm ci concluído; 174 testes em 22 arquivos, build, verificador dos 128 desenhos e diff aprovados. Pé agachado varia 1,5 px no atlas. Push e CI do commit desta entrega serão conferidos antes do relato final; nenhum merge em development ou main.
