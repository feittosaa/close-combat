# Close Combat — Pipeline

Regras gerais: [base.md](base.md). Arte: [identidade-visual.md](identidade-visual.md). Entrega: [docs/ci-cd.md](docs/ci-cd.md).

Este é o único documento Markdown para estado de implementação, decisões de personagens/cenários, números específicos, pendências, validações e histórico de entregas. As seções históricas não prevalecem sobre o estado vigente.

## Recuperação dos levantamentos e garrafa menor — 2026-10-28

Branch `codex/fix-recuperacao-launcher-garrafa`, dependente de `codex/feature-ritmo-combos-distancia` em `70bec33`, ainda não integrada. Pedido: levantamentos confirmados recuperam mais rápido para permitir continuar o combo; diminuir um pouco a garrafa da ultimate.

- [x] Metadados do launcher reúnem velocidade de lançamento e recuperação do autor. No acerto final de `1,1,2`, recuperação do ataque passa de 23 para 6 ticks, sem encurtar preparo/atividade, pular elapsedFrames ou alterar o soco forte isolado, no bloqueio ou no erro. Duração efetiva compartilhada por simulação, previsão de recuperação, animações e HUD; levantamento preserva velocidade -10, gravidade/juggle e comandos. Por pedido posterior, o levantamento confirmado limpa a receita e reinicia o piso de força, liberando fracos novamente; demais fortes continuam impedindo forte → fraco.
- [x] Garrafa da ultimate reduzida em 20% por dimensão: 69 × 55,2 → 55,2 × 44,16. Deslocamento Y -187,68 conserva o centro na altura do topo do personagem (-165,6). Desenho geométrico e caixa continuam compartilhados; arco, velocidades, dano, pausa e captura/isqueiro preservados. Sem imagens novas ou recoloração.
- [x] Instalação reproduzível, 293 testes/36 arquivos, build e diff aprovados. Conferência no jogo por comandos legais: launcher recupera em 6 ticks, continuação aérea forte conecta, fraco pode iniciar nova receita após levantamento, garrafa menor conserva saída alta/arco. Console sem erros. Evidências em /tmp/shoto-launcher-recuperacao-6.png, /tmp/shoto-launcher-continuacao-aerea.png, /tmp/shoto-launcher-reinicio-fraco.png e /tmp/shoto-garrafa-ultimate-menor.png. Sem alteração de arte ou aprovação artística inferida.
- [ ] Envio e CI do commit exato; sem merge, promoção ou release.

## Ritmo a 80%, receitas no vazio e empurrão mínimo — 2026-10-28

Branch `codex/feature-ritmo-combos-distancia`, dependente de `codex/feature-sequencias-abertas-shoto` em `056c5af`, ainda não integrada. Pedido: trocar a redução de velocidade de 40% por aproximadamente 20%, permitir executar receitas fechadas sem contato e evitar o afastamento excessivo durante os combos.

- [x] Tempos recalculados diretamente da base anterior à desaceleração (`f445d03`), dividindo por 0,8 e arredondando ao frame mais próximo, sem acumular arredondamentos do ajuste de 40%. Velocidades dos avanços próprios dos especiais em 80% da base; caminhada, salto, gravidade e projéteis preservados. Ultimate passa a preparar por 150 ticks, com demais tempos correlatos na mesma proporção. Soco fraco 8/3/15, forte 13/4/23, chutes 10/4/19 e 16/5/28.
- [x] As quatro receitas fechadas podem continuar no erro, após encerrar os frames ativos de cada etapa. Entrada antecipada só usa o buffer existente; não pula preparo/atividade nem executa a receita com botão mantido. Trocas fora das receitas continuam exigindo acerto; forte → fraco e término seguro permanecem. Erro conserva recuperação punível e não mantém o adversário em reação.
- [x] Empurrão no acerto dos básicos, abaixados e potentes reduzido a 1 unidade por impacto; bloqueio, agarrões, especiais/projéteis e deslocamentos da ultimate preservados. Nenhum novo comando, receita, imagem, dano ou caixa.
- [x] `npm ci`, 288 testes/35 arquivos, build e diff aprovados. Cinco regressões novas cobrem as quatro receitas no vazio nos dois lados, entradas separadas, ausência de dano/stun/continuação automática, preparo/atividade completos, rejeição de rotas externas no erro e empurrão real de 1 unidade nos dois jogadores. A sequência aberta existente foi conferida partindo de distância 96, com os sete acertos conectados e distância final 103. Regressões de ritmo/ultimate/agarrões foram atualizadas para os tempos novos, mantendo as mesmas exigências de contato, pausa, recuperação, trajetória e segurança.
- [x] Conferência no jogo por entradas legais e avanço de frames: `1,1,1` a distância 220, três entradas/execuções sem dano e alvo neutro; soco fraco 8/3/15 e forte 13/4/23 no HUD; `1,1,1 → 3 → 2,2,2` conecta 190 de dano contra tentativa de guarda, distância 96 → 103 e vantagem final 0F. Console sem erros/avisos. Evidências locais `/tmp/shoto-combo-vazio-20.png` e `/tmp/shoto-empurrao-minimo-20.png`. Sem alteração de arte ou nova aprovação artística.
- [x] Implementação enviada em `f35a8fc1760bbfafb695d4d990fcb4f0a5cc2623`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40753747050). Remoto auditado: development `ba2d46f` e main `be7d340` preservadas. Branch e dependências mantidas; sem merge, promoção ou release. Fechamento documental com sua própria CI conferida antes do relato final.

## Sequências abertas, receitas de socos e término seguro — 2026-10-28

Branch `codex/feature-sequencias-abertas-shoto`, dependente de `codex/feature-arco-garrafa-ultimate` em `45af619`, ainda não integrada. Pedido confirmado: somente socos nas receitas, forte → fraco nunca durante a sequência, retorno conjunto ao controle após acerto e manutenção do launcher.

- [x] Catálogo reduzido a `1,1,1`, `2,2,2`, `1,1,2` e `1,1,1+2`. Retiradas as sete receitas com chutes, incluindo mistas/extensão aérea, e o golpe exclusivamente dependente `reversal-followup`. Os quatro chutes normais terrestres/aéreos, abaixados e demais especiais individuais continuam disponíveis; o início do especial antigo agora se chama “Chute aéreo leve”. Lista, busca e tutorial refletem quatro receitas e 22 golpes. Sem receita nova ou alteração de arte/dano/alcance.
- [x] Depois de um acerto confirmado, básicos, abaixados e potentes podem trocar de golpe para continuar enquanto o alvo está em reação. Repetir o mesmo golpe exige prefixo de uma receita autorada: socos continuam limitados às repetições existentes e chutes não recebem rota de repetição. Segmentos fechados podem aparecer dentro da sequência aberta; `1,1,1 → 3 → 2,2,2` conecta os sete acertos, 190 de dano, sem virar receita no catálogo. Erro não cancela; bloqueio conserva somente as receitas fechadas anteriores, sem liberar as novas trocas abertas.
- [x] Qualquer ataque com botão 2 ou 4 eleva o piso de força da sequência; entradas fracas seguintes são rejeitadas e não ficam enfileiradas para execução automática. A restrição dura até o alvo recuperar o controle, incluindo voo/levantar protegido após launcher, e é limpa por reset/interrupção. Cada golpe continua exigindo nova entrada, sem execução automática de receitas.
- [x] Acertos de golpes diretos que mantêm o alvo no chão sincronizam reação e recuperação restantes: ambos retornam ao controle no mesmo tick e a vantagem real é 0F. Se o básico aéreo termina antecipadamente ao pousar, o alvo no chão também é liberado. Lançamentos preservam trajetória/juggle; proteção ao levantar cobre pelo menos a recuperação restante do atacante de um follow-up acertado, evitando exposição no fim. Bloqueio/erro mantêm recuperação punível e cinematográficas/agarrações/projéteis preservam seus contratos.
- [x] Removidos campos e lógica sem consumidores após retirar a extensão: `follows`, `followWindow`, `sequenceAfterFrame`, `commandFrame` do ataque e `chainLastFrame`. Estado da sequência guarda somente alvo e piso de força; receita local permanece separada. Princípios gerais atualizados em base.md e explicação da lista de golpes atualizada.
- [x] Instalação reproduzível, 283 testes/34 arquivos, build e diff aprovados. Onze regressões novas cobrem o exemplo integral nos dois lados sob tentativa de guarda, forte → fraco para soco/chute, descarte de entrada proibida e reinício, teto de repetição, bloqueio/erro, launcher e persistência da restrição, reset, pouso, proteção após juggle e possibilidade de o defensor atacar enquanto o atacante já consegue guardar no exato tick de recuperação conjunta. Testes de física usam follow-ups fortes para respeitar a regra nova; expectativas de receitas/extensão removidas foram substituídas por conferência dos especiais individuais remanescentes.
- [x] Conferência no jogo por entradas legais e avanço de frames: sete acertos do exemplo, alvo em guarda alta após o primeiro impacto, vida 810/1000, HUD com recuperação e reação iguais (27F na captura, vantagem 0F), tentativa de fraco rejeitada após forte e ambos neutros ao terminar. Catálogo mostra apenas quatro receitas de socos; console sem erros/avisos. Evidências locais `/tmp/shoto-sequencia-aberta.png`, `/tmp/shoto-sequencia-retorno.png` e `/tmp/shoto-receitas-socos.png`. Nenhuma arte nova ou aprovação artística inferida.
- [x] Implementação enviada em `c68327e265d5b6da88bbd6b9758f1e44e3e61f91`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40751102997). Remoto auditado: development `ba2d46f` e main `be7d340` preservadas. Branch e dependências mantidas, sem merge, promoção ou release. Fechamento documental com sua própria CI conferida antes do relato final.

## Garrafa da ultimate: tamanho, arco e trava após confirmação — 2026-10-28

Branch `codex/feature-arco-garrafa-ultimate`, dependente de `codex/feature-ritmo-combate` em `b40aaf9`, ainda não integrada. Escopo ampliado por pedido posterior para manter ambos os jogadores sem comandos de deslocamento após o acerto da garrafa, até o impacto do isqueiro.

- [x] Caixa da garrafa da ultimate ampliada de 34,5 × 27,6 para 69 × 55,2 (dobro por dimensão, quatro vezes a área). Centro inicial na altura do topo do corpo em pé: deslocamento Y -193,2 com meia altura 27,6, centro -165,6. Velocidade vertical inicial -1,5 e gravidade 0,12 geram pequena subida seguida de queda em arco. Velocidade horizontal 15, duração 150, dano 280 e sequência de confirmação/isqueiro preservados. Taça e garrafa especial comum não alteradas. O desenho geométrico provisório compartilha a caixa real, sem imagem nova ou ajuste artístico.
- [x] A captura existente do alvo trava também o autor: caminhada, dash, salto e novos ataques não são aceitos enquanto o alvo estiver capturado. Comandos recebidos nesse intervalo não ficam pendentes. Trava se encerra no impacto do isqueiro; alvo mantém queda/recuperação normais após explosão. Alvo aéreo continua aterrissando sob gravidade para permitir o lançamento do isqueiro. Erro/bloqueio da garrafa não ativam captura. Reset limpa a relação sem estado adicional.
- [x] `npm ci`, 273 testes/33 arquivos, build e diff aprovados. Novas regressões em ambos os lados verificam dimensões, altura inicial, arco, velocidade horizontal preservada, confirmação/explosão, posição constante sob tentativas contínuas de movimento/ataque, retorno de controle e reset durante captura. Regressões anteriores de bloqueio, erro, capturas aéreas e limite da arena permanecem verdes.
- [x] Conferência no jogo por entradas legais e avanço de frames, a 25% para inspeção: caixa ampliada junto ao topo do personagem, voo, confirmação sem dano inicial, distância 222 mantida até o isqueiro e retorno de movimento após explosão. Console sem erros/avisos. Evidências locais `/tmp/shoto-ultimate-garrafa-arco.png`, `/tmp/shoto-ultimate-trava.png` e `/tmp/shoto-ultimate-retorno.png`. Prévia restabelecida na porta 5174; nenhuma aprovação artística inferida.
- [x] Implementação enviada em `852e27f8ec665b797e4f4a3e241f95fbefa84f42`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40746168121). Branch e dependências preservadas; sem merge, promoção ou release. Fechamento documental enviado separadamente com sua CI conferida antes do relato final.

## Ritmo dos golpes do Shoto — 2026-10-28

Branch `codex/feature-ritmo-combate`, dependente de `codex/fix-tempo-alcance-agarrao` em `f445d03`, ainda não integrada. Pedido esclarecido: somente golpes aproximadamente 40% mais lentos, sem desacelerar caminhada, salto ou projéteis. Tempos de preparação, atividade e recuperação dos 23 golpes divididos por 0,6 e arredondados ao frame mais próximo; soco fraco 10/3/20, forte 17/5/30, chutes 13/5/25 e 22/7/37, agarrões 20/3/47 e 20/3/50. Reações de acerto/bloqueio, janelas de continuação e invulnerabilidade acompanham a escala temporal. Avanços próprios dos especiais ficam mais lentos com duração ampliada para conservar aproximadamente a distância. Velocidades verticais, gravidade, dano, caixas, comandos, receitas e imagens preservados; ataques aéreos continuam terminando ao aterrissar.

- [x] Preparação cinematográfica da ultimate ampliada de 120 para 200 ticks; lançamento do isqueiro de 6 para 10. Confirmação e queda protegida acompanham a duração ampliada; trajetórias e velocidades dos projéteis/lançamentos preservadas. Pausa de contato permanece 7 ticks, relógio e simulação a 60 Hz sem escala global.
- [x] Instalação reproduzível, 269 testes/33 arquivos, build e diff aprovados. Regressões atualizadas para aguardar os novos tempos sem relaxar contato, recuperação, bloqueio, invulnerabilidade, combos, determinismo ou limpeza após reset. Fixture de física de juggle mantém recuperação curta explícita para isolar a suspensão aérea da duração dos golpes oficiais.
- [x] Conferência no jogo por entradas legais dos quatro básicos: HUD mostra novos tempos, dano real preservado e reprodução das poses. Console sem erros/avisos. Evidência local `/tmp/shoto-golpes-lentos.png`. Nenhuma arte alterada; ajuste de ritmo sujeito à avaliação do usuário.
- [x] Enviado em `b40aaf9c191e1bc5f5b4d02f038d710c2ee85ab7`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40744848652). Sem merge, promoção ou release; development `ba2d46f` e main `be7d340` preservadas.

## Preparação e alcance dos agarrões — 2026-10-28

Branch `codex/fix-tempo-alcance-agarrao`, dependente de `codex/fix-agarrao-cores-originais` em `f6d142e`, ainda não integrada. O usuário esclareceu que deseja um agarrão mais demorado: preparação de ambos passa a 12 frames, substituindo 5/7; ativos 2 e recuperação 28/30 preservados, total próprio 42/44 frames (mais a pausa compartilhada quando há contato). Caixa de captura ampliada horizontalmente de 25,3 para 46 unidades, mesmo deslocamento frontal 18,4 e mesma altura 126,5. Captura a 80 unidades de distância entre centros e erro a 100; não captura alvos aéreos. Dano, comandos, frente/trás, regras de defesa e imagens preservados.

- [x] `npm ci`, 269 testes/33 arquivos, build e diff aprovados. Regressões verificam ausência de contato antes do frame 12, captura no frame 12 nos dois jogadores/comandos, alcance ampliado e seu limite, duração completa no erro; simultâneas ajustadas para aguardar a nova preparação. Casos anteriores de direção, paredes e alvo aéreo continuam passando.
- [x] Conferência no jogo com entradas legais dos dois comandos/jogadores a distância 80: sem contato no frame 11, contato no 12, caixa ampliada visível e direção traseira preservada. Console sem erros/avisos. Evidência local `/tmp/shoto-throw-twelve.png`; bancada temporária removida. Nenhuma alteração de arte ou regra global.
- [x] Implementação enviada em `91cd8a47aaa1615d3b0134ddfa8d1ded20e98a34`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40625957143). Sem novo pedido de integração; branches dependentes preservadas. Fechamento documental com CI própria conferida antes do relato final.

## Agarrão direcional e cores oficiais — 2026-10-27

Branch `codex/fix-agarrao-cores-originais`, dependente de `codex/fix-carregamento-impacto-aereo` em `07b3c66`, ainda não integrada (e da correção de juggle nela contida). Pedido: escolher frente/trás nos agarrões e retirar os efeitos de cor aplicados às imagens do Shoto; proibir globalmente correção de cores de spritesheets por CSS/código. Nenhum novo merge autorizado.

- [x] Ambos os agarrões (`1+3` e `2+4`) capturam a direção ao iniciar o comando: F/neutro lança à frente; B lança atrás, relativo ao autor. Soltar/mudar direção no preparo não substitui a escolha. Rearremesso coloca o alvo do outro lado, atualiza orientação dos dois imediatamente e conserva dano, alcance, tempos, comandos e magnitude de afastamento. Contatos simultâneos usam posições capturadas antes da aplicação para não favorecer a ordem dos jogadores. Paredes e separação de corpos continuam sendo resolvidas pelo motor; erro/alvo aéreo não trocam lados. Lista de golpes explica a escolha.
- [x] Excluir processamento de pixels `prepareShotoPalette.ts`/`shotoPalette.ts`, wrapper `prepareShotoSprites` e chamadas do boot/luta; retirar o drop-shadow CSS dos previews. Excluir as cinco verificações obsoletas de recoloração/preparação de paleta e substituí-las por regressão de carregamento direto dos 23 PNGs/atlas oficiais, sem canvas ou substituição de texturas mesmo em reentradas. Preload compartilhado/cache continua antes do menu, sem o custo de recoloração. Nenhum PNG, fonte, atlas ou manifesto artístico foi alterado.
- [x] Regra duradoura em AGENTS.md, base.md e identidade-visual.md: cores originais, sem filtros de cor CSS, tint, shaders/LUTs, recoloração de pixels ou pós-processamento; correções artísticas pertencem à fonte e exigem aprovação. Recorte, alpha técnico, escala/alinhamento e espelhamento não autorizam alterar RGB. Esta decisão substitui a preparação de paleta descrita nas entregas históricas abaixo.
- [x] `npm ci`, 267 testes/33 arquivos, build, diff e verificador dos 134 quadros aprovados. Seis regressões de agarrão cobrem ambos os comandos/jogadores/sentidos, escolha imutável no preparo, paredes, whiff, alvo aéreo, reset e simultâneas; regressão de integridade de fonte substitui as de paleta. Regressões de prontidão dos recursos permanecem.
- [x] Conferência no runtime por entradas legais: oito combinações de agarrão (dois comandos × dois jogadores × frente/trás), dano 75/85 preservado, troca de lado e retorno às poses oficiais. Texturas conferidas: todos os 23 atlas continuam HTMLImageElement originais, não canvas reprocessado. Previews PvP/miniatura com CSS computado `filter: none`, `mix-blend-mode: normal`, `opacity: 1`; console sem erros/avisos. Capturas locais `/tmp/shoto-original-colors.png`, `/tmp/shoto-back-throw.png` e `/tmp/shoto-selection-original-colors.png`. Bancada temporária retirada; não foi criada arte nova nem inferida nova aprovação artística.
- [x] Implementação enviada em `319c6c1ef6fe6de521be91f3b3bc3221f6493fb0`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40622744862). Remoto conferido: dependência `codex/fix-carregamento-impacto-aereo` em `07b3c66`, development `ba2d46fc270e3fdae3fc0f95879a4ec3c9a185d5` e main `be7d3408f6d7b64c8bc45f67c8dafa8b13c1999d`. Nenhum merge, promoção ou tag; branches de correção mantidas. Este fechamento é somente documental e terá sua CI própria conferida antes do relato final.

## Ajuste fino da pausa de contato — 2026-10-27

Na mesma branch `codex/fix-carregamento-impacto-aereo`, pedido posterior: reduzir a pausa compartilhada de acerto/bloqueio de 10 para 7 ticks a 60 Hz (aproximadamente 117 ms). A suspensão adicional de juggle continua em 6 ticks; demais regras preservadas. Este valor substitui os 10 ticks registrados na entrega abaixo.

- [x] Constante de contato e regressão explícita atualizadas para 7 ticks.
- [x] `npm ci`, 265 testes/33 arquivos, build e diff aprovados. Conferência no runtime: contato inicia com 7, sete ticks preservam a pose/estado e o oitavo retoma combate. Captura local `/tmp/shoto-hitstop-seven.png`; bancada temporária removida.
- [x] Ajuste enviado em `fe2e7ad3c8045721306cfd81c28173f00ffbbe58`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40621344708). Mesma branch preservada; sem merge. Este fechamento somente documental terá sua CI própria conferida antes do relato final.

## Entrada na luta e leitura do impacto aéreo — 2026-10-27

Branch `codex/fix-carregamento-impacto-aereo`, dependente de `codex/fix-trajetoria-juggle` em `6f82d6b`, ainda não integrada. Escopo ampliado pelos pedidos do usuário nesta entrega: eliminar espera após seleção, revisar todos os modos e criar regressão; reduzir hurtbox do salto livre conforme a animação; suspender brevemente o alvo atingido no juggle sem zerar velocidade; dobrar pausa de acerto/bloqueio. Nenhum novo merge autorizado, receita, golpe ou asset artístico.

- [x] Causa medida no treino frio: 685 ms no loader e 1948 ms na criação/preparação dos atlas, 2635 ms após confirmar. O primeiro modo aberto pagava o custo de preparação dos 23 atlas; treino não pré-carregava a sala no menu. `BootScene` carrega todos os cenários, menu e sprites e aplica a paleta uma única vez antes de liberar a seleção. Retirado o preload/indicador duplicado do menu. Entrada direta de FightScene conserva seu fallback e o cache impede reprocessamento ao retornar/reiniciar.
- [x] Após correção, medição local de confirmar personagem → fim de create no treino: 21 ms (loader 0 ms; create 19 ms). Demais create: tutorial básico 5 ms, combos 3 ms, Arcade 3 ms, PvP 2 ms; loaders 0 ms em todos. No Arcade/PvP o tempo total desde a seleção inclui a espera manual na escolha de cenário e não serve como benchmark de abertura. Preparo inicial permanece antes do menu; os tempos são amostras locais, não promessa universal de desempenho.
- [x] Hurtbox do salto livre autorada, sem inferência de pixels no runtime: forma estendida 55,2×145, topo Y=-165; forma recolhida 55,2×110, topo Y=-170, entre os ticks 12 e 21 do voo, alinhada à pose 25 de pernas dobradas. Referência visual medida nos desenhos existentes (pose recolhida de aproximadamente Y=-169,5 a -61,6). Ataques, guardas e reações mantêm a hurtbox aérea anterior; alcance dos golpes, física e arte preservados. Ao pousar retorna ao perfil de pé.
- [x] Pausa de contato compartilhada de 5 para 10 ticks a 60 Hz, aproximadamente 167 ms, em hit e block. Whiff não pausa; trades não acumulam; relógio do round continua contando. Nos novos acertos do juggle, somente o alvo fica suspenso por mais 6 ticks de combate depois da pausa global, mantendo posição e velocidade vertical; a retomada usa a gravidade já aumentada. Stun/advantage incluem a suspensão; reset e captura cinematográfica limpam o estado.
- [x] `npm ci`, 265 testes/33 arquivos, build e `git diff --check` aprovados. Sete regressões novas: boot conectado à entrada do app, recursos prontos sem filas adicionais em 5 modos × todos os cenários, paleta processada uma vez mesmo em 10 reentradas, hurtbox nas fases do ciclo/ambos os lados com torso atingível e espaço vazio sem contato, duração explícita de 10 ticks e suspensão exata de 6 ticks seguida de retomada. Expectativas antigas de 5 ticks atualizadas; a captura aérea da ultimate é conferida no trecho de descida exposto pela nova hurtbox, preservando a validação de aterrissagem em pé.
- [x] Conferência normal no navegador: inicialização/menu, treino, tutorial básico, combos, Arcade no bar, PvP com duas confirmações e Salão. Bancada temporária por entradas legais/ticks: caixa recolhida, acerto/bloqueio congelados por 10 ticks, seis ticks extras do alvo em juggle e retomada com velocidade preservada/gravidade 0,85. Console sem erros/avisos. Capturas locais `/tmp/shoto-training-loading-fixed.png`, `/tmp/shoto-jump-hurtbox.png`, `/tmp/shoto-juggle-suspension.png`. Bancadas retiradas do checkout; nenhuma nova aprovação artística inferida.
- [x] Correção enviada em `4d1469785820f84a47ca6a700c08d74ef5aa04a0`, com [CI da branch aprovada](https://github.com/feittosaa/close-combat/actions/runs/40620636568). Remoto conferido: development `ba2d46fc270e3fdae3fc0f95879a4ec3c9a185d5`, main `be7d3408f6d7b64c8bc45f67c8dafa8b13c1999d` e a dependência `codex/fix-trajetoria-juggle` em `6f82d6b`. Nenhum merge, promoção ou tag; ambas as branches de correção preservadas para revisão. Este fechamento é somente documental e terá sua CI própria conferida antes do relato final.

## Trajetória aérea, juggle progressivo e levantar protegido — 2026-10-27

Branch `codex/fix-trajetoria-juggle`, criada de origin/development `ba2d46f`. Pedido: ataques aéreos preservam a trajetória do salto; gravidade menor após levantamento, aumentando a cada novo acerto recebido no ar; invencibilidade ao cair e levantar. Nenhuma nova arte, comando ou receita. A autorização anterior de merge foi cumprida na entrega precedente; esta correção tem envio autorizado e permanece sem nova integração solicitada.

- [x] Compartilhar deslocamento direcional entre salto livre e básico aéreo, sem trocar a fase do ataque. Gravidade e controle direcional continuam iguais; especiais com movimento próprio preservados.
- [x] Estado de juggle exclusivo do alvo lançado: gravidade inicial provisória 70% da normal, +15 pontos percentuais por novo acerto confirmado no ar, teto 160%. Erro/bloqueio não contam; acertos comuns não reiniciam velocidade vertical. Reação dura até o piso; captura cinematográfica encerra o juggle e preserva a ultimate existente.
- [x] Ao aterrissar de juggle: recuperação caída de 24 ticks, invulnerável, seguida por 8 ticks protegidos já com controle normal. A queda da ultimate também recebe proteção de 8 ticks após sua recuperação própria. Salto livre não ganha invencibilidade. Relógios de proteção/gravidade congelam com hitstop/ativação; reset limpa tudo. Contagem e vantagem de frames usam previsão da trajetória física, compartilhada com a queda da ultimate.
- [x] `npm ci`, 258 testes/30 arquivos, build e `git diff --check` aprovados. Oito regressões novas cobrem trajetória integral dos quatro básicos nos dois lados/direções, gravidade progressiva/teto, frames reais de recuperação, proteção exata contra soco/agarrão/projétil, hitstop, reset e KO em voo. Regressões da ultimate continuam aprovadas.
- [x] Conferência no runtime Phaser por entradas legais/avanço de ticks em bancada temporária: salto livre e salto com chute forte têm as mesmas coordenadas X/Y/velocidade no tick 17; launcher mantém alvo no ar, antiaéreo confirmado aumenta escala de gravidade de 0,70 para 0,85, aterrissagem entra em queda com 32 ticks protegidos e após 24 ticks retorna neutro com 8 restantes. Console sem erros/avisos. Capturas locais `/tmp/shoto-air-trajectory.png`, `/tmp/shoto-juggle-hit.png` e `/tmp/shoto-wakeup-protected.png`. Bancada removida; arte de reação permanece provisória.
- [x] Correção enviada em `807d6e9152875869249f966a7ed2acfb872fb871`, com [CI da branch aprovada](https://github.com/feittosaa/close-combat/actions/runs/40618553802). Remoto consultado: development `ba2d46fc270e3fdae3fc0f95879a4ec3c9a185d5`; main `be7d3408f6d7b64c8bc45f67c8dafa8b13c1999d`, atualizada externamente desde a entrega anterior. Nenhum merge, promoção ou tag nesta correção; branch mantida para revisão. Este fechamento altera somente a pipeline e sua CI própria será conferida antes do relato final.

## Continuação da cinemática, básicos aéreos e launcher — 2026-10-27

Pedido: continuar na branch atual `codex/feature-salao-treino`, preservar o trabalho existente, concluir/conferir a ultimate; acrescentado pelo usuário: quatro básicos aéreos e `1,1,2` como launcher. Merge desta branch em development explicitamente autorizado após conclusão e CI verde. Base dependente da seleção dupla/idle em `39e62a4`, ainda não integrada; cenário preexistente preservado em commit próprio `7e01e0f`.

- [x] Auditoria da ultimate vigente: preparação global de 120 ticks, seis poses de beber com 20 ticks cada, garrafa a 15, confirmação sem dano, captura aérea caindo em pé, isqueiro a 7,5 após aterrissagem/preparo e explosão única de 280 com queda. Bloqueio/erro não geram continuação. Simultâneas, pausa do mundo/relógio, alcance, reset e KO cobertos pelas regressões existentes; não foi necessário substituir essa implementação nem produzir arte.
- [x] Quatro básicos aéreos em `1/2/3/4`, com os dados provisórios e poses dos básicos correspondentes. Gravidade contínua, aceitação de botão com cima mantido no ar e encerramento ao pousar. Continuação manual `f,d,fd,3,4` tem prioridade sobre o novo chute aéreo 4; nenhuma receita nova. Lista de golpes mostra “no ar”; tutorial introdutório conserva os quatro básicos no chão.
- [x] Somente o acerto final da receita exata `1,1,2` lança o alvo. Velocidade vertical provisória -10, igual ao salto vigente; stun mínimo calculado pela gravidade para a trajetória inicial, com frame advantage atualizado. Soco forte isolado, `1,2`, `2,2,2`, bloqueio e erro não recebem lançamento; dano e demais receitas preservados. Reação de hitstun continua geométrica provisória.
- [x] `npm ci`, 250 testes em 29 arquivos, build, `git diff --check` e verificador dos 134 quadros aprovados. Oito regressões novas cobrem os quatro ataques nos dois lados, cima mantido, gravidade, acerto, guarda aérea, hitstop, erro, pouso/reset e isolamento do launcher. Testes antigos que declaravam ausência de ataques aéreos foram atualizados para o novo pedido; as verificações dos básicos terrestres permanecem.
- [x] Conferência no navegador do runtime Phaser por entradas legais e avanço determinístico em bancada temporária: beber, confirmação de zero dano, explosão de 280, quatro ataques no ar, launcher e salto no Salão. Catálogo/teclas observados na pausa normal; Arcade iniciado pela seleção normal do Salão. Console sem erros/avisos durante a conferência. Bancada retirada do checkout; capturas locais em `/tmp/shoto-ultimate-explosion.png`, `/tmp/shoto-air-heavy-punch.png` e `/tmp/shoto-launcher.png`. Nenhuma aprovação artística ou balanceamento final inferidos.
- [x] Cenário preservado em `7e01e0f`; combate e validação em `383916ba38f81f4f9bd1d2ed1ae14f85c5ccacd5`, enviados com [CI da feature aprovada](https://github.com/feittosaa/close-combat/actions/runs/40613758571). Merge autorizado em development `239d79b729db9c047b48b19184219eff7de4d705`, com [CI da integração aprovada](https://github.com/feittosaa/close-combat/actions/runs/40613906113). A integração absorve também seleção dupla/idle em `39e62a4`. Main remota conferida em `77a4c939c9ccdf028eed5f334132f65368dbae30`; nenhuma promoção ou tag.
Fechamento documental anterior concluído em development `ba2d46f`, com [CI final aprovada](https://github.com/feittosaa/close-combat/actions/runs/40614205335). Após conferir ancestralidade remota, checkout limpo e ausência de outro worktree ativo, encerradas as branches locais/remotas `codex/feature-salao-treino` e `codex/feature-selecao-dupla-idle`.

## Salão de Treino — 2026-10-27

Branch `codex/feature-salao-treino`, dependente da seleção animada ainda não integrada em `39e62a4`. Pedido: adicionar a imagem fornecida `Crimson Banner Dojo Arena.png` com o nome Salão de Treino. Usuário confirmou novo cenário selecionável em PvP/Arcade; não substituir a sala fixa dos modos de prática.

- [x] Incorporar o PNG original sem edição, 1942×809, camada única, proporção nativa ultrawide, linha dos pés em Y=700. Zoom e regras de combate preservados; referência interna `salao-treino`.
- [x] Tela de cenário alterna Bar ao Anoitecer/Salão de Treino por setas ou botões anterior/próximo; miniatura e ID da partida acompanham a escolha. Sala de prática continua reservada a treino/tutoriais.
- [x] Instalação reproduzível, 242 testes/28 arquivos antes da ampliação do combate, build e diff aprovados. Conferência no jogo: seletor Bar/Salão por seta, início de Arcade no cenário escolhido e salto/enquadramento do Salão no runtime. Sala fixa preservada no treino. Capturas locais em `/tmp/salao-treino-arcade.png` e `/tmp/salao-treino-jump.png`; aprovação artística não é inferida da validação técnica.
- [x] Cenário enviado em `7e01e0f`, validado no conjunto `383916b` e integrado por autorização explícita em development `239d79b`, com CI da feature e da integração aprovadas conforme fechamento acima. Main preservada.

## Revisão da seleção: idle, centro e PvP duplo — 2026-10-27

Branch `codex/feature-selecao-dupla-idle`, baseada em development `e372120`. Pedido atual: animação idle nos personagens da seleção; grade de retratos no centro em todos os modos; PvP com escolha e confirmação independentes de P1/P2 e um personagem de cada lado; retirar frases extras acima das opções e do canto inferior direito do menu principal, mantendo nome e opções.

- [x] Reproduzir o idle autorado de oito poses a 6 FPS nos previews ampliados, usando o mesmo amostrador temporal do jogo; P2 espelhado para o centro. Retratos permanecem recortes do atlas ativo; nenhuma nova arte.
- [x] Grade 4×3 central; PvP apresenta dois previews, dois cursores e estados de confirmação. Mouse alterna o jogador pelos botões P1/P2 e usa a grade comum; teclado P1 A/D + J, P2 setas + Num1, Enter confirma a vez ativa. Somente avança ao cenário após ambos confirmarem; luta recebe os dois IDs escolhidos. Retornar do cenário limpa confirmações e mantém escolhas.
- [x] Remover chamadas, slogan, selo inferior, indicação de etapa e rodapé do menu principal. Preservar nome do jogo e botões dos modos. Remover CSS e estado de entrada obsoletos.
- [x] `npm ci`, 235 testes/28 arquivos, build e diff aprovados. Cinco regressões novas cobrem escolhas independentes, ordem de confirmação, espelhamento de escolha, alteração após confirmar e retorno. No jogo: menu sem as frases retiradas, idle dos dois lados (offsets do atlas mudam), P1 por mouse/J, P2 por Num1 antes de P1, espera pelas duas confirmações, cenário e início de PvP/Arcade, retorno limpando confirmações, seleção central no treino e Tab + Enter. Console sem erros/avisos. Captura local `selecao-pvp-idle.png` no painel de trabalho.
- [x] Implementação enviada em `a21c07b5e3e9f1c2d0e4b4b2a8fde3f327056316`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40571023824). Branch mantida para revisão; development permanece `e372120` e main `77a4c93`. Sem nova integração, promoção ou tag. Este fechamento somente documental terá sua própria CI conferida antes do relato final.

## Diretriz de limpeza e manutenção — 2026-10-27

Pedido concluído localmente: reforçar em `AGENTS.md` e `base.md` a prioridade de código limpo, legível e organizado; excluir sobras, duplicações, dependências e arquivos desnecessários; manter apenas artes em uso, fontes ativas, referências canônicas e propostas necessárias à revisão autorizada. Conferir consumidores antes de remover e preservar trabalho em andamento.

Branch própria para a diretriz: `codex/chore-diretriz-limpeza`. Validação do checkout: instalação reproduzível, testes, build e diff aprovados; alteração somente documental, sem mudança visual ou de controles. As alterações de câmera/ultimate e o ajuste de receita aérea já existentes são preservados fora deste commit documental. A consulta ao remoto funcionou fora do sandbox: development em `a5930d901654feb419570ff642acc6025d20daed`, main em `77a4c939c9ccdf028eed5f334132f65368dbae30`. Diretriz enviada em `c4d4ca81ee610a7f0d988b017ca3c280e1dd0142`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40562393410); sem integração.

## Consolidação autorizada de branches — 2026-10-27

Pedido explícito: integrar as entregas concluídas em development e encerrar as branches absorvidas. Todas as branches de código, limpeza e catálogo já são ancestrais dos menus, exceto `codex/feature-bar-anoitecer` (`438347a`). Seu código/arte de `254b6af` foi incorporado em `54f0c48`, conforme registro histórico abaixo, e depois revisado pela limpeza e panoramas/câmera. O merge mantém a árvore vigente: não restaura camadas e capturas retiradas, Markdown específico antigo, proporção anterior do fundo ou testes substituídos. O histórico original fica integrado por merge real com ambos os pais.

O worktree registrado em `/tmp/close-combat-bar` não existe mais e aparece como prunable; sem checkout ativo ou arquivos locais a descartar. Conferir ancestralidade remota e CI de development antes de remover referências. Main e tags preservadas. Instalação reproduzível, 230 testes/27 arquivos, build e diff aprovados no conjunto consolidado. CIs das features aprovadas: [menus c48d8b2](https://github.com/feittosaa/close-combat/actions/runs/40566252080), [ritmo 23cd974](https://github.com/feittosaa/close-combat/actions/runs/40566254036), [receita fe33042](https://github.com/feittosaa/close-combat/actions/runs/40566251331). Branch de consolidação `codex/chore-integracao-development`; [CI da consolidação e9352dd aprovada](https://github.com/feittosaa/close-combat/actions/runs/40566447890). Integração enviada em `615e38e3eb323855e3d857b4c862aff68db697ee`, com [CI de development aprovada](https://github.com/feittosaa/close-combat/actions/runs/40566686038). Após fetch, ancestralidade de todas as referências e ausência de alterações locais conferidas: encerradas dez branches remotas e doze locais (incluindo as duas referências locais temporárias de câmera/ultimate). Nenhum PR aberto. A referência temporária desta consolidação segue o mesmo encerramento após a CI do fechamento em development. Main remota permanece `77a4c939c9ccdf028eed5f334132f65368dbae30`; nenhuma promoção ou tag.

## Menus clássicos e integração — 2026-10-27

Branch `codex/feature-menus-classicos`, dependente da revisão de ritmo em `23cd974`. Pedido: estilizar menu principal e pausa, seleção clássica com quadrados de retratos e personagem ampliado à esquerda em PvP, Arcade e treino. Reaproveitar somente artes ativas; espaços vazios são decorativos, sem personagens inventados.

- [x] Menu principal em DOM/CSS, tipografia, hierarquia, molduras e realce de modo. Seleção com grade 4×3, retrato recortado do atlas existente, lutador à esquerda e confirmação por mouse/teclado. Overlay acompanha o retângulo do canvas e é removido ao sair da cena.
- [x] Conferência adicional com Tab identificou a captura antiga de Enter pelo Phaser, que bloqueava a ativação nativa dos botões DOM. Captura removida; o listener do menu continua prevenindo navegação padrão somente quando trata o comando. Tab + Enter conferidos no jogo para entrar em Arcade e voltar da seleção; 230 testes, build e diff aprovados novamente.
- [x] Pausa estilizada: painel compacto na partida, ferramentas e lista preservadas no treino. Controles mantêm foco e navegação.
- [x] `npm ci`, 230 testes/27 arquivos, build e diff aprovados. Conferência no navegador: menu principal, seleção de Arcade/PvP/treino, cenário, início de partida, pausa de PvP/treino e configurações; navegação por mouse e teclado, retorno sem duplicação de overlays. Console sem erros/avisos. Evidências locais de seleção e pausa no painel de trabalho; aprovação estética final permanece com o usuário.
- [x] Push dos menus em `c48d8b2` e [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40566252080). Auditoria, consolidação e integração concluídas com CI aprovada; encerramento registrado acima.

O usuário autorizou explicitamente integrar as entregas e encerrar branches concluídas em development; main e tags não foram incluídas. Também autorizou incorporar o ajuste local anterior da receita aérea `f,d,fd,3,4`, somente botão 4 na continuação, em commit separado `fe33042`, branch `codex/fix-receita-aerea`, também absorvida por esta entrega.

## Ritmo da preparação e projéteis da ultimate — 2026-10-27

Branch `codex/fix-ritmo-ultimate`, dependente de `codex/feature-camera-ultimates` em `af4a64d7a9acf60ba5995ca0d29a98e7672c6f41`, ainda sem integração. Pedido: tornar a preparação cinematográfica deliberada e desacelerar um pouco os projéteis.

- [x] Pausa compartilhada das ultimates de 120 ticks a 60 Hz (dois segundos), substituindo os seis ticks anteriores. Cronômetro, oponente, projéteis, efeitos e simulação permanecem congelados; somente a animação de preparação avança. Ativações simultâneas não somam duração.
- [x] Distribuir os seis desenhos existentes de beber ao longo dos 120 ticks: 20 ticks por pose. Não terminar o movimento nos primeiros seis ticks nem prender a última imagem durante o restante da pausa.
- [x] Garrafa da ultimate de 18 para 15 unidades/tick; isqueiro de 9 para 7,5 unidades/tick (redução de aproximadamente 17% em ambos). Preservar a confirmação, stun, aterrissagem em pé e explosão. Não alterar os especiais comuns sem preparação cinematográfica.
- [x] Validação local: `npm ci`, 230 testes em 27 arquivos, build e `git diff --check` aprovados. Regressão nova verifica os seis desenhos ao longo dos dois segundos; testes de pausa verificam todos os 120 ticks e os projéteis preservam confirmação nos dois lados.
- [x] Conexão do navegador recuperada. Preparação de beber e retomada com confirmação/explosão de 280 conferidas no treino a 100%; animação prolongada e projéteis revisados sem nova arte.
- [x] Implementação enviada em `23cd974` de `codex/fix-ritmo-ultimate`; [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40566254036). Receita aérea preservada fora deste commit e autorizada posteriormente para entrega separada.

A seção anterior de câmera/ultimate abaixo registra a implementação precedente; os tempos e velocidades vigentes são os desta revisão.

## Câmera vertical, escala e conclusão da ultimate — 2026-10-27

Branch: `codex/feature-camera-ultimates`, a partir de `codex/chore-diretriz-limpeza` (`c4d4ca8`), ainda não integrada. A base do runtime é o catálogo em `0324c2a`; esta entrega conclui os arquivos de ultimate e panoramas já em andamento em `codex/feature-ultimate-cinematica`. O ajuste preexistente de receita aérea permanece local e fora do commit desta entrega.

- [x] Ampliar os lutadores em 15%: célula visual de 204,6816 unidades; zoom uniforme continua 1,6 e a escala dos cenários permanece idêntica.
- [x] Rever explicitamente todos os perfis do elenco ativo (somente o Shoto): corpo 55,2; hurtboxes em pé 55,2×165,6, agachada 55,2×103,5, aérea 55,2×156,4 e caída 165,6×41,4. Hitboxes e deslocamentos aumentados em 15%; dano, tempos e movimento preservados nesta revisão de tamanho.
- [x] Acompanhar o personagem mais alto nos dois lados: deslocamento vertical de 40% da subida, limitado para manter os pés do adversário no chão dentro da visão; retorno ao pousar, sem alterar zoom nem foco horizontal por causa do salto.
- [x] Ampliar separação normal de 456 para 512 unidades, sem arrastar o adversário parado. Reservar espaço adicional para corpos deitados durante a queda, conservando o zoom e as bordas físicas do panorama.
- [x] Acrescentar 180 pixels somente ao topo dos dois fundos: 2172×904, chão de referência Y=795, `topExtension=180`. Os 724 pixels de altura originais foram preservados integralmente, comprovados por comparação RGBA. Ferramenta integrada image_gen; prompts e preparo em `assets/art/stages/vertical-extension.json`. No céu do bar, a transição de cor foi preparada somente na faixa nova.
- [x] Pausa global de ativação mantém seis ticks: somente os seis desenhos de beber avançam; combate, oponente, projéteis, efeitos e cronômetro congelam. Ativações simultâneas compartilham a pausa; reset limpa todos os estados.
- [x] Ultimate do Shoto: garrafa a 18 unidades/tick (antes 5), zero dano na confirmação, stun reservado até o isqueiro chegar. Acerto aéreo cancela a subida e faz o alvo cair em pé; o isqueiro aguarda aterrissagem e os seis ticks de preparo, persegue o alvo e confirma uma explosão de 280. Bloqueio/erro da garrafa não criam isqueiro nem explosão. Pose existente de arremesso reaproveitada; projéteis e explosão continuam marcadores geométricos provisórios.
- [x] Validação local: `npm ci`, 229 testes em 27 arquivos tanto no checkout quanto na exportação isolada do índice do commit (sem o ajuste de receita aérea), build, `git diff --check` e verificação dos 134 quadros aprovados. Regressões cobrem câmera/escala/cobertura dos fundos, alcance novo, espelhamento, stun aéreo, velocidade na distância máxima e corpo deitado nas bordas.
- [x] Conferência no jogo: sala e bar, salto do segundo jogador, tamanho, caixas, afastamento máximo, animação de beber, confirmação aérea com P2 manual caindo em pé sob stun e explosão na borda em câmera lenta. Console sem erros/avisos. Revisão funcional local não equivale a aprovação artística das extensões.
- [x] Commit/push do conjunto isolado em `036770de271834d26e9bef41a69ebe11f440d70f`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40562688520); sem merge, promoção ou tag.

Remoto consultado: development `a5930d901654feb419570ff642acc6025d20daed`, main `77a4c939c9ccdf028eed5f334132f65368dbae30`. Diretriz documental em `c4d4ca8`, enviada com CI aprovada. A implementação `036770d` está enviada e aprovada na CI; este fechamento altera somente a pipeline e terá sua própria CI conferida. O ajuste de receita aérea permanece nos dois arquivos locais originais, sem inclusão no commit. Aprovação artística e balanceamento manual continuam com o usuário.

## Estado vigente

- Elenco jogável: Shoto provisório, conceito Anfitrião; agente secreto espanhol, alto e esguio. A referência de identidade é o [turnaround canônico](assets/art/characters/shoto/turnaround.png).
- Figurino vigente: sem cinto, fivela ou relógio; somente uma pulseira simples de ouro em cada braço; cavanhaque marrom da família do cabelo, calça cinza carvão muito escuro, blazer creme, camisa vinho e sapatos marrons. Preservar rosto, proporções, pele, cabelo e desenho nas animações.
- 134 quadros em 23 atlas, com oito chaves antigas da caminhada e oito intermediárias, ciclo de 48F a 20 FPS. Chute forte usa a mesma perna em preparação, extensão, recolhimento e pouso. Conectores opacos; sem dissolução que cause piscadas.
- Fontes ativas e raízes: `src/assets/sprites/characters/shoto/alignment.json`. Os 22 strips ativos e oito fontes individuais são usados pelo preparo. Células de altura 768, pivô Y=720; largura 1152 nos ataques e 768 nas demais ações. A escala de exibição passa a 172,8 × 1,03 × 1,15, com geometria revisada proporcionalmente conforme a seção vigente acima.
- Preparar: `python scripts/prepare-shoto-sprites.py`; conferir: `python scripts/verify-shoto-sprites.py`. Precisam de Pillow, NumPy e SciPy. Procedência das fontes selecionadas: `assets/art/characters/shoto/source-generation.json`.
- Hitstun ainda usa representação técnica; não há nova arte de reação autorizada por esta limpeza. Corrida removida; dash/backstep permanecem.
- Bar ao Anoitecer é cenário geral de PvP/Arcade. Sala de Treino é fixa no treino, tutorial básico e tutorial de combos. Objetos do bar são decorativos; não há interação inferida.
- Catálogo manual do Shoto recebido: sequências, acordes, agarrões, agachados e especiais registrados abaixo. Implementados com valores provisórios para teste; balanceamento manual ainda não homologado.
- Combo breaker e drive rush continuam pendentes; ultimate do Shoto já tem comando e apresentação definidos, exigindo rage cheia. Barra e propriedades de combate implementadas provisoriamente para teste; ajustes finais permanecem com o usuário. Outros personagens, história e roguelike não têm autorização de implementação automática.
- Revisões visuais, hitstop, catálogo, limpeza, câmera, ultimate, receita aérea e menus integrados em development conforme consolidação acima. Registros antigos de branches mantidas ou ausência de merge são históricos; main continua preservada. Pendências artísticas e de balanceamento não são resolvidas por CI ou por merge.

## Limpeza de artes, referência e documentação

Branch: `codex/chore-artes-documentacao`, dependente das revisões ainda não integradas. Pedido: remover artes sem uso, atualizar cinto/pulseiras do turnaround e restringir os demais Markdown a regras gerais.

- [x] Inventariar imports do jogo, manifests de cenário, fontes do preparo e referências canônicas.
- [x] Atualizar o turnaround no mesmo caminho: sem cinto/fivela/relógio; uma pulseira de ouro em cada braço. Ferramenta integrada image_gen, prompt em `assets/art/characters/shoto/turnaround-generation.json`.
- [x] Retirar variantes rejeitadas, fontes substituídas, intermediárias descartadas, cópias e capturas históricas; preservar o conjunto ativo e as fontes necessárias para reproduzi-lo.
- [x] Centralizar os detalhes específicos nesta pipeline; retirar Markdown obsoleto e corrigir READMEs genéricos desatualizados.
- [x] Auditar referências, reproduzir os atlas sem diferença de pixels, conferir jogo, testes, build, links e diff.
- [x] Commit/push e CI da implementação aprovada, sem integração.

Remoto: implementação `3b933e7e8dec46dcdee35b1a67f76aca95e0b4ed`, [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40424558139). O registro documental final segue na mesma branch. development permanece em `a5930d901654feb419570ff642acc6025d20daed`; main em `77a4c939c9ccdf028eed5f334132f65368dbae30`.

Inventário: 442 imagens/mídias no checkout antes da limpeza; 384 removidas (159.2 MiB). Permanecem 58: 28 carregadas pelo jogo, 29 fontes ativas de sprites e um turnaround canônico. As 28 imagens do runtime reproduzidas mantiveram SHA-256 idêntico ao inventário anterior à limpeza. Validação: 186 testes em 24 arquivos, build e diff aprovados; preparação verificou 128 quadros. Menu e treino conferidos no navegador, incluindo movimento. Três testes novos protegem consumo de imagens, separação documental e links Markdown. npm ci concluído; auditoria informa três vulnerabilidades preexistentes (uma moderada, duas críticas), sem atualização de dependências nesta tarefa. Capturas/variantes removidas continuam recuperáveis no histórico Git, não no checkout ativo.

## Bancada do Shoto e receitas

## Ficha inicial implementada

Fonte de verdade executável: `src/engine/data/fighters/shoto.ts`. Vida 1000; body 55,2; hurtbox em pé 55,2×165,6, agachada 55,2×103,5 e aérea 55,2×156,4. Caixas relativas aos pés e centro horizontal do lutador, espelhadas pelo motor.

| Entrada | Nome | S / A / R | Dano | Hit / block stun | Pushback hit / block | Caixa: avanço, Y, largura, altura |
| --- | --- | --- | --- | --- | --- | --- |
| `1` | Soco fraco | 6 / 2 / 12F | 20 | 12 / 6F | 6 / 4 | 23, −138, 48,3, 32,2 |
| `2` | Soco forte | 10 / 3 / 18F | 35 | 14 / 8F | 9 / 6 | 23, −140,3, 66,7, 36,8 |
| `3` | Chute fraco | 8 / 3 / 15F | 25 | 16 / 7F | 7 / 5 | 23, −85,1, 71,3, 34,5 |
| `4` | Chute forte | 13 / 4 / 22F | 45 | 16 / 9F | 12 / 8 | 23, −105,8, 89,7, 43,7 |

Socos altos, chutes médios; todos recuperam em acerto/erro/bloqueio e têm um contato. As variantes, acordes, especiais e cancelamentos agora estão no catálogo manual abaixo; estes quatro básicos continuam com um contato cada. Nenhum desses números constitui aprovação do balanceamento final. A futura comparação entre arquétipos ainda depende do ajuste manual desta base.

## Registro por receita a receber

Usar esta ficha somente quando o usuário enviar uma receita:

| Campo | Informação a registrar |
| --- | --- |
| Identificação e estado | Proposta, em ajuste ou homologada; revisão dos dados |
| Sequência enviada | Entradas exatas e contexto inicial |
| Intenção | Função do starter, passos e conclusão |
| Regras | Janelas, cancelamentos, confirmação e condições de interrupção |
| Medições | Dano, duração, distância inicial/final, transporte e recuperação |
| Defesa | Bloqueio, erro, interrupção, punição e retorno ao controle |
| Recursos | Interação aprovada com breaker, drive rush, rage e rage art |
| Cenários | Lados, centro/canto aplicável, distâncias e reprodução por entradas |
| Evidência | Testes, conferência no jogo e decisão do usuário |

Manter valores desconhecidos explicitamente pendentes. Receitas de tutorial só entram após homologação e precisam de todos os contatos na ordem no mesmo combo. Não validar pela digitação isolada.


## Planejamento específico ainda não implementado

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

### Catálogo manual solicitado — exclusivo do Shoto

A notação universal está em `base.md`. **Todos os itens abaixo pertencem apenas ao Shoto**, sem aplicação automática aos demais personagens. O pedido autoriza estas sequências concretas; substitui as notas antigas que as tratavam apenas como exemplos. Status: implementado para teste com valores provisórios, conforme autorização posterior do usuário; homologação de balanceamento pendente. Não inferir novas rotas nem tratar os valores provisórios como decisões finais.

| Categoria | Comando | Intenção |
| --- | --- | --- |
| Combo simples | `1,1,1` | Três socos fracos |
| Combo simples | `2,2,2` | Três socos fortes |
| Combo simples | `3,3,3` | Três chutes fracos |
| Combo simples | `4,4,4` | Três chutes fortes |
| Combo alternado | `1,1,2` | Sequência manual |
| Combo alternado | `3,3,4` | Sequência manual |
| Combo alternado | `1,2,3,4` | Sequência manual |
| Combo alternado | `1,3,2,4` | Sequência manual |
| Golpe potente | `1+2` | Acorde de socos |
| Golpe potente | `3+4` | Acorde de chutes |
| Combo potente | `1,1,1+2` | Dois socos fracos e golpe potente |
| Combo potente | `3,4,3+4` | Chute fraco, forte e golpe potente |
| Agarrão | `1+3` | Agarrão; demais propriedades a definir |
| Agarrão | `2+4` | Agarrão; demais propriedades a definir |
| Golpe abaixado | `1` enquanto agachado | Soco rápido |
| Golpe abaixado | `2` enquanto agachado | Antiaéreo forte |
| Golpe abaixado | `3` enquanto agachado | Chute rasteiro rápido |
| Golpe abaixado | `4` enquanto agachado | Chute baixo de longo alcance |
| Especial | `d,df,f,1` | Projétil fraco e rápido: arremessa uma taça de vinho |
| Especial | `d,df,f,2` | Projétil forte e lento: arremessa uma garrafa de vinho |
| Especial | `f,d,fd,4` | Chute aéreo com invulnerabilidade de reversal |
| Especial | `f,d,fd,3,f,d,fd,4` | Chute aéreo estendido, dois golpes |
| Especial | `b,bd,d,df,f,3` | Joelhada de avanço com invulnerabilidade a projéteis |
| Ultimate | `b,bd,d,df,f,1+2` | Somente com barra de rage cheia: bebe uma garrafa de vinho, arremessa a garrafa no oponente e depois um isqueiro, formando um coquetel molotov |

O comando estendido mantém exatamente a ordem solicitada: a primeira parte termina em `3` e a segunda em `4`. Não interpretar isso como autorização para trocar pernas, gerar rotas adicionais ou atribuir dois contatos aos outros especiais.

### Entrega do catálogo

Branch: `codex/feature-shoto-catalogo-manual`, baseada em `de9927a8ee9d188daea20bda3a86109988c74c2e` para preservar a documentação geral recém-organizada e o trabalho visual ainda não integrado.

- [x] Fixar a notação universal em base.md.
- [x] Registrar os 24 itens solicitados exclusivamente nesta ficha.
- [x] Usuário autorizou colocar tudo no jogo, sem novas animações e com valores provisórios para testar e balancear.
- [x] Implementar comandos, cancelamentos manuais, versões abaixadas, agarrões, projéteis, invulnerabilidades, rage e ultimate.
- [x] Expor 19 golpes e 11 receitas no catálogo da pausa; oferecer somente os quatro básicos no tutorial básico e as 11 receitas no tutorial de combos.
- [x] Conferir taça e ultimate pelo teclado na prévia, incluindo dano, consumo de rage, catálogo e avanço de frame.
- [x] Instalação reproduzível, 209 testes em 25 arquivos, build e diff aprovados na versão final, incluindo direção de impacto própria dos projéteis.
- [x] Commit/push e CI da implementação aprovada, sem integração.

Implementação remota: `b0e2b4dc03cffcf273f1bab44efdd95b09ce8ca5`, [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40430583405). Registro documental final na mesma branch. development/main não foram modificadas; balanceamento manual permanece pendente.

### Parâmetros provisórios desta bancada

Fonte de ajuste: `src/engine/data/fighters/shoto.ts`; os 15 golpes novos têm dano, preparo, atividade, recuperação, stun, alcance e deslocamento declarados ali. Nenhuma nova imagem ou animação foi produzida. Golpes novos reutilizam poses existentes; abaixados mantêm uma pose de agachamento; taça/garrafa/molotov usam marcadores geométricos temporários. A sequência visual de beber, arremessar a garrafa e lançar o isqueiro permanece para a etapa de animação, sem bloquear a função da ultimate.

- Dez strings manuais e uma extensão de dois golpes. Uma entrada por etapa, sem autocombos; somente prefixos dessas receitas podem cancelar após contato (acerto ou bloqueio). Erro não permite cancelamento. Ao terminar ou interromper uma string, sua progressão é descartada; não autoriza loops nem rotas adicionais.
- Buffer de continuação: 6F; movimento especial: histórico de 36F. Acordes aceitam diferença de até 3F e substituem o botão simples ainda no preparo. Soco fraco tem hitstun 12F e chute fraco 16F para sustentar as rotas pedidas; soco potente tem preparo 8F.
- Agarrões: chão, curta distância, não bloqueáveis; não pegam alvo no ar ou já em hitstun/blockstun. Sem mecânica de escape inventada. Dano provisório 75 (`1+3`) e 85 (`2+4`).
- Taça: dano 30, velocidade 7, vida 100F. Garrafa: dano 55, velocidade 3,5, vida 180F. Projetil tem contato próprio, permanece após recuperação/interrupção do dono, respeita guarda, hitstop, limites e expiração. Não há clash ou chip adicional.
- Reversal forte: invulnerabilidade a ataques nos primeiros 16F. Extensão: início com `3`, novo movimento com `4`, um contato por etapa; a segunda depende da primeira conectar. Joelhada: invulnerável somente a projéteis nos primeiros 21F; continua vulnerável a golpes corporais.
- Rage local do Shoto: máximo 100; ganha 10 ao acertar, 15 ao receber acerto e 5 para cada lado no bloqueio. Sem ganho por erro; clamp em 100; reset a cada round/partida. Ultimate exige 100 e consome 100 no início, mesmo se interrompida ou errar; seu acerto não recarrega a própria barra. Dano provisório 240, sem chip no bloqueio. Drive rush e breaker não foram acrescentados.
- HUD mostra rage; pausa do treino oferece **Encher rage · treino** para os dois jogadores. Esse atalho não funciona fora do treino. As regras de ganho/consumo pertencem aos dados do personagem, sem impor rage aos futuros kits.

Balanceamento e homologação manual continuam pendentes; não equivaler os testes de execução à aprovação dos números.

### Processo de aprovação de uma receita

1. Receber do usuário a sequência e a intenção do combo.
2. Registrar starter, passos, contexto, condição de acerto, conclusão e comportamento esperado em erro ou bloqueio.
3. Definir com o usuário as propriedades que faltarem, sem preencher um catálogo inteiro por suposição.
4. Implementar a receita no livro próprio do shoto; medir dano, duração, alcance, risco, transporte e devolução de controle.
5. Testar ambos os lados, centro e canto quando aplicável, defesa, erro, interrupção e interação com recursos já especificados.
6. Conferir no treino e registrar a decisão: proposta, em ajuste ou homologada. Somente então usar como referência para a próxima receita.

As receitas acima foram fornecidas pelo usuário; ainda não há homologação de execução no jogo. A ficha numérica inicial serve somente para operar a bancada, sem homologação de balanceamento. A bancada está em [docs/shoto-balanceamento.md](https://github.com/feittosaa/close-combat/blob/a027c302ccdf8a58d2a965593dcd452f7a3ee0f1/docs/shoto-balanceamento.md).

## 5. Sistemas de combate da nova direção

| Sistema | Decisão | Definições necessárias antes de implementar |
| --- | --- | --- |
| Parry | Removido do design | Retirar lógica, input, feedback e lições dependentes na migração |
| Combo breaker | Incluir uma saída de combos | Comando, elegibilidade, custo, disponibilidade, janela, efeito, risco, imunidade e retorno ao controle |
| Drive rush | Incluir como mecânica de avanço/pressão | Ativação, custo, velocidade, duração, cancelamentos, vulnerabilidade e interação com defesa |
| Rage | Recurso provisório do Shoto implementado no catálogo | Balancear ganhos/consumo e eventual relação com drive rush; sem regra universal para o elenco |
| Rage art | Ultimate do Shoto implementada provisoriamente, somente com rage cheia | Homologar valores e produzir animação posteriormente |

A fala “rage (drive rush)” deixa a relação entre esses dois sistemas aberta. Registrar ambos sem presumir que compartilham barra, que um ativa o outro ou que sejam nomes intercambiáveis. Rage art é a ultimate; não criar uma segunda ultimate paralela.

Não adotar automaticamente o limite antigo de 25% de vida, uma tentativa por round, quatro botões simultâneos ou qualquer outra regra de ultimate do protótipo. Também não presumir air dash, Roman Cancel ou outras mecânicas por causa da referência anime fighter.

### Fundamentos a especificar e medir

Manter movimento, ataque, defesa, distância, vantagem e punição como dimensões de combate. Reavaliar startup, atividade, recuperação em acerto/erro/bloqueio, hitstun, blockstun, cancelamentos, knockdown, juggle, escala de dano e canto para servir à nova direção. Valores e regras de combate do protótipo não equivalem a aprovação para o shoto.

O kit inicial não derruba nem lança o adversário; não há knockdown, juggle ou levantada implementados nesta base. A preferência por recuperação manual fica registrada para quando quedas forem novamente especificadas, sem reintroduzir seus golpes e tempos antigos.

O objetivo é pressão, rotas e respostas defensivas legíveis, com limites verificáveis contra loops e retorno de controle definido. Medir cada escolha antes de afirmar que o balanceamento se aproxima da referência desejada.


# Ideias futuras — história e roguelike

> Notas de 25/10/2026. **Fora da implementação atual.** Não são tarefas autorizadas de produção. Prioridade em [base.md](https://github.com/feittosaa/close-combat/blob/a027c302ccdf8a58d2a965593dcd452f7a3ee0f1/base.md): shoto, balanceamento, PvP, Arcade PvE e treino.

## Premissa narrativa exploratória

O pai do protagonista é um rei. Para se tornar herdeiro, o personagem precisa treinar e provar que é digno do trono. O pai o coloca em um loop temporal; ele viaja pelo tempo para derrotar grandes guerreiros de diferentes épocas da humanidade. Só poderá sair do loop e assumir o trono depois de vencer todos.

A expressão “tsukuyomi infinito” é uma referência informal das notas para a ideia de aprisionamento no loop, não um nome ou poder a reproduzir. Tom, regras do tempo, elenco, desfecho e identidade do protagonista seguem abertos.

## Estrutura desejada para uma fase posterior

- Modo história principal de luta roguelike com um personagem único; Zagreu é referência de estrutura de protagonista, sem definir nome, desenho ou identidade.
- Cartas de habilidades e bênçãos que modifiquem a experiência de uma corrida.
- Personagens da história que concedem bênçãos e também compõem o elenco de PvP.
- Trinkets associados a personagens secundários.
- Missões com diferentes NPCs.
- Composite como décima possibilidade exploratória além dos nove arquétipos principais.

Não assumir que o protagonista roguelike é o shoto de balanceamento. Não levar cartas, bônus ou progressão ao PvP por inferência. Economia, persistência, geração de encontros, desbloqueios e interação com equilíbrio competitivo serão definidos apenas quando esse modo entrar no escopo.

Os nove arquétipos e suas sugestões temáticas estão em [base.md](https://github.com/feittosaa/close-combat/blob/a027c302ccdf8a58d2a965593dcd452f7a3ee0f1/base.md). Nenhuma identidade dessas notas está pronta para produção.

## Histórico de execução

<details>
<summary>Entregas e validações anteriores — registros históricos</summary>

## Revisão documental anterior — redefinir o design

Branch: `codex/chore-reinicio-design-shoto`.

- [x] Substituir a direção antiga por shoto único como referência de balanceamento.
- [x] Retirar elenco, catálogos, combos e balanceamento anteriores da especificação ativa.
- [x] Registrar nove arquétipos, sem iniciar os demais personagens.
- [x] Remover parry do design; registrar combo breaker, drive rush, rage e rage art com regras pendentes.
- [x] Reservar a autoria de combos ao usuário, um por um, sem gerar receitas.
- [x] Preservar treino de combos como ferramenta, exigindo substituição do conteúdo antigo.
- [x] Atualizar direção artística para referência Hades e separar referência de combate Xrd Rev 2.
- [x] Separar ideias futuras de história/roguelike do escopo PvP/PvE/treino.
- [x] Atualizar README e indicar o caráter histórico dos documentos auxiliares anteriores.
- [x] Validar instalação, testes, build, links locais e diff desta revisão documental.
- [x] Enviar branch, confirmar CI e integrar em `development`; registrar estado real abaixo.

**Critério de conclusão deste objetivo:** documentação coerente, sem apresentar migrações como implementadas, validada e entregue pelo manifesto. Não envolve alteração visual no jogo nem produção de assets.

## Etapa 1 — retirar o protótipo de conteúdo

Branch: `codex/feature-shoto-inicial`. Objetivo autorizado em 25/10/2026: remover o código anterior e criar Shoto com socos/chutes fracos e fortes. Valores técnicos provisórios estão em `base.md` §10; não criar combos ou mecânicas ainda indefinidas.

- [x] Inventariar dependências de Ayla, Gris, Tester e Dummy em dados, assets, seleção, Arcade, treino, tutoriais, renderização, ferramentas e testes.
- [x] Remover todos do runtime e do conteúdo ativo, incluindo importadores e catálogos antigos. Não manter Tester como exceção de treino ou Arcade.
- [x] Remover combos, strings, receitas e balanceamento antigos; definir com o usuário o mínimo necessário para a bancada neutra, sem gerar combos.
- [x] Retirar parry, comandos, dados, feedback e exercícios associados.
- [x] Disponibilizar uma única base neutra com nome provisório Shoto, sem identidade/animação final; permitir confronto espelhado e alvo de treino sem restaurar personagens antigos.
- [x] Adaptar PvP local, Arcade PvE, treino e estrutura do treino de combos. Não oferecer lições antigas como conteúdo novo.
- [x] Atualizar testes de conteúdo conforme a regra revogada, preservando cobertura técnica; conferir menu → modo → luta/treino → saída.

**Saída:** nenhum personagem ou receita anterior acessível; modos executáveis com a nova base; nenhuma dependência residual de parry. Mudança visual e de controles exige revisão no jogo.

Validação local concluída: `npm ci`, 109 testes em 13 arquivos, build, links locais e diff aprovados. Conferidos no jogo os quatro golpes, guarda sem dano, catálogo com quatro entradas, PvP, Arcade, tutorial básico completo e estado vazio do treino de combos. No build de produção, verificados pausa e avanço único do frame 3 para o 4, sem erros de console. Evidências e rastreabilidade dos testes em [docs/shoto-migracao.md](https://github.com/feittosaa/close-combat/blob/a027c302ccdf8a58d2a965593dcd452f7a3ee0f1/docs/shoto-migracao.md). Implementação integrada por fast-forward em `development`, commit `7a60ea985d34a79fa422af17d9a4cd9f4a765a93`. CI da [branch](https://github.com/feittosaa/close-combat/actions/runs/40204017166) e da [integração](https://github.com/feittosaa/close-combat/actions/runs/40204102774) aprovadas. Este fechamento documental segue o mesmo fluxo de CI/integração; sem promoção para `main` ou tag.

## Etapa 2 — especificar sistemas e kit mínimo

Pode ser documentada antes da migração; a implementação depende da base limpa.

- [x] Receber e implementar o kit mínimo de quatro básicos.
- [ ] Receber a primeira receita manual do usuário.
- [ ] Definir comandos, vida, movimento, ataque, guarda, agarrões e recuperação do shoto, sem herdar números antigos como aprovados.
- [ ] Especificar combo breaker: comando, estados elegíveis, janela, custo, efeito, risco e retorno ao controle.
- [ ] Especificar drive rush: ativação, avanço, custo, cancelamentos, risco e defesa.
- [ ] Especificar rage e esclarecer sua relação com drive rush; definir ganho, ativação, consumo e persistência.
- [ ] Especificar rage art como ultimate, sem presumir regras da ultimate anterior.
- [ ] Definir escala de dano, limites de combo, juggle/canto e retorno de controle conforme o kit necessário.
- [ ] Implementar e testar as regras aprovadas no mesmo motor para todos os modos; mostrar recursos/estados no treino.

**Saída:** contratos verificáveis e implementados para as mecânicas aprovadas; lacunas não podem ser escondidas por valores copiados de outro jogo.

## Etapa 3 — equilibrar o shoto, uma receita por vez

- [ ] Registrar a receita recebida em [docs/shoto-balanceamento.md](https://github.com/feittosaa/close-combat/blob/a027c302ccdf8a58d2a965593dcd452f7a3ee0f1/docs/shoto-balanceamento.md).
- [ ] Implementar somente os passos e propriedades definidos; não expandir “etc.” em catálogo.
- [ ] Medir dano por abertura, duração, alcance, risco em erro/bloqueio, transporte, gasto de recurso e resposta do defensor.
- [ ] Conferir ambos os lados, centro/canto aplicável, diferentes distâncias, contato/erro/bloqueio e combo breaker.
- [ ] Detectar loops, combos que não encerram e recursos que não consomem corretamente.
- [ ] Conferir no treino, ajustar individualmente com o usuário e registrar aprovação da receita.
- [ ] Alimentar o treino de combos apenas com receitas aprovadas e contatos reais no mesmo combo.
- [ ] Consolidar a ficha e os critérios mensuráveis de aprovação do shoto.

**Saída:** primeiro personagem pré-definido e equilibrado com aprovação do usuário. Não há quantidade mínima de receitas inventada nesta revisão.

## Etapa 4 — consolidar modos e apresentação

### Artes para tela inicial — 25/10/2026

Branch: `codex/feature-artes-tela-inicial`. Objetivo: produzir duas propostas de fundo para o menu atual com contorno expressivo, sombras gráficas e textura controlada. Escopo: artes estáticas, sem integração da interface ou definição visual do Shoto.

- [x] Gerar e inspecionar Arena de Brasa e Pátio de Jade, com área de baixo contraste à esquerda para as seis opções.
- [x] Salvar PNGs originais, dimensões, prompts e orientação de uso em [assets/art/menu/README.md](https://github.com/feittosaa/close-combat/blob/a027c302ccdf8a58d2a965593dcd452f7a3ee0f1/assets/art/menu/README.md).
- [x] Validar instalação, 109 testes em 13 arquivos, build e diff.
- [x] Enviar branch, confirmar CI e integrar o pacote de propostas em `development`.

Critério artístico desta entrega: duas alternativas originais sem texto incorporado ou personagens, disponíveis para avaliação. Não equivale à aplicação do guia no jogo. Seleção de fundo, integração e revisão visual no menu continuam pendentes; as imagens foram inspecionadas isoladamente.

Validação local aprovada com `npm ci`, `npm test -- --run`, `npm run build` e `git diff --check`. Ambas as imagens são PNG RGB de 1672 × 941. Nenhuma mudança no runtime: revisão dentro do jogo não se aplica ao pacote de alternativas, mas permanece obrigatória para sua integração visual futura.

Pacote integrado por fast-forward em `development`, commit `ed802341655d6d8a7a959ecd37ed167013d4fb6d`. CI da [branch](https://github.com/feittosaa/close-combat/actions/runs/40208532085) e da [integração](https://github.com/feittosaa/close-combat/actions/runs/40208596497) aprovadas. A primeira execução identificou uma linha vazia ao fim do guia, corrigida antes da integração. Este fechamento documental segue o mesmo fluxo de CI e integração. Sem promoção para `main` ou tag.

### Sprites básicos do Shoto — integração autorizada

Branch: `codex/feature-shoto-sprites`, criada de `origin/development` para não misturar o menu diurno pendente. Objetivo: aplicar as três folhas wide escolhidas, sem produzir ou simular arte de outros estados.

- [x] Preservar fontes magenta; preparar 22 quadros RGBA (8 idle, 8 caminhada e 6 agachado), cada animação em uma faixa horizontal, células 512 × 768, pés em Y=720.
- [x] Carregar atlas em luta e menu, espelhar direção e alinhar pés ao estado físico; manter escala uniforme e proporções alongadas.
- [x] Amostrar clipes pelo frame lógico; recuo usa caminhada invertida. Preview de menu usa idle e remove listener ao ser destruído.
- [x] Manter fallback geométrico para ações sem arte; nenhuma alteração nas regras ou colisores.
- [x] Validar preparação, testes de integração/determinismo, instalação, build e diff.
- [ ] Conferir arena nos dois lados, centro/cantos, caminhada/recuo, agachado, pausa/reset e transições entre sprite/geometria.
- [x] Enviar implementação e confirmar CI da branch.
- [ ] Integrar em `development` somente após revisão visual.

**Estado:** implementação local pronta; 115 testes em 14 arquivos aprovados. As tiras preparadas foram inspecionadas isoladamente, e a preparação verifica transparência, limites de célula e pé opaco em Y=719 para todos os quadros. O navegador de inspeção volta a expirar ao abrir o jogo em `127.0.0.1:5176`; não há evidência de reprodução na arena nesta entrega. Não confundir inspeção de PNGs/testes com homologação visual. Limites das folhas de origem e reprodução em [src/assets/sprites/characters/shoto/README.md](https://github.com/feittosaa/close-combat/blob/a027c302ccdf8a58d2a965593dcd452f7a3ee0f1/src/assets/sprites/characters/shoto/README.md).

Estado remoto: commit de implementação `2e72438a7044ccc160a3cf2659ea6c1c00ebe494` enviado; [CI da branch aprovada](https://github.com/feittosaa/close-combat/actions/runs/40254140672). Sem integração em `development`, promoção para `main` ou tag enquanto a revisão visual estiver pendente. O registro documental final acompanha a mesma branch.

### Menu diurno aprovado — 25/10/2026

Branch: `codex/feature-menu-diurno`. Aval manual recebido para aplicar a primeira arte diurna da segunda rodada como fundo padrão. As propostas anteriores permanecem históricas; não são o fundo aprovado.

- [x] Adotar `patio-solar.png`, com movimento lento sem expor bordas e partículas de luz; respeitar movimento reduzido.
- [x] Ajustar menu e CSS das configurações ao traço e paleta da peça; liberar a direita para o portal e o sol.
- [x] Registrar em `base.md` e `identidade-visual.md` o padrão de desenho e liberdade de paleta; exigir aval manual para novas imagens exploratórias.
- [x] Validar instalação, 109 testes em 13 arquivos, build e diff.
- [ ] Conferir no jogo os modos, configurações, retorno e animação.
- [x] Enviar implementação na branch e confirmar CI remota.
- [ ] Integrar em `development` após conferência visual.

Critérios: arte correta, opções legíveis, foco claro, movimento discreto, navegação preservada. O personagem continua com representação neutra.

Validação local: `npm ci`, `npm test -- --run`, `npm run build` e `git diff --check` aprovados. Conferência visual bloqueada: o navegador de inspeção reconhece as páginas locais, mas navegação, foco e captura de tela expiram, inclusive em aba nova. Servidor local restrito a `127.0.0.1:5174`. Não há captura ou homologação visual desta alteração; manter a feature fora de `development` até conferir o jogo. O movimento usa ciclo suave de 36 segundos com margem de 4,5% e nove partículas discretas, sem alterar a simulação de combate.

Estado remoto: implementação enviada no commit `473239ba86a15dab887b032efc695831280c1f80`; [CI da branch aprovada](https://github.com/feittosaa/close-combat/actions/runs/40212901225). Sem integração, promoção ou tag. Este registro documental acompanha a branch e não substitui a revisão visual pendente.



### Apresentação conjunta em Full HD

Branch: `codex/feature-apresentacao-1080p`, criada de `origin/development` e reunindo os commits das branches de sprites e menu conforme o novo pedido. As branches originais foram preservadas. Este objetivo inclui aplicar o menu diurno já aprovado, não apenas trocar a resolução do canvas.

- [x] Reunir menu diurno animado, CSS e sprites do Shoto; preservar conteúdo e documentação das duas entregas.
- [x] Canvas 1920 × 1080, ajuste FIT 16:9, antialiasing e textos em resolução 2.
- [x] Preservar coordenadas lógicas 1024 × 576 para arena/HUD/menu e regras de combate; projetar câmeras em escala uniforme 1,875.
- [x] Aumentar zoom próximo de 1,55 para 1,95 (+25,8%) com abertura por distância e piso compartilhado.
- [x] Validar testes de cantos do menu, piso/tamanho do personagem/HUD e ambos os extremos em Full HD; manter demais regressões.
- [x] Concluir instalação, 119 testes, build e diff finais.
- [x] Enviar branch e confirmar CI remota.
- [x] Conferir visualmente menu animado, configurações, seleção, treino/luta, escala, pés, pausa/reset em 1080p. Conferência concluída na entrega conjunta de HUD abaixo; o bloqueio anterior foi superado.

Validação final: 119 testes em 15 arquivos e build aprovados. O teste do limite anterior de zoom foi atualizado para a nova regra de 1,95; testes novos verificam a projeção 1920 × 1080, preservação da arena e altura projetada de 526,5 pixels para um corpo de 144 unidades no enquadramento próximo. Na conferência inicial no navegador, o menu diurno, a seleção de personagem/cenário e os sprites dos dois jogadores apareceram corretamente. A arena revelou um deslocamento do HUD devido ao scrollFactor zero: a câmera da interface foi corrigida para origem superior esquerda, zoom 1,875 e scroll zero, e um teste específico foi adicionado. A prévia de seleção também foi ampliada de 1,04 para 1,6. Após o recarregamento, o navegador perdeu a conexão com o servidor e voltou a expirar em foco/captura, inclusive em aba nova. A revisão visual da versão final continua pendente; não homologar a correção do HUD apenas pelo teste. Manter esta branch fora de development até a conferência final. Prévia de desenvolvimento em `127.0.0.1:5177` e build de produção em `127.0.0.1:4180`. A tentativa com produção também expirou na captura automática; a revisão final permanece pendente.

Estado remoto: commit `bf4fc90aad09fa6959494239f43f008fab5dee55` enviado na branch conjunta, [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40259013522). Nenhuma integração em development, promoção para main ou tag nesta entrega. O fechamento documental segue na mesma branch.

### HUD, enquadramento e propostas de novas animações

Branch: `codex/feature-hud-enquadramento`, criada de origin/development e reunindo a apresentação Full HD pendente como dependência. O objetivo inclui concluir a conferência visual da apresentação, aumentar a presença do personagem, corrigir o tamanho aparente do agachado e alinhar os HUDs ao menu. As novas imagens são somente para avaliação e não fazem parte dos assets carregados pelo jogo.

- [x] Zoom próximo 2,25 (+15,4% sobre 1,95), com limite por altura do salto e abertura por distância; piso compartilhado.
- [x] Correção uniforme 0,9 nos seis quadros agachados, mesmos pés/pivô e caixas originais.
- [x] HUD de luta e treino com tema comum ao menu: painéis de tinta, ouro/coral/jade, serifas, barras segmentadas, vida numérica, marcadores de rounds, dados de frames/contato e teclas remapeadas.
- [x] Gerar cinco folhas preview em faixa horizontal com fundo magenta: salto (8), defesa (6), recuo (8), dash (6), backstep (6). Sem copiar novas imagens para o repositório ou importar no runtime; aguardam aprovação manual.
- [x] Auditar branches e remover 20 branches locais/remotas já integradas, sem PR aberto nem checkout ativo. Registro em docs/branches-encerradas.md.
- [x] Registrar encerramento de branches após merge/CI em docs/ci-cd.md e AGENTS.md.
- [x] Validar instalação, testes, build, diff e HUD/enquadramento no jogo; salvar evidências.
- [ ] Confirmar CI, integrar a entrega em development e encerrar suas branches dependentes.

Não considerar as novas animações aprovadas ou inseridas. A retirada das branches de sprites/menu/Full HD depende da integração desta entrega; seus commits serão preservados. A antiga branch de gravidade tem apenas um fechamento documental único do protótipo: preservar esse commit no histórico sem reaplicar conteúdo antigo antes de encerrar a referência.

### Consolidação funcional

Manter os modos utilizáveis nas etapas anteriores; consolidar aqui o conjunto homologado.

- [ ] PvP local: espelhamento, rounds, vitória, revanche e retorno ao menu.
- [ ] Treino: pausa, passo único, reset sem entradas residuais, dados de frame, caixas, histórico e recursos novos.
- [ ] Treino/tutorial de combos: receita, instrução, confirmação por acertos ordenados, repetição e saída.
- [ ] Arcade PvE: IA por entradas legais do novo kit, recuperação e progressão sem elenco descartado.
- [ ] Especificar identidade do shoto somente quando solicitada; validar uma ação antes de produzir o conjunto de arte.
- [ ] Aplicar o guia visual inspirado em Hades quando a produção for autorizada; conferir legibilidade do combate anime fighter no jogo.

**Saída:** fluxo completo e dados iguais entre PvP, PvE e treino, com evidência funcional e visual.

## Etapa 5 — expandir elenco após homologação

- [ ] Escolher com o usuário o próximo dos oito arquétipos restantes.
- [ ] Criar identidade e kit próprios, com golpes, colisão e rotas individuais.
- [ ] Comparar cada confronto com o shoto de referência; medir vantagens, respostas e recursos.
- [ ] Aprovar um personagem por vez antes de ampliar a produção.

Composite e história/roguelike não pertencem a esta etapa. Consultar [docs/ideias-futuras.md](https://github.com/feittosaa/close-combat/blob/a027c302ccdf8a58d2a965593dcd452f7a3ee0f1/docs/ideias-futuras.md), sem iniciar implementação.

## Validação da revisão documental anterior e histórico

As pipelines anteriores, números de testes e aprovações de Ayla/Gris/Tester ficam no histórico do Git e nos registros auxiliares identificados como históricos. Não indicam avanço nas etapas novas. Infraestrutura existente poderá ser aproveitada após verificação; não reabrir automaticamente tarefas antigas de arte ou combos.

Validação local: `npm ci`, 419 testes em 24 arquivos, `npm run build`, links locais dos seis documentos ativos e `git diff --check` aprovados. Nenhum código de jogo ou teste foi alterado. Conferência visual no jogo não se aplica a esta entrega exclusivamente documental. Entrega integrada por fast-forward em `development`: commit `3ebb4097a96747056794a3780708ff6413f6d7f7`. CI da [branch](https://github.com/feittosaa/close-combat/actions/runs/40199645834) e da [integração](https://github.com/feittosaa/close-combat/actions/runs/40199715568) aprovadas. O fechamento deste registro documental segue o mesmo fluxo de CI e integração. Sem promoção para `main` ou tag nesta entrega.

Conferência conjunta concluída no build de produção: menu diurno, configurações, seleção, treino e PvP; agachado inspecionado por frame nos dois lados; salto preserva espaço do HUD; P2 apresenta 980/1000 após contato. Rodapé ajustado após revisão para separar contato e atalhos. Evidências em [docs/evidence/hud-enquadramento/README.md](https://github.com/feittosaa/close-combat/blob/a027c302ccdf8a58d2a965593dcd452f7a3ee0f1/docs/evidence/hud-enquadramento/README.md). Validação final: 124 testes em 16 arquivos, build e diff aprovados. A conferência atual substitui a pendência visual das entregas de menu, sprites e Full HD; os relatos anteriores descrevem o estado histórico. Integração e CI desta branch ainda pendentes neste registro.

Revisão solicitada após a primeira conferência: substituir zoom dinâmico por câmera fixa em escala 1, apenas deslocamento horizontal, incluindo saltos; HUD minimalista com barras contínuas no topo, sem segmentação vertical e sem grandes molduras. As evidências anteriores do enquadramento serão substituídas pela conferência desta revisão antes da integração.

Revisão visual da câmera fixa concluída: treino, salto por frame e PvP, barras contínuas no topo e ausência de mudanças de escala/altura. O zoom 2,25 mencionado no primeiro checklist foi substituído pelo pedido posterior de câmera fixa. Menu diurno e configurações conferidos nesta mesma entrega.

### Animações aprovadas, cabelo e alinhamento

Branch: `codex/feature-shoto-animacoes-alinhadas`, criada de development após a integração anterior `a35e1ba`. [CI da feature anterior](https://github.com/feittosaa/close-combat/actions/runs/40263439670) e [CI de development](https://github.com/feittosaa/close-combat/actions/runs/40263559525) aprovadas. As cinco branches absorvidas foram removidas localmente e no remoto, somando 25 branches encerradas nesta sessão. Menu diurno, sprites iniciais e HUD estão integrados; as pendências históricas acima foram resolvidas.

Novo aval manual: inserir salto, defesa, caminhada para trás, dash e backstep, com cabelo avermelhado uniforme em todas as folhas. Revisar alinhamento X, pés e loops, especialmente agachado. Aumentar presença do personagem pela referência de proporção fornecida, mantendo câmera fixa.

- [x] Editar cabelo nas oito folhas sem redesenhar poses, preservar fontes e registrar preparação.
- [x] Preparar atlas com raiz X autorada, escala comum, pés alinhados e ciclo agachado sem teleporte.
- [x] Integrar estados pela lógica real, sem inventar ataques ou animações não aprovadas.
- [x] Escala fixa 1,6 (corpo de cerca de 40% da altura); manter salto inteiro. Limitar afastamento ao espaço visível, com margem lateral de 64 unidades por lutador, para evitar desaparecimento sem zoom dinâmico.
- [x] Validar preparação, testes, build, diff e jogo em ambos os lados, pausa/reset, canto e salto.
- [x] Enviar, conferir CI, integrar e encerrar branch concluída.

Conferência da revisão de animações: 56 desenhos em oito atlas, cabelo editado pelo image_gen embutido; verificação independente de pixels sem corte/magenta opaco, pés alinhados e desvio X agachado de 1,5 pixel. Ciclo agachado em ida/volta, entrada de guarda sem reinício a cada volta e guarda fechada durante blockstun. Salto de P1/P2, recuo, dash, backstep, afastamento máximo e canto conferidos no jogo; capturas em docs/evidence/shoto-animacoes-alinhadas. A arte de ataques/hitstun continua provisória, conforme escopo aprovado. Estado remoto desta nova branch: envio/CI ainda pendentes neste registro.

Validação final desta revisão: instalação reproduzível concluída, 129 testes em 17 arquivos, build, diff e verificação dos pixels aprovados. Evidências de P2 no ápice confirmam espelhamento; revisão no afastamento máximo mantém ambos na tela, sem mudanças de escala. O cenário de treino solicitado depois será entregue em branch independente.

### Sala de treino — substituição do Cais

Branch: `codex/feature-sala-treino`, criada de development após integração das animações `de97cce`. CI da feature 40265537116 e CI de development 40265888943 aprovadas; branch de animações encerrada local/remotamente.

- [x] Gerar sala ilustrada neutra próxima da referência quadriculada, sem personagens/props/texto, e registrar prompt/origem.
- [x] Retirar Cais do catálogo e dos assets ativos; preservar histórico Git e evidências antigas.
- [x] Fixar sala no treino e dois tutoriais, sem etapa de escolha; única opção temporária nos modos gerais.
- [x] Validar testes, instalação, build, diff e jogo; conferir solo, enquadramento e todos os modos.
- [x] Enviar e confirmar CI; integração conjunta registrada abaixo, encerramento após CI de development.

Pedido posterior de dashs mais longos e transições suaves segue em objetivo separado; a geração dos conectores já começou sem misturar sua implementação nesta branch.

Sala final conferida no treino e capturada em docs/evidence/sala-treino/treino.png. Instalação, 135 testes em 18 arquivos, build e diff aprovados; PNG final preservado em tamanho nativo. Conferência da navegação dos demais modos ficou pendente após timeouts de foco/CDP no navegador; servidor de produção segue ativo e responde HTTP. Preservar a branch sem integração até completar essa conferência. O objetivo de dash/transições prossegue separadamente a partir de development.

### Dash imediato e transições suaves

Branch: `codex/feature-dash-transicoes`, criada de origin/development após as animações alinhadas. Pedido: dois toques imediatos com dash mais visível e demorado, mais sprites intermediários para evitar saltos de pose.

- [x] Capturar dois toques físicos entre ticks; pedido único, relativo ao facing; respeitar reset, blur, soltura e auto-repeat.
- [x] Dash/backstep iniciam no segundo toque e completam 24 frames após soltar; corrida somente ao manter avanço depois do dash.
- [x] Gerar sete conectores de quatro desenhos (28 novos, 84 no total), preservando cabelo/identidade, raízes e proporções.
- [x] Entradas/saídas autoradas, retorno parcial em interrupção e mistura lógica de três frames entre ações; pausa/FPS determinísticos.
- [x] Margem lateral 88 para manter as poses largas dentro do quadro, sem zoom dinâmico.
- [x] 137 testes em 18 arquivos, build e diff aprovados; verificação independente dos 84 quadros aprovada.
- [x] Conferir duração/loops/transições no jogo e registrar evidências; acesso recuperado após os timeouts.
- [x] Enviar e confirmar CI; integração conjunta registrada abaixo, encerramento após CI de development.


Dependência reunida para revisão conjunta: a branch de dash mantém o commit próprio `c616f68` e incorpora a sala pelo merge da branch `72cc275`, preservando ambos os objetivos. Integração em development aguarda a conferência visual conjunta e a CI do conjunto.

Conferência conjunta concluída após recuperar a prévia: treino, tutorial básico, tutorial de combos, PvP e Arcade usam a Sala de Treino. Tutoriais entram diretamente após escolher personagem; modos gerais mostram a sala como única opção. Evidências em docs/evidence/sala-treino. A pendência visual anterior está resolvida.

Dash e backstep conferidos após dois toques curtos e soltura: dash no frame 9, backstep no frame 12 e avanço até frame 24; entradas/saídas de caminhada, agachado e salto revisadas com avanço por frame, sem mudança de câmera. Capturas em docs/evidence/dash-transicoes. Correção adicional preserva o relógio de stun ao limpar direção residual. Validação conjunta: 144 testes em 19 arquivos, build, diff e verificação independente dos 84 quadros aprovados; instalação reproduzível executada nesta entrega.

Estado remoto antes do fechamento: sala `72cc275`, CI 40267614680 aprovada; conjunto `1d0e555`, CI 40269742462 aprovada. O commit de fechamento registra a revisão e segue novamente CI de feature, integração e CI de development; as duas branches serão encerradas somente após confirmação. Sem promoção para main.

Fechamento: código e evidências `5026ec3180b40ae1576ef5f49e4e7cfb41ea52e4` enviados e integrados por fast-forward em development. [CI da feature 40271546638](https://github.com/feittosaa/close-combat/actions/runs/40271546638) aprovada; [CI de integração 40271628696](https://github.com/feittosaa/close-combat/actions/runs/40271628696) aprovada no mesmo commit. Este último ajuste é somente documental e seguirá a mesma validação remota antes do encerramento das duas branches. A conferência no jogo e os 144 testes pertencem ao código integrado.

### Paleta uniforme e remoção da corrida — 26/10/2026

Branch `codex/feature-shoto-paleta-sem-corrida`, a partir de development. Padronizar seis materiais em todos os 84 desenhos e nas prévias do menu: cabelo castanho discretamente avermelhado, pele um pouco mais morena, calça escura, paletó marfim, camisa vinho e sapatos castanhos. Aplicar a tabela compartilhada na preparação das texturas do jogo, mantendo fontes, alpha, células e raízes intactos. Remover corrida da simulação, dados, seleção de clipes e HUD; ao terminar o dash, manter direção deve resultar em caminhada.

- [x] Paleta comum documentada e aplicada a todos os atlas.
- [x] Remover corrida e cobrir retorno à caminhada nos dois sentidos.
- [x] Instalação, testes, build, diff e conferência visual de todas as ações.
- [x] Código enviado e CI da feature aprovada; fechamento segue integração/CI de development e remoção da branch conforme docs/ci-cd.md.

Validação local concluída: npm ci, 147 testes em 20 arquivos, build e diff aprovados. Corrida removida do tipo de estado, dados de movimento, simulação, rótulos e clipes; testes verificam caminhada por 60F adicionais após completar o dash. Paleta RGB aplicada uma vez por atlas, com alpha e quadros preservados. Regressões cobrem pele/cabelo/camisa, botas levantadas e dobras marfim ao nível da cabeça durante dash, além de células com alturas diferentes.

Conferência no build de produção concluída: seleção, idle nos dois lados, caminhada/recuo, agachado, salto, dash, retorno à caminhada no frame 30, backstep, guarda e conectores. Corrigidas sombras quentes da manga que inicialmente eram confundidas com pele. Capturas e procedimento em docs/evidence/shoto-paleta/README.md. A prévia foi recuperada por nova aba após timeout ao recarregar. Envio/CI e integração seguem a etapa final abaixo; não confundir esta validação local com resultado remoto.

Entrega de código `8d7abf1f42494b7a83b2c2c723a3802cc669b027`: [CI da feature 40325219320](https://github.com/feittosaa/close-combat/actions/runs/40325219320) aprovada. Registro final acrescenta resultado.png e documentação; não altera código nem invalida a conferência. Integração por fast-forward e encerramento somente após CI do commit final e de development, sem promoção para main. O relato de conclusão confirma o resultado remoto dessas etapas.

Último ajuste de tom: a faixa média de pele foi escurecida para `#966344` (amostra de origem RGB 182/109/64 passa a 150/99/68), reservando a luz mais clara a valores acima de 190. Isso evita clarear a pele ao padronizar. Seleção e treino dos dois lados reconferidos; resultado.png atualizado. 147 testes, build e diff novamente aprovados. As capturas por ação registram a conferência anterior de classificação dos materiais; resultado.png registra a intensidade final da pele.

### Cores contínuas sem recortes e presença +3%

Branch `codex/fix-shoto-cores-suaves`, criada de development. Feedback do usuário rejeita os artefatos na jaqueta/pele da correção de cores anterior. Causa: classificação por limiares e troca por cores discretas; medianas por linha também mudavam a classificação de pixels vizinhos. Substituir por correção RGB contínua, preservar contornos/sombras/alpha e marfim original. Manter cabelo castanho discreto e pele um pouco mais morena. Ampliar o desenho uniformemente em 3%, com pés/raízes preservados, câmera fixa e sem alterar colisores; ajustar margem lateral para o desenho completo.

- [x] Validar continuidade em vizinhos RGB e coordenadas, transparência e ausência de quantização.
- [x] Conferir cores de todas as ações, salto inteiro e aumento discreto no jogo.
- [x] Instalação, testes, build, diff e push; CI da feature aprovada. Fechamento documental segue CI própria, integração/CI de development e remoção da branch conforme manifesto.

Conferência no build de produção concluída: seleção/idle nos dois lados, caminhada/recuo, agachado, dash/backstep, guarda e salto em execução. Salto capturado no frame 19 sem o painel de pausa, personagem inteiro e abaixo do HUD. Jaqueta e pele preservam as sombras originais, sem o mosaico de cores criado pela classificação anterior. Evidências em docs/evidence/shoto-cores-suaves. Escala do desenho +3%, margem 92, afastamento máximo 456 em 1024 × 576; câmera continua fixa em 1,6 e colisores inalterados. Instalação reproduzível, 149 testes/20 arquivos, build e diff aprovados. Fechamento remoto segue CI do commit final antes de integração e encerramento; sem promoção para main.

Código/evidências enviados em `4758f3045c39d47c2e3c255f78c060eed1747c7d`, [CI da feature 40340414066](https://github.com/feittosaa/close-combat/actions/runs/40340414066) aprovada. Este fechamento é somente documental. Integrar após CI do commit final, verificar CI de development e encerrar `codex/fix-shoto-cores-suaves` local/remotamente; o relato final confirma essas etapas do remoto. Sem alteração de main ou tags.

### Transições sem piscadas de opacidade

Branch `codex/fix-shoto-piscadas`, criada de development. Feedback: animações parecem piscar após correção das cores. Reprodução com snapshots reais: no frame 2 da entrada de caminhada, duas camadas com alpha 2/3 e 1/3 produzem cobertura composta 7/9 (77,78%) em composição source-over, deixando o cenário aparecer através do corpo. Regressão adicionada e confirmada falhando antes da correção.

Retirar a dissolução por alpha entre poses; renderizar uma pose sempre opaca. Preservar os conectores autorados de entrada/saída, seus tempos, cores, escala +3%, física, raízes e pausa determinística.

- [x] Regressão de cobertura opaca em ambos os lados, entradas/saídas, interrupções, salto/aterrissagem e dash/backstep.
- [x] Conferir movimentos e interrupções no jogo, registrar evidências.
- [x] Instalação reproduzível, 150 testes em 21 arquivos, build e diff aprovados.

Conferência no build de produção concluída com a mesma aba atualizada: caminhada e saída, entrada/interrupção curta de agachamento, dash no frame 2, reversão em movimento real e salto. Capturas em docs/evidence/shoto-sem-piscadas; o frame 2 que antes apresentava cobertura de 77,78% agora desenha uma única pose com alpha 1. Os conectores e seus tempos continuam ativos, assim como as verificações de pausa/FPS 30/60/120/144. Ajustadas somente as expectativas antigas de duas camadas que descreviam o comportamento defeituoso; testes de retorno parcial e determinismo permanecem.

Fechamento remoto desta entrega segue docs/ci-cd.md: envio, CI da feature, integração em development somente com CI verde do commit enviado, CI de development e remoção da branch após confirmar ancestralidade. O relato final registra o resultado efetivo dessas etapas. Sem promoção para main.

### Quatro básicos ilustrados e guardas por postura

Branch `codex/feature-shoto-golpes-guardas`, criada de origin/development. Criar e implementar soco fraco/forte, chute fraco/forte, defesa agachada e aérea no mesmo personagem/traço, sem modificar o balanceamento dos quatro básicos. Sincronizar poses com preparo, atividade e recuperação reais; raízes, proporções, cores naturais e opacidade preservadas. Guardas devem ser alcançáveis na postura correspondente.

Regra persistente atualizada em AGENTS.md, docs/ci-cd.md e base.md: commits/push autorizados; nenhum merge em development sem pedido explícito do usuário. Esta entrega termina na branch validada/enviada, mantida para revisão.

- [x] Gerar seis folhas e preservar fontes/prompts/proveniência.
- [x] Preparar atlas e raízes, integrar os quatro ataques por fase e duas guardas por postura.
- [x] Verificar preparação, transparência, enquadramento, ambos os lados, impactos/defesas, pausa/reset e FPS.
- [x] Instalação, testes, build, diff, conferência visual, commit/push e CI da branch.
- [x] Auditoria final: nenhuma integração em development, branch mantida.

Validação local desta branch: npm ci, 164 testes/22 arquivos, build, verificador dos 116 frames e diff aprovados. Revisão no jogo dos seis clipes em ambos os lados, com impactos, bloqueios reais, retorno e reset. Evidências em docs/evidence/shoto-golpes-guardas. Os ataques usam células 1152×768 com a mesma altura/escala; guardas 768×768. Novo módulo amostra as fases reais; guarda aérea passa a ser alcançável com B/DB, sem suspender gravidade, sem novos golpes ou mudança dos básicos. Código/arte enviados em `4b6eeebe97b4416919df5dc6bdafab60ee973bb4`, com [CI da feature 40351472690](https://github.com/feittosaa/close-combat/actions/runs/40351472690) aprovada. Branch local/remota mantida para revisão; development permanece `a5930d901654feb419570ff642acc6025d20daed` e main `77a4c939c9ccdf028eed5f334132f65368dbae30`. Nenhum merge, promoção ou tag. Este fechamento altera apenas o registro documental e terá a própria CI verificada antes da conclusão; resultado do commit final no relato ao usuário.

### Revisão de identidade dos seis clipes — mesma branch

Feedback do usuário: rosto/traço divergentes do turnaround, cabeça/corpo maiores nos socos, pele mais vermelha e sapatos mudando de tom. Revisar socos/chutes fraco/forte e guardas agachada/aérea usando o turnaround original como autoridade; comparar à locomoção e preservar transições. Pedido explícito para continuar em `codex/feature-shoto-golpes-guardas`, sem merge.

- [x] Preservar turnaround no projeto e registrar regra permanente por personagem em AGENTS.md/base.md.
- [x] Corrigir seis fontes com a referência canônica e preservar prompts/proveniência.
- [x] Repreparar raízes/escala; conferir identidade, cores e continuidade no jogo.
- [x] Validar testes/build/diff/verificador e enviar a mesma branch, conferindo CI sem merge.

Revisão local concluída: seis fontes canônicas v2 preservadas, 120 quadros em 21 atlas, mesma escala corporal. Guardas recebem duas intermediárias adicionais; ligação de postura reaproveita conectores autorados, ataques usam fechamento/reabertura sem atrasar contatos. Corrigido relógio visual do salto para sobreviver à guarda/stun. 167 testes/22 arquivos, build, diff e verificador aprovados; seis clipes conferidos nos dois lados e evidências em docs/evidence/shoto-identidade-canonica. Sem novo filtro rígido de cor, sem física/balanceamento alterados. Revisão enviada em `56f32de5a07129b6a1c87658cbf905d60c94e818`, com [CI 40373356429](https://github.com/feittosaa/close-combat/actions/runs/40373356429) aprovada. A branch local/remota continua mantida para conferência manual. Auditoria do remoto: development segue `a5930d901654feb419570ff642acc6025d20daed`, main `77a4c939c9ccdf028eed5f334132f65368dbae30`; nenhum merge ou tag. Este fechamento é somente documental; sua CI própria será conferida antes do relato final.

Regressão adicional: interromper a guarda após um único frame usa somente a profundidade alcançada; mantém a descida se D continuar, sem saltar para braços fechados.

### Figurino de todas as animações, caminhada 16F e golpes fortes v3 — REPROVADA

Pedido: padronizar mangas três quartos/um relógio esquerdo/sem braceletes/sem cinto/calça escura em TODAS as folhas antigas e novas; regenerar soco/chute fortes com proporções do idle e ampliar desenhos de caminhada para frente. Continuar na mesma branch sem merge.

- [x] Registrar regras definitivas e preservar referência de figurino complementar.
- [ ] Corrigir todas as folhas e conectores, preservar fontes/prompts e conferir peças/acessórios. — Tentativa v3 reprovada.
- [ ] Integrar caminhada de 16 desenhos reais e dois golpes fortes regenerados, sem crescimento de cabeça/corpo. — Integração v3 retirada.
- [ ] Conferir jogo, testes, build, preparo/verificação e diff; enviar/CI na mesma branch, sem merge. — Checagens técnicas passaram, arte reprovada.

Validação local desta revisão: npm ci, 168 testes/22 arquivos, build, preparo dos 128 quadros e verificador de pixels aprovados. Cabeça dos fortes comparada ao idle na mesma escala (largura superior 97–105 px, referência mediana 100 px); pés agachados dentro de 3 px. Conferência no jogo e capturas em docs/evidence/shoto-figurino-v3, incluindo quatro ataques nos dois lados e guardas reais. As 22 fontes v3, referência de figurino, prompts e seleção final foram preservados. Escala de exibição, câmera fixa e regras de combate mantidas. Revisão enviada em `cb7c3de4971cc8a09e0bcd052253c933081c3e3c`, com [CI 40383532409](https://github.com/feittosaa/close-combat/actions/runs/40383532409) aprovada. Auditoria remota: development permanece `a5930d901654feb419570ff642acc6025d20daed` e main `77a4c939c9ccdf028eed5f334132f65368dbae30`; nenhum merge ou tag. Branch local/remota mantida para validação manual. Este fechamento é documental; sua própria CI será conferida antes do relato final.


### Rejeição visual da v3 e recuperação da base anterior

O usuário reprovou a v3: dedos rosados, relógio intermitente, marcha incoerente, agachado pequeno, blazer excessivamente branco, cabelo/estilo divergentes, soco brusco e troca da perna no chute. As marcações técnicas da seção anterior não representam aprovação artística; a v3 não está concluída nem aprovada.

- [x] Identificar a troca em lote e preservar o histórico rejeitado sem reescrever commits.
- [x] Restaurar sprites, raízes, preparo e reprodução de 61ccbf9, anterior à v3; retirar intermediárias rejeitadas do runtime.
- [x] Conferir restauração no jogo, testes, build, verificação e diff; enviar a mesma branch e verificar CI, sem merge.

Objetivo desta recuperação: voltar à base anterior, sem nova geração ou tentativa de corrigir todas as folhas ao mesmo tempo. Os ajustes artísticos solicitados continuam pendentes e serão tratados pontualmente; não declarar que a restauração os resolveu.

Restauração local conferida: 44 arquivos ativos idênticos byte a byte a 61ccbf9 (imagens, atlas, raízes e reprodução), 120 desenhos/21 atlas, sem as intermediárias rejeitadas. npm ci, 168 testes/22 arquivos, build, verificador e diff aprovados. Capturas/relatório em docs/evidence/shoto-restauracao-v3. Nenhuma arte nova gerada. Restauração enviada em `b05c86c52503f70bfb83275112ee93e17ead9072`, com [CI 40388103035](https://github.com/feittosaa/close-combat/actions/runs/40388103035) aprovada. Nenhuma integração; a aprovação técnica comprova a execução da recuperação, não os ajustes artísticos pendentes. Este fechamento documental terá a própria CI conferida antes do relato final.


### Ajustes localizados v4 nas folhas existentes

Pedido atual: remover cinto/fivela de todas as folhas, uma pulseira de ouro em cada braço, cavanhaque marrom igual ao cabelo e calça no cinza mais escuro. Preservar desenhos existentes, rosto, blazer creme, pele, sapatos, altura e alinhamento. Somente caminhada frontal recebe novas intermediárias entre as poses atuais; chute forte deve preparar, estender, recolher e pousar a mesma perna. Não usar a v3 rejeitada. Mesma branch, sem merge.

- [x] Editar e comparar uma primeira folha, sem trocar os desenhos que já funcionam.
- [x] Aplicar somente os detalhes pedidos às demais folhas e conectores, conferindo poses/cores/acessórios.
- [x] Criar intermediárias da caminhada entre pares dos oito desenhos existentes, mantendo as chaves; corrigir continuidade da perna no chute forte.
- [x] Preparar sem deformar/recolorir os desenhos, conferir ciclos no jogo, testes/build/diff e registrar estado real do remoto.

O pedido atual inclui trazer o Bar ao Anoitecer da conversa «Gerar três imagens de cenário» para ESTA mesma branch. Arte e implementação de 254b6af reaproveitadas, com chão reduzido, Arcade/PvP no bar e treino/tutoriais na sala. Não altera câmera nem escala dos personagens. A validação conjunta será refeita com as animações v4.


Revisão v4 concluída localmente: 21 folhas existentes retocadas e oito intermediárias individuais, total 128 quadros em 22 atlas. Os oito desenhos antigos de caminhada continuam presentes; somente o quinto desenho do chute forte muda a perna de retorno para manter a continuidade. Figurino vigente documentado (sem cinto, duas pulseiras, cavanhaque marrom e calça carvão). Preparo técnico sem repintura/quantização; câmera, escala de exibição, física e tempos de golpes mantidos. Fontes/prompts e comparação de silhueta preservados.

Bar ao Anoitecer trazido de 254b6af para esta mesma branch por pedido explícito: PvP/Arcade no bar, treino e ambos os tutoriais na sala. Miniatura proporcional e piso reduzido preservados. Conferência conjunta no jogo em docs/evidence/shoto-fine-v4: ciclo completo de caminhada, recuo/agachado/salto, dash/backstep, quatro ataques, fortes dos dois lados, bloqueios agachado/aéreo reais, seleção/bar/PvP e tutoriais. Nenhuma homologação artística inferida dos testes.

npm ci concluído; 174 testes em 22 arquivos, build, verificador dos 128 desenhos e diff aprovados. Pé agachado varia 1,5 px no atlas. Implementação enviada em `54f0c48c86af270c1aaa478c87d93ed12a449dbb`, com [CI 40419807824](https://github.com/feittosaa/close-combat/actions/runs/40419807824) aprovada. Remoto auditado: development permanece `a5930d901654feb419570ff642acc6025d20daed`, main `77a4c939c9ccdf028eed5f334132f65368dbae30`; nenhum merge ou tag. Este fechamento documental terá a própria CI conferida antes do relato final. Branch mantida para revisão artística manual.

### Micro pausa em acertos e bloqueios

Branch `codex/feature-hitstop-contato`, baseada em `850ac79` da revisão visual ainda não integrada; preserva esse conjunto para a conferência. Nenhum merge em development autorizado.

- [x] Pausa de contato compartilhada de 5F em hit/block; whiff sem pausa. Separar tempo de combate do relógio do round.
- [x] Preservar pose de impacto, física/stun/recuperação durante a pausa; trades sem soma, reset/KO/time-up tratados.
- [x] Concluir regressões, instalação/build/diff e conferir no jogo acerto, bloqueio e erro.
- [x] Enviar branch e verificar CI remota do commit exato.

Nenhuma imagem ou folha de animação foi alterada. Regressões antigas de recuperação/gravidade agora descontam a pausa de contato, mantendo as mesmas exigências de recuperação integral e trajetória fora do hitstop.

Validação local da micro pausa concluída: npm ci, 183 testes/23 arquivos, build e diff aprovados. Conferência no Fedora por avanço de ticks: hit e bloqueio mantêm cinco ticks com os mesmos pixels/posições/pose; o sexto retoma combate/stun; whiff avança normalmente. Evidências em docs/evidence/hitstop-contato. O relógio é validado separadamente em modo normal, inclusive KO/time-up, sem alterar assets ou clipes. Branch baseada em 850ac79, preservando a revisão visual anterior.

Micro pausa enviada em `fcf38426c5d333694ac054a4141b5a86c14ab20e`, com [CI 40422004102](https://github.com/feittosaa/close-combat/actions/runs/40422004102) aprovada. Sem merge/promoção/tag; development e main preservadas. Este fechamento é apenas documental e sua CI própria será conferida antes do relato final.


</details>

## Documentos específicos retirados do checkout

As fichas, propostas e capturas substituídas não são requisitos gerais. O estado vigente e as pendências foram centralizados acima. As versões anteriores são consultáveis no [checkout anterior à limpeza](https://github.com/feittosaa/close-combat/tree/a027c302ccdf8a58d2a965593dcd452f7a3ee0f1); o conteúdo antigo descartado não está novamente autorizado.
