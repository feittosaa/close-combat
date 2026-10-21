# Combos livres após atividade

A regra solicitada é aplicada aos strikes de todos os livros: startup e atividade precisam terminar; depois disso, acerto e erro liberam a próxima ação, sem entrar em recuperação. Se algum contato for bloqueado, o lutador passa pela recuperação cadastrada. Golpes multihit lembram o bloqueio mesmo que um contato posterior acerte. Agarrões conservam seu ciclo próprio de captura, quebra e recuperação.

Essa é uma adaptação autoral escolhida para Close Combat. Ela substitui a regra provisória anterior de 18F no contato e 24F no vazio para o elétrico; não é apresentada como a recuperação real de Kazuya. O elétrico usa 18F se bloqueado, zero após atividade em acerto/erro. A fonte e os valores-base dos movimentos permanecem rastreáveis no snapshot.

## Strings e execução

O contexto de continuação guarda o golpe anterior e seu relógio sem conservar `attack` nem o estado `recovery`. O parser pode reconhecer a continuação dentro da janela, ou uma ação raiz pode substituir esse contexto. Movimento fica livre; não executar a string inteira ao tocar um botão. Janela expirada, dano, nova ação e reset descartam o contexto. Pause conserva o estado sem avançar relógios.

A sequência `J,J,K` continua formando o launcher; após a atividade, Ayla pode iniciar o elétrico. Dois elétricos consecutivos funcionam contra Ayla, Gris, Tester e Dummy na distância inicial 96, com até 16F entre contatos na execução testada. Botão mantido não repete o golpe. Se o primeiro for bloqueado, a mesma tentativa não ignora a recuperação. O avanço de Fulgor e a transição de `3,1` para crouch dash também reconhecem o contexto livre.

## Suspensão, juggle e queda

Parâmetros de Ayla: velocidade inicial −9,6, gravidade de lançamento 0,5; manutenção de juggle −5,4 com deterioração, gravidade aérea base 0,385 + 0,025 por contato aéreo; Screw −8,5, uma renovação por combo; queda 26F. Hits no chão anteriores ao launcher não contam como contatos aéreos para a gravidade inicial.

Sem novos contatos, elétrico e `J,J,K` mantêm o alvo no ar por 36–40 frames, com altura entre 80 e 100 unidades, e a descida acelera continuamente. Na aterrissagem, o alvo entra em queda; recupera o controle no fim de 26F. Novos acertos podem prolongar o combo, mas não interrompem o relógio de gravidade. A rota de nove contatos com extensor/finalizador continua no mesmo juggle, assim como a rota de parede. Arte das reações permanece provisória e está na fila de produção.

## Evidências

329 testes verificam a política em todos os strikes dos livros, execução nos três personagens selecionáveis, multihit bloqueado/acertado, strings, elétricos consecutivos, trajetória/queda, controle no primeiro frame livre e regressões anteriores. Build e diff aprovados. Inspeção por frame no treino confirmou `J,J,K` com Ayla neutra, elétrico como quarto contato e aterrissagem; capturas em `docs/evidence/combos-livres/`.

CI e integração de `codex/feature-fluidez-corrida-treino` devem ser confirmadas no remoto antes da conclusão da entrega.
