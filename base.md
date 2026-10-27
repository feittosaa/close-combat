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

## Fundação técnica

TypeScript, Vite, Phaser e Vitest formam a base técnica. A simulação determinística roda a 60 Hz, independente da renderização. Entrada, dados, estado, colisão, combate, renderização, interface e assets têm responsabilidades separadas.

O motor é a autoridade sobre contato, dano, posições e duração dos estados. Sprites, cores, câmeras, cenários e HUD não alteram essas regras. Perfis e livros de golpes pertencem a cada personagem; não impor um catálogo universal por conveniência.

Controles são remapeáveis, direções são relativas ao oponente e transições de pausa/reset/foco não devem reaproveitar comandos antigos. Ferramentas de treino e IA usam entradas legais e a mesma simulação das partidas, sem acertos ou vantagens forçados.

## Apresentação compartilhada

A saída padrão é Full HD 1920 × 1080, em 16:9, com composição lógica 1024 × 576 e projeção uniforme. A câmera de combate tem escala fixa, acompanha somente o eixo horizontal e deve mostrar os personagens inteiros, inclusive durante o salto. Não aplicar zoom dinâmico por distância, ação ou postura.

O piso, os lutadores e os cenários compartilham o mesmo espaço. O limite lateral da visão deve preservar ambos os lados sem arrastar um personagem parado. As caixas físicas não são inferidas de silhuetas ou do desenho do cenário.

O HUD deve ser minimalista: barras de vida contínuas próximas ao topo, sem divisões verticais ou molduras grandes. Mostrar dados reais; detalhes de diagnóstico pertencem às ferramentas de treino. Animações decorativas respeitam movimento reduzido e não prejudicam leitura ou foco.

## Contato e tempo

Acertos e bloqueios confirmados recebem uma micro pausa compartilhada na pose de impacto; golpes que erram não pausam. A pausa usa cinco ticks a 60 Hz, aproximadamente 83 ms. Durante ela, combate, física e animação ficam congelados, enquanto o relógio do round continua contando normalmente. Contatos simultâneos não somam pausas. A retomada não deve pular desenhos nem alterar os tempos próprios dos golpes. Reset e encerramento de round devem tratar esse intervalo de forma consistente.

## Qualidade e entrega

Seguir [docs/ci-cd.md](docs/ci-cd.md). Instalação reproduzível, testes, build e diff são obrigatórios. Mudanças de arte, interface, animação ou controles também exigem conferência no jogo. Validação local, CI remota e aprovação artística são evidências distintas.

Não remover ou enfraquecer testes para mascarar falhas. Alterações de regra exigem atualização explícita das regressões correspondentes. Código e documentação devem comunicar o estado real, sem apresentar tarefas pendentes como concluídas.
