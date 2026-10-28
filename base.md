# Close Combat — Princípios do projeto

Este documento contém somente decisões gerais e duradouras. Escopo em execução, personagens, cenários, fichas numéricas, tarefas, pendências, histórico e validações pertencem exclusivamente à [pipeline](pipeline.md). Contratos específicos executáveis ficam nos dados e manifestos correspondentes.

## Identidade e direção

Close Combat é um jogo de luta 2D para navegador de computador. A experiência deve favorecer leitura de ações, domínio de distância, pressão, defesa e retorno de controle verificável. Treino, confronto local e partidas contra IA compartilham as mesmas regras de combate.

Anime fighters, especialmente Guilty Gear Xrd Rev 2, orientam a intenção de ritmo. Hades orienta a linguagem ilustrada descrita em [identidade-visual.md](identidade-visual.md). Referências externas não autorizam copiar personagens, identidade, assets, comandos, números ou sistemas completos.

## Autoria e decisões

- Combos são definidos pelo usuário, manualmente e individualmente. Não gerar receitas, catálogos ou rotas por combinação automática.
- Não inferir regras, personagens, golpes ou sistemas de uma referência estética ou de um arquétipo.
- Números provisórios e conteúdo exploratório não equivalem a aprovação de design, balanceamento ou arte.
- Uma definição de personagem não se torna regra universal por estar implementada primeiro. Cada kit tem dados e revisão próprios.
- Lacunas ficam explícitas na pipeline; não completá-las por cópia de versões descartadas.

## Notação universal de comandos

Esta convenção vale para todos os personagens; não define quais golpes ou combos cada um possui.

| Símbolo | Significado |
| --- | --- |
| `1` | Soco fraco |
| `2` | Soco forte |
| `3` | Chute fraco |
| `4` | Chute forte |
| `u` | Up — cima |
| `d` | Down — baixo |
| `b` | Back — trás |
| `f` | Front — frente |

Frente e trás são relativos à orientação do personagem, não a um lado fixo da tela. Letras combinadas representam diagonais (`df` e `fd`: baixo/frente; `bd`: baixo/trás). Vírgulas indicam entradas sucessivas; `+` indica botões simultâneos. A notação é independente das teclas físicas remapeáveis. Cada etapa de combo exige sua entrada; não executar uma sequência inteira com um único botão. Catálogos e exceções individuais ficam somente na pipeline e nos dados de cada personagem.

## Fundação técnica

TypeScript, Vite, Phaser e Vitest formam a base técnica. A simulação determinística roda a 60 Hz, independente da renderização. Entrada, dados, estado, colisão, combate, renderização, interface e assets têm responsabilidades separadas.

O motor é a autoridade sobre contato, dano, posições e duração dos estados. Sprites, cores, câmeras, cenários e HUD não alteram essas regras. Perfis e livros de golpes pertencem a cada personagem; não impor um catálogo universal por conveniência.

Controles são remapeáveis, direções são relativas ao oponente e transições de pausa/reset/foco não devem reaproveitar comandos antigos. Ferramentas de treino e IA usam entradas legais e a mesma simulação das partidas, sem acertos ou vantagens forçados.

## Apresentação compartilhada

A saída padrão é Full HD 1920 × 1080, em 16:9, com composição lógica 1024 × 576 e projeção uniforme. A câmera de combate tem escala fixa, acompanha o combate no eixo horizontal e o personagem mais alto no eixo vertical durante a subida e a descida. O tamanho visual dos personagens é independente da escala do cenário; o enquadramento deve preservar ambos nos limites laterais. Não aplicar zoom dinâmico por distância, ação ou postura.

O piso, os lutadores e os cenários compartilham o mesmo espaço. O limite lateral da visão deve preservar ambos os lados sem arrastar um personagem parado. Mudanças autorizadas no tamanho dos lutadores exigem revisão proporcional de corpo, hurtboxes, hitboxes e seus deslocamentos nos dados de cada personagem. As caixas físicas não são inferidas automaticamente de silhuetas ou do desenho do cenário.

O HUD deve ser minimalista: barras de vida contínuas próximas ao topo, sem divisões verticais ou molduras grandes. Mostrar dados reais; detalhes de diagnóstico pertencem às ferramentas de treino. Animações decorativas respeitam movimento reduzido e não prejudicam leitura ou foco.

## Contato e tempo

Acertos e bloqueios confirmados recebem uma micro pausa compartilhada na pose de impacto; golpes que erram não pausam. A pausa usa cinco ticks a 60 Hz, aproximadamente 83 ms. Durante ela, combate, física e animação ficam congelados, enquanto o relógio do round continua contando normalmente. Contatos simultâneos não somam pausas. A retomada não deve pular desenhos nem alterar os tempos próprios dos golpes. Reset e encerramento de round devem tratar esse intervalo de forma consistente.

A ativação de toda ultimate usa uma preparação cinematográfica prolongada com pausa global: somente a sequência de ativação do autor avança; adversários, projéteis, física, efeitos e relógio do round ficam congelados. Essa pausa é distinta da micro pausa de contato. Ativações simultâneas compartilham o mesmo intervalo, sem acumular tempo. O combate retoma ao terminar a animação de preparação, sem pular frames ou conservar esse estado após reset.

Fundos de combate são ultrawide, com proporção mínima 21:9. Preservar a proporção nativa e ajustar o enquadramento do cenário para evitar ampliação excessiva; a escala dos lutadores e o tamanho de saída da tela são decisões separadas. Não esticar a imagem nem aplicar zoom dinâmico.

Ataques aéreos básicos preservam o deslocamento e a gravidade do salto; iniciar um golpe não interrompe a trajetória horizontal. Deslocamentos próprios de especiais continuam definidos nos dados do golpe.

Um alvo lançado permanece em reação aérea até aterrissar. A gravidade inicial do levantamento é reduzida e aumenta progressivamente a cada novo acerto recebido no ar. Ao tocar o chão, o alvo entra em recuperação protegida e recebe uma breve invencibilidade ao retornar ao controle normal. O salto livre não usa a gravidade de juggle; valores de cada personagem pertencem aos seus dados. Capturas cinematográficas mantêm sua sequência própria.

## Qualidade e entrega

Priorizar código limpo, legível e bem organizado, com nomes claros, responsabilidades coesas e soluções proporcionais à necessidade atual. Manter somente código, dependências, documentação e assets necessários ao escopo autorizado; retirar sobras, duplicações e peças substituídas após conferir seus consumidores. Artes rejeitadas ou sem aprovação não compõem o acervo ativo; propostas em revisão só permanecem enquanto necessárias a uma tarefa autorizada registrada na pipeline. Fontes ativas de preparação e referências canônicas são parte desse acervo necessário. O Git preserva versões descartadas.

Seguir [docs/ci-cd.md](docs/ci-cd.md). Instalação reproduzível, testes, build e diff são obrigatórios. Mudanças de arte, interface, animação ou controles também exigem conferência no jogo. Validação local, CI remota e aprovação artística são evidências distintas.

Não remover ou enfraquecer testes para mascarar falhas. Alterações de regra exigem atualização explícita das regressões correspondentes. Código e documentação devem comunicar o estado real, sem apresentar tarefas pendentes como concluídas.
