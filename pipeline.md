# Close Combat — Pipeline de implementação

> **Raiz:** [`base.md`](./base.md), versão 0.2.1.
> **Revisão:** 21/10/2026.
> **Alvo:** luta local 1 contra 1, apresentação arcade 2D em poses desenhadas e combate técnico com espaço, recuperação e punições.
> **Estado:** fundação e núcleo preservados; primeira entrega da consolidação de animações e treino implementada. Combos completos, quedas/levantadas e balanceamento continuam pendentes.

## Como usar

- As Etapas 0–2 preservam o trabalho concluído da pipeline anterior; não devem ser refeitas.
- A ordem atual é **Etapa 3 → Etapa 4 → Etapa 5 → Etapa 6 → Etapa 7**. Os primeiros instrumentos da Etapa 4 podem apoiar a revisão visual da Etapa 3.
- Cada checkbox significa implementação concreta. Cobertura automatizada, revisão visual e balanceamento são critérios separados; um build não aprova animação nem justiça de colisão.
- Registrar regras em `base.md` antes de codificar, usar dados por personagem e manter combate a 60 Hz independente do Phaser.
- Os números atuais dos golpes são provisórios. Não copiar números de outro jogo nem alterar tempos para encobrir defeitos de animação ou entrada. A revisão de cadência de 20/10, solicitada pelo usuário, está registrada em base.md: +2F de preparo, +1F ativo e +4F de recuperação nos strikes, sem alterar agarrões; requer revisão posterior de vantagem/balanceamento.
- Não marcar um sistema inteiro como pronto por existir um clipe ou um rótulo. Registrar limitações e próxima entrega.

## Referências e decisões

| Referência de pesquisa | Aplicação em Close Combat | Limite desta revisão |
| --- | --- | --- |
| Apresentação de The King of Fighters 2000/2002 | Cadência de poses desenhadas, silhueta, continuidade entre estados, espelhamento, reações legíveis e cenários em planos | Arte própria; o atlas atual é material provisório de desenvolvimento |
| Combate técnico de Tekken 7 | Quatro botões por membro, altos/médios/baixos, risco/retorno, vantagem, punição de bloqueio e erro, treino mensurável | Espaço horizontal 2D e regras já acordadas de guarda e movimento |
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
- [ ] Verificar equivalência de poses com diferentes FPS de renderização e após pausa/reinício em cobertura automatizada.

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
