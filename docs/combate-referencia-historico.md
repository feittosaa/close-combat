# Histórico de referência — substituído em 23/10/2026

Arquivo de rastreabilidade. Estas diretrizes não governam o catálogo autoral atual; consultar `../base.md` e `ayla-golpes.md`. Testes de referência permanecem com fixtures explícitos para proteger funcionalidades do motor.

### 1.3 Contrato de referência e adaptação

#### Fontes e versões

- [TekkenDocs](https://tekkendocs.com/): consulta indicada pelo usuário para listas, comandos e propriedades. É uma base comunitária; conferir versão, notas e evidência reproduzível antes de homologar valores.
- [Kazuya em Tekken 7](https://tekkendocs.com/t7/kazuya): referência de comparação para a estrutura mecânica da adaptação de Ayla. Registrar patch/edição da referência por golpe antes de preencher a ficha final. Um valor sem patch confirmado fica pendente, nunca é apresentado como exato.
- [Kazuya — ficha de Tekken 8 fornecida pelo usuário](https://tekkendocs.com/t8/kazuya/meta): catálogo da entrega executável descrita abaixo, por solicitação posterior do usuário. Não atribuir Heat, Tornado nem números de Tekken 8 a Tekken 7. Se uma propriedade existir nas duas versões, verificar a versão de Tekken 7 separadamente.
- [Tekken Frame Data API (theneosloth)](https://github.com/theneosloth/tekken-api): fonte comunitária de comandos e propriedades de golpes de Tekken 7 em JSON. Usar como referência de balanceamento e famílias de golpes; conferir versão/patch e validar dados incompletos na ficha local antes de homologar.
- [Noctis — dados JSON da API](https://github.com/theneosloth/tekken-api/blob/main/data/json/noctis.json): referência de repertório com espada para orientar as famílias, cadência, alcance e funções dos golpes da Gris, reinterpretadas como tesoura. Não copiar nomes, identidade, arte ou valores crus de frame/dano sem adaptação e rastreabilidade.
- [Guilty Gear Strive — Arc System Works](https://www.arcsystemworks.com/game/guilty-gear-strive/): referência visual de personagens, cenários, efeitos, HUD e menus. A obra de referência usa gráficos híbridos 2D/3D; nossa escolha é obter aparência semelhante por assets 2D em HD. A semelhança visual não importa automaticamente suas mecânicas.

#### Catálogo executável — atualização de 21/10/2026

A solicitação de implementar todos os movimentos do link T8 amplia a decisão anterior: Ayla agora possui as **135 entradas expostas de Kazuya em Tekken 8**, mais entradas autorais de postura/avanço no plano 2D e **36 receitas** do guia, incluindo alternativas de starter e finalizador. A fonte é identificada como T8, sem atribuir seus números a T7. A estrutura central de combate continua orientada a Tekken 7 em 2D; Tornado é adaptado a Screw único, profundidade a posturas no plano e variantes Heat/Devil a um recurso local de Fulgor. Não há importação implícita de vida recuperável nem de quebras/transições de cenário.

O livro contém múltiplos contatos com caixas e níveis próprios, janelas de strings, posturas FC/WS, execução elétrica precisa, cargas, crush, armadura, low parry e sabaki, sete agarrões, projéteis por contato, launch, juggle, queda e parede. O personagem define suas categorias, receitas, caixas e regras; Gris e Tester mantêm livros independentes. Golpes do protótipo anterior ficam marcados como legado fora do comando de Ayla. As associações visuais provisórias não impedem a execução de uma entrada.

A implementação, conversões de frames, escala de dano e critérios de verificação estão em [`docs/ayla-combate.md`](./docs/ayla-combate.md). A fonte não informa todas as recuperações e contatos de follow-up; esses valores têm estimativas explícitas na ficha e em [`docs/ayla-combate-dados-pendentes.md`](./docs/ayla-combate-dados-pendentes.md). Isso não certifica fidelidade quantitativa final. A produção dos sprites/keyframes faltantes está em [`docs/ayla-combate-animacoes-pendentes.md`](./docs/ayla-combate-animacoes-pendentes.md).

P ou Esc pausa a luta em qualquer modo local. No treino, o pause abre o livro de P1/P2 com busca, categorias, fichas e receitas; é possível fixar o comando ao retomar. Pausar congela simulação, cronômetro, recursos, bot, animações e projéteis; entradas do menu são descartadas ao retomar. O retorno ao menu fica dentro do pause. Passo único continua sendo uma ferramenta explícita do treino.

As especificações históricas de parry universal, cinco especiais antigos de Ayla e lista limitada de protótipo abaixo continuam registradas como legado, não como descrição do livro novo. Animações homologadas e balanceamento por matchup continuam distintos de cobertura funcional do catálogo.

#### Limite estritamente 2D

**Gris — calibração de espada em tesoura:** cada movimento de Gris registra em `MoveDefinition.balanceReference` a ficha Noctis consultada, comando, startup, dano, vantagem em bloqueio/acerto/counter hit e a conversão local. O mapeamento atual cobre `1/2/3/4`, `FC+1/2/3/4`, quatro ataques durante salto, strings `1,2`, espada arremessada `f,f+1+2`, avanço/teleporte `f+2`, launcher `d/f+2`, launcher aéreo da família `u/f+4` e a conversão local do agarrão. A string `standing-lp → standing-rp` é confirmável após acerto. Esses dados guiam os valores de startup/dano e os papéis do repertório, mas não são copiados crus: frames são convertidos à convenção local, dano é reescalado, caixas/altura/avanço são específicos da tesoura e os clipes continuam os assets disponíveis da Gris. A API não informa geometria 2D nem todos os campos de recuperação/contato necessários; eles permanecem adaptações locais e requerem revisão visual e por matchup antes da homologação final.

**Queda e levantada manual:** após aterrissar em `floorY` em estado de queda, a personagem permanece no chão até nova entrada do jogador. `1`/`2` levantam atacando com o soco correspondente; `F` levanta avançando; `B` levanta recuando em guarda; neutro mantém a pose caída. A seleção é individual por jogador e o comando de levantar não dispara a ação do oponente.

O mundo de combate possui somente eixo horizontal e altura. Não há sidestep, sidewalk, rotação de arena, profundidade de colisão ou desvio de eixo. `U`/`D` mantêm significado vertical/agachamento; não ganham uma ação de profundidade. Golpes cuja função depende de sidestep precisam de adaptação própria ou ficam fora da primeira lista. Propriedades homing/tracking não concedem uma vantagem artificial contra um eixo inexistente.

Preservar aproximação, recuo, dash, backdash, crouch dash e transições de postura quando traduzíveis ao plano. Separar movimento, agachamento completo (`FC`), levantar do agachamento (`WS`) e corrida (`WR`) na notação e nos dados; `WS` não significa golpe durante salto. Saltos e ataques aéreos existentes são legado do protótipo e devem ser auditados para não converter o combate em um sistema centrado em air dash ou combos de cancelamento livre.

#### Ayla: núcleo inicial e lista de golpes

Ayla será construída primeiro como lutadora de punição, execução precisa, pressão de aproximação e escolha entre médio e baixo. Sua lista deve aproximar funções, trajetórias, comandos e poses de Kazuya, mantendo identidade, nomes e arte próprios. Não reduzir essa direção a adicionar um especial elétrico ao livro atual.

| Família a especificar para Ayla | Papel na primeira base jogável |
| --- | --- |
| Jabs e strings curtas, incluindo equivalente funcional a `1,1,2` | Punição rápida, confirmação e risco na conclusão |
| Médios, baixos e strings direcionais | Controle de espaço, pressão e escolhas defensivas verificáveis |
| Ascendente normal e elétrico de execução precisa | Duas versões com comandos, risco, recompensa e keyframes próprios |
| Crouch dash e repetição de avanço | Acesso ao mix de médio/baixo sem movimentação em profundidade |
| Rasteira de aproximação e alternativa média | Mix com consequências próprias de bloqueio, queda e distância |
| Respostas em pé, `FC` e `WS` | Punição correspondente à postura real de recuperação |
| Launchers, extensores, enders e finalizadores de parede | Rotas de dano, transporte e posicionamento distintas |
| Agarrões e respostas defensivas | Quebras e recuperação explícitas; não um cancel universal |

A tabela organiza as famílias do livro executável; não homologa sua arte nem seus valores finais. Manter catalogados todos os movimentos pertinentes ao plano 2D, suas strings e variantes. Recursos especiais de transformação/Rage dependem de especificação própria; não presumir que toda particularidade do personagem de referência já foi aprovada para Ayla. Os cinco especiais anteriores de Ayla são material legado de teste, fora do comando do livro novo.

#### Critério de fidelidade de frames e poses

Cada golpe precisa de ficha rastreável: ID local, comando, fonte e versão, postura inicial/final, níveis por hit, dano por hit, primeiro frame de contato, intervalos ativos, recuperação, vantagem em bloqueio/acerto/counter hit, deslocamento, pushback, crush/evasão quando aplicável, resultado de queda/launch e propriedades de combo/parede. Usar os valores de Tekken 7 como ponto de partida e manter os compatíveis; qualquer desvio necessário ao 2D fica justificado na ficha. Não aplicar acréscimos globais de startup ou recuperação para tornar sprites mais legíveis.

Distinguir tempo do comando, buffer e startup da ação. Uma referência `i10` identifica o primeiro frame capaz de acertar na convenção da fonte; isso não deve ser copiado cegamente para um campo que conte apenas frames anteriores ao ativo. Documentar e testar a conversão, contato tardio e vantagem resultante. Dados ausentes, como intervalo ativo completo, não devem ser inventados a partir de um único número de startup.

Keyframes incluem antecipação, passagem, primeiro contato, ápice e recolhimento, com peso, trajetória e proporção temporal próximos à referência. Vincular cada pose a frames lógicos e revisar lado a lado em velocidade normal e por passo único. Suavizar um loop não autoriza alongar o ataque; holds de arte não ampliam hitboxes. Hitstop, efeitos e câmera têm especificação separada e nunca mascaram uma divergência temporal. O alvo HD e o pixel art temporário obedecem ao mesmo contrato.

#### Ordem de balanceamento e homologação

1. Fixar convenções de contagem, reconhecimento de comandos e baseline de Ayla contra ela mesma.
2. Homologar neutro, defesa alto/médio/baixo, punição em pé/agachada, execução normal/precisa e counter hit.
3. Homologar uma rota simples e outra de maior execução por launcher, com queda/levantada e transporte até a parede.
4. Homologar interação de parede e rotas de dano versus wall carry; registrar custo, distância e recompensa.
5. Só então calibrar Gris e ampliar o elenco com referência nessa base. Ajustes em Ayla exigem revalidar os casos que dependem dela.

Medir dano por abertura, número de aberturas por round, risco de bloqueio/erro, alcance, recompensa por execução, distância de carry e vantagem após queda. Vida, escala de dano, dimensões da arena, movimento e gravidade devem ser calibrados em conjunto: não copiar dano isolado de uma escala de vida diferente. A ficha separa valores de referência, adaptação proposta, valor implementado e evidência aprovada. Nenhuma porcentagem de vitória isolada substitui esses critérios.
