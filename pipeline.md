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

Validação local concluída: `npm ci`, 109 testes em 13 arquivos, build, links locais e diff aprovados. Conferidos no jogo os quatro golpes, guarda sem dano, catálogo com quatro entradas, PvP, Arcade, tutorial básico completo e estado vazio do treino de combos. No build de produção, verificados pausa e avanço único do frame 3 para o 4, sem erros de console. Evidências e rastreabilidade dos testes em [docs/shoto-migracao.md](./docs/shoto-migracao.md). CI remota e integração desta implementação: pendentes do envio da branch.

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
