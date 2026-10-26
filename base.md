# Close Combat — Documento principal de design

> **Design 0.5.1 · 25/10/2026.** Shoto inicial, sem alteração da versão do pacote.
> **Raiz de regras e escopo.** Execução em [pipeline.md](./pipeline.md), arte em [identidade-visual.md](./identidade-visual.md) e entrega em [docs/ci-cd.md](./docs/ci-cd.md).
> **Estado real:** elenco anterior removido do código e dos assets; Shoto provisório jogável com quatro básicos. Combo breaker, drive rush, rage e rage art permanecem pendentes.

## 1. Reinício do projeto de combate

Close Combat é um jogo de luta 100% 2D para navegador. O foco atual é construir e equilibrar um único personagem do arquétipo **shoto**, usando-o como referência para os demais. Seu nome provisório é **Shoto**. O usuário aprovou o conceito visual “Anfitrião” e a integração dos sprites de idle, caminhada, agachado, salto, defesa, caminhada para trás, dash e backstep: homem alto e esguio, cabelo castanho-avermelhado preso, bigode/cavanhaque, paletó marfim, camisa vinho e calça preta. Arma, narrativa, nome definitivo e reações continuam indefinidos. Os quatro básicos agora têm animações próprias, assim como as guardas agachada e aérea. O shoto de balanceamento não está automaticamente identificado com o protagonista da história futura.

O ritmo e o balanceamento têm como referência conceitual um **anime fighter, especialmente Guilty Gear Xrd Rev 2**. A direção de arte tem como referência **Hades**, traduzida em desenho original. São referências de intenção, sem adoção automática de números, comandos, personagens ou sistemas completos dessas obras.

### Precedência e descarte

Esta decisão substitui o design anterior e suas tarefas de conteúdo:

- Retirar **todos os personagens existentes**, incluindo Ayla, Gris, Tester e Dummy, de seleção, adversários, treino, tutoriais, catálogos e referências ativas. Nenhum permanece como exceção de elenco ou base de balanceamento. Um alvo de treino futuro deve usar a nova base neutra.
- Descartar o balanceamento, livros de golpes, strings, combos, receitas de tutorial e adaptações/importações anteriores, inclusive as referências Tekken/Kazuya/Noctis. Não converter automaticamente o catálogo de Ayla em catálogo do shoto.
- Retirar o **parry**. A nova mecânica de saída de combos será o **combo breaker**; não é apenas renomear o parry.
- Não herdar como requisitos os 18 ataques base, 80 entradas, seis levantamentos, quatro especiais, comandos de ultimate, janelas, dano, gravidade, limite de levantamentos, Screw, wall splat, recuperação somente no bloqueio ou versões de execução precisa. Essas escolhas pertencem ao protótipo descartado e precisam de nova definição quando relevantes.
- Cancelar a produção de arte e o balanceamento pendentes para o elenco anterior. Assets e evidências existentes não representam a identidade futura.

A remoção foi implementada na entrega `codex/feature-shoto-inicial`, incluindo dados, importadores, assets, parry, strings, recursos e reações experimentais anteriores. Documentos anteriores em `docs/` estão identificados como históricos; seus números, checklists e aprovações não homologam o novo design. O Git preserva as versões anteriores dos documentos principais.

## 2. Prioridades e modos

1. **Treino:** bancada principal para definir golpes, testar cada combo e medir o combate.
2. **PvP:** luta local 1 contra 1 como primeiro ambiente de comparação, inicialmente shoto contra shoto. Online não está incluído nesta etapa.
3. **Arcade PvE:** manter o formato de partidas contra IA, adaptando adversários à nova base sem exigir novos personagens antes da homologação do shoto.

O sistema de treino/tutorial de combos pode permanecer como ferramenta. Seu conteúdo antigo deve sair: novos exercícios usam somente receitas enviadas pelo usuário e aprovadas individualmente. O tutorial básico, se preservado, também precisa abandonar personagens e lições incompatíveis, especialmente parry.

História, roguelike, cartas, bênçãos, trinkets e missões estão fora da implementação atual. As ideias ficam em [docs/ideias-futuras.md](./docs/ideias-futuras.md).

## 3. Nove arquétipos e sequência de elenco

| Arquétipo | Papel de design | Ideia temática futura, sem identidade aprovada |
| --- | --- | --- |
| Shoto | Base versátil para comparação dos demais | Hitman / John Wick como anotação conceitual |
| Grappler | Proximidade e ameaça de agarrões | Personagem grande cyberpunk |
| Stance | Alternância entre posturas | Kung fu chinês |
| Puppet | Controle de personagem e entidade auxiliar | Mafioso demoníaco / Constantine como anotação |
| Rushdown | Aproximação e pressão ofensiva | Viking berserker |
| Zoner | Controle de espaço e distância | Cowboy |
| Mix-up | Variação de ameaças e respostas defensivas | Samurai |
| Gimmick | Regra particular que define suas decisões | Pirata de sorte, nota de nome “Nimbus” |
| Set play | Preparação de situações e pressão planejada | Caçador de bruxas / médico da peste |

Essas descrições orientam diferenças de jogo; não são catálogos ou regras fechadas. As referências nominais são notas criativas, não instruções para reproduzir personagens. As notas temáticas não substituem o conceito visual “Anfitrião”, posteriormente escolhido pelo usuário. Composite é uma décima ideia exploratória, fora dos nove arquétipos principais e sem produção prevista.

Primeiro definir e equilibrar o shoto. Só depois criar e balancear os outros personagens em relação a essa referência, um por vez. Não fabricar nove kits em paralelo nem fixar confrontos antes de existir a base.

## 4. Golpes e combos de autoria manual

O usuário criará os combos **manualmente, um por um**. Não gerar um catálogo, preencher combinações possíveis, restaurar receitas antigas ou assumir rotas com base apenas no arquétipo.

As notas `1,1,1`, `2,2,2` e `3,3,3` exemplificam **combos fechados** a especificar. Não são três receitas implementadas, aprovadas ou necessariamente garantidas no bloqueio. “etc.” não autoriza gerar outras sequências. Cada passo exige sua entrada; a nota não autoriza executar o combo inteiro com um botão.

A notação numérica continua útil para conversar: vírgula indica sequência e `+` simultaneidade. A decisão de 25/10/2026 define `1` como soco fraco, `2` soco forte, `3` chute fraco e `4` chute forte. O kit inicial contém somente esses quatro golpes em pé; `F` e `B` não mudam o golpe. Não há versões agachadas/aéreas, acordes, especiais ou agarrões cadastrados.

### Processo de aprovação de uma receita

1. Receber do usuário a sequência e a intenção do combo.
2. Registrar starter, passos, contexto, condição de acerto, conclusão e comportamento esperado em erro ou bloqueio.
3. Definir com o usuário as propriedades que faltarem, sem preencher um catálogo inteiro por suposição.
4. Implementar a receita no livro próprio do shoto; medir dano, duração, alcance, risco, transporte e devolução de controle.
5. Testar ambos os lados, centro e canto quando aplicável, defesa, erro, interrupção e interação com recursos já especificados.
6. Conferir no treino e registrar a decisão: proposta, em ajuste ou homologada. Somente então usar como referência para a próxima receita.

Não há receitas homologadas. A ficha numérica inicial serve somente para operar a bancada, sem homologação de balanceamento. A bancada está em [docs/shoto-balanceamento.md](./docs/shoto-balanceamento.md).

## 5. Sistemas de combate da nova direção

| Sistema | Decisão | Definições necessárias antes de implementar |
| --- | --- | --- |
| Parry | Removido do design | Retirar lógica, input, feedback e lições dependentes na migração |
| Combo breaker | Incluir uma saída de combos | Comando, elegibilidade, custo, disponibilidade, janela, efeito, risco, imunidade e retorno ao controle |
| Drive rush | Incluir como mecânica de avanço/pressão | Ativação, custo, velocidade, duração, cancelamentos, vulnerabilidade e interação com defesa |
| Rage | Incluir como estado/recurso | Gatilho, duração, ganho/consumo, efeitos, persistência e relação com drive rush |
| Rage art | Ultimate da nova direção | Comando, condição, custo, uso por round, defesa, erro, dano e apresentação |

A fala “rage (drive rush)” deixa a relação entre esses dois sistemas aberta. Registrar ambos sem presumir que compartilham barra, que um ativa o outro ou que sejam nomes intercambiáveis. Rage art é a ultimate; não criar uma segunda ultimate paralela.

Não adotar automaticamente o limite antigo de 25% de vida, uma tentativa por round, quatro botões simultâneos ou qualquer outra regra de ultimate do protótipo. Também não presumir air dash, Roman Cancel ou outras mecânicas por causa da referência anime fighter.

### Fundamentos a especificar e medir

Manter movimento, ataque, defesa, distância, vantagem e punição como dimensões de combate. Reavaliar startup, atividade, recuperação em acerto/erro/bloqueio, hitstun, blockstun, cancelamentos, knockdown, juggle, escala de dano e canto para servir à nova direção. Valores e regras de combate do protótipo não equivalem a aprovação para o shoto.

O kit inicial não derruba nem lança o adversário; não há knockdown, juggle ou levantada implementados nesta base. A preferência por recuperação manual fica registrada para quando quedas forem novamente especificadas, sem reintroduzir seus golpes e tempos antigos.

O objetivo é pressão, rotas e respostas defensivas legíveis, com limites verificáveis contra loops e retorno de controle definido. Medir cada escolha antes de afirmar que o balanceamento se aproxima da referência desejada.

## 6. Fundação técnica preservada

- TypeScript, Vite, Phaser e Vitest; navegador de computador como plataforma atual.
- Simulação determinística em **60 Hz**, independente do FPS de renderização.
- Separação entre entrada, simulação, colisão, dados, renderização e interface.
- Hitboxes, hurtboxes, corpo, dano e frames definidos pelo motor; sprites não decidem contato.
- Livros de golpes e perfis de colisão por personagem, sem impor catálogo universal aos nove arquétipos.
- Controles remapeáveis, limpeza de entradas em pausa/reset/transições e direções relativas ao oponente.
- Câmera com escala uniforme, piso compartilhado e cenários em camadas, sujeitos à conferência visual.
- Treino com pausa, passo por frame, reset, visualização de caixas, histórico de entradas e dados de contato.

Preservar infraestrutura útil não preserva o conteúdo antigo. Adaptar seletores, IA, treino, tutoriais, HUD, animações e testes às novas definições. Nenhum recurso de rage/breaker pode existir apenas na interface ou alterar regras somente no treino.

## 7. Arte e apresentação

Seguir [identidade-visual.md](./identidade-visual.md): ilustração 2D original com referência estética em Hades, contornos expressivos, sombras gráficas, cores e texturas pictóricas controladas, silhuetas fortes e leitura em movimento.

**Padrão visual aprovado em 25/10/2026:** o traço da [arte diurna do menu](./assets/art/menu/patio-solar.png) é a referência interna para novas peças: contornos pretos expressivos com variação de espessura, desenho angular, massas de cor chapada, sombras recortadas e textura discreta. A referência de Hades orienta o desenho, sem exigir reproduzir sua paleta: cores podem variar por ambiente e personagem, preservando contraste e unidade do traço.

Essa arte diurna é o fundo padrão do menu, com deslocamento lento em loop e partículas discretas de luz. O movimento deve preservar a leitura das opções, não expor bordas e respeitar a preferência de movimento reduzido. A interface usa sombras de tinta, acentos quentes e tipografia de títulos com serifa; textos e foco são desenhados separadamente da imagem. O aval autoriza esta aplicação; futuras imagens de teste continuam apenas para avaliação até aprovação manual explícita, sem inclusão automática no repositório ou desenvolvimento.

Guilty Gear Xrd Rev 2 orienta o combate; Hades orienta a arte. A antiga referência visual global em Guilty Gear Strive foi substituída. O nome técnico provisório continua Shoto. O conceito “Anfitrião”, menu diurno e três clipes iniciais foram integrados em development com revisão no jogo e CI aprovada. O novo aval cobre também salto (8), defesa (6), recuo (8), dash (6) e backstep (6), após ajuste do cabelo e alinhamento. A entrega atual tem 116 desenhos em 21 atlas, descritos em [src/assets/sprites/characters/shoto/README.md](./src/assets/sprites/characters/shoto/README.md). Não criar ataques ou reações por suposição; estados sem arte mantêm geometria técnica explícita. A animação acompanha os frames da simulação, com raiz autorada e escala uniforme. Sprites não mudam colisões, alcance, vida, dano ou duração de estados.


### Resolução e enquadramento

A saída de renderização padrão é **1920 × 1080 (Full HD)**, ajustada à janela em 16:9 pelo modo FIT. O mundo de combate e o layout da interface continuam em coordenadas lógicas **1024 × 576**: trocar a resolução não amplia a arena, não reduz a velocidade aparente e não muda medidas de colisão ou regras. Câmeras da arena e do HUD projetam essas coordenadas uniformemente para os pixels da saída; textos usam resolução de textura 2 para preservar leitura.

A câmera da arena tem **escala fixa 1,6**, sem zoom por distância, postura ou salto, e sem movimento vertical. Acompanha somente a posição horizontal, dentro dos limites do cenário. O corpo inteiro cabe durante o salto; em pé ocupa cerca de 41% da altura lógica. O afastamento máximo é a largura lógica dividida por 1,6 menos duas margens de 92 unidades (456 em 1024 × 576), suficientes para as poses mais largas. Ao atingir essa borda compartilhada, parar somente o deslocamento para fora, sem arrastar o adversário parado; preservar os limites físicos da arena. A saída permanece Full HD 1920 × 1080, com projeção uniforme da composição lógica 1024 × 576. O menu aplica a arte diurna aprovada, interface correspondente e movimento sutil de fundo. Os 116 quadros usam células de altura 768, raiz central e Y=720; os quatro ataques usam largura 1152 (raiz X=576) para acomodar punhos/pernas, demais clipes 768 (X=384), mantendo a mesma escala corporal; preparação autorada mantém a proporção do agachado e os pés sem mudar colisores. O ciclo agachado percorre as seis poses e retorna pelas intermediárias. Cabelo castanho levemente avermelhado uniforme; movimentação real pertence à simulação, nunca à deriva da folha. O HUD é minimalista: barras contínuas próximas do topo, sem divisões verticais nem grandes molduras; serifas discretas, acentos coral/jade, vida numérica e marcadores de rounds. Dados detalhados ficam no treino. Não exibir recursos ainda não especificados.

As cinco folhas adicionais foram inicialmente apenas propostas. O aval manual posterior autorizou sua integração e o ajuste do cabelo em todas as folhas; a restrição de prévia permanece válida para futuras imagens ainda não aprovadas.

### Dashs e transições de pose

Dois toques rápidos na mesma direção iniciam dash no segundo toque, com janela de 12 frames lógicos / 200 ms. O adaptador preserva o duplo toque mesmo quando ambos ocorrem entre ticks e emite um pedido consumido uma única vez. Tecla mantida/auto-repeat não gera novo dash; reset e perda de foco descartam pedidos antigos. Dash e backstep duram 24 frames (0,4 s), com velocidades próprias já existentes; soltar a direção não interrompe o deslocamento. Direção oposta, agachamento, salto, ataque, guarda e stun mantêm suas interrupções normais. Não há corrida. Manter a direção depois de dash/backstep retorna à caminhada correspondente; soltar retorna ao idle.

Há sete conectores de quatro desenhos para caminhada, recuo, agachamento, salto, defesa, dash e backstep: 28 desenhos adicionais, total 84 em 15 atlas. Entradas comuns duram 8 frames; salto/dash/backstep usam 4, sem atrasar movimento ou regras de combate. Retorno ao idle inverte o conector, limitado à profundidade já alcançada quando a entrada é interrompida. As poses permanecem totalmente opacas, sem dissolução por alpha: a mistura anterior deixava o corpo semitransparente e causava piscadas. Os conectores autorados fazem as transições; relógio lógico e histórico anterior limitado preservam retorno parcial, pausa e determinismo em FPS diferentes. Os quatro ataques autorizados usam seis poses por golpe; somente hitstun permanece técnico. Não criar outros sprites por suposição.

## 8. Qualidade e entrega

Seguir [docs/ci-cd.md](./docs/ci-cd.md): uma branch por objetivo, validação antes do push, CI remota confirmada e pedido explícito do usuário antes de qualquer integração em `development`. `main` e tags pertencem a marcos de release próprios.

A revisão documental anterior não removia código; esta implementação remove o conteúdo antigo e entrega uma bancada funcional, sem aprovar o balanceamento final. Na migração, atualizar testes de conteúdo com rastreabilidade da regra substituída; não apagar ou enfraquecer testes para mascarar regressões. Preservar cobertura de determinismo, input, colisão, treino e fluxo. Acrescentar testes de novas regras conforme forem definidas, incluindo consumo de recursos, retorno de controle e prevenção de loops.

Toda entrega exige instalação reproduzível, testes, build e checagem de diff. Alterações visuais/de controle exigem conferência no jogo. Registrar validação local e CI remota separadamente na pipeline.

## 9. Decisões abertas

- Primeira receita manual a receber; expansão do kit somente conforme novas instruções.
- Números de vida, dano, movimento, frames, recuperação, cancelamentos e regras aéreas.
- Regras de combo breaker, drive rush, rage e rage art, inclusive relação entre recursos.
- Critérios mensuráveis para homologar o shoto antes de abrir o próximo arquétipo.
- Identidade visual e narrativa do elenco, sem fechar conceitos apenas pelas referências das notas.

Essas lacunas são trabalho futuro explícito. Não preenchê-las copiando o protótipo ou fichas de outros jogos.

## 10. Shoto inicial — contrato executável de 25/10/2026

| Entrada | Golpe | Preparo / atividade / recuperação | Dano | Hitstun / blockstun | Altura |
| --- | --- | --- | --- | --- | --- |
| `1` | Soco fraco | 6 / 2 / 12F | 20 | 10 / 6F | Alto |
| `2` | Soco forte | 10 / 3 / 18F | 35 | 14 / 8F | Alto |
| `3` | Chute fraco | 8 / 3 / 15F | 25 | 12 / 7F | Médio |
| `4` | Chute forte | 13 / 4 / 22F | 45 | 16 / 9F | Médio |

Vida: 1000. Valores novos e provisórios, definidos para testar os quatro comandos autorizados; não são o balanceamento anime fighter final. Fonte executável: `src/engine/data/fighters/shoto.ts`. Alcance, caixas, velocidades e pushback estão registrados também na bancada do shoto.

Um toque inicia um golpe, segurar não repete; é preciso soltar e pressionar novamente. Cada ataque tem um contato e recupera integralmente após **acerto, erro e bloqueio**. Não há cancelamentos, continuação contextual, buffer de saída de stun ou combos pré-cadastrados. Entradas durante um golpe ou stun são descartadas; acordes não cadastrados não executam outro ataque por acidente.

Os quatro básicos só começam em pé e no chão. Agachar ou saltar não cria golpes extras. Altos passam sobre alvo agachado; médios atingem em pé/agachado. Segurar `B` ou `DB` bloqueia altos/médios no chão ou no ar quando há ameaça e a geometria permite o contato; `DB` também cobrirá baixos se forem cadastrados futuramente. Defesa não causa dano nem atordoa o atacante como parry. Um ataque fora de alcance não desloca o alvo. Contatos simultâneos são trades.

Movimento técnico preservado: andar frente 2,4 e trás 1,8 unidades/frame; dash frente 4,6 e trás 3,6 por 24F, sem corrida ao manter avanço após dash; salto inicial −10 e gravidade 0,55. Agachar mantém posição. Dash e backstep são locomoção comum, sem implementar drive rush. Arena, câmera, rounds (99s, duas vitórias) e remapeamento continuam disponíveis. Todos os números continuam provisórios.

PvP e treino usam Shoto espelhado. Arcade tem uma luta espelhada com IA por entradas legais até haver novo elenco. O tutorial básico possui seis lições: movimento, os quatro golpes e defesa. O treino de combos mantém a estrutura e mostra mensagem de espera porque não há receitas. Nos estados sem clipe aprovado, a renderização geométrica técnica distingue jogadores por cor e orientação e representa o alcance apenas na fase ativa. Idle, andar, agachado, salto, defesa, recuo, dash e backstep possuem sprites aprovados; corrida removida. A entrega inicial já está em development; a nova revisão segue o fluxo de validação e integração descrito na pipeline.

As cinco propostas adicionais receberam aval manual para integração após ajuste do cabelo e alinhamento. Não usar a aprovação como aval para gerar ataques ou reações novos. Salto usa poses durante a trajetória real; defesa entra uma vez e mantém guarda, backstep/recuo têm folhas próprias, sem modo de corrida. O aval posterior cobre os quatro básicos e duas guardas; somente hitstun mantém representação provisória.

### Cenário de treino permanente

O Cais foi retirado do catálogo e dos assets ativos. Sala de Treino é uma sala neutra de parede/piso quadriculados, eixos de medição e textura pintada no traço ilustrado do projeto. É fixa nos modos Treino, Tutorial Básico e Tutorial de Combos; esses modos pulam a escolha de cenário. Temporariamente é também a única opção geral de PvP e Arcade. Quando novos cenários forem produzidos, retirar a sala das opções gerais e mantê-la restrita aos modos de treinamento. A política dos modos de treino deve continuar explícita, independente do default geral. Sala em uma camada opaca, parallax 1, escala uniforme e câmera lateral fixa; imagens não mudam colisões.

### Paleta de materiais do Shoto — 26/10/2026

Referências de cor em `src/rendering/animations/shotoPalette.ts`, com correção RGB contínua comum aos 116 desenhos/21 atlas no carregamento, tanto no menu quanto nas lutas. Preservar as sombras, detalhes, contornos e gradientes da ilustração. A classificação rígida por material e a quantização da entrega anterior foram rejeitadas por criarem manchas e recortes na jaqueta/pele; não reintroduzi-las. A tabela abaixo orienta a arte, sem restringir os pixels a essas cores exatas. Fontes, alpha, poses, raízes e física são preservados.

| Material | Tom de referência | Direção |
| --- | --- | --- |
| Calça | `#2D302C` | Carvão escuro, inclusive ao andar |
| Jaqueta | `#D6C8A8` | Marfim quente |
| Camisa | `#71343C` | Vinho fechado |
| Sapatos | `#543D2D` | Couro castanho |
| Cabelo | `#563A2B` | Castanho com reflexo avermelhado discreto, sem vermelho vivo |
| Pele | `#966344` | Moreno quente, levemente mais escuro |

Novos desenhos devem seguir essas referências de material, preservando luzes e sombras naturais. Não aplicar posterização nem trocar cores de pixels por classificação discreta. O desenho é 3% maior uniformemente em todas as poses (display 177,984 × 177,984), com pés e câmera fixa mantidos; colisores não foram ampliados.

### Integração somente por pedido explícito

A partir da entrega de socos/chutes e guardas agachada/aérea, concluir, validar, commitar e enviar a branch é autorizado. Qualquer merge em development exige pedido explícito do usuário para a entrega, mesmo com CI verde. Manter a branch para revisão sem apagá-la. Esta decisão substitui todas as autorizações históricas de integração automática; vale também para os próximos pedidos. Ver AGENTS.md e docs/ci-cd.md.

Novo escopo autorizado de arte: soco fraco, soco forte, chute fraco, chute forte, defesa agachada e defesa no ar. Integrar essas seis animações na branch; os quatro ataques mantêm comandos, tempos, dano e colisões existentes. Guardas usam a postura real, sem criar ataques agachados/aéreos ou novos golpes.

Os seis novos clipes têm fontes/prompts em `source/combat-generation.json`. Cada golpe distribui duas poses pelo startup, mantém a extensão durante toda a atividade e distribui três poses pela recuperação real. Guardas agachada/aérea usam quatro desenhos em ida e volta, sempre fechadas durante blockstun. A defesa aérea preserva gravidade e deslocamento aéreo normal antes do impacto; não bloqueia baixos no ar. Ao aterrissar sob ameaça, mantém guarda. Nenhum comando, dano, alcance ou tempo dos quatro básicos foi modificado.
