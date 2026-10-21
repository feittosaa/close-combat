# Combate por personagem — Ayla

## Entrega

Branch `codex/feature-combate-ayla`. A solicitação desta entrega amplia o catálogo de referência para todas as 135 entradas expostas de Kazuya em Tekken 8, no link indicado pelo usuário. O núcleo continua em um plano 2D, com quatro botões, comandos relativos ao adversário, fases lógicas e um único extensor Screw por combo. Isso atualiza o escopo documental anterior que tratava a ficha T8 apenas como complemento; não declara que dados de T8 são de Tekken 7.

Ayla possui 135 entradas de referência, duas entradas autorais de postura 2D e cinco avanços confirmados de Fulgor. Existem 36 receitas de combo, incluindo alternativas de starter/finalizador do guia. Combinações possíveis não são uma lista finita de receitas: o motor resolve cada contato e estado, não despacha combos automáticos. As 18 ações do protótipo anterior ficam com `legacy: true`, disponíveis para regressão e revisão da arte, fora do livro de entrada e do pause atual.

## Fontes e autoria

Dados: [TekkenDocs — Kazuya](https://tekkendocs.com/t8/kazuya), [guia indicado](https://tekkendocs.com/t8/kazuya/meta) e RBNorway. Snapshot datado e revisão do dataset em `src/engine/data/reference/kazuya.json`. O guia consultado declara GameVersion 3.01.01; isso não certifica o patch de cada linha de frame data. A permissão do projeto de origem autoriza o uso dos dados expostos com atribuição; nenhum código, sprite, vídeo ou áudio do site foi importado.

`python scripts/import-ayla-combat.py` reconstrói os dados de execução e as filas de produção a partir do snapshot local, sem rede. IDs de referência são estáveis por comando; identidade e arte continuam sendo de Ayla. O jogo não depende do site para carregar.

## Modelo executável

- Cada lutador mantém seu próprio livro, comandos, categorias, colisões, recursos e receitas. Gris e Tester continuam usando suas definições próprias; não recebem o catálogo de Ayla.
- `MoveDefinition.combat` possui intervalos por contato, nível e dano de cada hit, membro, resultado normal/counter, caixas autoradas, fases de hurtbox, janelas de crush/armadura/parry e relação de follow-up. Intervalos entre hits não ganham caixa ativa.
- Cada contato acerta no máximo uma vez. Um hit subsequente do mesmo movimento pode acertar novamente. A geometria exibida usa os mesmos dados do resolvedor.
- Strings exigem entradas de continuação, com buffer e janela associados ao movimento anterior. Não viram sequências inteiras ao pressionar um botão. Segurar o último botão permite a versão carregada; o tempo de carga já integra seu startup.
- FC exige seis frames de agachamento; WS é a janela após soltar o agachamento. Crouch dash usa F,N,D,DF ou F,N,DF. O elétrico exige botão e DF no mesmo frame; atalhos são declarados no comando. Cada personagem pode declarar regras diferentes.
- SS passa a ser uma postura de esquiva curta no próprio plano. Entradas F+1+2+3+4 e B+1+2+3+4 dão acesso a SS e BT; não há terceiro eixo. Agarrões laterais da referência viram variantes direcionais frontais, com quebras próprias, sem inventar lateralidade física.
- Sete agarrões têm alcance, quebra e resultado próprios; duas quebras alternativas são aceitas nos agarrões comuns. Ataques com extensão em agarrão exigem o contato anterior. A continuação B pode cancelar antes da extensão correspondente.
- Low parry de Ayla usa DF por uma janela curta; não é o parry legado universal de B. O sabaki de socos altos/médios usa a janela do próprio golpe. Crush alto/baixo e armadura são propriedades por intervalo; armadura recebe dano sem cancelar o ataque.
- A carga habilita counter hit no próximo ataque e impede guarda durante sua duração. Counter hit altera a reação declarada, sem bônus global oculto de dano.
- Fulgor é uma adaptação local das variantes Heat/Devil: 600F, uma ativação por round, entradas condicionais, custos e avanços confirmados. A variante R exige vida até 25% e é consumida por round. Não há sistema de vida recuperável importado de T8; golpes declarados não letais preservam ao menos um ponto de vida.
- Projéteis pertencem ao contato emissor e continuam existindo fora da recuperação do atacante. Onde falta arte de energia, usam efeito explicitamente provisório.

## Juggle, parede e balanceamento

Launchers levam o alvo ao ar; hits sucessivos acumulam dano e contagem, com redução de dano e deterioração da trajetória. A vantagem de uma reação aérea não é apresentada como um número de stun terrestre: depende da trajetória e da aterrissagem. O primeiro Screw renova a trajetória; os seguintes não renovam esse recurso. Queda entra em knockdown e devolve o controle após o relógio de recuperação. Vida do treino pode restaurar após um período sem ações.

Wall carry usa deslocamentos e pushback reais. Um contato válido na borda pode gerar um wall splat por combo; wall bounce devolve o alvo para dentro da arena quando o golpe permitir. Corpo e caixas permanecem dentro dos limites. Quebras de chão/sacada da referência são adaptadas à parede fixa; não há transição de arena.

Ayla tem hurtboxes próprias para parado, agachado, aéreo, juggle e queda. A hurtbox de juggle representa o volume da futura reação horizontal; o sprite atual ainda não está homologado para essa pose. Dano usa escala ×4 para conviver com a vida do protótipo. Movimento, dimensões, janelas, gravidade, carry e valores não publicados são balanceamento 2D provisório, não números certificados do jogo de referência.

## Pause e lista de golpes

P ou Esc abre o pause em treino, PvP e arcade. Parar não avança simulação, bot, cronômetro ou projéteis. No treino, a lista mostra o livro de P1 ou P2, com busca, categorias disponíveis naquele personagem, receita e ficha de movimento. Uma ação pode aparecer em várias categorias sem criar cópias no livro.

Categorias incluem básicos, strings, combos, especiais, agarrões, starters, agachados, WS, posturas, defesa e parede. Fichas mostram os comandos, contatos, fases, dano, condições e estado da arte. “Fixar comando no treino” mantém a receita visível ao retomar. “Inspecionar luta” recolhe a lista mantendo a pausa, para ver caixas e poses; ponto ou “Avançar 1 frame” avança somente um frame lógico. Reabrir a pausa volta à lista por padrão. Entradas de navegação não são reaproveitadas como ataques ao sair do pause. Esc dentro da luta passa a abrir/fechar o pause; o retorno ao menu é uma escolha explícita nele.

## Limites de fidelidade e produção

Todas as entradas possuem implementação e entrada contextual; isso não certifica a fidelidade final de animações ou balanceamento. Os valores publicados são preservados quando têm correspondência clara. Lacunas de startup de follow-up e recuperação usam estimativas visíveis na ficha, em vez de impedir o movimento.

- [Animações e efeitos faltantes](./ayla-combate-animacoes-pendentes.md): todas as entradas têm associação provisória e instrução de produção; inclui reações de juggle e parede.
- [Dados a confirmar](./ayla-combate-dados-pendentes.md): propriedades temporárias por comando. Não confundir primeiro frame de contato com todos os frames ativos.

As poses são amostradas pelo relógio de combate; a arte não determina startup, dano ou colisão. Produzir os desenhos faltantes antes de aprovar a continuidade/keyframes finais.

## Validação

O catálogo tem teste parametrizado das 135 entradas e seus requisitos, mais testes de múltiplos contatos, elétrico/atalhos, strings, low parry, carga, recurso, projétil e avanço confirmado. Replays por entradas normais verificam dois elétricos, string após launcher, a primeira rota completa com extensor e ender e combo após splat real. Os casos de regressão de projéteis anteriores usam um fixture separado, preservando sua cobertura independentemente da troca de livro de Ayla.

A cobertura de um conjunto de replays não certifica todas as distâncias e matchups; as receitas do guia permanecem sujeitas ao balanceamento da adaptação 2D. A conferência visual e os resultados finais da CI são registrados na pipeline e na entrega do PR.
