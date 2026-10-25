# Close Combat — Documento principal de design

> **Design 0.5.1 · 25/10/2026.** Shoto inicial, sem alteração da versão do pacote.
> **Raiz de regras e escopo.** Execução em [pipeline.md](./pipeline.md), arte em [identidade-visual.md](./identidade-visual.md) e entrega em [docs/ci-cd.md](./docs/ci-cd.md).
> **Estado real:** elenco anterior removido do código e dos assets; Shoto provisório jogável com quatro básicos. Combo breaker, drive rush, rage e rage art permanecem pendentes.

## 1. Reinício do projeto de combate

Close Combat é um jogo de luta 100% 2D para navegador. O foco atual é construir e equilibrar um único personagem do arquétipo **shoto**, usando-o como referência para os demais. Seu nome provisório é **Shoto**; aparência, personalidade, arma e animações finais continuam indefinidas. O shoto de balanceamento não está automaticamente identificado com o protagonista da história futura.

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

Essas descrições orientam diferenças de jogo; não são catálogos ou regras fechadas. As referências nominais são notas criativas, não instruções para reproduzir personagens. **Nenhuma delas define o visual do shoto inicial.** Composite é uma décima ideia exploratória, fora dos nove arquétipos principais e sem produção prevista.

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

Guilty Gear Xrd Rev 2 orienta o combate; Hades orienta a arte. A antiga referência visual global em Guilty Gear Strive foi substituída. O nome técnico provisório é Shoto. Não produzir figurino, arma, retrato ou animação final agora. Usar representação neutra de diagnóstico quando a implementação começar; não reaproveitar identidade de um personagem retirado como identidade aprovada.

## 8. Qualidade e entrega

Seguir [docs/ci-cd.md](./docs/ci-cd.md): uma branch por objetivo, validação antes do push, CI remota confirmada antes da integração em `development`. `main` e tags pertencem a marcos de release próprios.

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

Os quatro básicos só começam em pé e no chão. Agachar ou saltar não cria golpes extras. Altos passam sobre alvo agachado; médios atingem em pé/agachado. Segurar `B` ou `DB` bloqueia altos/médios quando a geometria permite o contato; `DB` também cobrirá baixos se forem cadastrados futuramente. Defesa não causa dano nem atordoa o atacante como parry. Um ataque fora de alcance não desloca o alvo. Contatos simultâneos são trades.

Movimento técnico preservado: andar frente 2,4 e trás 1,8 unidades/frame; dash frente 4,6 e trás 3,6 por 12F, corrida 5,2 mantendo avanço após dash; salto inicial −10 e gravidade 0,55. Agachar mantém posição. Dash/corrida são locomoção comum, sem implementar drive rush. Arena, câmera, rounds (99s, duas vitórias) e remapeamento continuam disponíveis. Todos os números continuam provisórios.

PvP e treino usam Shoto espelhado. Arcade tem uma luta espelhada com IA por entradas legais até haver novo elenco. O tutorial básico possui seis lições: movimento, os quatro golpes e defesa. O treino de combos mantém a estrutura e mostra mensagem de espera porque não há receitas. Renderização geométrica neutra distingue jogadores por cor e orientação e representa o alcance apenas na fase ativa; não é arte ou animação final.
