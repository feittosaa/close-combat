# Shoto inicial — migração e validação

25/10/2026 · Branch `codex/feature-shoto-inicial`. Raiz: [base.md](../base.md).

## Resultado e limites

Apenas Shoto, com quatro básicos. Removidos os dados e sprites de Ayla, Gris, Tester e Dummy, seus manifestos, catálogos, importadores e ferramenta de revisão exclusiva da arte antiga. Também saem parser contextual, strings, combos, parry/low parry, execução precisa de combate, Fulgor, ultimate antiga, projéteis, agarrões, lançamentos, Screw, wall splat, scaling e recuperação somente em bloqueio. Nenhuma dessas regras fica escondida como fixture executável.

Corrigida a tolerância numérica do acumulador de tempo para emitir os mesmos 120 passos em dois segundos a 30/60/120/144 FPS (144 FPS perdia um passo por arredondamento). Mantidos simulação 60 Hz, geometria de combate por personagem, input e remapeamento, reconhecimento genérico de entradas, cenário/Cais, câmera, rounds, treino e infraestrutura genérica de amostragem de animação para arte futura. Nenhum comando de sequência, acorde ou execução precisa está cadastrado no kit. Shoto usa geometria neutra; seus valores são novos e provisórios. Recursos novos aguardam definição.

## Rastreabilidade dos testes

A migração substitui testes de conteúdo revogado, não aprova a feature apagando regressões:

| Contrato anterior | Destino nesta base |
| --- | --- |
| AylaCombat, OrganicCombat e CharacterData | CharacterData e Simulation verificam único elenco, quatro golpes, remoção de IDs, input, contato, defesa e recuperação integral |
| AylaAnimations, GrisAnimations e atlas anteriores | AnimationPlayback mantém contratos genéricos; AnimationDeterminism verifica corpo/pés, contato, pausa/reset e FPS do Shoto geométrico |
| ComboFreedom, ComboRoutes e ElectricRecovery | Regras revogadas; Simulation garante ausência de cancelamento, recuperação após hit/whiff/block e descarte de acordes/comandos durante lock |
| JuggleGravity, LaunchLimit e KnockdownRecovery | Lançamentos, quedas e levantadas retirados; Simulation conserva salto, gravidade, aterrissagem, stun e retorno ao controle, sem simular golpes removidos |
| Projectiles e TechnicalMovement | Conteúdo retirado; contratos de alcance, geometria, input e movimento seguem cobertos sem reintroduzir projéteis/posturas |
| GuardMovement, Running, controles, teclado e câmera | Migrados ao Shoto; mantidos contratos de guarda parada, corpo sem arrastar defensor, chão/escala, corrida, remapeamento e limpeza de entradas |
| ArcadeController e ArcadeReplay | IA usa apenas entradas legais dos quatro básicos e conclui partida espelhada reproduzível |
| Tutoriais antigos | TrainingSession verifica lições dos quatro básicos por contato e estado vazio sem receita inventada |

O número antigo de 419 testes abrangia conteúdo descartado. A nova suíte tem **109 testes em 13 arquivos**, aprovados após instalação limpa; a mudança de contagem acompanha as regras revogadas e não representa redução do compromisso de cobrir a infraestrutura preservada.

## Conferência no jogo

Servidor Vite local e navegador. Sem erros de console observados. Verificados:

- Seleção só de Shoto; Cais e chão compartilhado mantidos.
- Quatro entradas de P1: J/K/N/M; contatos com danos 20/35/25/45, caixas e recuperação no treino em 25%.
- Guarda alta do alvo: chute forte bloqueado, dano zero, blockstun e vantagem exibidos, sem parry.
- Catálogo de pausa com exatamente quatro golpes; alternância P1/P2 mostra J/K/N/M e Num1/Num2/Num3/Num4.
- PvP: movimento dos dois jogadores e soco de P2 reduzindo a vida de P1; sem painéis de depuração.
- Arcade: IA aproxima, ataca e conclui partida contra P1 parado; resultado e pausa funcionam.
- Treino de combos: mensagem de espera por receitas, sem crash ou aprovação automática.
- Tutorial básico: seis lições concluídas no jogo, incluindo defesa.
- Build de produção: catálogo e treino carregados; inspeção de pausa mantém o frame 3 e um clique em avanço único muda somente para frame 4. Sem erros de console na conferência final.

Evidências em [evidence/shoto-inicial/](./evidence/shoto-inicial/): `soco-fraco.png`, `soco-forte.png`, `chute-fraco.png`, `chute-forte.png`, `bloqueio.png`, `catalogo.png`, `pvp.png`, `arcade.png`, `combos-vazio.png`, `tutorial-basico.png` e `passo-unico.png`.

## Entrega

Validação local aprovada: `npm ci`, `npm test -- --run` (109 testes / 13 arquivos), `npm run build`, links dos documentos ativos e `git diff --check`. Build conserva o aviso de chunk acima de 500 kB. CI remota e integração: pendentes do envio desta branch. Nenhuma promoção para `main` ou tag prevista.
