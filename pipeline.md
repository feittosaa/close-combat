# Close Combat — Pipeline de implementação

> **Entrega e versionamento:** seguir o [manifesto de CI/CD](./docs/ci-cd.md): branches por objetivo, testes antes do push, integração em `development` e releases posteriores em `main` com tags.

> **Raiz:** [`base.md`](./base.md), revisão de design 0.4.0.
> **Revisão:** 23/10/2026.
> **Alvo:** luta local 1 contra 1, apresentação arcade 2D em poses desenhadas e combate técnico com espaço, recuperação e punições.
> **Estado:** fundação e núcleo preservados; primeira entrega da consolidação de animações e treino implementada. Combos completos e homologação final de balanceamento continuam pendentes.

## Combate orgânico autoral e tutoriais — 23/10/2026

Branch: `codex/feature-combate-organico`. Objetivo: substituir a cópia direta dos livros externos por comandos acessíveis e escolhas de combo, com catálogo inicial editável de Ayla.

- [x] Registrar em `base.md` a nova precedência autoral e arquivar o contrato anterior.
- [x] Criar `docs/ayla-golpes.md` com 80 entradas contáveis: 18 bases, 55 etapas de string, quatro especiais, dois agarrões, ultimate.
- [x] Integrar livros autorais de Ayla/Gris: seis ataques por postura, mesmo golpe andando para frente/trás, seis launchers, quatro especiais por lutadora e projétil.
- [x] Adicionar dois agarrões com quebras distintas e troca de lado; ultimate bloqueável e limitada por round/vida.
- [x] Criar tutorial básico e tutorial progressivo das duas receitas iniciais por entradas reais.
- [x] Validar `npm ci`, 388 testes, build TypeScript/Vite e `git diff --check`.
- [ ] Concluir a revisão visual dentro dos tutoriais: o menu com seis modos foi conferido, mas o navegador de inspeção deixou de responder antes de validar luta e progressão.
- [ ] Integrar em `development` apenas após revisão visual completa e CI verde do commit atual. Push/CI da branch são relatados na entrega, separados dos checks locais.

Verificação automatizada inclui os seis básicos nas três posturas, identidade em avanço/recuo, tolerância dos acordes, seis starters por lutadora, projéteis à distância, dois agarrões e quebras, ultimate/limite por round, duas receitas contra Ayla/Gris/Tester e conclusão das onze lições básicas por entradas comuns. Os testes anteriores de livros importados continuam com fixtures históricos explícitos, sem remover sua cobertura.

Pendência de ambiente: após o primeiro menu renderizado, a API de inspeção deixou de responder a foco, navegação e captura, inclusive em abas novas. O servidor local continua respondendo HTTP 200. Não declarar revisão visual completa nem integrar a feature com base apenas na suíte verde.

Limites: arte reaproveitada/provisória; a ficha de 80 entradas é base de autoria, não balanceamento final nem 80 animações únicas. Outras receitas para extensor/postura/carry serão adicionadas ao tutorial conforme homologação. Tester/Dummy e fixtures históricos preservam regressões; seus comandos não governam o elenco autoral. Não promover `main` sem marco de release.

O histórico abaixo permanece rastreável. Menções a prioridade Ayla/Tekken e variantes direcionais estão substituídas por esta entrega e `base.md` §1.3.

## Continuação da Etapa 3.1 — equivalência de reprodução

Cobertura integrada da simulação e apresentação por personagem: a mesma entrada lógica deve exibir o mesmo quadro, textura, posição, pivô, escala e orientação em 30/60/120/144 FPS. Renderizações durante pausa mantêm a pose e reset reproduz o início. O roteiro passa por preparo, atividade, recuperação após bloqueio, salto, agachamento e recuo. A auditoria artística dos golpes da Etapa 3.2 permanece pendente.

Validação local: 362 testes, build e diff aprovados após instalação offline com scripts desativados. Entrega em `codex/test-animation-fps-pause-reset`, acompanhada no PR #15; a CI desse PR executa instalação padrão e validação completa.

## Regressão dos cenários — 22/10/2026

- [x] Descobrir todos os cenários pelo catálogo real e exigir piso fixo, enquadramento progressivo, limites da imagem, visibilidade dos lutadores e troca de lados em quatro resoluções.
- [x] Conferir a integração de `StageView`: zoom uniforme, scroll vertical compartilhado pelas camadas e limpeza da câmera ao sair da luta.
- A matriz automatizada protege geometria e configuração. A perspectiva/legibilidade de novas artes ainda exige revisão visual.

Entregue pelo PR #14, merge `d8c57c2`; 350 testes/build/diff locais aprovados; CI do push (#40), PR (#41) e merge (#42) aprovadas.

## Câmera uniforme e chão compartilhado — 22/10/2026

Zoom uniforme nos dois eixos, piso projetado na altura fixa `floorY`, chão e lutadores com o mesmo scroll vertical. Limites horizontais consideram a largura visível após zoom; o zoom mínimo impede exibir fora da imagem do cenário. Substitui as correções anteriores de câmera.

Validação: 345 testes, build e diff aprovados. Revisão no jogo com distância 96 e afastamento real até 815: proporções preservadas, pés na mesma linha do chão e abertura do enquadramento. Integração confirmada pelo PR #13, merge `e6ac9f2`, CI do push (#37), PR (#38) e merge (#39) aprovadas.

## Histórico substituído: remoção do zoom vertical — 22/10/2026

- [x] Limitar o zoom dinâmico ao eixo horizontal; manter zoom vertical em `1` e posição Y central fixa.
- [x] Cobrir por teste que distâncias próximas e longas variam apenas o enquadramento horizontal; revisar no jogo.

Validação local: 345 testes, build e `git diff --check` aprovados. No treino, os pés permaneceram alinhados à linha do cenário em distâncias 96 e 220; a câmera altera o enquadramento horizontal e não escala no eixo vertical. CI remota e integração serão registradas na entrega.

## Histórico substituído: compensação vertical — 22/10/2026

- [x] Calcular o scroll vertical em relação ao centro da viewport para preservar o `floorY` na tela durante o zoom.
- [x] Adicionar regressão de enquadramento em zoom próximo, normal e distante; conferir os pés no jogo em distâncias 96, 144 e 220.

Validação local: 345 testes, build e `git diff --check` aprovados. A CI remota e integração serão registradas na entrega.

## Levantada manual, balanceamento Gris/Noctis, comandos e chão — 22/10/2026

Branch: `codex/feature-gris-recovery-floor-controls`; commit `112f94a`, PR #9 integrado em `development` pelo merge `61bfd52`.

- [x] Documentar a API Tekken e a ficha do Noctis como referências, com limites de adaptação em `base.md`.
- [x] Implementar espera manual no chão e levantada com `1`/`2` (ataque) ou `F`/`B` (andar/guardar); quedas forçadas mantêm a janela de proteção e continuam caídas depois dela.
- [x] Ajustar startup, recuperação e dano dos golpes normais, agachados, aéreos, especiais e agarrão da Gris, mantendo tesoura, hitboxes e livro próprios.
- [x] Registrar fonte, comando, startup, dano/vantagens e adaptação em cada movimento da Gris; implementar e validar a string local `1,2` inspirada na de Noctis.
- [x] Ampliar configurações com teclas editáveis de pausa e reinício de treino, sem conflito com comandos dos jogadores ou atalhos de treino.
- [x] Manter os pés no mesmo ponto da tela durante o reenquadramento de zoom da luta.
- [x] Validar testes automatizados (344/344), build e diff.
- [x] Conferir no jogo a linha dos pés em treino nas distâncias 96, 144 e 220, alternando o zoom, e confirmar a tela de controles com pausa/reinício remapeáveis.
- [x] Commitar e enviar a branch; CI do push (#24) e do PR (#25) aprovadas; integrar em `development` e confirmar CI do merge (#26) aprovada.

API comunitária voltada a frame data de Tekken 7; Noctis é base funcional de espada, sem copiar identidade ou dados crus. A ficha individual existe em `balanceReference` para todo movimento da Gris; startup/dano foram adaptados, enquanto recovery, hitboxes, vantagens reais e continuidade dos clipes ainda dependem de homologação visual e por matchup. As CI do push, do PR e do merge em `development` passaram; integração confirmada em `61bfd52`.

Revisão no navegador em 22/10/2026: o marcador de chão e os pés das duas personagens permaneceram na mesma linha de tela no treino em 96/144/220; a tela `CONTROLES` exibiu movimentos de P1/P2, pausa `P` e reinício `R`. Um ataque real da Gris foi executado e confirmado no HUD. As quatro respostas de knockdown têm cobertura automatizada; não foi isolada captura visual de cada levantada. Balanceamento quantitativo e homologação das propriedades adaptadas seguem como trabalho futuro.

## Como usar

- As Etapas 0–2 preservam o trabalho concluído da pipeline anterior; não devem ser refeitas.
- A prioridade atual é a baseline autoral Ayla de 23/10/2026; o plano histórico abaixo ela orienta **Etapa 3 → Etapa 4 → Etapa 5 → Etapa 6 → Etapa 7**. Os primeiros instrumentos da Etapa 4 podem apoiar a revisão visual da Etapa 3.
- Cada checkbox significa implementação concreta. Cobertura automatizada, revisão visual e balanceamento são critérios separados; um build não aprova animação nem justiça de colisão.
- Registrar regras em `base.md` antes de codificar, usar dados por personagem e manter combate a 60 Hz independente do Phaser.
- Os números atuais dos golpes são provisórios. Usar dados de Tekken 7 verificados por versão como base, documentando conversão e adaptações 2D; não alterar tempos para encobrir defeitos de animação ou entrada. A revisão de cadência de 20/10, solicitada pelo usuário, está registrada em base.md: +2F de preparo, +1F ativo e +4F de recuperação nos strikes, sem alterar agarrões; requer revisão posterior de vantagem/balanceamento.
- Não marcar um sistema inteiro como pronto por existir um clipe ou um rótulo. Registrar limitações e próxima entrega.

## Feature de combate de Ayla — 21/10/2026

Branch: `codex/feature-combate-ayla`. Critérios e limites em [`docs/ayla-combate.md`](./docs/ayla-combate.md).

- [x] Integrar as 135 entradas de referência de Kazuya/T8 com comandos e condições executáveis, sem remover ações por ausência de arte.
- [x] Modelar por personagem contatos múltiplos, caixas/hurtboxes, fases, strings, posturas, carregados, precisão, crush/armadura e respostas defensivas.
- [x] Integrar receitas, launch/juggle, deterioração, Screw único, queda, wall carry, splat/bounce e limites de arena.
- [x] Implementar pause em treino/PvP/arcade e catálogo de treino por personagem com categorias, busca e comando fixado.
- [x] Registrar por ID as animações/efeitos e os dados da referência que ainda precisam de produção/confirmação.
- [x] Conferir o pause com Ayla, busca de elétrico, receitas e livro independente do segundo lutador; evidências em `docs/evidence/combat/`.

Validação local: instalação reproduzível, 300 testes, build e checagem de diff aprovados. Inspeção confirmou catálogo, busca, troca de lutador, pause e string aérea de três contatos por avanço de frame; evidências em `docs/evidence/combat/`. Push, CI e integração serão confirmados no remoto.

A revisão visual final é de apresentação funcional com arte provisória. Não homologa os sprites novos nem declara todos os matchups balanceados. Testes/build locais e CI remota são relatados separadamente no PR.

Combate integrado em `development` pelo PR #3, commit `5549034`, com CI remota aprovada.

### Movimento técnico — `codex/feature-movimento-tecnico`

- [x] Reduzir velocidades e separar recuo/backdash por personagem.
- [x] Diferenciar jab neutro/avanço de Ayla e preservar suas strings.
- [x] Conectar recuo dedicado de Ayla e manter facing sem espelhar a caminhada normal.
- [x] Registrar poses provisórias de recuo de Gris/Tester e jab de avanço pendente de arte.
- [x] Validar 305 testes, build, diff e apresentação no treino/arcade.
- [x] Movimento integrado pelo PR #4, commit `fb6edc9`, com CI remota aprovada.

Evidências: `docs/evidence/combat/ayla-recuo.png` e `ayla-jab-avanco.png`.

## Revisão de direção — Ayla / Tekken 7 / HD 2D

Objetivo desta branch: atualizar a documentação de design, sem mudar o runtime nem prometer balanceamento ou arte já concluídos.

- [x] Definir Tekken 7 como referência mecânica central e separar a ficha de Tekken 8.
- [x] Definir Ayla/Kazuya como base inicial, substituindo a direção Terry para seu kit futuro.
- [x] Especificar metas 2D de lista, keyframes, parry, combos e parede, separando legado e destino.
- [x] Unificar a direção visual futura HD e preservar pixel art como etapa de teste.

Entregas futuras, ainda não implementadas por esta revisão:

- [ ] Fixar versão/patch e criar ficha comparativa de cada movimento de Ayla, com fontes e desvios 2D.
- [ ] Homologar parser, startup/contato, posturas FC/WS/WR e variantes normal/elétrica.
- [x] Migrar o modelo de defesa/parry de Ayla para dados próprios, com low parry, sabaki e testes de níveis; homologação quantitativa da referência continua pendente.
- [x] Implementar strings, launcher, juggle, Screw, ender e escalonamento; replays de rotas e devolução de controle cobertos.
- [ ] Homologar os números de wall carry/splat/bounce, queda e levantamento contra a referência; a base funcional e um replay de parede estão implementados.
- [ ] Registrar baseline e calibrar Gris em relação a Ayla antes de ampliar o elenco.
- [ ] Produzir piloto HD 2D de Ayla e planejar migração integral de personagens, UI, efeitos e cenários.

Critérios mecânicos e de autoria: `base.md` §1.3, §§12–15 e `identidade-visual.md`. A ordem antiga de próximos passos deve ser lida sob esta prioridade; Tester continua ferramenta, não base de balanceamento.

Validação desta revisão documental: instalação limpa, 138 testes, build e checagem de diff aprovados. Entrega em `codex/feature-direcao-tekken7-ayla`; push/CI e integração por PR serão conferidos no remoto. Não há alteração visual ou funcional que exija nova inspeção da arena.

## Referências e decisões

| Referência de pesquisa | Aplicação em Close Combat | Limite desta revisão |
| --- | --- | --- |
| Guilty Gear Strive | Direção visual global HD, cel shading, volume e impacto gráfico | Assets e runtime de combate 2D; pixel art permanece provisório; não importar mecânicas |
| Tekken 7 / Kazuya | Estrutura central do combate e baseline de Ayla: lista, frames, strings, combos, defesa, execução, wall carry e recuperação | Sem eixo de profundidade; registrar divergências do protótipo e patch de cada ficha |
| Projeto atual | Parser, golpes locais por personagem, colisões próprias, parry, agarrões e execução precisa | Preservar comportamento existente ao consolidar a apresentação |

As fontes oficiais confirmam que as referências possuem sistemas diferentes: [KOF 2000](https://www.snk-corp.co.jp/kof30th/en/materials/kof00/index.html) destaca assistentes ativos, e o [sistema de KOF 2002](https://www.snk-corp.co.jp/official/kof2002/english/e_kof2002_system.html) descreve times e diferentes saltos. São opções de pesquisa para outra etapa. Times, assistentes, múltiplos saltos, esquivas e barras precisam de decisões próprias antes de entrar no escopo.

O [treino e a exibição de frames de Tekken 7](https://en.bandainamcoent.eu/tekken/news/tekken-7s-season-3-winter-updates) orientam os instrumentos de aprendizado. As [notas oficiais de ajuste 4.10](https://media-center.bandainamcoent.eu/games/tekken/tekken-7/t7_S4_410_Adjustmentlist.pdf) também relacionam punição à recuperação e à distância no bloqueio. Em Close Combat, recomendações precisam considerar a geometria e o parser locais; um número negativo sozinho não prova uma punição.

Os guias de produção de arte usam linguagem descritiva própria em [`identidade-visual.md`](./identidade-visual.md) e [`docs/animacao.md`](./docs/animacao.md). As referências acima orientam estrutura e leitura; não definem uma nova lista global de golpes.

## Entrega iniciada nesta revisão

**Ayla, Gris e fluxo inicial — 21/10/2026:** código integrado com livros próprios (cinco especiais de Ayla, quatro de Gris), hitboxes de cada golpe/projétil, hurtboxes por personagem/postura, velocidades individuais e entidades de projétil a 60 Hz. Atlas selecionados: 249 recortes de Ayla e 110 de Gris; contatos largos substituídos e recortes contaminados excluídos. Menu implementado com personagem de P1, cenário Cais, treino, PvP, arcade PvE por entradas comuns e configurações. 138 testes e build passaram. A revisão visual dos personagens, teclado, treino, PvP e sequência completa de arcade foi concluída, incluindo vitória/derrota, passagem ao próximo adversário e reinício. Evidências e limites em [`docs/ayla-gris-progresso.md`](./docs/ayla-gris-progresso.md). Esta entrega não encerra os demais marcos gerais da pipeline.

- [x] Reduzir as cargas do Cais em 24%, ancorando sua base e mantendo chão/cargas no mesmo parallax.
- [x] Ajustar a célula visual do Tester de 220 para 256, alinhando melhor a silhueta às hurtboxes existentes, sem mudar regras de combate.
- [x] Reproduzir loops, reações e fases de ataque pelo relógio lógico; acrescentar holds por pose e poses aéreas vinculadas à trajetória.
- [x] Corrigir o sinal da vantagem e identificar punições/contra-ataques a partir de contatos reais.
- [x] Acrescentar treino com pausa, passo único, reset, geometria e opções simples do adversário.
- [ ] Concluir os critérios de saída das Etapas 3 e 4; esses instrumentos ainda não equivalem a animação final, treino completo ou balanceamento aprovado.

## Etapa 0 — Preparar e manter o projeto

**Objetivo:** tornar o protótipo fácil de executar e modificar.

- [x] Criar configuração inicial com TypeScript, Vite e Phaser.
- [x] Criar menu e cena de luta provisória.
- [x] Criar o esqueleto dos módulos de entrada, simulação, combate, colisão, dados, renderização e interface.
- [x] Configurar `.gitignore` para dependências, builds, caches e arquivos locais.
- [ ] Confirmar os comandos `npm install`, `npm run dev`, `npm run test`, `npm run build` e `npm run preview` em instalação limpa.
- [x] Manter `README.md` com requisitos, comandos e controles existentes.

**Saída:** o projeto instala, inicia no navegador e gera um build; os comandos documentados correspondem aos configurados.

## Etapa 1 — Fundação jogável

**Base:** `base.md` §§2, 5, 6, 17 e marco M1 de §19.

### 1.1 Simulação em passo fixo

- [x] Criar relógio de passo fixo de 60 Hz, separado da renderização.
- [x] Fazer a cena avançar uma instância da simulação em cada passo fixo.
- [x] Definir estado inicial explícito para os dois jogadores e limites da arena configuráveis.
- [x] Garantir que delta grande de renderização não gere uma sequência ilimitada de passos atrasados.

### 1.2 Entrada e movimento

- [x] Definir tipos de direções relativas ao oponente e botões `1`–`4`.
- [x] Criar adaptador inicial de teclado e buffer de entradas por frame.
- [x] Definir/documentar o mapeamento inicial de teclado e exibi-lo no README.
- [x] Suportar entrada para os dois jogadores sem conflito de teclas.
- [x] Implementar andar para frente e para trás, agachar, salto vertical e saltos direcionais previstos.
- [x] Permitir dash por toque duplo somente no chão; ignorar taps direcionais durante o salto.
- [x] Permitir cruzamento aéreo quando há separação vertical suficiente e confirmar atualização de `F`/`B` após a troca.
- [x] Manter os lutadores dentro da arena e impedir passagem corporal indevida.
- [x] Separar estado lógico/posição do objeto visual Phaser.

### 1.3 Apresentação provisória

- [x] Carregar menu e cena de luta.
- [x] Desenhar lutadores provisórios e HUD textual.
- [x] Exibir barras de vida, timer e indicador de round com dados configuráveis.
- [x] Exibir controles no README.
- [x] Permitir retornar ao menu e iniciar outra luta sem duplicar listeners ou estado.

**Saída da etapa:** dois jogadores podem mover-se localmente, saltar e agachar; lado e direção relativa são corretos após troca de posição; o resultado não depende do FPS de renderização.

## Etapa 2 — Núcleo de luta

**Base:** `base.md` §§7–11, 15, 17–18 e marco M2 de §19.

### 2.1 Parser e dados

- [x] Definir buffer de 30 frames, janela de simultaneidade de 3 frames e prioridade de seleção de comandos.
- [x] Reconhecer pressionamentos simples dos botões `1`, `2`, `3`, `4` como golpes provisórios.
- [x] Reconhecer variantes direcionais provisórias de aproximação e recuo (`F/B+1`, `DF/DB+2`, `D+3`, `UF/UB+4`).
- [x] Selecionar golpes aéreos provisórios por botão quando o personagem já está no ar.
- [x] Selecionar golpes abaixados provisórios com `D+1`, `D+2` e `D+4`; manter `D+3` como rasteira.
- [x] Reconhecer chords provisórios cadastrados de Tester (`1+2`, `3+4`) e consumir combinações sem cadastro sem dividi-las em golpes simples.
- [x] Integrar botões pressionados dentro da janela ao início do golpe, com fallback simples após o fechamento da janela.
- [x] Reconhecer sequências de comandos como `F,F+2` e `D,DF+3`, com janela e prioridade documentadas.
- [x] Registrar entradas direcionais/botões recentes na interface.
- [x] Definir os campos iniciais de dados de golpes: startup, active, recovery, nível, hitbox, dano, hitstun, blockstun, pushback e condição aérea.
- [x] Criar o primeiro personagem de teste, Tester, associar golpes e usá-lo como padrão temporário.
- [x] Criar pelo menos um segundo personagem de teste com dados mínimos.

### 2.2 Estados e colisão

- [x] Implementar estados de startup, ativo, recuperação e hitstun para golpes de teste.
- [x] Atualizar hitboxes e hurtboxes por frame de lógica.
- [x] Resolver contatos sem depender de física genérica do renderizador e desenhar as hitboxes ativas.
- [x] Implementar ataques básicos, dano e hitstun.
- [x] Implementar bloqueio alto/baixo, blockstun e empurrão provisórios.
- [x] Implementar rounds, vitória, empate por KO/tempo e reinício a partir de configuração.
- [x] Resolver ataques simultâneos como trade no protótipo.

### 2.3 Testes da simulação

- [x] Cobrir troca de lado e conversão de direções relativas.
- [x] Cobrir capacidade do buffer, prioridade de combinações e prioridade direcional do parser.
- [x] Cobrir chords na janela inclusiva de 3 frames, fallback para golpe simples e descarte de combinação sem cadastro.
- [x] Cobrir sequências de comandos, diagonais e prioridade de seleção do parser.
- [x] Cobrir startup, frames ativos, recovery, escolha de variantes direcionais/aéreas/abaixadas, acerto e dano dos golpes provisórios.
- [x] Cobrir dash terrestre e rejeitar dash iniciado por entradas no ar.
- [x] Cobrir bloqueio alto/baixo, blockstun, empurrão, rounds, reinício e interações entre os sistemas.
- [x] Cobrir alcance, colisão, dano, hitstun e trade básico.
- [x] Confirmar que a mesma sequência de entradas produz o mesmo estado final.

**Saída da etapa:** uma luta local pequena com ataques e defesa pode ser reproduzida e testada sem abrir o navegador.

## Etapa 2.4 — Sistemas técnicos já existentes

Preservados da antiga Etapa 3:

- [x] Agarrões com alcance, quebra e arremesso à frente/atrás.
- [x] Comandos diagonais, especiais e cancelamentos permitidos por golpe.
- [x] Execução precisa e parry elegível com atordoamento de 18 frames.
- [x] Trocas de golpes e invulnerabilidade declarada por golpe.
- [x] Livros de golpes e perfis de body/hurtbox separados por personagem.
- [x] Eventos de contato com recuperação restante, stun e vantagem; convenção de sinal corrigida nesta revisão.

## Etapa 3 — Coerência de animação e escala

**Base:** §§1, 6, 7, 16–17; [`docs/animacao.md`](./docs/animacao.md). **Marco M3.**

### 3.1 Contrato e reprodução

- [x] Atlas do Tester integrado com 399 quadros, faixas de origem e mapeamento dos golpes/chutes.
- [x] Direção original por clipe, recuo com caminhada espelhada e pulo voltado para o lado correto.
- [x] Guarda, reação ao bloqueio e hitstun em pé sem reutilizar a cambalhota da queda.
- [x] Frame de entrada do estado, reprodução em tempo lógico e holds de duração variável por pose.
- [x] Startup/atividade/recuperação amostrados dentro da duração real do golpe.
- [x] Subida/ápice/descida selecionados pela velocidade vertical; sem clipe de salto terminando no meio da trajetória.
- [x] Validação de quadros, repetições, holds, escala e mapeamento antes da partida.
- [x] Correções autoradas de escala/âncora por quadro: agachamento a 78%, sem mudar a colisão.
- [x] Soco aéreo remapeado para punho fechado, chute forte em pé com a sequência escolhida e retorno mais lento.
- [x] Remover tint por fase e pulsação da geometria que simulavam piscar sobre o personagem.
- [x] Verificar equivalência de poses com diferentes FPS de renderização e após pausa/reinício em cobertura automatizada. `AnimationDeterminism.test.ts` compara a saída de `CombatantView` em 30/60/120/144 FPS para Tester, Ayla e Gris; cobre pausa de dois segundos e replay após reset.

### 3.2 Produção e transições

- [x] Matriz de ações e política de fallback/provisoriedade documentadas.
- [ ] Auditar os 26 golpes do Tester, nas três fases, nos dois lados, com contato/erro/bloqueio e câmera em movimento.
- [ ] Produzir arte própria para entrada/saída de agachamento, preparação/aterrissagem do salto e retorno de recuperação à guarda.
- [ ] Criar reações distintas por altura e intensidade, preservando a guarda baixa e os pés.
- [ ] Reavaliar captura, queda e recuperação do agarrão; não usar poses de giro no acerto comum.
- [ ] Introduzir hitstop configurável por contato após definir duração, timer, comandos e congelamento de ambos em `base.md`.
- [ ] Revisar pivôs, escala, mãos/pés, alcance aparente e sobreposição com adversário em cada quadro.

### 3.3 Composição e cenário

- [x] Catálogo automático de cenários e quantidade livre de camadas; primeiro Cais com fundo, chão e cargas.
- [x] Transparência, proporções uniformes, escala de conteúdo ancorada e parallax compartilhado; interface fixa.
- [x] Encerramento tolerante ao ciclo da câmera Phaser; retorno entre treino, menu e partida sem a falha de câmera encerrada.
- [ ] Revisar bordas da câmera, legibilidade dos lutadores e consistência de perspectiva em todos os cenários futuros.
- [ ] Definir contraste final e identidade comum entre ilustração de personagem e cenário provisório em pixel art.

**Saída:** cada ação principal é identificável em ambos os lados; pés e volume são estáveis; golpes mostram preparo, contato e recuperação nos frames corretos; não há mudança de personagem, inversão indevida, queda na defesa ou salto preso no último quadro.

## Etapa 4 — Punições, espaço e treino

**Base:** §§7–9, 12–16. **Marco M4.**

### 4.1 Instrumentos iniciais

- [x] Vantagem do atacante = stun do defensor menos recuperação restante; positivo favorece quem atacou.
- [x] Registrar contatos recentes para não perder feedback quando um render avança vários frames lógicos.
- [x] Marcar acerto real em recuperação após bloqueio, recuperação de erro e interrupção de preparo/atividade.
- [x] Treino no menu, cronômetro livre, distância inicial curta e reinício de vida/posições/comandos.
- [x] Pausar e avançar exatamente um frame pelo mesmo caminho da simulação.
- [x] Mostrar fases de golpe, geometria real, distância, recuperação, stun, vantagem e entradas.
- [x] Adversário manual, guarda alta, guarda baixa e repetição de socos 1/2 e chute 4 por entrada real.
- [x] Interface técnica exclusiva do treino; partida normal sem estados, entradas ou geometria.
- [x] Câmera lenta em 50%/25%, último golpe persistente, dano/altura e tempo restante.
- [x] Vida automática configurável após 90 frames sem ação e reinício em distâncias 96/144/220.
- [x] Passo único com deduplicação de evento e reinício sem carregar teclas mantidas.

### 4.2 Janela de ação e punição garantida

- [ ] Auditar o primeiro frame em que cada lado pode agir após contato, com o frame de impacto excluído das duas contagens.
- [ ] Separar janela de chord, buffer de ataque durante stun e leniência direcional; preservar execução precisa.
- [ ] Definir buffer ao sair de stun/recuperação, incluindo expiração, prioridade e trocas de lado, antes de implementá-lo.
- [ ] Classificar opções de punição por livro do personagem, estado e alcance após pushback; incluir baixos, guarda alta e invulnerabilidade.
- [ ] Reproduzir punição no limite, resposta um frame atrasada e golpe que cabe na janela mas não alcança.
- [ ] Diferenciar dado teórico, janela disponível e punição confirmada. Não exibir “garantido” sem simulação válida do caso.

### 4.3 Treino completo

- [ ] Gravar/reproduzir sequências de entradas com direção relativa e reset de cenário.
- [ ] Adversário que bloqueia e responde no primeiro frame legal, com respostas escolhidas por personagem.
- [ ] Exercícios guiados de bloqueio, punição de erro, alcance, contra-ataque e quebra de agarrão.
- [x] Oferecer recuperação de vida configurável e distância de reinício sem vazamento de comandos.
- [ ] Acrescentar posições de reinício à esquerda/direita e sincronizá-las com limites da câmera.
- [ ] Exportar relatório reproduzível de exercício com versão dos dados e sequência de entradas.

**Saída:** é possível explicar uma punição por tempo, estado e distância; o mesmo exercício reproduz o contato ou a falha sem depender do FPS. O treino não altera as regras da partida.

## Etapa 5 — Combos, quedas e recuperação

**Base:** §§7, 9, 13–15. **Marco M5. Dependência:** Etapas 3 e 4 estáveis.

- [ ] Documentar strings por personagem, janelas de continuação, confirmação de acerto e interrupção por defesa.
- [ ] Definir launcher, juggle, gravidade, limite de contatos, deterioração de dano e encerramento de combo; sem adotar valores finais por suposição.
- [ ] Separar hitstun em pé, no ar, queda e levantada; definir colisão e vulnerabilidade de cada estado.
- [ ] Definir recuperação no chão, opções defensivas e interação com paredes antes de acrescentar golpes que dependam delas.
- [ ] Sincronizar clipes próprios com cada estado; manter animador sem autoridade sobre dano/colisão.
- [ ] Verificar que cancelamentos, agarrões, esquinas e hits simultâneos não criam loops infinitos ou estados travados.

**Saída:** uma rota curta por personagem funciona e tem fim; o defensor recupera controle conforme a regra; erro e bloqueio interrompem a rota nos pontos previstos.

## Etapa 6 — Conteúdo, fluxo e feedback

**Base:** §§1, 4–5, 16. **Marco M6.**

- [ ] Seleção real dos dois personagens e de cenário; carregar apenas os assets disponíveis de cada escolha.
- [ ] Segundo personagem com arte e livro próprios; evitar espelhar o mesmo kit para simular variedade.
- [ ] Entrada de round, anúncio, resultado e revanche; definir claramente rounds disputados ou necessários para vencer.
- [ ] Gamepad/remapeamento; números/siglas e paletas com contraste, sem depender apenas de cor.
- [ ] HUD final, impactos, áudio, volume, redução de flashes/tremor e informação de treino alternável.
- [ ] Ensaio completo: menu → seleção → luta → resultado → revanche/menu, sem listeners duplicados.
- [ ] Avaliar especial cinematográfico somente após especificar suas regras e acessibilidade; fora do caminho crítico de punição/animação.

**Saída:** uma pessoa consegue iniciar, entender e terminar a luta, identificar ações e retornar ao menu com controles legíveis.

## Etapa 7 — Qualidade e publicação web

**Base:** §§2, 18, 21. **Marco M7.**

- [ ] Executar a matriz de regressão de animação, input, contato, punição, queda e round quando for solicitado validar a implementação.
- [ ] Confirmar instalação limpa, README e comandos em ambiente sem caches locais.
- [ ] Configurar build e testes no GitHub, depois revisar orçamento de textura, download e desempenho.
- [ ] Publicar demo e releases versionados após aprovação de publicação.
- [ ] Avaliar PWA/offline, desktop, IA ampliada e online como entregas independentes.

**Saída:** build estático reproduzível, uso de memória/desempenho conhecido, assets de distribuição revisados e fluxo completo validado.

## Registro de verificação desta revisão

- Compilação TypeScript e build web realizados durante a implementação.
- Inspeção no navegador: composição do Cais, salto, pausa, passo único, reset, guarda, repetição do adversário, alternância dos painéis e retorno entre cenas. Casos e limites em [`docs/revisao-2026-10-20.md`](./docs/revisao-2026-10-20.md).
- Em 21/10, a suíte completa passou com 138 testes, incluindo livros locais, projéteis e partidas completas de arcade. Build e diff foram verificados. A revisão visual de Ayla, Gris e dos três modos está concluída em [`docs/ayla-gris-progresso.md`](./docs/ayla-gris-progresso.md); os demais critérios de saída desta pipeline permanecem próprios de suas etapas.

## Próximo bloco concreto

1. Fechar a auditoria de ações do Tester usando o treino e a matriz de `docs/animacao.md`, sobretudo aterrissagem, agarrão e recuperação.
2. Especificar o buffer de resposta ao sair do stun; a janela atual de chords não equivale a buffer de punição.
3. Criar o primeiro exercício reproduzível de bloqueio e resposta, com variante que falha por alcance.
4. Só então avançar para strings, combo aéreo e queda/levantada.

Online, ranking, times, assistentes, medidores e novas modalidades de salto continuam fora da entrega atual.

### Revisão de animações e treino — 20/10/2026

Correções de escala, remapeamento de golpes e cadência, partida sem depuração e expansão do treino estão descritas em [`docs/revisao-animacoes-treino.md`](./docs/revisao-animacoes-treino.md). Isso não encerra a auditoria dos 26 golpes nem aprova o atlas como arte final. A nova recuperação modifica os valores de vantagem: revisar punições e cancelamentos antes de balancear.

### Cadência da Gris — 21/10/2026

Loops com retorno intermediário e holds explícitos; menu e arena respeitam as mesmas durações. Cortes fortes e especiais mantêm o seguimento da tesoura na recuperação, sem mudar tempos lógicos, dano ou caixas. Conferido no treino; 138 testes e build aprovados. Detalhes e evidências em `docs/ayla-gris-progresso.md`.

## Fluxo de CI/CD — 21/10/2026

- [x] Documentar branches, critérios de conclusão, push, integração e releases em `docs/ci-cd.md`.
- [x] Registrar instruções persistentes do repositório em `AGENTS.md`.
- [x] Criar workflow para testes/build em branches, PRs e tags; validar versão e origem da tag em `main`.
- [ ] Confirmar primeira execução remota da CI e integração desta entrega em `development`.
- [ ] Aplicar proteções de branch no GitHub (configuração remota).

Validação local desta entrega: instalação limpa, 138 testes, build e `git diff --check` aprovados. Integração remota depende da execução da nova CI.

## Fluidez, corrida e leitura dos comandos — 21/10/2026

Branch: `codex/feature-fluidez-corrida-treino`.

- [x] Reduzir recuperação do elétrico/gancho no contato e testar dois elétricos sem cancelamento antecipado, preservando +5 no bloqueio do elétrico.
- [x] Transicionar dash de avanço para corrida sustentada, com interrupções e velocidades próprias por lutador.
- [x] Ampliar o combate por enquadramento, mantendo HUD e geometria coerentes.
- [x] Apresentar setas, teclas configuradas e cores no catálogo e no treino.
- [x] Implementar configurações persistentes e validar conflitos de teclas.
- [x] Adicionar histórico de mudanças de entrada, duração, soltura e acordes.

Validação automatizada: 320 testes; build e diff. A conferência visual cobre tamanho, entradas coloridas, remapeamento, catálogo e corrida; evidências em `docs/evidence/fluidez/`. CI e merge devem ser confirmados no remoto na entrega.

Limites: o gancho ainda reutiliza poses existentes; produzir desenho de ascendente próprio. Corrida usa poses de avanço disponíveis em loop acelerado. As demais recuperações continuam sendo dados locais de cada golpe. Detalhes em `docs/fluidez-corrida-treino.md`.

## Combos livres e trajetória — continuação de 21/10/2026

Na mesma branch de fluidez ainda não integrada, a nova solicitação substitui a recuperação anterior, preservada no commit intermediário `54de726`.

- [x] Strikes livres após atividade em acerto/erro; recuperação só no bloqueio, incluindo multihit parcialmente bloqueado.
- [x] Manter contexto/janela de strings sem manter o lutador em recuperação; validar fraco–fraco–forte seguido de elétrico.
- [x] Ajustar suspensão, gravidade, manutenção de juggle, Screw, aterrissagem e retorno de controle.
- [x] Preservar regras próprias de agarrão e os livros individuais.
- [x] Atualizar fichas/HUD e conferir string, elétrico e queda no treino; evidências em `docs/evidence/combos-livres/`.

Validação: 329 testes, build e diff aprovados; replays mantêm a rota completa de nove contatos, parede e dois elétricos contra os quatro alvos. O lançamento inicial sem novas entradas é medido em 36–40F, altura 80–100 e queda de 26F. Ver `docs/combos-livres.md`. CI remota e integração são confirmadas na entrega do PR.

## Suspensão e limite de levantamentos — 21/10/2026

Branch: `codex/feature-limite-levantamentos`, criada de `origin/development` após integração do PR #5.

- [x] Aumentar suspensão inicial para aproximadamente 56F e suavizar a gravidade.
- [x] Reduzir impulso de acertos aéreos e segundo levantamento.
- [x] Compartilhar orçamento de dois levantamentos entre launchers e Screw; terceiro força queda protegida.
- [x] Proteger descida e recuperação no chão contra strikes, projéteis e agarrões; impedir interrupção por parede.
- [x] Mostrar limite/imunidade no treino e conferir terceiro elétrico, aterrissagem e retorno ao neutro no jogo.
- [x] Validar 340 testes, build e diff; documentar a nova regra em `base.md` e `docs/limite-levantamentos.md`.

Evidências: `docs/evidence/limite-levantamentos/`. Receitas históricas com três elétricos são truncadas pela regra nova; comandos permanecem disponíveis. CI e integração devem ser confirmadas no remoto na entrega.

## Alinhamento visual do juggle — 21/10/2026

Branch: `codex/fix-alinhamento-juggle`.

- [x] Substituir reação em pé por pose aérea própria em Ayla, Gris e Tester.
- [x] Alinhar pivô corporal de cada clipe à hurtbox existente, inclusive no espelhamento; manter salto livre e chão.
- [x] Conferir no treino com dois elétricos contra Tester: corpo horizontal sobre a região atingível; evidência em `docs/evidence/alinhamento-juggle/`.
- [x] Preservar integralmente simulação, caixas, gravidade e limite de levantamentos.

Poses aéreas sustentadas são provisórias; animações dedicadas continuam pendentes. Testes/build/diff e CI remota são conferidos na entrega.

## Recuo menor nos acertos — 22/10/2026

Branch: `codex/fix-recuo-acertos`.

- [x] Reduzir pela metade o pushback de acertos nos livros atuais e no importador de Ayla.
- [x] Preservar bloqueio, agarrões, avanço, caixas, gravidade e limite de levantamentos.
- [x] Conferir dois elétricos no treino: distância final 89, antes 117, no frame 30 com distância inicial 96; evidência em `docs/evidence/recuo-acertos/`.
- [x] Verificar regressões de combos, parede e proteções: 341 testes aprovados.

Build, instalação limpa, diff e CI remota são confirmados na entrega; integração em development após aprovação.
