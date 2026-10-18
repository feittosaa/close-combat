# Pipeline de desenvolvimento — Close Combat

> **Documento de execução:** este roteiro transforma o plano de [`base.md`](./base.md) em etapas de implementação verificáveis. `base.md` continua sendo a fonte de verdade para visão, regras e decisões do jogo; este arquivo organiza a ordem do trabalho e seu estado.
>
> **Status inicial:** Fundação iniciada. A configuração TypeScript/Vite/Phaser, o menu e uma cena de luta provisória existem. Movimento jogável, barras de vida ligadas à simulação e testes da lógica ainda faltam.

## Como usar este pipeline

- Trabalhar na ordem das etapas e concluir os critérios de saída antes de avançar.
- Atualizar as caixas deste arquivo ao concluir trabalho; não marcar como concluído algo que ainda seja só visual ou um stub.
- Registrar primeiro em `base.md` qualquer nova regra de combate, controle ou design. Depois implementar a regra e refletir aqui o trabalho necessário.
- Manter regras temporais em frames de simulação e manter a simulação independente do Phaser.
- Não escolher valores finais de balanceamento para preencher lacunas. Usar configuração provisória identificada como tal ou deixar a decisão em aberto em `base.md`.

## Etapa 0 — Preparar e manter o projeto

**Objetivo:** tornar o protótipo fácil de executar e modificar.

- [x] Criar configuração inicial com TypeScript, Vite e Phaser.
- [x] Criar menu e cena de luta provisória.
- [x] Criar o esqueleto dos módulos de entrada, simulação, combate, colisão, dados, renderização e interface.
- [x] Configurar `.gitignore` para dependências, builds, caches e arquivos locais.
- [ ] Confirmar os comandos `npm install`, `npm run dev`, `npm run test`, `npm run build` e `npm run preview` no ambiente de desenvolvimento.
- [ ] Manter `README.md` com requisitos, comandos e controles existentes.

**Saída:** o projeto instala, inicia no navegador e gera um build; os comandos documentados correspondem aos configurados.

## Etapa 1 — Fundação jogável

**Base:** `base.md` §§2, 5, 6, 17 e Fase 1 de §19.

### 1.1 Simulação em passo fixo

- [x] Criar relógio de passo fixo de 60 Hz, separado da renderização.
- [ ] Fazer a cena avançar uma instância da simulação em cada passo fixo.
- [ ] Definir estado inicial explícito para os dois jogadores e limites da arena configuráveis.
- [ ] Garantir que delta grande de renderização não gere uma sequência ilimitada de passos atrasados.

### 1.2 Entrada e movimento

- [x] Definir tipos de direções relativas ao oponente e botões `1`–`4`.
- [x] Criar adaptador inicial de teclado e buffer de entradas por frame.
- [ ] Definir/documentar o mapeamento inicial de teclado e exibi-lo no README.
- [ ] Suportar entrada para os dois jogadores sem conflito de teclas.
- [ ] Implementar andar para frente e para trás, agachar, salto vertical e saltos direcionais previstos.
- [ ] Atualizar `F` e `B` conforme os jogadores trocam de lado.
- [ ] Manter os lutadores dentro da arena e impedir passagem corporal indevida.
- [ ] Separar estado lógico/posição do objeto visual Phaser.

### 1.3 Apresentação provisória

- [x] Carregar menu e cena de luta.
- [x] Desenhar lutadores provisórios e HUD textual.
- [ ] Exibir barras de vida, timer e indicador de round com dados configuráveis.
- [ ] Exibir controles na tela de início/pausa ou no README.
- [ ] Permitir retornar ao menu e iniciar outra luta sem duplicar listeners ou estado.

**Saída da etapa:** dois jogadores podem mover-se localmente, saltar e agachar; lado e direção relativa são corretos após troca de posição; o resultado não depende do FPS de renderização.

## Etapa 2 — Núcleo de luta

**Base:** `base.md` §§7–11, 15, 17–18 e Fase 2 de §19.

### 2.1 Parser e dados

- [ ] Definir buffer, janela de simultaneidade, duração e prioridade de comandos.
- [ ] Reconhecer botões `1`, `2`, `3`, `4`, combinações e comandos direcionais/diagonais.
- [ ] Registrar comandos reconhecidos para depuração e feedback.
- [ ] Definir esquema validável de dados de golpes, incluindo startup, active, recovery, nível, alcance, stun e pushback.
- [ ] Criar pelo menos dois personagens de teste com dados mínimos; identificar claramente valores provisórios.

### 2.2 Estados e colisão

- [ ] Implementar transições explícitas de estado do lutador.
- [ ] Atualizar hitboxes e hurtboxes por frame de lógica.
- [ ] Resolver contato sem depender de física genérica do renderizador.
- [ ] Implementar ataque, acerto, bloqueio alto/baixo, dano, hitstun, blockstun e empurrão.
- [ ] Implementar rounds, vitória e reinício a partir de configuração.
- [ ] Definir e documentar prioridade de contatos simultâneos antes de implementá-la.

### 2.3 Testes da simulação

- [ ] Cobrir troca de lado e conversão de direções relativas.
- [ ] Cobrir botões, combinações, diagonais e prioridade do parser.
- [ ] Cobrir startup, frames ativos, recovery, acerto e bloqueio.
- [ ] Cobrir colisão, alcance, dano, stun, empurrão e rounds.
- [ ] Confirmar que a mesma sequência de entradas produz o mesmo estado final.

**Saída da etapa:** uma luta local pequena com ataques e defesa pode ser reproduzida e testada sem abrir o navegador.

## Etapa 3 — Sistemas técnicos

**Base:** `base.md` §§8–14, 17–18 e Fase 3 de §19.

- [ ] Expor vantagem de frames em acerto e bloqueio usando a convenção definida em `base.md`.
- [ ] Implementar agarrões, alcance e quebra de agarrão.
- [ ] Completar comandos diagonais, especiais e regras de cancelamento.
- [ ] Implementar janelas de execução precisa e casos-limite de frame.
- [ ] Implementar parry para categorias e golpes definidos, incluindo risco ao falhar.
- [ ] Definir e testar troca de golpes, invulnerabilidade e prioridades.
- [ ] Implementar combos com limites e recuperação sem estados travados ou loops.
- [ ] Testar alcance e punição considerando distância e pushback.

**Saída da etapa:** os sistemas técnicos definidos para o protótipo funcionam em conjunto e têm regras e testes representativos.

## Etapa 4 — Identidade, interface e feedback

**Base:** `base.md` §§1, 4, 16, 19 e princípios de §21.

- [ ] Definir direção visual e formato de arte em `base.md` antes de produzir conteúdo em escala.
- [ ] Criar seleção de personagens e paletas de botões com número/sigla além da cor.
- [ ] Substituir os retângulos provisórios por arte original e animações.
- [ ] Adicionar efeitos e áudio originais para acerto, defesa, parry e execução precisa.
- [ ] Implementar HUD final e feedback acessível, sem ocultar informação importante apenas por cor.
- [ ] Criar ferramentas de treino: frames, vantagem, hitboxes/hurtboxes, reinício e histórico de entradas.
- [ ] Implementar um especial cinematográfico interativo somente depois de suas regras serem definidas em `base.md`.

**Saída da etapa:** uma partida completa demonstra a identidade visual e os sistemas escolhidos, com feedback legível e controles acessíveis.

## Etapa 5 — Publicação web

**Base:** `base.md` §§2.1, 2.4, 18–19.

- [ ] Completar README com instalação, controles, comandos e limitações conhecidas.
- [ ] Configurar automação de build e testes no GitHub.
- [ ] Criar e validar build estático para hospedagem web, por exemplo GitHub Pages.
- [ ] Fazer uma verificação de instalação limpa seguindo apenas a documentação.
- [ ] Publicar versão web e releases versionados quando aprovados.
- [ ] Avaliar PWA/offline como etapa própria; testar o comportamento em vez de presumir suporte.
- [ ] Avaliar desktop nativo somente se surgir necessidade real.

**Saída da etapa:** uma pessoa que não desenvolveu o projeto consegue abrir a demo ou seguir as instruções sem passos não documentados.

## Fora do primeiro protótipo

- Multijogador online, sincronização de rede e ranking.
- IA completa, elenco ampliado e balanceamento final.
- PWA/offline e empacotamento desktop.

Só trazer esses itens para o escopo ativo quando a fundação local estiver estável e a decisão estiver registrada em `base.md`.

## Próximo bloco de trabalho

Concluir a Etapa 1 na seguinte ordem: ligar `Simulation` à cena; definir estado e arena iniciais configuráveis; implementar controles simultâneos para dois jogadores; adicionar movimento horizontal, salto, agachamento e troca de lado; completar o HUD mínimo; então cobrir as regras de movimento com testes. Atualizar `base.md` antes de fixar qualquer regra que ainda esteja em aberto.
