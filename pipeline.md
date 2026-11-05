# Close Combat — Pipeline

## Validação da branch — 2026-11-04

Instalação reproduzível, 711 testes, build e checagem de diff passaram localmente antes do envio. A instalação informou quatro vulnerabilidades nas dependências. As últimas alterações visuais e suas transições ainda precisam de conferência no jogo; a validação automatizada não constitui aprovação artística.

## Wallpaper do Bob — 2026-11-04

A arte fornecida do Bob foi adicionada à rotação do menu principal, alternando com a da Texas a cada vinte segundos, com movimento horizontal linear alternando entre alinhamento à esquerda e à direita, e fades de saída e entrada de um segundo (troca direta e sem movimento quando reduzido), e à tela de carregamento, que usa o mesmo intervalo, movimento alternado e duração dos fades. O teste direcionado de carregamento passou; a apresentação no menu ainda precisa de conferência visual no jogo.

## Sequências e preparação da Texas — 2026-11-04

Foram adicionadas as sequências `d+2,2` e `4,4,2`, usando os golpes existentes; ambas conectam nos testes dos dois lados. Em `4,4,2`, as preparações são 17, 12 e 10 quadros, acelerando o segundo chute e o tiro; a reação da Texas ao levantamento foi ampliada em 10%, depois 12% e duas vezes mais 2%; a reação a dano aéreo foi reduzida em 6% e a de levantamento depois aumentada em 3%; após o segundo levantamento, a queda usa os quadros aéreos ampliados em 15% e muda para a pose no chão ao aterrissar; o soco forte foi reduzido em 2%; e a pose caída no chão foi ampliada em 140% e depois reduzida em 20% (1,92 vez a escala original). Essas alterações ainda precisam de conferência visual em jogo. O início do primeiro tiro da ultimate foi atrasado em 12 quadros após a preparação, e o áudio da pistola na ultimate e na provocação foi atrasado em seis quadros. O painel de golpes no treino exibiu as duas sequências; a execução em jogo e a escuta do áudio permanecem pendentes. Instalação reproduzível, 707 testes, build e diff passaram localmente.

As três folhas aprovadas foram integradas em resoluções normal e alta: tiro duplo `1+2`, queda e reação aérea ao levantamento. O tiro usa os braços mágicos e efeitos separados e cria dois projéteis simultâneos; seus tempos e dano são provisórios, baseados no tiro leve existente. A queda reaproveita a recuperação anterior. O tiro duplo foi observado no treino, com dois acertos e 40 de dano; posteriormente a escala do corpo nessa animação aumentou 2% e essa alteração ainda precisa de conferência no jogo; os ciclos completos de queda e levantamento ainda precisam de conferência visual em movimento. Instalação reproduzível, 711 testes, build e diff passaram localmente; a instalação informou quatro vulnerabilidades em dependências. As alterações permanecem na branch existente; a validação remota depende da CI após o envio.

## Ações de Rage e dois níveis — 2026-11-04

Rage acumula até 600 pontos em duas barras sobrepostas de 300, azul e vermelha, cada uma dividida em seis partes de 50; o contador de níveis completos de 0 a 2 fica na extremidade externa. Ultimates custam 300 e podem ser repetidas sempre que houver recurso, inclusive fora do treino. O atalho de Rage é configurável: E para P1 e Num7 para P2 por padrão, respeitando mapeamentos já existentes. O histórico de treino registra o novo comando.

Ação de Rage custa 50: sem golpe, recupera um lutador vulnerável no ar; junto de 1 ou 3 prevê golpe leve, e junto de 2 ou 4 prevê golpe pesado. Durante um combo, a tentativa é resolvida quando o adversário inicia o próximo golpe: acerto recupera ambos e encerra o combo, erro aumenta em 20% os danos seguintes desse combo, incluindo o golpe previsto. Uma tentativa pendente ou falha termina com o combo. Testes cobrem os dois lados, comandos, acertos, erros, custo, encerramento da penalidade, limite, repetição de ultimates fora do treino e recuperação em lançamentos e quiques reais.

Instalação reproduzível, 703 testes, build e diff passaram localmente. No treino foram observados os níveis azul e vermelho, os contadores nas extremidades externas e o consumo de 300 pontos de uma ultimate; anteriormente também foram observados duas ultimates consecutivas e o registro de E junto de um golpe; as situações de recuperação e combo breaker foram verificadas por testes de simulação, mas não reproduzidas visualmente no jogo. A avaliação de jogabilidade e artística permanece pendente. Alterações na branch existente, sem novo commit, push ou CI remota; a instalação informou quatro vulnerabilidades nas dependências.

## Seleção de personagens e cores — 2026-11-04

Uma divisória angular escura e estreita, em formato de ampulheta e contornada pelas cores dos jogadores, separa as artes no centro para evitar a junção espelhada; ela foi conferida no jogo com Texas dos dois lados. O menu de seleção usa as quatro artes de fundo fornecidas, alinhadas à esquerda para P1 e espelhadas à direita para o adversário, com a grade de personagens na parte inferior. Os retratos anteriores de corpo inteiro foram preservados a pedido do usuário. Grappler e Puppet continuam disponíveis apenas para visualização. Ao confirmar um lutador, abre-se uma escolha entre as duas cores acima do nome; cada jogador pode definir sua própria cor no PvP. No treino, após escolher seu lutador, o jogador escolhe o adversário e sua cor; em confrontos espelhados, a cor oposta é sugerida por padrão. Nos demais modos individuais o adversário espelhado usa a cor oposta por padrão. A escolha acompanha o personagem e os efeitos durante a luta; o aleatório resolve o lutador antes da escolha de cor.

Instalação reproduzível, 680 testes, build e diff passaram localmente. O menu e a seleção alternativa de Texas para P1 foram observados no treino, com o adversário usando a cor original. A escolha de Bob contra Texas alternativa também foi conferida no treino. A avaliação artística do menu e a conferência visual das demais combinações e efeitos continuam pendentes. Alterações locais na branch existente, sem novo commit, push ou CI remota. A instalação informou quatro vulnerabilidades nas dependências (duas moderadas e duas críticas).

## Laço contra alvo agachado — 2026-11-04

O agarrão de laço `1+3` da Texas passou a ser alto: erra adversários agachados e continua acertando em pé. Sua caixa ativa foi elevada e reduzida na vertical para ficar acima das caixas agachadas de Bob e Texas, mantendo alcance horizontal e carga. Testes cobrem os dois lutadores, ambos os lados, guarda agachada e laço carregado ou sem carga; a caixa ativa foi observada no treino acima de Texas agachada. Instalação reproduzível, 680 testes, build e diff passaram localmente.

## Cores, iluminação e blindagem de ultimate — 2026-11-04

Personagens idênticos usam paletas provisórias no segundo jogador: a camisa oliva de Bob passa a vermelho vibrante; na Texas os tons vermelhos, rosas, magentas e marrons ficam próximos do preto. Tons azuis da Texas alternativa e de seus efeitos passam a roxo, incluindo braços mágicos, tiros, dinamite, explosão e contatos, também na ultimate e no perfect block. A explosão guarda o autor para distinguir Texas espelhadas. A troca atua na imagem inteira por faixa de cor, com transições suaves, e pode alcançar outras partes com tons semelhantes; deve ser revista durante as animações. A iluminação de cada cenário aplica matiz e brilho aos sprites de corpo; no Saloon as chamas adicionam luz de acordo com a posição e o parallax da camada. O sistema usa shader e matriz de cor em WebGL e processamento de quadros em Canvas. As fontes de imagem não foram alteradas.

Enquanto uma ultimate está em execução, acertos, projéteis e agarrões causam metade do dano, arredondada ao inteiro mais próximo, sem interromper a ação ou aplicar lançamento e deslocamento. A preparação cinematográfica continua congelando o combate. Regressões cobrem ambos os lados, lutadores, golpes, agarrões e projéteis.

Instalação reproduzível, 676 testes, build e diff passaram localmente. Texas espelhada foi observada na postura inicial e em um acerto de dinamite no treino em WebGL. A escolha da cor da dinamite, explosão, tiros e bloqueios por autor tem regressão automatizada; o bloqueio roxo e a explosão completa ainda precisam de conferência visual. A revisão artística das paletas e da iluminação em movimento e nos demais cenários continua pendente. Branch aberta, alterações ainda sem commit ou push.

## Correções de efeitos, Saloon e contatos de treino — 2026-11-04

A câmera de escurecimento da apresentação agora ignora também os efeitos criados no quadro atual, após a atualização das imagens de combate. Antes, ela podia desenhar uma cópia pequena dos projéteis e efeitos de contato em outra posição. Os braços espectrais de ataque da Texas permanecem atrás do corpo, conforme sua apresentação original.

A linha de chão do Saloon Retrô foi corrigida de 710 para 750, igual às variantes Dia e Noite; os pés dos dois lutadores foram conferidos apoiados no piso no cenário. Em treino, o evento de contato passa a registrar o dano integral do golpe mesmo com a vida do alvo em zero, enquanto a vida permanece limitada a zero. Assim, o painel de dano e o som de acerto continuam presentes em novos contatos. A variante `heavy_hit_3` começa após 631 ms de silêncio; seu seek passou de 739 ms para 606 ms, preservando o ataque audível da onda.

Instalação reproduzível, 665 testes, build e diff passaram localmente. Um acerto da Texas foi conferido no treino após a correção da câmera; a reprodução visual do projétil e a escuta humana da mixagem do acerto forte seguem pendentes. O piso do Saloon Retrô foi conferido no jogo. A branch permanece aberta para os próximos efeitos.

## Revisão das animações do Shoto — 2026-11-04

O personagem antes exibido como Shoto passou a se chamar Bob, e a Cowboy passou a se chamar Texas; os identificadores internos foram preservados. As 57 folhas high fornecidas para Bob foram conectadas à opção de qualidade alta, com atlas de resolução dupla e escala de exibição preservada, incluindo projéteis e efeito da ultimate. Os testes comparam todos os quadros nas duas qualidades; as dimensões e limites visíveis dos arquivos high foram comparados aos originais. Bob em alta qualidade e os dois nomes foram observados no jogo; a revisão artística e os ciclos completos de todas as animações seguem pendentes. Instalação reproduzível, 662 testes, sete verificações visuais, build e diff passaram localmente. As reduções de recuperação do antiaéreo e do chute fraco agachado da Texas solicitadas anteriormente também fazem parte desta entrega.

A recuperação base do chute fraco agachado da Cowboy (`d+3`) foi reduzida de 20 para 10 quadros; a regra existente de recuperação em ataques bloqueados continua válida. Instalação reproduzível e build passaram; 659 testes passaram e um teste de higiene falhou devido às imagens não rastreadas do Shoto em `src/assets/sprites/characters/shoto/high/`, preservadas. Sem commit ou push nesta alteração.

A recuperação do antiaéreo agachado da Cowboy (`d+2`) foi reduzida de 29 para 23 quadros. Instalação reproduzível e build passaram; 659 testes passaram e um teste de higiene falhou porque encontrou imagens não rastreadas em `src/assets/sprites/characters/shoto/high/`, preservadas como trabalho existente. Sem commit ou push nesta alteração.

O chute potente `3+4` da Cowboy também é um overhead médio: acerta a guarda agachada e é bloqueado em pé. Testes cobrem os dois lados e adversários Shoto e Cowboy. Instalação reproduzível, 660 testes, sete verificações visuais, build e diff passaram localmente. As artes em revisão continuam aguardando avaliação artística e conferência integral em movimento.

O soco forte agachado do Shoto é um overhead de nível médio: acerta a guarda agachada e pode ser bloqueado em pé. O motor usa uma propriedade explícita para essa regra, sem alterar os demais golpes médios. Testes cobrem ambas as guardas e os dois jogadores; instalação reproduzível, 658 testes, build e diff passaram localmente. Sem commit, push ou CI remota.

O soco de uma polegada passou a causar 20 de dano, igual ao soco fraco em pé. O soco fraco agachado passou a atingir baixo: acerta a guarda em pé e pode ser defendido agachado. Os testes conferem dano e defesas dos dois lados. Instalação reproduzível, 656 testes, build e diff passaram localmente. Sem commit, push ou CI remota.

A defesa agachada foi reduzida em 4%; agachamento, soco fraco agachado e chute fraco agachado foram ampliados em 3%. No treino, foram observados os contatos dos dois ataques agachados; a defesa ainda requer conferência visual sob ataque. Instalação reproduzível, 654 testes, sete verificações visuais, build e diff passaram localmente. Sem commit, push ou CI remota.

Regra global de quique: depois que um personagem quica na parede, o próximo combo recebido não pode fazê-lo quicar novamente; a proteção persiste mesmo se ele recuperar o controle antes desse combo e termina quando a reação do combo protegido acaba. Testes cobrem continuação aérea, intervalo neutro, múltiplos acertos, liberação para um quique posterior, reset, ambos os lados e vítimas Shoto e Cowboy. Instalação reproduzível, 654 testes, build e diff passaram localmente. Sem commit, push ou CI remota.

O soco de uma polegada agora começa em pé, estende a mão aberta para a frente com dedos juntos e fecha o punho no primeiro quadro ativo. A caixa de ataque foi reduzida e posicionada junto à mão; os tempos provisórios passaram para preparo 6, atividade 3 e recuperação 40 quadros, mantendo afastamento e quique. A corrida de saída foi refeita com as duas mãos para cima e sem efeitos desenhados; o segundo soco forte foi reduzido em 1%. Testes cobrem o momento do impacto nos dois lados. Instalação reproduzível, 652 testes, sete verificações visuais, build e diff passaram; contato e caixa do soco observados em treino. A corrida completa e a avaliação artística das folhas seguem pendentes. Sem commit, push ou CI remota.

O Shoto recebeu saída após a vitória com corrida assustada em estilo cartoon, após a pose de vitória; o avanço do Arcade espera que ele saia da câmera. A folha usa o turnaround e está em revisão artística. O comando existente `1+2` passou a executar um soco de uma polegada com nova folha, afastamento de 140 unidades em 12 quadros e quique ao alcançar a parede; dano e tempos anteriores preservados, com valores de afastamento provisórios. A receita existente `1,1,1+2` continua usando esse golpe. Testes cobrem o quique e a saída nos dois lados; o soco foi observado em treino. A saída completa e o quique no jogo ainda aguardam conferência visual. Instalação reproduzível, 650 testes, sete verificações visuais, build e diff passaram. Sem commit, push ou CI remota.

A animação de defesa agachada do Shoto foi reduzida em 8%, preservando a arte e as regras de colisão. Instalação reproduzível, 646 testes, sete verificações visuais, build e diff passaram. O treino abriu, mas a pose de bloqueio sob ataque não foi capturada; conferência visual e avaliação artística permanecem pendentes. Sem commit, push ou CI remota.

O primeiro soco forte foi ampliado em 1%; a preparação da ultimate aumentou 2% e o giro diminuiu 1%. A preparação troca quadros a cada 15 quadros de simulação, e giro e vento a cada dois; tempos e dano do golpe foram preservados. A espera com ancinho foi alinhada pelo cabo, com teste visual da estabilidade horizontal. Um segundo levantamento durante o juggle inicia queda acelerada e invulnerável a partir da posição aérea, seguida de recuperação protegida; a simulação testa a descida e a proteção dos dois lados. Instalação reproduzível, 646 testes, sete verificações visuais, build e diff passaram. A ultimate foi observada no treino; a queda e os ciclos completos ainda precisam de conferência visual em movimento e aprovação artística. Sem commit, push ou CI remota.

O segundo soco forte do combo foi refeito para distinguir o braço que golpeia do braço mantido junto ao corpo; a folha preparada está em uso e aguarda avaliação artística. O combo `2,2,2` ficou mais rápido: o segundo e o terceiro socos têm preparação de 10 quadros em vez de 13; primeiro soco, recuperação final e outros combos permanecem com os tempos anteriores. A preparação da ultimate do ancinho foi ampliada em 4%. O giro recebeu uma folha separada de vento em seis quadros, atrás do personagem e com centro transparente, seguindo o estilo dos efeitos de poeira existentes. No treino foi observada a camada de vento durante a ultimate; avaliação artística e continuidade integral dos quadros permanecem pendentes. Instalação reproduzível, 645 testes, seis verificações visuais e build passaram; sem commit, push ou CI remota.

Revisão mais recente: a ultimate padrão do ancinho tem preparação e giro próprios com smear; o botão U e `d,df,f,d,df,f,1` a ativam, enquanto a ultimate dos corvos usa `b,f,b,f,1+2`. O giro aplica dez contatos, totalizando 400 de dano, reduzidos em 20 por acerto anterior no mesmo combo; as duas folhas foram reduzidas em 3%. Novas folhas de socos fortes alternados, reação ao ippon e provocação foram ligadas ao jogo; os dois agarrões usam o ippon e sua vítima é desenhada atrás do atacante durante a projeção. O recorte da entrada do ancinho passou a separar os contornos completos das poses. Também foram ajustados os alcances solicitados, a recuperação das voadoras, as escalas de golpes e reações e o retorno do antiaéreo para a postura escolhida. No Shoto, a sequência iniciada por chute fraco impede a troca para socos, enquanto sequências iniciadas por soco podem passar a chutes; `3,4` usa o mesmo final de `3,3,4`. O lançamento de tomate mantém o movimento e ganhou borrão de movimento.

Instalação reproduzível, 642 testes, seis testes visuais, build e diff passaram localmente; teste adicional cobre a prioridade da vítima. No treino foram observados o agarrão e a prioridade da vítima, a espera com ancinho, a provocação e o giro da ultimate com dez acertos e 400 de dano. A continuidade completa das novas artes e a conferência dos dois lados continuam pendentes de avaliação artística. A instalação apontou quatro vulnerabilidades nas dependências. Sem commit, push ou CI remota.

A animação do antiaéreo agachado foi refeita com o punho de trás subindo em arco e smear na trajetória; a mesma mão permanece no movimento. A folha foi preparada e o contato observado no treino. Instalação reproduzível, 631 testes, seis testes visuais, build e diff passaram localmente. Arte ainda sujeita à avaliação do usuário; sem commit, push ou CI remota.

O primeiro soco fraco foi ampliado em 3% no atlas. O antiaéreo agachado (`d+2`) ganhou animação própria a partir da referência de soco ascendente fornecida, com preparo, braço estendido para cima e retorno ao agachamento; a caixa e os tempos existentes foram preservados. Ambos foram observados no treino, incluindo o contato do antiaéreo com a caixa visível. Instalação reproduzível, 631 testes, seis testes visuais, build e diff passaram. A arte aguarda avaliação do usuário e conferência integral dos dois lados; sem commit, push ou CI remota.

O primeiro soco fraco foi refeito com silhueta mais estreita e altura menor que a espera; o soco forte ganhou folha nova de gancho baseada no idle normal, usada tanto isoladamente quanto no final de 1,1,2. A recuperação não recebe mais a ampliação extra, preservando o tempo do golpe. No treino foram observados o soco leve, o contato e a recuperação do gancho com caixas visíveis. npm ci, 630 testes, seis testes visuais, build e diff passaram localmente; ambas as folhas aguardam avaliação artística, e a conferência integral em ambos os lados segue pendente. Sem commit, push ou CI remota.

Revisão de colisão e transições: os chutes fraco, forte e potente em pé tiveram as caixas ativas elevadas para a altura das pernas nas poses de contato; a caixa do tomate forte passou a ter o mesmo tamanho e altura central do fraco. As demais caixas ainda exigem revisão quadro a quadro, incluindo windmill, voadoras, corvos e ambos os lados. Criada a entrada na caminhada a partir do turnaround; saídas de guarda e agachamento usam quadros existentes em sequência reversa. A comparação com Cowboy identificou ausências de arte própria para antiaéreo agachado e segundo agarrão, além de transições de recuo, giro, salto e provocação ainda pendentes. A arte gerada permanece em revisão.

Voadoras fraca e forte, continuação da fraca e os dois chutes aéreos especiais estão imunes a projéteis durante o golpe inteiro. A invulnerabilidade geral anterior do chute aéreo forte permanece até o quadro 20; os demais não ficam imunes a ataques físicos. Testes cobrem início, atividade e recuperação dos dois lados. npm ci, 630 testes, cinco testes visuais e build passaram; chute forte observado no treino com caixa exibida. Conferência completa no jogo, revisão de todas as colisões e aprovação artística seguem pendentes. Sem commit, push ou CI remota. A instalação apontou quatro vulnerabilidades nas dependências.

O primeiro soco fraco foi regenerado com silhueta mais larga a partir do turnaround e preparado no atlas existente. Golpes defendidos permitem continuação e cancelamento manual em especiais, sem estender a defesa; a restrição entre soco e chute fracos aplica-se apenas ao Shoto. Os encerramentos de 1,1,1 e 2,2,2 também valem na defesa. Testes locais cobrem os dois lados e ambos os personagens; o novo soco foi carregado e observado no treino. Arte sujeita à avaliação do usuário; sem commit, push ou CI remota.

Revisão de combate e animações: primeiro agarrão (`1+3`) usa novo ippon com smear, captura, projeção aérea e queda da vítima; direção de arremesso continua selecionável. Socos leves em pé e último chute do 3,3,4 regenerados com o turnaround; corrigida a cabeça da recuperação do gancho e antecipado o recolhimento visual do braço, mantendo a recuperação do golpe. Escalas de socos, salto, especiais, chute agachado, reação aérea e queda foram ajustadas. Arremesso de tomate reproduz seis quadros 20% mais rápido e mantém os dados do projétil; espera normal ancorada pelo pé de apoio. A caixa ativa do soco forte foi ajustada para o gancho.

Golpes básicos, agachados e potentes confirmados podem ser cancelados por comando manual em especiais, inclusive durante e ao término de combos; testes cobrem dinamite, afastamento e tomates dos dois lados. No Shoto, sequências iniciadas com um golpe fraco não trocam entre soco e chute fracos; 1,1,1 e 2,2,2 encerram continuações comuns, mas permitem o especial solicitado. Recuperação confirmada de 1,1,1 aumentada para 20 quadros; 2,2,2 mantém 30. A verificação visual automatizada agora também mede a estabilidade horizontal do pé na espera. O ippon foi observado em treino com smear e vítima em projeção; o ciclo completo, ambos os lados, novas cores e demais animações ainda requerem avaliação artística. npm ci, 618 testes, cinco testes visuais, build e diff passaram localmente; sem commit, push ou CI remota.

Revisão atual: novos socos leves em pé e com silhueta mais larga, rasteiro e agachamento refeitos com a referência canônica; ambos os socos fortes usam o mesmo gancho corrigido, com recuperação redimensionada. Criada espera normal sem ancinho e, após 600 quadros neutros, transição de 30 quadros para a espera com ancinho; ações reiniciam a contagem. Alteradas escalas solicitadas de salto, chutes aéreos, tomate, reações e queda. O salto sobe cerca de 15% mais; caixas do salto, chute aéreo forte e voadoras foram ajustadas. Acertos aéreos comuns imprimem velocidade vertical de pelo menos -2,5 quando necessário para elevar o alvo, preservando golpes de lançamento próprios. O arremesso do tomate usa os seis quadros distribuídos uniformemente e a folha intercalada que causava piscar foi removida.

Adicionado `npm run test:visual`, com verificações geométricas dos atlas do Shoto usando Pillow: quadros presentes e sem cortes, alinhamento dos pés, altura da recuperação do gancho e pose compacta do salto. Esses testes não comparam capturas do jogo nem aprovam qualidade artística. Esperas e recuperação do soco forte observadas no treino; revisão visual integral das novas animações, transições e colisões em ambos os lados permanece pendente. Instalação reproduzível, 616 testes, quatro testes visuais, build e diff passaram localmente; sem commit, push ou CI remota.

O segundo gancho gerado foi confirmado como atlas ativo do final de 1,1,2. A folha do salto foi refeita com joelhos recolhidos durante o voo e ancorada nos seis quadros; a pose aérea foi observada no treino com caixas visíveis. Revisão artística e conferência do ciclo completo e dos dois lados permanecem pendentes. npm ci, 610 testes, build e diff passaram localmente; sem commit, push ou CI remota.

Revisão adicional: o quadro de impacto do launcher de 1,1,2 foi redesenhado para manter o mesmo braço do quadro anterior; salto regenerado com proporções coerentes. As duas animações de soco leve e as duas do arremesso de tomate foram reduzidas em 3%; a pose final da recuperação do primeiro chute leve foi reduzida mais 3%, e a folha compartilhada pelas voadoras, 2%. O novo salto foi observado no treino; a continuidade completa do launcher e dos demais ciclos ainda requer conferência em movimento e avaliação artística. npm ci, 610 testes, build e diff passaram localmente; sem commit, push ou CI remota.

Nova revisão de movimento: dashes do Shoto passam de 24 para 18 quadros, com velocidade compensada para conservar a distância; salto sobe mais. Voadoras fraca e forte sobem e avançam mais, usando pose de recuperação em pé ao tocar o chão. Os dois chutes especiais aéreos têm lançamento mais alto, gravidade reduzida e startup/atividade/recuperação menores; valores são provisórios. Ajustadas as escalas solicitadas de espera, salto, rasteiro, socos, voadora e especiais. Um novo atlas de uppercut com smear é selecionado exclusivamente no terceiro golpe de 1,1,2; a arte permanece em revisão. Salto observado no treino; os ciclos de voadora, especiais e launcher em ambos os lados ainda requerem conferência visual completa e aprovação artística. npm ci, 610 testes, build e diff passaram localmente; sem commit, push ou CI remota.

Nova revisão: rasteiro forte e segundo soco leve refeitos, este usando o outro braço; defesa aérea refeita e animada, com bloqueio aéreo já existente confirmado nos testes dos dois lados. Criadas reações no chão para contatos altos e baixos, além da reação média existente; reações aéreas continuam próprias. Escalas de espera, salto, recuperação do primeiro chute fraco, dano, queda, socos e defesas ajustadas conforme pedido; defesa agachada espelhada. Os atlas foram preparados e inspecionados; no treino foram observados o rasteiro forte em contato e uma reação. Ciclos completos, ambos os lados e transições ainda dependem de revisão visual e aprovação artística. npm ci, 607 testes, build e diff passaram localmente; sem commit, push ou CI remota.

Ajustes posteriores: escalas de locomoção, agachamento, ataques, reações, dash, especiais e ultimate revistas; soco aéreo fraco reduzido em 20%. As artes do antiaéreo agachado e do atacante nos agarrões foram retiradas a pedido, mantendo os golpes com representação geométrica provisória até serem refeitas. Reações reiniciam a cada novo hit, e golpes agachados retornam à pose agachada. Shoto usa as três zonas de contato da Cowboy contra golpes comuns; agarrões mantêm a caixa anterior. Caixas dos chutes aéreos foram ajustadas e as voadoras iniciam 2 quadros antes e avançam 10% mais por quadro, com valores provisórios. O treino abriu e foi observado um acerto de soco agachado com as zonas exibidas; a revisão completa de ciclos e colisões em ambos os lados ainda é necessária. Instalação reproduzível e 606 testes passaram; build e diff verificados localmente. As artes seguem sem aprovação final; alterações locais sem commit, push ou CI remota.

O usuário pediu uma nova revisão das artes e substituiu a joelhada e o Superman por voadoras `b,bd,d,df,f,3/4`. A versão fraca aceita mais um `3` durante o voo; a forte não possui essa continuação. Valores de movimento e dano são provisórios. O soco forte é um uppercut, os três socos leves alternam os braços, e salto, dash para trás, chutes forte em pé e no ar, primeiro chute fraco e levantamento foram regenerados. A voadora usa a referência recebida, aponta para a frente e contém smear. A espera foi ancorada pelo pé; caminhada, dash, reações e outros golpes receberam os ajustes de escala solicitados. Essas imagens permanecem em revisão artística.

O tomate foi regenerado com rotação e smear alongado, usando o mesmo tamanho visual nas duas versões; suas velocidades horizontais aumentaram 10% e ambas as trajetórias formam arcos. O efeito de contato foi recortado em quadros individuais e realinhado. A revoada passou a emitir 12 corvos, alguns simultâneos, em alturas variadas; cada desenho de corvo foi reduzido em 40%, com dano provisório de 30 por contato. As caixas de colisão anteriores foram preservadas. No treino, foram observados o tomate em voo, a voadora fraca e a revoada com mais de um corvo. As demais ações, a continuação em jogo, espelhamento, transições e proporção visual das caixas dos projéteis ainda requerem revisão; em especial, a caixa dos corvos é maior que o novo desenho. Testes locais cobrem as voadoras dos dois lados, reentrada da fraca após acerto e erro, e emissão simultânea dos corvos. Instalação reproduzível, 604 testes, build e diff passaram localmente; a instalação apontou quatro vulnerabilidades. Sem commit, push ou CI remota.

## Sprites do Shoto — trabalho em andamento — 2026-11-03

O usuário forneceu um novo turnaround de espantalho e referências individuais em `Pictures/projects/close combat/characters/sprites/shoto`. As propostas em revisão estão relacionadas em `assets/art/characters/shoto/revisao.json`. Espera, locomoção, defesas, todos os golpes do catálogo, queda, levantamento, reações, provocação, vitória, derrota e ultimate possuem atlas e seleção provisória; o ancinho tem uma transição curta desenhada. As escalas e âncoras dos quadros preparados foram ajustadas em relação à altura e à posição das caixas existentes, sem mudar as colisões. Espera nos dois lados, agachamento, preparação do agarrão e contato do soco agachado de P1 foram observados no treino com as caixas visíveis. Uma comparação inicial revelou agarrão e reações aéreas 25% maiores, corrigidos antes da segunda conferência. Os demais ciclos, transições e lados ainda requerem conferência em movimento. Instalação reproduzível, 602 testes, build e diff passaram localmente; a instalação informou quatro vulnerabilidades nas dependências. As imagens ainda não foram aprovadas artisticamente.

O usuário esclareceu que `light_kick_combo` é sempre o primeiro `3`, `punch_combo_112` é o segundo soco de qualquer sequência iniciada em `1,1`, `anti_air` é `d+2`, `throw` é arremesso de tomate e `superman` é golpe de avanço imune a projéteis. Comandos: tomate fraco `d,df,f,1`, forte `d,df,f,2`; Superman `b,bd,d,df,f,2`. Os tomates substituem os projéteis de vinho preservando inicialmente velocidade, dano, tempos, trajetória e colisões como valores provisórios. O Superman e o combo `3,3,4` foram definidos com valores provisórios em referência à Cowboy, conforme autorizado; o segundo `3` e o `4` devem girar em windmill, um golpe por entrada. O usuário pediu smear principalmente no tomate e break dance, além de antecipação, elasticidade e acompanhamento quando úteis. Caminhada, recuo, reação e vitória foram gerados a partir do turnaround com autorização para as poses sem referência.

Na conferência do primeiro `3`, a bota ativa apareceu na altura da cabeça enquanto a caixa ativa permanece na altura do tronco. O quadro de contato foi redesenhado e observado em câmera lenta com a perna na altura da caixa, sem alterar a geometria; as continuações do windmill também precisam dessa conferência visual.

A ultimate antiga foi substituída provisoriamente: o Shoto sobe no ancinho e observa o adversário enquanto corvos atravessam a tela a alturas diferentes, saindo do lado do autor. O comando anterior foi preservado e o usuário autorizou valores provisórios. Testes cobrem ativação e emissão nos dois lados; em treino foram observados a apresentação, um corvo em contato e a sequência de seis acertos com 360 de dano provisório. Passagem pelas bordas, bloqueios, lado oposto e ciclo completo ainda requerem conferência em jogo. Alterações locais sem commit, push ou CI remota.

## Fluxo de trabalho — 2026-11-03

O workflow de CI e seu manifesto foram removidos do checkout. Branches, commits e pushes dependem de pedido explícito; commits e pushes diretamente em `main` ou `development` são proibidos. As referências anteriores a CI nesta pipeline registram o histórico e não representam exigências atuais. A remoção no remoto depende de envio autorizado; configurações de proteção do GitHub não foram verificadas nem alteradas.

## Proposta de parry da Cowboy — 2026-11-03

A defesa em pé aumentou mais 1% de escala. Os braços mágicos em pé foram ampliados em 5% e são reutilizados na defesa aérea, com deslocamento vertical para acompanhar a pose; os braços agachados aumentaram 2% e foram deslocados 25 unidades para baixo, aproximando as pontas do chão. A arte aérea de braços que deixou de ser usada foi retirada. O relato anterior de efeitos em miniatura continua sem reprodução e correção confirmadas.

A defesa em pé aumentou mais 1% de escala. Os braços mágicos para as defesas em pé, agachada e aérea e a animação corporal de defesa aérea foram aprovados e integrados nas versões normal e high. Os braços aparecem na frente da personagem, acompanham sua direção e usam quadros de entrada e saída; a defesa aérea tem sua própria animação corporal. As defesas em pé e agachada foram observadas no treino; a defesa aérea e a qualidade high ainda precisam de conferência visual em combate. Testes cobrem seleção, ordem das camadas, espelhamento e saída para os dois jogadores. Instalação reproduzível, 604 testes, build e diff passaram.

A escala da defesa em pé da Cowboy aumentou 5% e a do perfect parry aumentou 2%, em relação aos valores anteriores. A defesa em pé foi observada no treino; o perfect parry ainda requer conferência visual. Instalação reproduzível, 602 testes, build e diff passaram.

Após a rejeição das folhas anteriores, foram geradas novas propostas de defesa e parry com a imagem do jogo fornecida pelo usuário como referência de proporções. O usuário forneceu as versões ampliadas em Downloads; as folhas comuns e high foram integradas com alinhamento técnico dos pés. Foi corrigido o piscar na saída da guarda em qualidade alta: os três últimos quadros estavam fora dos limites descritos pelo atlas. A nova folha respeita a grade do atlas, sem alteração de cores; um teste verifica os limites e dimensões dos atlas de guarda e perfect block. Guarda e retorno ao neutro foram observados em treino em qualidade alta; a transição de perfect block ainda requer conferência visual. Instalação reproduzível, 602 testes, build e diff passaram.

O usuário aprovou as novas artes de defesa em pé e perfect parry geradas a partir do turnaround e forneceu as versões ampliadas em Downloads. As quatro folhas foram integradas com alinhamento técnico uniforme dos pés e cores originais; a guarda normal foi observada no treino, enquanto o perfect parry ainda precisa de conferência visual em combate. A escala dos dashes terrestres da Cowboy foi reduzida em 3% e a do dash aéreo para trás em 2%; a conferência visual dos dashes continua pendente. Instalação reproduzível, 600 testes, build e diff passaram.

A solicitação de corrigir a cabeça desproporcional refere-se à defesa normal em pé, conforme esclarecido pelo usuário; a proposta anterior de alterar o parry não deve substituir a animação ativa. A folha de seis poses foi aprovada e integrada, com a versão high fornecida em Downloads e alinhamento técnico dos pés; o bloqueio em pé foi observado no treino. A escala da defesa agachada foi reduzida em 1% e a do perfect block em 2%, sem substituir suas artes. O novo brilho do perfect block, baseado na imagem enviada pelo usuário, foi aprovado e substituiu o efeito anterior; seus seis quadros foram conferidos e testes cobrem seu posicionamento. Instalação reproduzível, 600 testes, build e diff passaram. A apresentação do perfect block em combate ainda precisa de conferência visual.

A guarda em pé e agachada recebeu mais 2% de escala. A proposta de quatro poses para perfect block com desvio pela mão foi aprovada pelo usuário e integrada em qualidade normal e alta a partir das duas imagens em Downloads; os pés foram alinhados tecnicamente sem recoloração. Um novo efeito branco com brilho, desenhado para o ponto de contato, substitui as duas imagens de perfect block anteriores; os bloqueios comuns continuam cobrindo o corpo. Testes verificam seleção, posição e tamanho do efeito. Instalação reproduzível, 600 testes, build e diff passaram. No treino, um golpe da Cowboy foi reproduzido; não foi possível acionar o perfect block durante a inspeção. A aparência da nova animação e do efeito em jogo ainda requer conferência, assim como a origem das miniaturas relatadas pelo usuário.

## Ajustes de ultimate, chamas e Cowboy — 2026-11-03

O relógio permanece parado durante a ativação e a execução da ultimate, incluindo projéteis, captura, isqueiro pendente e explosão, e volta ao terminar a sequência. O áudio `push_hit_3` foi retirado do jogo. A escala das poses de guarda e perfect block da Cowboy aumentou 2%, e a caminhada para trás diminuiu 1%. Os quadros das chamas foram alinhados horizontalmente pela base, sem alteração de cores. Instalação reproduzível, 600 testes, build e diff passaram. A sala de treino foi aberta no jogo; a verificação visual das poses e do ciclo das chamas ainda está pendente. O relato de efeitos de tiro e acerto em miniatura ao fundo ainda não foi reproduzido nem corrigido e permanece em investigação. A branch anterior foi enviada em `1e141ca`; estas alterações ainda aguardam envio e CI.

## Chamas, sincronia e conferência em jogo — 2026-11-03

As lanternas dos três Saloons usam seis quadros transparentes em resolução maior, posicionados individualmente; cópias laterais de camadas pequenas acompanham o espelhamento das posições do cenário. O Saloon Dia foi observado em jogo e as três variantes foram comparadas com as imagens de base. Efeitos de impacto, passos, laço, dash aéreo, disparos e agarrão tiveram seus picos medidos e os casos com início atrasado foram alinhados por seek. Na sala de treino, foi observado o alvo no ar após o laço junto à parede; testes cobrem o retorno e o novo combo nos dois lados. Instalação reproduzível, 600 testes, build e diff passaram localmente. A avaliação artística dos três cenários e a escuta da mixagem permanecem pendentes; CI remota ainda não verificada.

## Distância do quique e sons da Cowboy — 2026-11-03

O retorno do quique agora busca uma distância de corpo mais 40 unidades, em vez de 10, sem afastar um alvo que já esteja mais próximo. O erro do laço toca ao terminar a fase ativa sem captura, com seek de 415 ms alinhado ao pico medido; o ataque 3 toca heavy step no início da fase ativa e o fim do dash terrestre da Cowboy também usa heavy step. As três primeiras variações do passo forte usam seek para aproximar seus picos do evento. Os testes cobrem o erro sem captura, os passos e a continuação após o quique nos dois lados. Instalação reproduzível, 600 testes, build e diff passaram localmente. A escuta e o ritmo em jogo ainda precisam de avaliação; sem novo commit, push ou CI remota.

## Retorno do quique — 2026-11-03

Após tocar a parede física, o alvo retorna durante 25 quadros até uma distância de corpo mais 10 unidades à frente do atacante; a distância é calculada no instante do impacto e não desloca o atacante. A gravidade inicial do quique passou de 80% para 65% da gravidade inicial de juggle. Os testes cobrem os dois lados, o chute e o laço, posição à frente, alvo ainda no ar e continuação como combo novo. Instalação reproduzível, 598 testes, build e diff passaram localmente. A trajetória e o ritmo ainda precisam de conferência visual no jogo; sem novo commit, push ou CI remota.

## Ponto de contato do quique — 2026-11-03

Ao atingir a parede física, a transição da caixa de queda para o corpo aéreo posiciona o contato a 1% da largura visível da parede, sem mover o oponente; o quique só ocorre se essa posição conservar ambos no limite de afastamento. O chute e o laço foram verificados nos dois lados por teste, incluindo a distância do efeito à parede. Instalação reproduzível, 598 testes, build e diff passaram. A aparência e a continuidade do deslocamento ainda precisam de conferência em jogo; sem novo commit, push ou CI remota.

## Quique apenas na parede do cenário — 2026-11-03

O quique exige que o movimento alcance a parede física da arena e que o alvo esteja nessa parede após a resolução de limites. O limite de afastamento da câmera no meio do cenário não dispara quique nem arrasta o atacante; isso substitui a regra anterior que também permitia quicar no limite visível. Os testes cobrem os dois lados, o afastamento e o laço, além da parede física e do golpe letal. Instalação reproduzível, 598 testes, build e diff passaram localmente. A conferência visual do contato e da distância até a borda no jogo permanece pendente; sem novo commit, push ou CI remota.

## Ajustes de rounds, HUD e cenário — 2026-11-03

A pausa entre rounds não decisivos foi ajustada a 120 quadros, seguida do reinício dos lutadores e um segundo de preparação antes do READY. O fim da luta preserva tempo para a apresentação final. O áudio do dash terrestre foi removido; o aéreo permanece. Os retratos do HUD foram ampliados e os trilhos de vida afastados dos retratos. Durante o resultado, os quadros do cenário e dos lutadores usam o instante do fim do round; a Cowboy já em knockdown mantém a pose congelada, enquanto a animação final própria continua disponível para quem estava em pé. As nuvens da Fazenda oscilam horizontalmente e suas cópias não são espelhadas. Foram medidos os picos de energia das ondas de áudio; a comparação com os eventos e a correção da sincronia ainda não foram concluídas. A substituição e o alinhamento das chamas do Saloon também permanecem pendentes: a imagem gerada ainda não foi integrada. Os 598 testes e o build passaram; mudanças visuais e de timing aguardam conferência no jogo. Sem novo commit, push ou CI remota.

## Conferência dos resultados por tempo — 2026-11-03

Um teste integra a simulação real às apresentações dos três temas e verifica TIMEOUT, ROUND WIN e VICTORY ao longo de dois rounds vencidos por tempo. Os 597 testes e o build passaram; a observação visual direta das telas transitórias nesse percurso continua pendente. Sem novo commit, push ou CI remota.

## Chamas do Saloon — 2026-11-03

As chamas das três variantes foram ampliadas de 1,25× para 1,5× e ancoradas próximas à base, com compensação vertical para preservar a posição nas luminárias. O Saloon Dia foi conferido no jogo; a avaliação visual do ciclo completo, das bordas e das outras variantes permanece pendente. Instalação reproduzível, 594 testes, build e diff passaram localmente; sem novo commit, push ou CI remota.

## Ajustes de ultimate, áudio, quique e Saloon — 2026-11-03

A moldura da ultimate preenche as quatro bordas da área visível sem recortar a imagem, com 90% de opacidade e personagens/HUD acima; sua proporção acompanha a janela. Foi conferida no Saloon em 16:9 e na sala de treino em 21:9; proporções adicionais são cobertas por teste automatizado e ainda precisam de conferência visual. O movimento horizontal da moldura da Fazenda foi retirado para manter as bordas alinhadas. As chamas das três versões do Saloon usam recortes individuais, reposicionados para suas luminárias e ampliados em 25%; as três versões foram observadas no jogo, mas o ciclo completo e as bordas dos cenários ainda precisam de avaliação.

Os volumes dos dashes terrestres e aéreos foram reduzidos para 20% do anterior. Os novos arquivos da pasta de efeitos foram sincronizados; agarrões, arremessos e rasteira da Cowboy usam os respectivos sons. Espada, agarrão giratório, chefe e timeout adicional foram carregados sem associá-los a ações inexistentes ou ambíguas. A mixagem e a sincronia ainda precisam de conferência auditiva no jogo.

As versões 2× fornecidas de perfect block, quique e saída da Cowboy foram adicionadas à qualidade alta, com atlas de quatro quadros. Após quicar, o alvo sobe com velocidade inicial de -8 e usa 80% da gravidade de juggle inicial; o atacante recupera até quatro quadros após a atividade do golpe responsável, e a string, o histórico do combo ativo e os comandos pendentes anteriores são reiniciados. Testes cobrem ambos os jogadores, afastamento e laço, um novo acerto e o reinício da contagem. O ritmo e as versões high ainda precisam ser conferidos em movimento no jogo.

Instalação reproduzível, 594 testes em 44 arquivos, build e diff passaram localmente. A instalação informa quatro vulnerabilidades das dependências (duas moderadas e duas críticas). Alterações locais na branch `codex/feature-menus-audio`, sem novo commit, push ou CI remota; sem integração autorizada.

## Encerramento, quique na parede e áudio — 2026-11-02

A vida zerada não encerra o round enquanto a reação confirmada, um combo, uma ultimate ou o deslocamento pendente de quique ainda está em andamento. Acertos posteriores a zero continuam contando para o combo. O intervalo de resultado dura 300 quadros; ROUND WIN ou ROUND LOSE aparecem nos rounds intermediários. No round decisivo, VICTORY ou LOSE antecedem a animação existente de vitória ou derrota; a Cowboy usa a saída de cena de quatro poses aprovada após sua animação de vitória. A folha de saída possui versão high fornecida posteriormente. No Arcade, a opção de avançar só é habilitada após a Cowboy vencedora sair da área visível, inclusive quando precisa pousar primeiro; o estado de combate não é deslocado. As poses de perfect block e quique da Cowboy foram aprovadas e suas folhas comuns foram integradas: o perfect block em pé usa a nova pose e a defesa agachada conserva sua pose própria; o quique usa a nova sequência no ar e cede lugar a uma reação de acerto posterior. As duas folhas também possuem versões high fornecidas posteriormente. No treino em 25% de velocidade, foram observados o perfect block em pé e a sequência aérea do quique após o laço, com o impacto na borda. A avaliação artística e a continuidade completa dos quadros permanecem pendentes. As três folhas preparadas sem versão high foram copiadas para `/home/feit/Downloads/cowboy-animacoes-sem-high`. Após a integração, instalação reproduzível, 593 testes, build e diff passaram; No Saloon Dia, foram observados ROUND LOSE, a passagem ao segundo round e a pose de vitória final da Cowboy adversária seguida de sua saída da tela; ainda falta avaliar a continuidade das poses em movimento e a saída como jogadora 1. Na Fazenda, uma partida por tempo chegou à vitória da jogadora 1 e ela saiu da tela; o texto transitório e a continuidade em movimento ainda precisam ser observados. Sem commit ou push nesta revisão. As artes de resultado foram geradas para os três temas e copiadas à pasta de efeitos indicada. A ultimate preserva a proporção e as bordas com fundo preto, mantendo personagens e HUD por cima.

O afastamento d,df,f,4 e o arremesso de laço 1+3 da Cowboy podem lançar a vítima de volta ao ar ao tocar a parede física ou o limite visível, sem deslocar o atacante parado; o impacto usa imagem própria. Cobertura automatizada inclui os dois jogadores, ambos os golpes, limite de tela e golpe letal. No treino foram observados a moldura inteira da ultimate com personagens e HUD por cima e a vítima no ar após o laço; as ultimates da Fazenda e do Saloon também foram observadas no jogo com essas camadas; falta verificar visualmente todo o quique, os resultados em todos os cenários e ambos os lados. O timing e a arte aguardam avaliação do usuário.

A pasta de áudio fornecida foi comparada com o jogo: adicionados sons de dash no chão e no ar, erro de laço, rage pronta, início e round final, vitória e derrota, terceira variação de empurrão e atualização da ativação da ultimate. Sons de espada e outras ações sem correspondência inequívoca não foram associados; conferência auditiva no jogo ainda pendente. Instalação reproduzível, 586 testes, build e diff aprovados localmente. Branch ativa `codex/feature-menus-audio`, sem commit ou push destes ajustes e sem CI remota; sem integração autorizada.

## Apresentações dos cenários e sala HD — 2026-11-02

Saloon, Fazenda e sala de treino têm artes próprias de Ready, Fight, Victory, Lose, Timeout e Ultimate; as três variantes do Saloon compartilham sua identidade. Resultados usam a perspectiva do jogador 1; quando o tempo acaba, Timeout precede Victory ou Lose. As ultimates preservam os personagens e a interface acima da imagem, com bola de feno girando no Saloon e movimento de vento na Fazenda. As imagens usadas foram copiadas para `scenarios/effects` na pasta indicada pelo usuário, organizadas por cenário. A sala de treino usa a imagem HD fornecida na qualidade alta. Ready foi observado no jogo no treino e na Fazenda; na sala de treino também foram observados FIGHT no segundo round e ROUND LOSE no encerramento do primeiro, com a camada escura atrás do texto. A luta começou depois da apresentação. Um teste verifica que LOSE fica acima do escurecimento de 20% e que ambos desaparecem ao iniciar a pose final. Na sala de treino, na Fazenda e no Saloon Dia, a tela LOSE foi observada diretamente, seguida pelas poses de derrota e vitória e pela saída da vencedora. O carregamento inicial também foi observado no navegador com a indicação de preparação. Em PvP na Fazenda, uma vantagem de vida levou corretamente à vitória de P1 por tempo; a captura começou após os PNGs transitórios, que ainda precisam de observação direta nesse percurso. Instalação reproduzível, 594 testes, build e diff passaram nesta conferência. As 24 imagens de texto e ultimate dos três temas foram comparadas por conteúdo com as cópias em `scenarios/effects`. As molduras de ultimate foram observadas no jogo nos três temas, com lutadores e HUD acima; no Saloon também apareceu a bola de feno. Resultados de todos os temas, versões HD e ciclos completos de animação ainda aguardam conferência visual. Instalação reproduzível, 573 testes, build e diff aprovados localmente; sem commit, push ou CI remota.

## Sala de treino e encadeamento da Cowboy — 2026-11-02

A sala de treino usa a nova arte branca aprovada, sem as linhas superiores das paredes, e bandeiras em quatro quadros separados. A sala foi elevada em 40 pixels de referência e conferida no treino com os personagens em pé; a animação nas extremidades e os saltos ainda precisam de conferência visual. A Cowboy pode passar de um, dois ou três chutes fracos confirmados à sequência de tiros, sem reiniciar o chute já usado no mesmo combo; o soco fraco também não pode ser retomado depois de deixado. Os testes cobrem os dois jogadores, retorno ao neutro e as três extensões. Instalação reproduzível anterior, 567 testes, build e diff aprovados localmente; alterações locais sem commit, push ou CI remota.

## Apresentação de luta e carregamento — em andamento — 2026-11-02

O Saloon recebeu artes PNG próprias de Ready, Fight e Victory, com entrada e saída animadas; a preparação segura a simulação até a chamada de luta terminar. A apresentação é compartilhada pelas três versões do Saloon. O intervalo entre rounds agora é de 300 quadros; enquanto os textos aparecem, uma camada preta de até 20% cobre a tela atrás deles. As ultimates usam imagens próprias de cada cenário, com 90% de opacidade durante a preparação, acima do cenário e abaixo dos personagens e da interface. O carregamento inicial usa imagens de `assets/art/wallpapers`; a pedido do usuário, somente a arte da Cowboy permanece na pasta. Ready foi conferido no jogo para treino e Fazenda; as demais apresentações e as ultimates ainda precisam de conferência visual completa. A instalação, os 565 testes, o build e a checagem do diff passaram localmente. Alterações locais sem commit, push, CI remota ou aprovação artística.

A exibição do wallpaper e a remoção da tela ao final do carregamento foram verificadas por teste automatizado. A sessão do navegador foi encerrada durante a tentativa de conferir a ultimate e a vitória no jogo; essas conferências visuais permanecem pendentes.

## Cenários — em andamento — 2026-11-02

O Saloon possui variantes Retrô, Dia e Noite; as duas novas usam os arquivos normais e HD fornecidos e compartilham os quadros de chamas, recortados e posicionados individualmente. A Fazenda usa uma base gerada a partir da referência completa, sua versão HD fornecida em Downloads e camadas geradas separadas para céu, fumaça e sombra. A versão HD foi conferida no jogo em uma luta Arcade. A fumaça foi elevada para a chaminé; o céu acompanha a câmera sem paralaxe e suas nuvens avançam linearmente, com cópias sem espelhamento. O chão de cada cenário segue a linha de apoio de sua imagem, sem mudança de colisões; as variantes Dia e Noite foram elevadas em 40 pixels de referência, preservando a posição do Retrô. Fazenda e Saloons de dia e noite foram conferidos no jogo em qualidade normal, incluindo a nova base da Fazenda e as alturas ajustadas dos dois Saloons; falta conferir a versão HD, o ciclo completo das animações e a aprovação artística da base e das camadas geradas. Instalação reproduzível, testes e build passaram localmente. Alterações locais, sem commit, push ou CI remota.

## Efeitos de contato — em andamento — 2026-11-02

O usuário descartou as últimas 11 propostas e solicitou implementar as anteriores provisoriamente para testar. Dezesseis folhas anteriores foram conectadas como spritesheets de seis quadros: três de acerto, três de bloqueio, duas de defesa perfeita e pares de acerto/bloqueio para azul, vinho, laranja e verde. As cores são originais dos arquivos, sem filtros ou recoloração no jogo. As 11 descartadas não foram copiadas ao projeto. A escolha é provisória para avaliação do usuário e não representa aprovação artística final.

Trabalho na branch `codex/feature-menus-audio`: acertos ficam concentrados no ponto de contato e bloqueios são posicionados à frente do corpo. Golpes físicos usam cinza e projéteis especiais recebem cores de acordo com sua apresentação. Contatos simultâneos são preservados. As folhas antigas de impacto e bloqueio, substituídas e sem consumidores, foram retiradas.

As imagens foram verificadas no treino em um acerto e um bloqueio; a avaliação de todas as variações e da animação pelo usuário permanece pendente. A altura da defesa usa a postura da vítima no contato, inclusive quando ela cai em seguida. Instalação reproduzível, testes, build e diff passaram localmente. As alterações permanecem locais para teste; sem commit, push ou CI remota nesta revisão.

Os efeitos de contato foram reduzidos em 25%. A pedido do usuário, as sete folhas de acerto mais angulares já geradas substituíram provisoriamente as anteriores; os bloqueios foram mantidos. Um acerto foi conferido no treino. As folhas ainda apresentam elementos próximos de contornos e estrelas, e algumas têm quadros irregulares; a avaliação visual de todas as variantes e a aprovação artística permanecem pendentes.

O recorte do acerto forte foi alinhado aos cinco desenhos existentes e completado com um quadro transparente, preservando as cores; o golpe forte foi conferido no treino. A aprovação visual final continua pendente.

Os efeitos de acerto e bloqueio receberam redução adicional de 20% sobre o tamanho anterior; a avaliação visual do usuário continua pendente.

## Menus e áudio — 2026-11-02

Branch `codex/feature-menus-audio` criada a partir de `origin/development` para o trabalho de menus e áudio. Primeiro ajuste: o som de aterrissagem continua acionado no contato com o chão, mas as três variantes começam cerca de 25 ms antes dos picos medidos (0,300 s, 0,411 s e 0,535 s), sem modificar os arquivos originais. Instalação reproduzível, 530 testes, build e diff passaram localmente; a avaliação auditiva no jogo permanece pendente. Demais mudanças de menus e áudio aguardam definição.

A pasta de efeitos indicada pelo usuário foi sincronizada com o jogo: sons ausentes na origem foram removidos, `hit_3` foi atualizado e as novas variantes foram adicionadas. Passos comuns acompanham a caminhada; os pesados ficam reservados ao identificador `grappler`, ainda sem lutador jogável. Início de luta, derrota no Arcade e explosão mágica foram conectados aos seus eventos. Aterrissagens 4 e 5 começam 25 ms antes dos picos medidos (0,430 s e 1,014 s). Três nomes de arquivos de origem foram normalizados nas cópias do jogo. Os sons de combo breaker permanecem reservados até existir a mecânica. Instalação, 538 testes, build e diff passaram localmente; conferência auditiva no jogo, aprovação artística dos efeitos visuais e CI remota continuam pendentes. Alterações locais, sem novo commit ou push.

Os passos comuns e pesados foram reduzidos em 80% e os tiros em 30% em relação aos volumes anteriores. A explosão da dinamite agora toca mesmo sem acertar o adversário, uma vez por explosão. Instalação reproduzível, testes, build e diff passaram; a conferência auditiva permanece pendente.

Os tiros receberam redução adicional de 20% sobre o volume anterior, e o som das mãos mágicas foi reduzido em 20%. A conferência auditiva no jogo continua pendente.

## Cowboy — sincronia de áudio e tamanho na captura — 2026-11-02

O laço do agarrão 1+3 foi realinhado verticalmente à mão sem alterar a imagem original. No agarrão 2+4, cada um dos três disparos reinicia a animação de reação da vítima durante a captura, sem alterar o dano ou a duração do golpe. O laço foi conferido no treino; a avaliação visual completa dos dois agarrões permanece pendente.

Os sons de impacto forte começam por variante perto dos picos medidos, preservando cerca de 25 ms de ataque; os arquivos originais permanecem intactos. O saque da pistola ocorre 36 quadros (0,6 s) após o início da provocação ou da ultimate e é cancelado se a ação for interrompida. A reação média foi ampliada em 2%. Durante o segundo agarrão da Cowboy, a vítima Cowboy mantém a escala original nos quadros iniciais e aumenta 5% no restante da captura, sem alterar colisão; o tamanho da atacante foi preservado. Instalação reproduzível, 527 testes, build e diff passaram. O usuário solicitou envio, integração em `development` e encerramento da branch após a validação. A conferência visual e sonora no jogo segue pendente pelo bloqueio anterior do navegador.

O conjunto foi enviado em `e15ccc34070725de23b8a2b92581ecc7369cef81`, com [CI da branch aprovada](https://github.com/feittosaa/close-combat/actions/runs/41480098951), e integrado em `development`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/41480343547). Esta atualização documental terá sua própria CI; o encerramento da branch depende da confirmação da integração final.

## Novos áudios de combate — 2026-11-02

Novos sons de impacto forte, contra-ataque, pouso, laço, empurrão, saque da pistola, ativação de ultimate, aviso de dez segundos, nocaute, tempo esgotado e vitória foram integrados aos eventos correspondentes. O saque toca na provocação e na ativação da ultimate da Cowboy. A quinta variação de acerto leve usa `hit_6`; os pesos são 50/25/15/5/5. Grupos com até quatro variações mantêm 50/25/15/10 normalizados. Os dois sons de combo breaker ficam carregados e reservados até a mecânica existir; o arquivo de origem com nome `combro_breaker_2` foi copiado como `combo_breaker_2`. Instalação reproduzível, 520 testes, build e diff passaram. Conferência auditiva no jogo pendente pelo bloqueio anterior da abertura do navegador; alterações locais na branch ativa, sem commit, push ou CI remota nesta revisão.

## Cowboy — pose ao sofrer agarrão — 2026-11-02

A interpretação anterior da imagem foi corrigida pelo usuário: o ajuste pretendido é na vítima durante a captura, após os primeiros quadros. Os resultados de validação desta seção referem-se à revisão anterior.

## Cowboy — sequência do segundo agarrão — 2026-11-02

A caminhada frontal foi reduzida em 1% e as poses do segundo agarrão ampliadas em 1%. Após os 15 quadros de quebra, o agarrão 2+4 mantém o adversário capturado por mais 40 quadros: mãos diagonais disparam duas vezes, desaparecem, dão lugar a mãos horizontais e um terceiro tiro antecede o lançamento e a queda. O dano permanece 85, acima dos 75 do laço 1+3; o dano é aplicado ao final da captura. Os sons dos três tiros são independentes. Instalação reproduzível, 516 testes, build e diff passaram. A conferência visual e sonora no jogo permanece pendente pelo bloqueio anterior da abertura do navegador; alterações locais, sem commit, push ou CI remota nesta revisão.

## Entrega da branch de menus e Cowboy — 2026-11-02

O usuário solicitou o envio do conjunto atual e a integração em `development`, preservando `codex/feature-menus-design` para continuação. A instalação reproduzível, 515 testes, build e diff passaram localmente. Conferência no jogo das alterações visuais e sonoras permanece pendente após bloqueio do navegador pela revisão automática; não há aprovação artística ou de mixagem inferida dos testes. O resultado da CI remota e da integração deve ser verificado no remoto.

O conjunto foi enviado em `8ce590a5017e6d6b4a65d02970b6b6f15fe19a69`, com [CI da branch aprovada](https://github.com/feittosaa/close-combat/actions/runs/41393811137), e integrado por avanço direto em `development`, cuja [CI também passou](https://github.com/feittosaa/close-combat/actions/runs/41393953298). A branch permanece aberta por pedido do usuário. Esta atualização documental terá sua própria CI.

## Rage e perfect block — 2026-11-02

A barra tem cinco segmentos de 50 pontos, máximo de 250, e a ultimate exige a barra cheia. A rage continua acumulando após a ultimate; o limite de uma ultimate por combate fora do treino permanece. Acertar concede 10, receber um acerto 15, bloquear 5 e executar perfect block 50, sem ultrapassar o máximo. Acertos da ultimate não geram rage para seu atacante; o defensor recebe a rage normal. Um comando novo de defesa nos três quadros até o contato válido produz perfect block; segurar a defesa antes da janela ou durante bloqueio contínuo não renova a oportunidade. Guardas altas/baixas e agarrões preservam suas regras. O perfect block recebe indicação visual branca, som próprio e identificação no treino; os efeitos de contato são acumulados entre quadros de renderização. Instalação reproduzível, 515 testes, build e diff passaram. A conferência visual e sonora no jogo permanece pendente: a abertura do navegador foi rejeitada anteriormente pela revisão automática do ambiente. Alterações locais na branch ativa, sem commit, push ou CI remota.

## Limites de caminhada e animação de repouso — 2026-11-02

Ao segurar para trás no limite da arena ou de afastamento da câmera, o lutador deixa de exibir caminhada quando não há deslocamento e volta a caminhar quando surge espaço. A animação alternativa de repouso da Cowboy passa a ocorrer a cada 600 quadros (10 segundos) de repouso contínuo, com a contagem reiniciada ao agir ou se deslocar. Os retratos nas bordas das barras de vida aumentaram de 38 para 57 pixels, com nomes e estados reposicionados. Os quadros das luminárias do Saloon são compartilhados entre as duas qualidades e não precisam de upscale. Instalação reproduzível, 509 testes, build e diff passaram; conferência no jogo permanece pendente por bloqueio anterior da abertura do navegador. Sem commit, push ou CI remota nesta revisão.

## Saloon e mixagem — 2026-11-02

O Saloon está disponível na seleção de cenário para PvP e Arcade; treino e tutoriais mantêm a sala própria. A arte fornecida é usada em 1× na qualidade Baixa e 2× na Alta, com a mesma escala no jogo. Seis quadros transparentes animam discretamente as chamas das luminárias sobre o cenário fixo; as imagens das chamas e a folha gerada foram copiadas para `scenarios/animacoes_saloon` no diretório fornecido para upscale. Tiros usam volume 0,7 e acertos e bloqueios 1,15. Instalação reproduzível, 505 testes, build e diff passaram. A conferência no jogo, a avaliação artística e a escuta da mixagem continuam pendentes: a abertura do navegador foi rejeitada pela revisão automática do ambiente. As alterações permanecem na branch ativa, ainda sem commit, push ou CI remota.

## Seleção proporcional e retirada visual do Shoto — 2026-11-01

Os retratos de seleção usam altura visível proporcional a 160 cm para Cowboy, 170 cm para Shoto, 175 cm para Puppet e 205 cm para Grappler, com a mesma linha de apoio e compensação das margens transparentes. A escala de todos foi ampliada em 25%, sem limitar a largura dos retratos; a composição foi reposicionada para manter os pés dentro da janela, podendo ficar atrás das caixas de nome. As folhas de animação antigas do Shoto, seus carregadores e testes exclusivamente visuais foram removidos; ele continua jogável com geometria provisória e mantém golpes, combos e efeitos. Os 487 testes restantes, build e diff passaram antes da ampliação; sete testes direcionados de seleção e build passaram depois. A conferência visual no jogo permanece bloqueada pela política do navegador; alterações locais na branch ativa, sem commit, push ou CI remota.

## Artes de seleção e ícones de vida — 2026-11-01

As oito imagens fornecidas foram preparadas com transparência no fundo magenta, preservando as cores da arte. Os novos ícones e retratos substituem os anteriores de Shoto e Cowboy; Grappler e Puppet aparecem na grade e suas artes de corpo inteiro podem ser visualizadas como personagens em desenvolvimento, sem habilitar kits de combate inexistentes. O HUD usa os ícones dos lutadores nas extremidades externas das barras de vida, carregados antes da seleção. A transparência das oito artes foi inspecionada em composição; os 524 testes e o build passaram. A conferência visual no jogo segue bloqueada pela política do navegador do ambiente. Alterações locais na branch ativa com trabalho anterior pendente, sem commit, push ou CI remota.

## Cowboy — limite do chute fraco em combo — 2026-11-01

Após um chute fraco em pé acertar, o chute fraco agachado não pode iniciar enquanto o mesmo combo permanecer ativo. A restrição termina quando o defensor se recupera; os demais golpes e a sequência de três chutes em pé permanecem disponíveis conforme suas regras. Testes cobrem um e três chutes confirmados, retomada após recuperação e ambos os jogadores. Os 523 testes e o build passaram; alterações locais junto do trabalho em andamento, sem commit, push ou CI remota.

## Cowboy — dano da ultimate — em andamento — 2026-11-01

A ultimate causa 360 de dano em seis tiros quando iniciada sem golpes anteriores no mesmo combo. Para cada acerto anterior ao primeiro tiro, reduz 20 do total da rajada, distribuindo o resultado inteiro entre os disparos e limitando o dano mínimo a zero. O histórico de combo conta os tiros mesmo quando chegam ao mínimo de dano. Foram verificados os dois lados, a ultimate isolada, continuações com três e quatro golpes e o cálculo para seis golpes anteriores. Instalação reproduzível, 521 testes, build e diff passaram. Alterações locais na branch ativa, junto do trabalho visual pendente; sem commit, push ou CI remota.

## Efeitos sonoros de combate — 2026-11-02

Os 16 arquivos WAV fornecidos foram adicionados e carregados na preparação: acertos leves e fortes, defesa, defesa perfeita, materialização das mãos e disparos mágicos. A reprodução observa cada quadro fixo para não perder eventos quando a renderização pula quadros; ataques fortes e especiais usam impacto forte, defesa usa seu próprio som, e mãos e tiros da Cowboy têm sons próprios. Variantes seguem pesos 50/25/15/10, normalizados para grupos menores; os sons de defesa perfeita estão disponíveis sem criar a mecânica. Os 498 testes, build e diff passaram localmente. Falta conferir volume, mixagem, sincronia e desbloqueio de áudio no navegador, cuja abertura foi bloqueada pelo ambiente. Alterações locais na branch ativa junto dos trabalhos anteriores, sem commit, push ou CI remota.

## Cowboy — antecipação do agarrão e disparos da ultimate — 2026-11-02

O agarrão 2+4 recebeu nova folha de antecipação com recuo corporal, preparação de 18 quadros em vez de 13 e alcance horizontal total de 66 unidades em vez de 55 (+20%). A captura continua próxima e permite ao oponente escapar com pulo ou quebrar após a captura; sem deslocar a posição física do atacante durante a antecipação. A ultimate ganhou nova folha corporal com quadros de smear exibidos por dois quadros de simulação antes das poses estáveis; intervalos, projéteis e hitboxes permanecem os mesmos. As folhas 1× foram copiadas para Downloads, incluindo a folha de captura anterior; as três versões 2× fornecidas depois foram inseridas na qualidade Alta e seus 18 quadros conferidos integralmente contra as imagens recebidas. Os 495 testes, build e diff passaram. Falta conferir em jogo proporções, alinhamento com hitboxes e timing visual, pois a abertura do navegador foi bloqueada pelo ambiente. Alterações locais na branch ativa, incluindo gráficos e agarrão ainda pendentes, sem commit ou push nem CI remota.

## Cowboy — agarrão 2+4 de curta distância — 2026-11-02

O antigo laço baixo foi substituído por uma captura próxima com as duas mãos, mãos espectrais diagonais e dois efeitos de disparo; após a janela de quebra de 15 quadros, o alvo é lançado para frente e cai. O agarrão continua rápido e sem carga; alcance e área agora correspondem a uma captura próxima. A janela de quebra e as regras de tentativa foram preservadas. A nova folha corporal foi gerada com a referência canônica, preparada em 1× e ampliada tecnicamente para a variante 2×; os efeitos obsoletos do laço baixo foram removidos. Testes verificam alcance, quebra, aparecimento das mãos, lançamento para ambos os lados e queda. Os 493 testes, build e diff passaram. A revisão em jogo de alinhamento, hitbox, disparos e transições permanece pendente porque a abertura do navegador foi bloqueada pelo ambiente; a arte ainda depende de avaliação visual. Alterações locais na branch ativa, incluindo configurações gráficas pendentes, sem commit ou push nem CI remota.

## Qualidade gráfica das sprites — 2026-11-02

As configurações oferecem Baixa (sprites originais 1×, padrão) e Alta (upscale 2× fornecido). As imagens 3× foram retiradas do checkout e a antiga opção Média volta ao padrão Baixa; uma escolha Alta já salva continua Alta, agora usando 2×. Ao salvar uma alteração de qualidade, o jogo reinicia e retorna ao menu para carregar somente o conjunto escolhido. As folhas ampliadas em uso foram reorganizadas em grades de três por duas células sem alterar pixels ou transparência; atlas e escala de exibição mantêm alinhamento e colisões. A comparação integral anterior confirmou os 444 quadros 2× idênticos às fontes. Instalação reproduzível, 491 testes, build e diff passaram localmente. O carregamento conjunto das texturas 2× pode consumir cerca de 2,7 GiB de memória gráfica; desempenho e interface em jogo permanecem pendentes de conferência devido ao bloqueio do navegador. Alterações locais na branch ativa, sem commit ou push nem CI remota.

## Cowboy — escala dos dashes e combo — 2026-11-02

Os dashes dianteiros e traseiros, no chão e no ar, foram reduzidos em 3%; as duas folhas usadas nos três golpes fortes da sequência 1,2,2,2 foram reduzidas em 2%, preservando o primeiro golpe, as colisões e os tempos. Os 488 testes, build e diff passaram; instalação reproduzível concluída na alteração anterior. Conferência em jogo segue pendente devido ao bloqueio do navegador. As mudanças estão locais junto da substituição das sprites ampliadas, sem commit ou push.

## Cowboy — reação baixa — 2026-11-02

A reação baixa foi ampliada em 1% em relação à escala anterior, sem alterar a colisão. Instalação reproduzível, 488 testes, build e diff aprovados localmente. Conferência visual em jogo ainda pendente: a abertura do navegador foi bloqueada pelo ambiente. Envio para a branch ativa autorizado; CI remota e aprovação artística ainda não verificadas.

## Cowboy — ajuste de guarda e reações — 2026-11-02

A reação a golpe médio foi reduzida em mais 4%, a reação alta em mais 2% e a guarda em pé ampliada em 1%, em relação aos tamanhos anteriores; colisões preservadas. Os 488 testes e o build passaram. A inspeção no jogo permanece pendente por bloqueio do navegador; alterações locais sem commit, push ou CI remota.

## Cowboy — escala do laço, ultimate e reações — 2026-11-02

A apresentação do laço normal ao acertar ou errar e o chute após o acerto foram reduzidos em 2%; a escala do mesmo chute quando usado como especial independente foi preservada. A rajada da ultimate foi reduzida em 1%, a guarda em pé em 2%, a reação média em 4%, a alta em 2% e a baixa ampliada em 1%, sempre em relação às escalas anteriores. As colisões não foram alteradas. Os 488 testes, build e diff passaram; a instalação reproduzível já havia sido concluída. A conferência visual no jogo permanece pendente pelo bloqueio do navegador. Trabalho local na branch ativa, sem commit, push ou CI remota.

## Cowboy — escala de reações e transições — 2026-11-02

A caminhada para trás foi ampliada em 2% e a folha de preparação do laço em 5%. O trecho intermediário compartilhado entre provocação e ativação da ultimate foi ampliado de 1,04 para 1,08, mantendo os ajustes horizontais. A defesa em pé foi reduzida em 4%, a reação média em 6% e as reações baixa e alta em 3%, sem modificar colisões. Os 488 testes, build e diff passaram; instalação reproduzível já havia sido concluída. Conferência visual em jogo permanece pendente pelo bloqueio do navegador; mudanças locais sem commit ou push.

## Cowboy — proporções e carga do laço — 2026-11-01

A caminhada para trás recebeu nova folha com proporções revistas. Corrigida a definição de células da carga do laço, que ainda usava 768 × 768 para uma imagem de células 640 × 640; um teste cobre os seis quadros. O tiro final agachado foi reduzido em 10%, os chutes fraco agachado e forte em pé ampliados em 4% e o chute de afastamento reduzido em 2%. As poses centrais da provocação, compartilhadas com a preparação da ultimate, foram ampliadas em 4% e alinhadas horizontalmente, com ajuste da entrada. Colisões mantidas. Os 488 testes, build e diff passaram; instalação reproduzível já havia sido concluída. Conferência visual no jogo e aprovação artística permanecem pendentes por bloqueio de abertura do navegador; alterações locais, sem commit ou push.

## Cowboy — atualização do chapéu — em andamento — 2026-11-01

O turnaround canônico da Cowboy usa chapéu clássico baixo e arredondado, sem ponta triangular. A pedido do usuário, as 55 folhas corporais devem ser refeitas do zero, preservando ao máximo as poses, os golpes e as proporções; a tentativa anterior de máscara foi abandonada.

Foram preparadas folhas para repouso, deslocamentos e entradas, defesas, parte das viradas, golpes básicos e especiais, combos e reações. Há também folhas novas para vitória, derrota e espera após cinco segundos de repouso. O chute forte usa um quadro de smear antes do contato, seguido de uma pose legível, sem alterar a hitbox. A revisão das folhas identificou um quadro de recuperação do tiro agachado que ocultava um braço e uma postura de recuo do soco fraco que se afastava do original; ambas foram substituídas por outras propostas geradas, mais coerentes com as poses de referência.

Após a captura enviada pelo usuário, a caminhada foi deslocada tecnicamente para trás e sua entrada recebeu uma transição gradual desse deslocamento. Os quadros agachados também foram reposicionados horizontalmente, com transição gradual, aproximando o corpo do centro de colisão. O repouso em pé, o repouso especial e a vitória receberam escala uniforme com a mesma âncora dos pés, aproximando o topo do chapéu da altura de referência. Posteriormente, a escala do agachamento e dos golpes agachados foi reduzida, com compensação entre os dois quadros de repouso para diminuir a oscilação; a fluidez ainda precisa de conferência visual. A conferência visual dessas alterações no jogo ainda está pendente; os 55 testes direcionados de sprites e higiene passaram.

Após esses ajustes, os 60 testes direcionados de sprites e higiene passaram e o build compilou. A espera especial foi verificada com movimento, agachamento e salto: em cada caso o contador retorna a zero e exige novamente cinco segundos em repouso; os 57 testes direcionados da Cowboy passaram.

A folha de derrota recebeu escala uniforme com a âncora dos pés preservada para aproximar sua pose inicial da altura do repouso atualizado. Os testes direcionados de sprites e higiene passaram; a continuidade da queda e a escala ainda precisam de conferência visual no jogo.

O usuário identificou cabeça desproporcional na caminhada para trás, na carga do soco forte e nos dashes terrestres. Essas quatro folhas foram regeneradas do zero e substituídas; a entrada da caminhada para trás e a pose ativa do laço também receberam novas folhas com chapéu clássico. A defesa em pé e os dois chutes aéreos foram reduzidos em 5%; o chute potente foi ampliado em cerca de 3%. O pulo foi reduzido em 5%, com transição na entrada; o soco fraco foi ampliado em 2%. Os socos fortes do combo tiveram o tamanho ajustado novamente a pedido do usuário, preservando o primeiro tiro e a âncora dos pés. Os testes direcionados passaram; a compatibilidade visual com mãos espectrais e hitboxes ainda requer conferência no jogo.

As folhas restantes de laço, dashes aéreos, viradas, provocação e corpo da ultimate foram regeneradas com o chapéu clássico e preparadas com transparência, escala e alinhamento técnico; a saída da provocação foi recortada por pose para não invadir o quadro seguinte. Todas as folhas corporais ativas foram substituídas, mas isso não comprova a qualidade ou continuidade visual no jogo. Quando o round termina com a Cowboy no ar, a apresentação simula sua trajetória até o chão antes da pose de resultado, sem modificar o estado de combate. A instalação reproduzível foi concluída fora do isolamento após EPERM do esbuild; há quatro vulnerabilidades reportadas nas dependências. Após a reinstalação, os 487 testes, o build e a checagem do diff passaram. A leitura dos consumidores e testes confirmou que vitória e derrota são selecionadas no encerramento do round e que a espera alternativa é acionada após 300 quadros neutros, reiniciando após movimento ou provocação; queda e resultado permanecem dependentes da revisão visual. As etapas da provocação e as poses corporais da ultimate foram inspecionadas nas folhas para verificar mãos, chapéu e recorte entre quadros; o ritmo e a continuidade em movimento ainda precisam ser vistos no jogo. Uma inspeção direta dos PNGs confirmou as dimensões esperadas e ausência de pixels opacos nas bordas de células; uma amostra visual do terceiro quadro de cada folha também foi conferida, sem substituir a revisão da animação completa. A abertura do jogo no navegador foi bloqueada pela política do ambiente: faltam a conferência no jogo das transições, proporções, efeitos e hitboxes, e a avaliação artística. Alterações locais na branch ativa, sem commit, push ou CI remota; preservar as demais alterações locais anteriores.


## Limpeza de assets sem uso em execução — 2026-11-01

Na `codex/feature-menus-design`, removidas folhas-fonte de personagens e cenário que não são carregadas pelo jogo, junto dos metadados e preparadores que dependiam dessas fontes, além de registros antigos de geração sem consumidores. Foram preservados os quatro turnarounds oficiais, folhas finais carregadas, retratos, efeitos e cenário em uso. A auditoria automatizada exige que as imagens restantes sejam consumidas ou turnarounds canônicos. O histórico Git mantém os arquivos rastreados removidos; folhas-fonte novas ainda não versionadas não estão disponíveis no Git.

Instalação reproduzível, 507 testes em 42 arquivos, build e diff aprovados. A limpeza está local junto das alterações em andamento de referências, seleção e reações; retirada do visual antigo do Shoto e conferência completa dos ajustes da Cowboy continuam pendentes. Sem commit, push ou CI para estas alterações.


## Referências, seleção e reações — em andamento — 2026-11-01

Na `codex/feature-menus-design`, foram registradas as novas referências canônicas de grappler, Cowboy, puppet e Shoto. Os retratos de seleção da Cowboy e do Shoto usam as imagens fornecidas; os retratos de corpo inteiro tiveram o fundo magenta removido sem recoloração. A folha corporal do laço baixo foi substituída por poses sem corda integrada e a corda separada ganhou recolhimento; há uma nova folha de queda para a Cowboy durante empurrões.

Os 507 testes e o build passaram; os retratos e uma captura do laço foram observados no jogo. Ainda faltam retirar as folhas antigas e dependências visuais do Shoto preservando seus golpes, conferir a queda e o laço corrigido em ambos os resultados e lados, revisar alinhamento/hitboxes e completar instalação reproduzível e validação final. Alterações locais sem commit ou envio; nenhuma aprovação artística presumida.


## Cowboy — disparos agachados e artes de seleção — 2026-11-01

Na `codex/fix-sala-treino-agarrao`, as mãos espectrais dos disparos agachados foram reposicionadas em direção à origem dos projéteis, mantendo suas trajetórias e caixas de colisão. O final 1,1,1 agachado usa uma nova folha de seis poses com gesto de arminha e camada separada de mãos espectrais horizontais. As duas imagens fornecidas pelo usuário substituem o recorte do idle no ícone central e no retrato grande da Cowboy, com cores originais.

Instalação reproduzível, 505 testes em 42 arquivos, build e diff aprovados; seleção, antiaéreo e o final do combo observados no jogo; aprovação artística final depende do usuário. Envio e CI remota serão conferidos.


## Cowboy — laços e antiaéreo agachado — 2026-11-01

Na `codex/fix-sala-treino-agarrao`, o laço baixo 2+4 ganhou 15 unidades de alcance e mantém a volta visível durante a fase ativa e o começo da recuperação. A corda visual do 1+3 foi alongada para acompanhar melhor sua área de contato, inclusive ao carregar. O antiaéreo agachado tem nova folha de seis poses a partir da referência canônica, com as duas mãos humanas e gesto de arminha; as mãos mágicas diagonais existentes aparecem também durante o disparo ativo. Folha anterior substituída e quadros alinhados tecnicamente.

Instalação reproduzível, 503 testes em 42 arquivos, build e diff aprovados. No treino foram observados o antiaéreo, suas mãos espectrais e o laço baixo com a hitbox. A aprovação artística final depende do usuário. Envio e CI remota serão conferidos.


## Cowboy — quebra e laço rasteiro — 2026-11-01

Na `codex/fix-sala-treino-agarrao`, a quebra tem uma única tentativa durante a captura: 1 ou 3 escapam do 1+3, e 2 ou 4 escapam do 2+4; um botão de ataque incorreto impede novas tentativas naquela captura. O 2+4 é um laço baixo, mais rápido e de menor alcance, sem carga, que derruba no local. O 1+3 mantém a carga e o arremesso direcional. Duas folhas novas, com poses e corda baixa, foram geradas a partir da referência canônica e preparadas com transparência e alinhamento técnico.

Instalação reproduzível, 501 testes em 42 arquivos e build aprovados; o 2+4, sua caixa de contato e a queda foram conferidos no treino. Avaliação artística final pendente. Envio e CI remota serão conferidos.







## Cowboy — dinamite espectral e projétil da ultimate — 2026-11-01

Na `codex/fix-sala-treino-agarrao`, os disparos dos especiais d,df,f,1 e d,df,f,2 foram substituídos por uma dinamite azul lançada por uma mão espectral, horizontal no fraco e diagonal ascendente no forte. A dinamite detona no ar ao tocar o adversário ou ao terminar o alcance, com explosão azul; os comandos, valores, geometria de colisão, duração da carga e capacidade antiaérea foram preservados. O tamanho visual dos projéteis da ultimate aumentou de 1,12 para 1,45 vezes suas caixas de contato.

Cinco novas folhas foram geradas pela ferramenta integrada de imagem usando a referência canônica da Cowboy e a mão espectral existente: corpo lançando, mãos horizontal e diagonal, dinamite azul e explosão azul simples em estilo de desenho clássico. As fontes magenta estão em `src/assets/sprites/characters/cowboy/source/`; as folhas substituídas foram removidas do checkout. A preparação mantém as cores originais e alinha os sprites ao ponto de apoio. Instalação reproduzível, 497 testes em 42 arquivos, build e diff aprovados; as duas versões e as hitboxes foram conferidas no treino. Aprovação artística final depende do usuário; envio e CI serão verificados.

## Cowboy — escala dos efeitos e agarrão direcional — 2026-11-01

Na branch `codex/fix-sala-treino-agarrao`, os projéteis normais e especiais foram ampliados visualmente, assim como os seis tiros da ultimate. As areias dos chutes ficaram maiores e um pouco mais baixas, próximas ao chão. A escala é apenas visual: hitboxes e regras de combate continuam inalteradas.

O agarrão para trás existente foi confirmado: pressionar para trás ao executar 1+3 ou 2+4 captura essa direção e joga o alvo para o outro lado. Testes cobrem ambos os jogadores e comandos. Instalação reproduzível, 495 testes em 42 arquivos, build e diff aprovados; areias e disparo observados no treino. Avaliação artística final pendente. Implementação enviada em `0f6cec5` com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/41275339959); este registro possui CI própria.

## Cowboy — efeitos clássicos em HD — 2026-11-01

Na `codex/fix-sala-treino-agarrao`, foram refeitas as sete folhas de efeito de tiro normal, tiro à queima-roupa, ultimate, impacto, bloqueio e areias leve/potente. São efeitos originais gerados a partir das referências fornecidas: animação 2D simples, cores chapadas e sem contornos escuros marcados; tiros e impactos azuis, bloqueio e areia brancos. Os quadros foram tecnicamente alinhados e preparados com transparência a partir de fundos magenta. O efeito de impacto azul cobre ataques da Cowboy e acompanha a altura do contato quando disponível; os seis quadros dos tiros especiais são utilizados. Nenhuma mecânica ou hitbox foi alterada.

Conferência no treino: pisão e chute potente com areia junto ao chão, disparo e impacto azul; seis quadros de cada folha também foram inspecionados. Instalação reproduzível, 493 testes em 42 arquivos, build e diff aprovados. A revisão artística final de todos os golpes continua sujeita à aprovação do usuário. Implementação enviada em `de8efd7`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/41274424233); este registro possui CI própria. A branch continua aberta, sem integração autorizada.

## Sala de treino e reação ao agarrão — 2026-11-01

Branch `codex/fix-sala-treino-agarrao`, criada mediante autorização do usuário após o encerramento das branches anteriores. A sala usa os cinco desenhos fornecidos, ampliados com Upscayl em modo high fidelity; somente as bandeiras variam, com chão, paredes e objetos estabilizados. A referência e o procedimento de preparação ficam no repositório. A Cowboy permanece na primeira pose de captura durante a janela de quebra de 15 quadros e, depois, segue a reação do arremesso; as poses com braço estendido deixam de ser exibidas nessa reação.

Instalação reproduzível, 493 testes em 42 arquivos, build e diff aprovados. No jogo foram observados o ciclo da sala e o primeiro quadro da captura; a comparação dos cinco arquivos confirmou piso idêntico, pixel a pixel, e bandeiras diferentes. A validação artística final depende do usuário. Implementação enviada em `4c3d834`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/41272692795); este registro tem sua própria CI. A branch permanece aberta para revisão e futura integração autorizada.

## Cowboy e sala de treino animada — 2026-11-01

Continuação na `codex/feature-cowboy-zoner`: ultimate aceita a sequência de combo e o comando b,bd,d,df,f,1+2; primeiro disparo é baixo, os seis levantam o alvo e o último causa queda. O laço tem alcance visual ajustado à hitbox, nova recuperação ao errar e janela de 15 quadros para o defensor quebrar com o mesmo comando (1+3 ou 2+4), antes de dano e arremesso. A carga do laço recebeu ajuste técnico de escala, o golpe agachado ficou mais lento, a provocação dura 132 quadros e a repetição infinita de 1 após 3,3,3 na mesma sequência foi bloqueada.

A sala fornecida possui cinco quadros sincronizados com o tempo de combate e substitui os cenários anteriores em treino e seleção dos demais modos. Foram geradas novas folhas para laço ativo, laço separado e erro, usando a referência canônica da Cowboy e preservando as cores originais; requerem avaliação artística final. O cenário e o laço foram observados no treino. A instalação reproduzível reportou quatro vulnerabilidades de dependências (duas moderadas e duas críticas). A branch foi enviada como `4fc5c1b` e sua [CI](https://github.com/feittosaa/close-combat/actions/runs/41271058900) aprovou instalação, testes e build. Integração em `development` autorizada pelo usuário; a verificação do commit integrado e a limpeza das branches dependem da CI de integração. O histórico antigo de `sprites/shoto` foi integrado; seu turnaround alternativo e diretórios de planejamento vazios foram retirados do checkout por estarem substituídos, preservados no histórico.

## Cowboy — provocação em 2,5 segundos — 2026-10-31

Na `codex/feature-cowboy-zoner`, a provocação mantém as mesmas poses e passa a durar 150 quadros, com 50 para cada etapa de entrada, ação e saída. Instalação reproduzível, 490 testes em 42 arquivos e build aprovados; provocação observada no treino, com avaliação artística final pendente. A instalação apontou quatro vulnerabilidades de dependências (duas moderadas e duas críticas). Envio e CI devem ser conferidos; sem autorização de merge em `development`.

## Cowboy — duração equilibrada da provocação — 2026-10-31

Na `codex/feature-cowboy-zoner`, a provocação usa as mesmas dezoito poses de entrada, ação e saída, distribuídas uniformemente em 198 quadros: 66 por etapa e 11 por pose. A ativação da ultimate mantém seu próprio ritmo. Instalação reproduzível, 490 testes em 42 arquivos e build aprovados; provocação observada no treino, com avaliação artística final pendente. A instalação apontou quatro vulnerabilidades de dependências (duas moderadas e duas críticas). Envio e CI devem ser conferidos; sem autorização de merge em `development`.

## Cowboy — carga do laço, soco forte e virada — 2026-10-31

Continuação na `codex/feature-cowboy-zoner`. As viradas de repouso, caminhada, agachada e aérea passam de 12 para 15 quadros mantendo as mesmas poses. Os dois agarrões podem ser segurados mantendo os botões do comando: soltar qualquer botão lança o laço, com disparo automático após 60 quadros. O alcance cresce gradualmente até 30%, com a mesma geometria no resolvedor e na inspeção; dano e arremesso permanecem inalterados. Nova folha de seis poses mostra o laço girando. Os braços espectrais acompanham a carga do soco forte, inclusive no combo.

Instalação reproduzível, 488 testes em 42 arquivos e build aprovados; conferidos no treino a mudança de lado, a carga do laço, a hitbox e os braços do soco. A avaliação artística completa das transições e direções permanece pendente. A instalação apontou quatro vulnerabilidades de dependências (duas moderadas e duas críticas). Envio e CI remota devem ser conferidos; sem autorização para merge em `development`.

## Menu — imagem em alta resolução — 2026-10-31

Na branch `codex/feature-cowboy-zoner`, o wallpaper do menu foi substituído pelo PNG fornecido pelo usuário, de 4758 × 2976 pixels, mantendo a proporção e o enquadramento existentes. O arquivo ocupa aproximadamente 24,5 MB. O menu foi conferido no navegador com cobertura integral e degradê à esquerda; a aprovação visual final cabe ao usuário.

Instalação reproduzível, 482 testes em 42 arquivos e build aprovados; a instalação informou quatro vulnerabilidades de dependências (duas moderadas e duas críticas). O envio e a CI devem ser conferidos. Sem autorização para integrar em `development`.

## Cowboy — duração da provocação e giro da ultimate — 2026-10-31

Continuação em `codex/feature-cowboy-zoner`. A provocação mantém as mesmas poses e transições, com duração ampliada de 60 para 90 quadros. A preparação da ultimate conserva 150 quadros: a entrada ganhou tempo e as poses existentes do giro avançam mais rapidamente, incluindo uma segunda volta, antes da mesma saída.

Instalação reproduzível, 482 testes em 42 arquivos, build e checagem de diff aprovados localmente; provocação e preparação foram observadas no treino. A avaliação artística integral permanece pendente. A instalação apontou quatro vulnerabilidades de dependências (duas moderadas e duas críticas). Envio e CI remota devem ser conferidos; não há autorização para merge em `development`.

## Cowboy — ritmo da preparação da ultimate — 2026-10-31

Correção reunida na branch `codex/feature-cowboy-zoner`, junto às branches de animações, especiais e ritmo ainda não integradas em `development`. A preparação mantém seus 150 quadros e as sequências de entrada e saída; as seis poses intermediárias agora ocupam 17 quadros cada, eliminando a permanência mais longa na última pose. O fluxo de trabalho passa a manter correções na branch ativa, criando novas branches somente por pedido explícito do usuário.

Instalação reproduzível, 482 testes em 42 arquivos e build aprovados localmente; a ativação foi observada no treino. A avaliação artística integral permanece pendente. A instalação apontou quatro vulnerabilidades de dependências (duas moderadas e duas críticas). O envio e a CI devem ser conferidos; não há autorização para integrar em `development`.

## Cowboy — ritmo do chute potente e provocação — 2026-10-31

Branch `codex/fix-cowboy-ritmo-chute-potente`, dependente de `codex/feature-cowboy-especiais-carregados` e seus antecedentes ainda não integrados. O chute potente passa de 20 para 18 quadros de preparação e de 34 para 30 de recuperação, preservando atividade, dano e caixa. A provocação passa de 48 para 60 quadros de simulação, mantendo os mesmos desenhos, a entrada e a transição de saída; sua duração não altera a ativação da ultimate.

Instalação reproduzível, 480 testes em 42 arquivos e build aprovados; o treino exibiu o chute com caixas e a provocação. A avaliação artística completa permanece pendente. A instalação apontou quatro vulnerabilidades de dependências (duas moderadas e duas críticas). Envio e CI devem ser conferidos; não há autorização para merge.

## Cowboy — braços durante os especiais segurados — 2026-10-31

Continuação na `codex/feature-cowboy-especiais-carregados`, dependente das branches anteriores ainda não integradas. Os dois especiais agora disparam ao soltar o botão ou atingir 60 quadros, sem bônus de dano. Durante a espera, os braços espectrais permanecem visíveis e alternam poses, horizontais no especial fraco e diagonais no forte.

Instalação reproduzível, 480 testes em 42 arquivos e build aprovados. No treino foi observado o especial horizontal segurado com braços e hitboxes; testes verificam as duas direções, ambos os jogadores, limite e dano. A revisão visual completa do antiaéreo e a aprovação artística permanecem pendentes. A instalação informou quatro vulnerabilidades de dependências (duas moderadas e duas críticas); envio e CI remota devem ser conferidos, sem merge autorizado.

## Cowboy — especiais seguráveis e controles — 2026-10-31

Branch `codex/feature-cowboy-especiais-carregados`, dependente de `codex/feature-cowboy-animacoes` ainda não integrada. Os efeitos de tiro e areia criados na entrega anterior já estão conectados ao jogo. Os dois especiais à queima-roupa podem ser segurados por até 120 quadros, disparando ao soltar ou automaticamente no limite; o dano permanece inalterado. O projétil horizontal dura nove quadros e o antiaéreo onze, ampliando moderadamente o alcance. As configurações incluem todos os atalhos de treino, além da ultimate e provocação de cada jogador; rejeitam conflitos entre jogadores, luta e treino, e atualizam o rodapé do treino.

Instalação reproduzível, 478 testes em 42 arquivos, build e checagem de diff aprovados localmente. No jogo, um atalho de caixas foi remapeado e testado no treino; os especiais segurados foram verificados por simulação nos dois lados, com revisão visual integral ainda pendente. A instalação informou quatro vulnerabilidades de dependências (duas moderadas e duas críticas). O envio e a CI devem ser conferidos no remoto; não há autorização para merge.

## Cowboy — efeitos, provocação e ultimate — 2026-10-31

Continuação em `codex/feature-cowboy-animacoes`, dependente dos trabalhos anteriores ainda não integrados. O histórico de golpes recebeu painéis no estilo do HUD. As fontes e atlas dos efeitos de tiro e areia foram substituídos por desenhos estilizados; projéteis diagonais reutilizam o efeito horizontal rotacionado. A provocação retorna ao repouso por uma nova sequência, também usada na transição entre a preparação e a ultimate. Durante os seis disparos, a Cowboy alterna poses de arminha enquanto os projéteis continuam saindo das armas espectrais. A folha do especial horizontal já apresenta dois braços na preparação e recuperação; o especial antiaéreo permanece inalterado.

Instalação reproduzível, 473 testes em 42 arquivos e build aprovados localmente. No treino foram observados o painel de dano, a poeira do pisão e uma fase da ultimate com caixas visíveis. A revisão artística e a conferência dos ciclos completos, direções e bordas permanecem pendentes. O envio e a CI remota devem ser conferidos; não há autorização para merge.

## Menu e tiro horizontal da Cowboy — 2026-10-31

Continuação na `codex/feature-cowboy-animacoes`, dependente das alterações anteriores ainda não integradas. O menu principal alinha a imagem à direita, calcula sua cobertura pela proporção real da janela e aplica o degradê preto solicitado à esquerda. A fonte e o atlas do especial horizontal `d,df,f,1` receberam novas poses inicial e final com ambos os braços visíveis, substituindo a pose de uma mão; o especial antiaéreo não foi alterado nesta revisão.

Instalação reproduzível, 469 testes em 42 arquivos e build aprovados; testes cobrem a cobertura em quatro proporções, inclusive janela ultralarga. No jogo foram observados o menu e o especial horizontal com caixas de colisão; o ciclo completo em ambas as direções e a proporção ultralarga real ainda aguardam revisão visual do usuário. O envio e a CI devem ser conferidos no remoto; não há autorização para merge.

## Cowboy — carga no combo, referência e histórico — 2026-10-31

Continuação na branch `codex/feature-cowboy-animacoes`, dependente de `codex/feature-cowboy-zoner` e das alterações anteriores ainda não integradas. O soco forte pode ser carregado durante `1,2,2,2`, preservando as folhas alternadas de tiros do combo; o tiro mantém o dano conforme a carga. A fonte do especial forte foi corrigida com dois braços humanos e gestos de arminha; o novo turnaround fornecido substitui a referência canônica em `assets/art/characters/cowboy/turnaround.png` sem modificar o arquivo. A ilustração fornecida foi conectada ao fundo do menu principal; a referência anterior permanece usada nas outras telas.

Adicionado histórico dos últimos 12 combos, acumulando acertos e dano por atacante até a vítima recuperar a defesa; bloqueios não contam. O treino mostra os três registros recentes de cada jogador, enquanto os demais modos mostram temporariamente a contagem e o dano de sequências com múltiplos acertos. A pausa de contato compartilhada caiu de sete para seis quadros de 60 Hz, a aproximação inteira mais próxima de 20%. Foram conferidos no jogo o menu e a contagem após um acerto no treino; as folhas do especial e as transições completas continuam sujeitas a revisão artística do usuário.

Instalação reproduzível, 465 testes em 42 arquivos, build e diff aprovados localmente. O commit `f6c50e5` foi enviado à branch remota; a [CI 41245444069](https://github.com/feittosaa/close-combat/actions/runs/41245444069) passou. O fechamento documental seguinte também requer sua própria CI. Não há autorização para merge em development.

## Cowboy — chutes e carga do soco forte — 2026-10-31

Continuação na branch `codex/feature-cowboy-animacoes`, dependente dos trabalhos anteriores ainda não integrados. As fontes dos chutes forte e de afastamento foram revisadas para manter a mesma perna de apoio e a mesma perna de ataque; a recuperação do afastamento pula o quadro com braço encoberto. A folha do especial forte foi refeita mantendo dois braços humanos e os braços espectrais azuis no disparo. Criada uma folha própria para a postura de carga do soco forte, sem braços espectrais antes do disparo.

O soco forte carrega por até 120 quadros e dispara automaticamente no limite: +20% ao completar 60 quadros e +40% ao completar 120, com arredondamento do dano. Regressões cobrem os dois jogadores, limiares, liberação e disparo mantendo o botão pressionado. Conferidos no treino a carga e acertos do chute forte, do afastamento e do especial forte com caixas visíveis; os ciclos completos em ambos os lados ainda exigem revisão artística. `npm ci`, 458 testes em 41 arquivos, build e `git diff --check` passaram localmente. O remoto configurado é público; o envio anterior foi rejeitado pela revisão automática e continua sem autorização específica de publicação. Sem CI remota ou merge.

## Cowboy — áreas de contato, dash e ultimate — 2026-10-31

Continuação na `codex/feature-cowboy-animacoes`, com dependência de `codex/feature-cowboy-zoner` e de todo o trabalho de animação anterior ainda não integrado. O dash aéreo mantém a altura e é limitado a uma utilização por salto, restaurada ao pousar. As caixas agachada e aérea foram ampliadas horizontalmente; a vulnerabilidade da Cowboy está dividida em cabeça, tronco e pernas, com região baixa mais larga, e o contato seleciona a reação correspondente sem alterar a regra de bloqueio. Receber agarrão usa uma nova folha em pé durante a puxada. As receitas existentes podem continuar após defesa, sem reiniciar o combo de três pisões.

A provocação teve âncoras corrigidas. A ativação da ultimate retorna pela provocação antes do repouso; seis mãos individuais disparam de baixo para cima, com projéteis emitidos junto às armas e faixas verticais limitadas ao espaço entre o chão e abaixo do HUD. Foi ampliado o alcance do laço. A folha de idle e a personagem foram conferidas no treino: as duas pernas estavam visíveis, portanto o desaparecimento relatado não foi reproduzido. Uma proposta para ampliar visualmente o laço atravessou os limites das células e não substituiu a folha atual; a coerência visual do extremo do alcance ainda precisa de refinamento.

Instalação reproduzível, testes e build verificados localmente. Conferência no treino incluiu as três áreas de vulnerabilidade, o agarre em pé e as mãos/tiros da ultimate; o ciclo completo em ambos os lados, as bordas e a revisão artística ainda precisam de conferência. O estado de envio e CI deve ser confirmado no remoto; não houve autorização de integração em development.

## Cowboy — dash aéreo, impacto e efeitos — 2026-10-31

Continuação local em `codex/feature-cowboy-animacoes`, dependente do trabalho anterior ainda não integrado. Dash aéreo para frente e para trás usa a mesma entrada de dash e preserva gravidade e hitbox aérea; o pouso encerra o dash. Novas folhas magenta para os dois dashes, chute forte aéreo, reação média na barriga, poeiras em estilo de desenho e projétil azul da ultimate foram preparadas e conectadas. A provocação teve âncoras e escala ajustadas; a preparação visual da ultimate percorre suas poses mais rapidamente, mantendo a duração de ativação compartilhada. Três pares de braços e seis projéteis sequenciais continuam seguindo o comportamento existente; os projéteis usam efeito próprio e a poeira acompanha a região do golpe e o chão.

Instalação reproduzível, 449 testes em 41 arquivos, build e diff aprovados localmente. No treino, observados o dash aéreo para frente e a hitbox; as folhas foram examinadas individualmente. Ainda falta conferir no jogo o ciclo completo dos novos efeitos, os dois sentidos, bordas e transições, e obter revisão artística; permanecem pendências anteriores da branch. Sem commit, push, CI remota ou integração.

## Cowboy — ritmo de projéteis e ultimate — 2026-10-31

Continuação local de `codex/feature-cowboy-animacoes`, dependente do trabalho anterior ainda não integrado. O soco fraco confirmado não cancela para outro soco fraco, preservando a transição para as receitas autoradas. Os agarrões passam de 15 para 19 quadros de preparação e de 80 para 120 unidades de largura na caixa; os valores são provisórios. A reação alta usa desde o impacto uma pose mais clara de recuo da cabeça; a escala do chute forte aéreo foi reduzida uniformemente e as âncoras horizontais das folhas de provocação foram alinhadas.

A animação da provocação também é usada na ativação da ultimate, com duração compartilhada preservada. Os pares de braços espectrais surgem e desaparecem gradualmente. Cada um dos seis projéteis nasce em uma altura diferente, de baixo para cima, e viaja horizontalmente a 24 unidades por quadro; o intervalo passa de 12 para 18 quadros. A hitbox acompanha cada projétil, sem atingir a arena inteira instantaneamente. Os efeitos de areia foram ancorados ao solo e permanecem por até 12 quadros, independentemente da atividade do golpe.

Instalação reproduzível, 444 testes em 41 arquivos, build e diff aprovados. No treino foram observados o pisão com areia e a ultimate com braços e projétil em movimento; os testes cobrem ambos os lados, repetição do soco, reação alta, sequência dos seis projéteis e atraso até o contato. Ainda faltam revisão completa das animações e hitboxes, bordas, ritmo e aprovação artística, além das pendências anteriores de caminhada. Sem commit, push, CI remota ou integração.

## Cowboy — reações e areia — 2026-10-31

Continuação local na `codex/feature-cowboy-animacoes`, dependente de todas as alterações anteriores ainda não integradas. Ajustadas as escalas uniformes das folhas de recuo e chute forte aéreo; corrigido o recorte que deixava um fragmento azul no especial forte. Criadas duas folhas independentes para areia dos pisões e do chute potente, exibidas na área do golpe durante a atividade. Removido o efeito amarelo genérico de acerto.

Cada acerto passa a registrar altura e instante para reiniciar a reação mesmo durante um combo. A Cowboy usa folhas distintas para dano baixo, médio e alto em pé e para dano baixo agachada; as reações aéreas preservam sua própria folha. Em treino foi observada a reação baixa e a areia do pisão com hitbox visível; a areia potente foi vista antes do último ajuste de leitura. Faltam conferir a versão final de todos os quadros, as bordas e ambos os lados no jogo. As tentativas de refazer as caminhadas continuaram repetindo passos e não substituíram as folhas atuais: refinamento das duas caminhadas segue pendente, assim como revisão artística e os itens anteriores da branch. Instalação reproduzível, 440 testes em 41 arquivos, build e diff aprovados localmente. Sem commit, push ou CI remota.

## Cowboy — revisão de golpes, arte e ultimate — 2026-10-31

Continuação local de `codex/feature-cowboy-animacoes`, ainda dependente das alterações anteriores não integradas. O idle usa uma única folha para evitar mistura de cores e adereços; caminhada, recuo, chute potente, especial fraco, chute forte aéreo e provocação receberam correções nas fontes. A provocação ganhou seis poses de entrada sem alterar seus 48 quadros de duração. Recortes retiram fragmentos dos antiaéreos; as escalas do agarrão, ultimate, chute potente e chute aéreo foram revistas. Poeira é desenhada acima do personagem e dentro das hitboxes dos chutes.

O combo `3,3,3` não reinicia imediatamente com outro `3`; continua permitindo soco ou chute forte. O alcance dos agarrões aumentou; o arremesso para frente puxa antes do chute, e o para trás mantém o lançamento. Na ultimate, seis disparos visuais percorrem a tela de baixo para cima e a colisão de cada um cobre a arena; três pares dos braços espectrais são posicionados atrás da luta. A ativação mantém a duração compartilhada do Shoto. As alterações são provisórias e requerem revisão visual completa, inclusive ritmo, alinhamento, ambos os lados, bordas e a aparência dos braços da ultimate na versão atual. Nenhuma aprovação artística é inferida.

Validação local: `npm ci`, 434 testes em 41 arquivos, build e `git diff --check` aprovados. O treino foi aberto e a versão anterior da ultimate foi observada, mas a conferência visual da última alteração da câmera e de todos os novos recortes ainda está pendente. Sem commit, push, CI remota ou integração; preservar a branch até terminar a revisão.

## Cowboy — continuação de combate e animação — 2026-10-31

Trabalho local em `codex/feature-cowboy-animacoes`, dependente do protótipo da Cowboy ainda não integrado. Foram conectados novos ciclos e transições de movimento e virada, reações, provocação, braços espectrais direcionais e efeitos de disparo; as fontes e atlas ativos permanecem no diretório da personagem. Corrigidos fragmentos de quadros adjacentes no chute potente e na queda. A revisão artística completa das folhas e transições segue pendente, inclusive a alternância das pernas nas caminhadas e a ultimate.

Implementados golpes e sequências solicitados, incluindo tiros aéreos com recuo, continuação confirmada dos combos, soco forte carregável por tempo ilimitado com bônus de 10% por segundo até 30%, agarrões com laço e arremesso gradual, e seis disparos da ultimate. Os valores e a apresentação dependem de conferência em jogo. As verificações automatizadas cobrem ambos os jogadores, acertos, bloqueios, carregamento, combos e trajetória dos agarrões; uma inspeção parcial no treino conferiu repouso e um disparo com caixas visíveis. Falta verificar todas as ações, transições, hitboxes e bordas em jogo. Nenhuma aprovação artística é presumida.

Instalação reproduzível realizada; 426 testes, build e checagem de diff aprovados localmente. Ainda faltam a validação final conjunta, commit, push e CI remota; nenhum merge autorizado.

## Cowboy — correções de quadros e recuperação — 2026-10-31

Continuação local de `codex/feature-cowboy-animacoes`, dependente do trabalho ainda não commitado de animação e de `codex/feature-cowboy-zoner`. O preparo de atlas usa uma escala única por folha, eliminando a diferença de escala introduzida entre linhas; escalas dos golpes agachados foram aproximadas à postura de agachamento. Recortes foram ajustados para manter pés e braços espectrais dentro do quadro correto e remover fragmentos desconectados de quadros adjacentes. O salto foi editado com a ferramenta integrada de geração de imagens, a partir da folha existente e da referência canônica, para remover a dobra extra do chapéu. As propostas geradas para caminhada não apresentaram alternância suficiente e não substituíram as fontes existentes: caminhada e recuo seguem pendentes.

Após ataques agachados a reprodução retorna diretamente ao ciclo agachado em vez de reiniciar a entrada em pé; regressão cobre ambos os jogadores. A coronhada passou de 7 para 11 quadros de preparo e de 16 para 20 de recuperação, valores provisórios. A poeira dos chutes fracos ficou maior e animada dentro da hitbox ativa, inclusive nos três pisões. No treino, idle, agachamento e acerto do chute fraco agachado foram observados com caixas visíveis; a verificação quadro a quadro de todas as poses, do especial antiaéreo, do combo inteiro, ambos os lados e bordas, além da aprovação artística, continua pendente. Sem commit, push ou CI remota; não integrar sem autorização explícita.

Uma ponta do clarão do especial forte ainda está cortada na imagem fonte; uma tentativa de substituição criou braços espectrais soltos e foi descartada. A conferência no treino antecedeu o último ajuste de escala dos chutes agachados, que ainda precisa ser verificado em execução. Instalação reproduzível, 403 testes, build e diff aprovados localmente; o instalador informa quatro vulnerabilidades nas dependências (duas moderadas e duas críticas), sem atualização automática fora do escopo.

## Cowboy — revisão de arte, combo agachado e mobilidade — 2026-10-31

Continuação na `codex/feature-cowboy-animacoes`, dependente das alterações locais anteriores e de `codex/feature-cowboy-zoner`. Recriadas com a ferramenta integrada de imagens e a referência canônica as folhas de repouso, pulo, guarda, caminhada, golpes agachados, especiais, afastamento e tiros do combo, entre outras; as fontes usam fundo magenta e seus atlas usam transparência. Os prompts pediram poses e proporções consistentes, apoio estável, mãos humanas completas e disparos azuis; o pulo teve o ornamento extra do chapéu removido. Ajustadas âncoras e cadência das poses, inclusive no pulo e na recuperação dos especiais. As caminhadas ainda precisam de revisão artística: a alternância das pernas continua pouco evidente. A alternância de mãos e as transições de todos os golpes também precisam de conferência visual completa.

Adicionado o combo manual agachado `1,1,1`: duas coronhadas seguidas de tiro azul, com folha própria para a finalização e cada entrada exigida separadamente. A velocidade de movimentação e a altura do pulo aumentaram; o chute de afastamento empurra 100 unidades ao longo de 12 quadros e derruba no acerto, sem derrubar na defesa. Os valores são provisórios. O projétil substituto também é azul.

No treino foram conferidos parcialmente repouso, agachamento, coronhada, especial e antiaéreo com caixas visíveis; testes automatizados cobrem ambos os lados, afastamento, defesa e combo. Ainda faltam conferir visualmente o ciclo completo das animações, o combo inteiro, os dois lados e as bordas, além de aprovar a arte e o balanceamento. Instalação reproduzível, 400 testes, build e diff aprovados localmente. Sem commit, push ou CI remota; não integrar sem autorização explícita.

## Cowboy — caixas e animações recriadas — 2026-10-31

Continuação em `codex/feature-cowboy-animacoes`, preservando o trabalho local dependente de `codex/feature-cowboy-zoner`. A pedido do usuário, recriadas com a ferramenta integrada de geração de imagens e a referência canônica as folhas de socos em pé, quatro básicos aéreos, entrada/saída de agachamento e tiro de outra mão; fontes magenta e atlas ativos ficam em `src/assets/sprites/characters/cowboy`. Os prompts pediram identidade e tamanho consistentes, quadros separados, apoio estável, pernas recolhidas no ar, tiro aéreo diagonal e retorno à postura. As folhas de soco sem braços incorporados usam a camada espectral existente também durante a atividade. As fontes substituídas e a folha antiga de combo sem uso foram retiradas; o ciclo agachado usa os quadros da própria transição para manter a mesma proporção.

Os dois dashes distribuem suas seis poses pelos 24 quadros do deslocamento; tiros do combo usam uma folha distinta nas entradas 2 e 4 e animam recuperação após a atividade. A rasteira passa de 16/32 para 10/26 quadros de preparação/recuperação, preservando dano, alcance e queda; a hurtbox aérea passa de 147,03 para 125 unidades de altura. Uma poeira procedimental fica dentro da hitbox ativa dos chutes fracos em pé e agachado. `docs/animacao.md` registra a conferência de caixas e ausência de teleporte como procedimento para futuras alterações.

Revisão visual no treino: pose agachada, soco em pé, tiro aéreo e poeira do chute fraco no P1, com caixas visíveis; a caixa aérea foi revista após o ajuste. Testes cobrem raiz e geometria para os dois jogadores, espelhamento, progressão de dash, recuperação e alternância de textura do combo, e queda da rasteira. Ainda falta conferir visualmente todas as fases e extremos dos dois lados, executar o combo completo em jogo e aprovar sua legibilidade artística; a troca de mãos da arte precisa de verificação humana. Instalação reproduzível, 391 testes, build e diff aprovados localmente. Sem commit, push ou CI remota; não integrar sem autorização explícita.

## Cadência de animação por ação — 2026-10-30

Continuação local na `codex/feature-cowboy-animacoes`, dependente do trabalho ainda não commitado das animações da Cowboy e da branch `codex/feature-cowboy-zoner`; não há base limpa para separar esta entrega sem transportar esse trabalho. O usuário pediu cadências independentes inspiradas na animação tradicional e em Skullgirls. A reprodução compartilha amostragem por taxa ou duração de cada desenho; fases com duração de combate fixa usam pesos autorados para antecipação e recuperação, preservando contato e simulação em 60 Hz. Cadências distintas aplicadas aos ciclos do Shoto e da Cowboy, golpes e combo do Shoto, golpes da Cowboy e efeitos de projétil e impacto. Valores são provisórios, sujeitos a avaliação do usuário.

Algumas poses ainda não têm sequências próprias, incluindo reações e golpes agachados do Shoto; partes especiais de transição e combos da Cowboy continuam com seleção por fase específica. As caminhadas e o combo visual da Cowboy ainda precisam de arte corrigida, conforme a seção seguinte. A revisão visual alcançou treino e um disparo da Cowboy; ainda falta conferir todas as ações, ambos os lados, bordas e o ritmo completo em jogo. Instalação reproduzível, 386 testes, build e diff aprovados localmente; sem commit, push ou CI remota. Nenhuma aprovação artística de ritmo foi presumida; a entrega permanece em andamento e não deve ser integrada sem autorização.

## Cowboy — revisão de movimento e afastamento — 2026-10-30

Continuação local na branch `codex/feature-cowboy-animacoes`, com as alterações anteriores preservadas. O idle recebeu âncoras horizontais individuais no manifesto e atlas regenerado; falta revisar o alinhamento dos demais movimentos. No acerto, o chute de afastamento agora desloca 70 unidades ao longo de 12 quadros de combate, depois do hitstop; bloqueio permanece com seu deslocamento anterior. Testes cobrem os dois lados e a pausa no impacto. O padrão de fundo magenta para futuras fontes de personagem foi registrado em `identidade-visual.md`.

O usuário aprovou e pediu a integração das quatro propostas: agachamento contínuo, dash frontal, dash traseiro e materialização espectral. As fontes magenta e os atlas transparentes são preparados pelo mesmo script; o efeito aparece como camada independente atrás do personagem antes e após as poses de disparo. Na inspeção em treino foram observados agachamento, dash frontal, dash traseiro e disparo; escala do agachamento e corte do dash frontal foram corrigidos e revistos. Ainda falta conferir ciclos completos, todos os disparos, ambos os lados e extremos da arena.

As propostas anteriores de caminhada, recuo e combo não representam claramente os passos alternados e a troca de mãos, respectivamente, e precisam ser refeitas. A revisão de alinhamento dos demais movimentos, novas caminhadas e combo revisado continua pendente. Instalação reproduzível, 384 testes e build aprovados localmente; alterações ainda sem commit ou push e sem CI remota. Esta branch contém trabalho em andamento e depende da branch de personagem ainda não integrada; não integrar em development sem autorização explícita.

## Cowboy — animações aprovadas — 2026-10-30

Branch `codex/feature-cowboy-animacoes`, dependente de `codex/feature-cowboy-zoner` em `0084b86`, ainda não integrada a development. O usuário aprovou a integração das propostas e suas correções. Fontes de 23 folhas de personagem e cinco de efeitos preservadas em `src/assets/sprites/characters/cowboy/source`; atlas reproduzíveis pelo script `scripts/prepare-cowboy-sprites.py`, com recorte, transparência, escala, separação de quadros e raízes registrados em `alignment.json`. Nenhuma alteração de colisão, dano ou tempos. Usadas as versões corrigidas dos socos, tiros aéreos, três pisões, chute frontal de afastamento e especial antiaéreo com duas armas. Efeitos de tiro horizontal, diagonal, rajada e impacto acompanham projéteis e relógio da simulação.

Seleção e combate usam sprites da Cowboy; idle, caminhada, recuo, agachamento, salto, defesas, básicos, especiais e combos têm mapeamento por fase. O quadro do salto com chapéu cortado foi omitido; reações sem arte própria usam idle, dash/backstep usam caminhada e guarda aérea usa defesa em pé. A proporção de folhas foi ajustada tecnicamente em relação ao idle; a arte do usuário e suas cores permanecem inalteradas. Revisão no build de produção: seleção, idle nos dois lados, salto, movimento e um disparo com impacto; ainda é necessária revisão manual completa das demais ações e transições em ambos os lados e bordas. Isso não invalida a aprovação das imagens, mas é uma limitação da conferência de animação em jogo.

Instalação reproduzível, 380 testes em 41 arquivos, build e diff aprovados. Regressões cobrem carregamento dos atlas, seleção de poses nas fases de ataque, três pisões, entrada em agachamento e guarda, espelhamento e ausência do quadro de salto cortado. Branch local com alterações ainda sem commit ou push, pois a revisão visual completa em jogo permanece pendente; CI remota não executada. Não integrar em development sem autorização explícita.

## Cowboy — turnaround canônico — 2026-10-30

O usuário definiu a imagem fornecida como referência canônica da Cowboy. Arquivo original preservado sem alterações em [turnaround.png](assets/art/characters/cowboy/turnaround.png), com vistas, figurino e elementos espectrais para orientar futuras artes. Esta referência não é uma spritesheet nem foi integrada à apresentação do jogo; a geometria temporária continua em uso. A aprovação da referência não implica aprovação de animações futuras. Instalação reproduzível, 375 testes, build e diff aprovados; envio e CI remota a conferir.

## Cowboy — combos de chutes e tiros — 2026-10-30

Na branch `codex/feature-cowboy-zoner`, adicionadas manualmente as receitas `3,3,3` e `1,2,2,2`, com uma entrada por golpe. Na sequência de tiros os preparos provisórios são 8, 10, 32 e 32 frames. Os dois tiros finais preservam a confirmação quando os anteriores acertam, inclusive com projéteis em voo; após bloqueio a receita pode continuar e o preparo expõe uma janela de punição. O defensor que soltar a guarda também pode ser atingido. A extensão de recuperação da receita considera o tempo de deslocamento dos projéteis; balanceamento e sensação dos tempos aguardam avaliação.

Instalação reproduzível, 375 testes em 40 arquivos, build e diff aprovados. Regressões verificam entradas individuais, acertos em curta e longa distância, punição após bloqueio e soltura da guarda, nos dois lados. No navegador, treino e primeiros dois tiros foram conferidos; a execução manual completa dos combos ainda precisa de conferência. Arte própria e aprovação artística pendentes; envio e CI remota a verificar.

## Cowboy — tiros especiais de perto — 2026-10-30

Na branch `codex/feature-cowboy-zoner`, `d,df,f,1` passa a ser tiro alto à queima-roupa (120 de dano provisório), e `d,df,f,2` um tiro alto antiaéreo de perto (140 de dano provisório). Ambos são projéteis de vida curta; o segundo sobe em diagonal. Eles erram alvos agachados e podem ser bloqueados. Os socos básicos e o especial de afastamento permanecem. Dano, alcance e tempos aguardam revisão de balanceamento.

Instalação reproduzível, 365 testes em 40 arquivos, build e diff aprovados. Regressões verificam dano, bloqueio, erro à distância e contra agachado, além de acerto antiaéreo próximo, nos dois lados. Arte e aprovação visual continuam pendentes; envio e CI remota a verificar.

## Cowboy projectile zoner — 2026-10-30

Continuação em `codex/feature-cowboy-zoner`: altura da hurtbox em pé 157,54 contra 182,16 do Shoto (proporção 1,60/1,85); corpo e demais posturas ajustados. Socos básicos em pé disparam horizontalmente, socos aéreos em diagonal para baixo, e `d+2` dispara em diagonal para cima. `d+1` é coronhada próxima; chutes em pé e abaixados têm alcance curto e atingem baixo, com `d+3` rápido e `d+4` como rasteira que derruba apenas no acerto. Chutes aéreos mantêm contato próximo. Queda usa recuperação e invencibilidade de retorno do alvo. Especiais anteriores de disparo e afastamento permanecem. Sem novas receitas, arte ou ultimate; geometria e balanceamento são provisórios.

Instalação reproduzível, 361 testes em 40 arquivos, build e diff conferidos. Regressões cobrem direção dos disparos nos dois lados, proporção, alcance baixo e rasteira no acerto, bloqueio e erro. Treino e geometria provisória conferidos no navegador; aprovação visual e balanceamento seguem pendentes. Envio e CI remota a verificar.

## Cowboy zoner — 2026-10-30

Branch `codex/feature-cowboy-zoner`, baseada em `origin/development`. Protótipo jogável com quatro básicos em pé, quatro aéreos, quatro abaixados, antiaéreo, dois disparos e golpe próximo de afastamento. Hitboxes, hurtboxes, dano, tempos e comandos são provisórios e aguardam revisão de design e balanceamento. Nenhuma receita de combo foi criada. Ainda não há ultimate nem arte própria; seleção identifica a arte pendente e o combate usa geometria de diagnóstico, sem reutilizar sprites do Shoto.

Comandos provisórios: `d,df,f,1` disparo rápido; `d,df,f,2` disparo pesado; `d,df,f,4` afastamento; `d+2` antiaéreo. Instalação reproduzível, 356 testes em 40 arquivos e build aprovados. No navegador, seleção e entrada no treino com Cowboy conferidas; geometria temporária visível nos dois lados. Aprovação artística e balanceamento pendentes. CI remota e integração não presumidas; integração exige autorização explícita.

## Integração de tela e combate — 2026-10-29

Por pedido explícito, `codex/feature-tela-adaptavel` foi integrada em `development`, incluindo tela adaptável, HUD, rage, atalho da ultimate e escolha do golpe forte. A validação local passou com 352 testes, build e diff; [CI da branch aprovada](https://github.com/feittosaa/close-combat/actions/runs/40920303484). Integração enviada em `5813bf3`, com [CI de development aprovada](https://github.com/feittosaa/close-combat/actions/runs/40920495118). Após conferir ancestralidade e ausência de outros checkouts e PRs abertos, a branch integrada foi encerrada localmente e no remoto. `sprites/shoto` continua separada.

## Escolha do golpe forte — 2026-10-29

Na branch `codex/feature-tela-adaptavel`, após soco forte confirmado não se pode continuar com golpe fraco nem chute forte; após chute forte confirmado não se pode continuar com golpe fraco nem soco forte. A mesma opção forte respeita as receitas existentes; levantamento confirmado reinicia a sequência. Integração em `development` autorizada pelo usuário. Instalação reproduzível, 352 testes em 39 arquivos, build e diff aprovados; regressões verificam as quatro entradas após cada forte nos dois lados, retorno ao neutro, progressão fraco-forte e levantamento. Envio e CI em andamento.

## Treino, final forte e atalho de ultimate — 2026-10-29

Na branch `codex/feature-tela-adaptavel`, o treino permite recuperar rage e repetir ultimate; os modos de combate mantêm o limite de uma ultimate e a rage bloqueada após uso. Combo fechado forte confirmado encerra a sequência até sua recuperação, sem impedir a continuação dos levantamentos. Atalho configurável de ultimate para cada jogador: U no P1 e Num5 no P2; o comando original continua disponível e ambos seguem as mesmas regras de rage e ativação. Instalação reproduzível, 348 testes em 39 arquivos, build e diff aprovados. Conferidos no jogo os atalhos configuráveis e a ativação com U; regressões cobrem repetição no treino, encerramento do combo forte, atalho após socos, os dois jogadores e migração dos controles existentes. Envio e CI a conferir.

## Rage entre rounds e apresentação — 2026-10-29

Na branch `codex/feature-tela-adaptavel`, a rage de cada personagem persiste entre rounds e é zerada ao reiniciar a partida. Após ultimate, continua sem recarregar. Barra de rage recebeu moldura angular, brilho e indicador de carga completa; título destacado no menu recebeu tipografia mais pesada. Instalação reproduzível, 340 testes em 39 arquivos, build e diff aprovados. Conferidos no navegador o destaque de Configurações e a barra no treino; regressão verifica a rage de ambos os lutadores entre rounds e após reset. Aprovação visual pendente; envio e CI a conferir.

## Menu, HUD e rage — 2026-10-29

Na branch `codex/feature-tela-adaptavel`, o destaque do menu usa tamanho uniforme e impede quebra de linha. HUD ocupa a largura disponível: vida, rage e entradas de treino ficam nas extremidades, mantendo a escala; barra de rage maior junto à parte inferior. Shoto passa de 100 para 200 de capacidade e custo, com ganhos por contato inalterados. Após usar a ultimate, não acumula mais rage naquela partida; o limite é restabelecido ao reiniciar. Barras de vida avançam em direção ao cronômetro. Cada jogador pode ativar uma ultimate por partida, inclusive ao trocar de round; reiniciar a partida libera nova ativação. No treino, reiniciar também libera outra ativação. Instalação reproduzível, 339 testes em 39 arquivos, build e diff aprovados. Conferidos no jogo o destaque de Configurações, as barras de vida e a rage 0/200 no treino; regressões cobrem HUD largo, uso da ultimate entre rounds e bloqueio de recarga nos dois lados, inclusive no treino. Aprovação visual pendente; envio e CI em andamento.

## Tela adaptável — 2026-10-29

Branch `codex/feature-tela-adaptavel`, criada a pedido a partir de `development`. Adaptar menus e cenário ao tamanho da janela, preservando escala relativa dos lutadores e HUD, câmera fixa e simulação. Manter `sprites/shoto` separada. Canvas acompanha a janela; HUD conserva a composição central e a escala, enquanto a câmera mantém zoom lógico e simulação. O cenário usa laterais espelhadas nas paredes e uma cópia de fundo para cobrir proporções extremas sem esticar a imagem. Instalação reproduzível, 334 testes em 39 arquivos, build e diff aprovados; navegador conferido em janela estreita/alta, menu e treino. Proporções largas verificadas por regressões geométricas, ainda sem conferência visual em monitor ultrawide; aprovação visual pendente. Envio e CI a conferir.

## Integração em development — 2026-10-29

Por pedido explícito, integradas em `development` as branches encadeadas `codex/fix-janela-punicao-maior`, `codex/feature-selecao-cenarios-alcance`, `codex/fix-ultimate-combo-reinicio` e `codex/fix-chutes-alcance-controles`. A branch `sprites/shoto` permanece separada por orientação expressa e só será integrada a pedido. Por enquanto, não criar novas branches e trabalhar diretamente em `development`. Instalação reproduzível, 331 testes, build e diff aprovados. Integração enviada em `b47da23`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40902181768). Após conferir ancestralidade, ausência de outros checkouts e PRs abertos, as quatro branches integradas foram removidas localmente e no remoto. Aprovação visual permanece pendente.

## Chutes, alcance e controles — 2026-10-29

Branch `codex/fix-chutes-alcance-controles`, dependente de `codex/fix-ultimate-combo-reinicio` em `88a548f`, ainda não integrada. Chutes aéreos que erram e aterrissam em recuperação preservam a recuperação vulnerável; chutes bloqueados continuam sem defesa durante a recuperação. Larguras horizontais das caixas corpo a corpo do Shoto aumentadas em mais 10%, incluindo agarrões e especiais diretos, sem mudar projéteis. Menu de controles atualizado com painéis e botões angulares da identidade dos demais menus. Instalação reproduzível, 331 testes em 39 arquivos, build e diff aprovados. Regressões cobrem chutes bloqueados dos dois lados e aterrissagem em recuperação no vazio. Conferidos no navegador o menu de controles, captura e cancelamento de tecla, retorno ao menu e acesso ao treino. Aprovação visual do usuário pendente; envio e CI em andamento.

## Ultimate em combo e atalho de reinício — 2026-10-29

Branch `codex/fix-ultimate-combo-reinicio`, dependente de `codex/feature-selecao-cenarios-alcance` em `c53a2b8`, ainda não integrada. O atalho configurado de reinício atua apenas no treino livre; PvP, Arcade e tutoriais não reiniciam por ele. Removidas as instruções de reinício do HUD e do resultado do Arcade; pausa/retorno ao menu e progresso do Arcade preservados.

Ultimates acionadas após acertos podem cancelar para a preparação cinematográfica completa; comandos armazenados durante uma ação também aguardam o caminho de ativação, evitando lançar o projétil sem beber. Regressões cobrem `1,1,ultimate` nos dois lados, os 150 ticks da ativação, ausência de projétil durante ela e comando armazenado até o fim de um golpe no vazio. No treino, conferida a animação de beber após socos; R reinicia o treino e não reinicia PvP ou Arcade. Instalação reproduzível, 325 testes em 39 arquivos, build e diff aprovados. Implementação enviada em `555c65e`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40896774367).

## Alcance, seleção de cenário e continuidade de combos — 2026-10-29

Branch `codex/feature-selecao-cenarios-alcance`, dependente de `codex/fix-janela-punicao-maior` em `66fd55d`, ainda não integrada. Ampliar em 10% a largura horizontal das caixas corpo a corpo do Shoto, incluindo básicos, agachados, aéreos, potentes, agarrões e especiais diretos, sem alterar projéteis, hurtboxes ou tempos de contato. Regressão confirma punição após bloqueio à distância 114, antes fora do alcance do soco fraco, nos dois lados.

Seleção de cenário substituída por grade central 3×3, com vagas vazias, prévia da arena em fundo ao passar o ponteiro ou navegar pelo teclado e confirmação do cenário selecionado. A seleção de personagem ocupa toda a área do jogo; personagens idle ficaram maiores e mais próximos das extremidades. Não há novas imagens nem recoloração. Conferência em Arcade e PvP: prévias do Bar e do Salão, ponteiro, teclado e início de luta no Salão. Áreas externas ao canvas permanecem sujeitas ao enquadramento proporcional da janela.

Combos fechados de socos confirmados: recuperação final 10F em `1,1,1`, 30F em `2,2,2`; atacante e alvo no chão recuperam o controle juntos. Uma continuação iniciada enquanto o alvo ainda está em hitstun mantém a reação através do preparo e atividade do próximo golpe, inclusive se ele tentar defender, permitindo 1,1,1 → 2,2,2 quando a continuação começa perto do fim da reação. Sem criar novas receitas. Levantamento `1,1,2`, limite de força e recuperação da sequência no vazio preservados. Testes de regressão nos dois lados e com defesa pressionada; balanceamento permanece provisório.

Validação local: instalação reproduzível, 317 testes em 38 arquivos, build e diff aprovados. Implementação enviada em `03a9945`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40893157022); aprovação artística e integração em `development` não inferidas.

## Recuperação bloqueada ampliada — 2026-10-29

Branch `codex/fix-janela-punicao-maior`, baseada em `development` após a integração de menus e combate. O usuário relatou dificuldade para punir manualmente na janela anterior de 9/16 frames. Recuperação de golpes diretos bloqueados ampliada para oferecer ao defensor no mínimo 24 frames (0,4 s) contra leves e 36 frames (0,6 s) contra fortes, depois de terminar o blockstun. O atacante mantém sua recuperação vulnerável e não pode bloquear, agachar para evitar a resposta nem cancelar em outro golpe durante ela; os sprites usam a recuperação real até retornar ao estado normal. Acerto e erro mantêm os tempos anteriores; projéteis preservam a recuperação natural conforme escolha do usuário.

Validação local: instalação reproduzível, 311 testes em 38 arquivos, build e diff aprovados. Regressões incluem resposta após atraso de 12 frames e aproximação, quatro básicos, ambos os lados e tentativas de defesa alta/baixa, além da exposição até o fim e retorno ao idle. No treino, o HUD mostrou −24F para o leve e −36F para o forte, com o defensor livre antes do atacante. Envio e CI remota a conferir; sem nova integração autorizada.

## Seleção compartilhada e pausa

O usuário autorizou a integração das branches de menu e de punição em `development`. As duas foram integradas em `d0b680a`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40873483006), e encerradas localmente e no remoto após conferência de ancestralidade e ausência de outros checkouts. A aprovação artística permanece pendente. As observações de ausência de integração abaixo registram o estado anterior.

Pedido atual: fundo do menu principal preto provisoriamente; navegação e personagem mantidos. A ilustração anterior continua em uso nas telas de cenário e configurações.

Revisão visual: grade de personagens centralizada em 3×3, caixa aleatória separada e título central; seleção de cenário com painéis e botões angulares, profundidade e imagens originais; pausas de treino e partida com superfícies em camadas e botões no mesmo estilo. Conferidos no jogo seleção solo/PvP, troca de cenário e pausas de treino/partida. Instalação, 298 testes, build e diff aprovados; aprovação visual do usuário pendente e CI remota a conferir.

A seleção agora mantém nove caixas para personagens, incluindo vagas vazias, e uma caixa separada para escolha aleatória. A opção sorteia apenas personagens disponíveis ao confirmar, com seleção independente no PvP e navegação pelo teclado. Validação local: instalação reproduzível, 298 testes, build e diff; jogo conferido no treino e no PvP, inclusive confirmação aleatória dos dois jogadores. A aprovação visual permanece pendente; CI remota a conferir.

Branch `codex/feature-menu-hud`: seleção de personagem unificada para Arcade, PvP, treino e ambos os tutoriais, com dois painéis de lutadores e grade central inspirados na referência fornecida. PvP mantém confirmações independentes; nos demais modos o segundo painel apresenta o adversário. Pausa de partida e de treino atualizadas com a linguagem angular, cores e tipografia do menu principal, preservando os controles e ferramentas de treino. Sem nova arte ou alteração das cores dos sprites.

Validação local: instalação reproduzível, 297 testes em 37 arquivos, build e verificação de diff. No navegador: seleção nos cinco modos, confirmações de ambos os jogadores no PvP, entrada na partida e pausas de partida e treino. A aprovação artística do usuário permanece pendente. Envio e CI remota a conferir.

Regras gerais: [base.md](base.md). Arte: [identidade-visual.md](identidade-visual.md). Entrega: [AGENTS.md](AGENTS.md).

Este é o único documento Markdown para estado de implementação, decisões de personagens/cenários, números específicos, pendências, validações e histórico de entregas. As seções históricas não prevalecem sobre o estado vigente.

## Menus e HUD — 2026-10-28

Branch `codex/feature-menu-hud`, criada a pedido do usuário a partir de `main` no merge `e38be82`. A branch anterior foi integrada em `development` no commit `010091a`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40808247508), e promovida para `main` com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40808411107). Após conferir ancestralidade e ausência de trabalho ativo, a branch anterior foi removida localmente e no remoto. Por decisão explícita do usuário, `development` permanece em `010091a`, sem receber o commit de merge de `main`. O pedido posterior encerra a restrição temporária anterior de criação de branches.

- [x] Menu principal com modos em lista vertical à esquerda, destaque angular de grande escala, personagem do jogo e cenário original à direita. Hover, foco e setas atualizam a seleção, descrição e animação; Enter confirma a opção selecionada. A preferência por movimento reduzido desativa a transição e mantém o retrato estático. Nenhuma imagem foi recolorida ou criada.
- [x] HUD usa a mesma paleta e tipografia, com marcador angular para o relógio; barras contínuas e métricas da simulação preservadas. Seleção de personagem/cenário, pausa e controles receberam ajustes de cor e tipografia coerentes.
- [x] npm ci, 297 testes/37 arquivos, build e diff aprovados. No jogo a 1280×720: navegação por Tab/setas/Enter, seleção de modo longo, controles e retorno, treino, pausa, confirmação independente no PvP e seleção de cenário; HUD conferido com acerto e vida real. Console sem erros/avisos. Imagens locais: /tmp/close-combat-novo-menu.png, /tmp/close-combat-novo-hud.png e /tmp/close-combat-nova-pausa.png. A preferência de movimento reduzido é respeitada pelo código; confirmação artística do usuário permanece distinta da validação técnica.
- [x] Implementação enviada em `994f6e5e079602ba2e71a95e80d777ec230ef6b1`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40809334922). Branch pronta para revisão, sem integração do novo menu e HUD; fechamento documental com CI própria conferida antes do relato final.
## Punição após bloqueio

Branch `codex/fix-punicao-bloqueio`, baseada em `main`. Ajuste: recuperação de golpes diretos bloqueados garante janela mínima de 9 frames para entradas leves e 16 para fortes; cancelamentos de receitas ficam indisponíveis após bloqueio, mantendo as receitas no acerto e no vazio. Golpes aéreos bloqueados mantêm recuperação ao aterrissar. Os números são provisórios. Por confirmação do usuário, projéteis mantêm recuperação natural e não interrompem o lançador após sua recuperação. No treino, soco leve bloqueado mostrou −9F e forte −16F para o atacante. Testes confirmam que o atacante é atingido mesmo segurando defesa durante essa janela, nos dois lados e para socos leves e fortes, e pode defender novamente após a recuperação. Instalação reproduzível, testes, build e diff conferidos; envio e CI remota a verificar. Sem integração.

## Limpeza de branches antigas — 2026-10-28

Por solicitação explícita, removidas localmente e no remoto dez branches anteriores: `codex/feature-arco-garrafa-ultimate`, `codex/feature-personagens-maiores`, `codex/feature-ritmo-combate`, `codex/feature-ritmo-combos-distancia`, `codex/feature-sequencias-abertas-shoto`, `codex/fix-agarrao-cores-originais`, `codex/fix-carregamento-impacto-aereo`, `codex/fix-recuperacao-launcher-garrafa`, `codex/fix-tempo-alcance-agarrao` e `codex/fix-trajetoria-juggle`.

Antes da remoção, conferidos remoto atualizado, ausência de pull requests abertos, único checkout ativo e ancestralidade de cada ponta na branch atual `codex/fix-limite-levantamentos`; os commits e mudanças permanecem no histórico dessa branch. As entregas ainda não foram integradas em `development`. Preservadas a branch atual, `development`, `main` e as tags. As menções históricas à preservação das antigas referências descrevem o estado anterior a esta limpeza.

## Animação autorada dos três socos fracos — 2026-10-28

Trabalho mantido em `codex/fix-limite-levantamentos`, conforme orientação vigente de não criar branches.

- [x] Usuário confirmou três entradas: 1,1,1, sem quarto golpe. Folha RGBA fornecida com oito poses; por ajuste explícito, frame 5 retirado e sete poses preparadas com recorte, transparência técnica para retirar somente marcadores numéricos e alinhamento de raiz/pés, sem recoloração ou redesenho. Fonte ativa preservada para reprodução.
- [x] Impactos nos frames originais 3 (ombrada), 6 (gancho) e 7 (tapa voltando); frame 1 sai do idle e frame 8 retorna ao idle. Cada entrada seleciona somente sua etapa; interromper após um ou dois socos executa a recuperação dessa etapa. 1,1,2 compartilha os dois primeiros desenhos e mantém o forte final existente. Receitas, dano, tempos e caixas não alterados; socos aéreos/abaixados e demais golpes preservados.
- [x] npm ci, 297 testes/37 arquivos, build e diff aprovados. Preparo/verificação reproduzíveis: 141 células no conjunto, sete da folha nova, raízes/pés fixos e sem cortes no atlas. Regressões verificam impactos 3/6/7 e retorno 8 em ambos os lados, interrupção após 1/2/3 entradas, reinício por ombrada, 1,1,2 com forte final, hitstop e FPS determinísticos. Conferência no jogo por comandos legais de 1,1,1, retorno após soco isolado e ombrada espelhada do P2 em modo manual. Console sem erros/avisos; evidências /tmp/shoto-combo-impacto-3.png, /tmp/shoto-combo-impacto-6.png, /tmp/shoto-combo-impacto-7.png, /tmp/shoto-combo-retorno-8.png e /tmp/shoto-combo-espelhado.png. Fonte e cores originais preservadas; sem inferir homologação artística final.
- [x] Implementação enviada em `6d9ba6e92ff7d915b79379f49b8a259159e72453`, na branch atual `codex/fix-limite-levantamentos`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40793941081). Nenhuma branch nova, merge, promoção ou release. Fechamento documental enviado na mesma branch, com CI própria conferida antes do relato final.

## Fluxo temporário de trabalho — 2026-10-28

Orientação anterior: não criar novas branches e manter pushes em `codex/fix-limite-levantamentos`. Encerrada por pedido explícito posterior de integrar essa branch em `development` e `main` e criar uma nova branch para menus e HUD.

## Um levantamento por sequência — 2026-10-28

Branch `codex/fix-limite-levantamentos`, dependente de `codex/feature-personagens-maiores` em `229a318`, ainda não integrada.

- [x] Primeiro levantamento confirmado mantém trajetória, recuperação curta e reinício do atacante. Um novo levantamento durante o juggle leva o alvo ao piso no mesmo contato, cancela velocidade/suspensão aérea e inicia queda protegida, preservando dano e micro pausa. A recuperação no chão cobre pelo menos a recuperação restante do atacante. Golpes aéreos comuns continuam permitidos; depois de levantar/recuperar o controle ou resetar a partida, um novo levantamento é permitido. Capturas da ultimate mantêm seu contrato.
- [x] npm ci, 295 testes/36 arquivos, build e diff aprovados. Regressões nos dois lados cobrem primeiro/segundo levantamento, dano, ida imediata ao piso, limpeza do voo, micro pausa, proteção, recuperação e novo levantamento após retorno ao controle/reset. Conferência no jogo por entradas legais: 1,1,2 → 1,1,2 conecta seis impactos, vida 850/1000, alvo no chão imediatamente no segundo launcher, recuperação protegida 24F contra 10F restantes do atacante. Console sem erros/avisos; evidência /tmp/shoto-segundo-levantamento-chao.png. Sem alteração de arte.
- [x] Implementação enviada em `ce9b6198d0d8a931ec599091735b0bd186bb53bb`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40758348359). Sem merge, promoção ou release; fechamento documental com CI própria conferida antes do relato final.

## Personagens maiores e acompanhamento vertical — 2026-10-28

Branch `codex/feature-personagens-maiores`, dependente de `codex/fix-recuperacao-launcher-garrafa` em `89adb4d`, ainda não integrada.

- [x] Desenho, corpo, hurtboxes, hitboxes e deslocamentos ampliados em mais 10%; escala uniforme sem recoloração ou mudança de arte. Tempos, dano, caminhada, salto e física preservados. Garrafa da ultimate mantém a redução relativa já solicitada.
- [x] Zoom fixo 1,6 preservado. Acompanhamento vertical passa de 40% para 60% da subida, limitado a manter os pés do personagem no chão 16 pixels acima da borda inferior. Margem lateral proporcional 64 → 70,4, sem arrastar o oponente parado. Escala e imagens dos cenários preservadas.
- [x] npm ci, 293 testes/36 arquivos, build e diff aprovados. Conferência no jogo de chão, salto/pouso e afastamento máximo 499,2, com ambos inteiros nas bordas e acompanhamento vertical sem zoom dinâmico. Console sem erros/avisos. Evidências /tmp/shoto-maior-chao.png, /tmp/shoto-maior-salto.png e /tmp/shoto-maior-bordas.png. Testes do catálogo completo verificam cobertura em toda a viagem vertical: não é necessário aumentar a altura nem alterar as proporções dos cenários atuais. Sem alteração de imagem ou aprovação artística inferida.
- [x] Implementação enviada em `6bbbbd4d7a646151c82a180d0f6d418db514da75`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40757181796). A conferência combinada /tmp/shoto-maior-launcher-fraco.png confirma fraco iniciado depois de 1,1,2 com as caixas maiores. Remoto auditado: development `ba2d46f` e main `be7d340` preservadas. Sem merge, promoção ou release; fechamento documental tem sua própria CI conferida antes do relato final.

## Recuperação dos levantamentos e garrafa menor — 2026-10-28

Branch `codex/fix-recuperacao-launcher-garrafa`, dependente de `codex/feature-ritmo-combos-distancia` em `70bec33`, ainda não integrada. Pedido: levantamentos confirmados recuperam mais rápido para permitir continuar o combo; diminuir um pouco a garrafa da ultimate.

- [x] Metadados do launcher reúnem velocidade de lançamento e recuperação do autor. No acerto final de `1,1,2`, recuperação do ataque passa de 23 para 6 ticks, sem encurtar preparo/atividade, pular elapsedFrames ou alterar o soco forte isolado, no bloqueio ou no erro. Duração efetiva compartilhada por simulação, previsão de recuperação, animações e HUD; levantamento preserva velocidade -10, gravidade/juggle e comandos. Por pedido posterior, o levantamento confirmado limpa a receita e reinicia o piso de força, liberando fracos novamente; demais fortes continuam impedindo forte → fraco.
- [x] Garrafa da ultimate reduzida em 20% por dimensão: 69 × 55,2 → 55,2 × 44,16. Deslocamento Y -187,68 conserva o centro na altura do topo do personagem (-165,6). Desenho geométrico e caixa continuam compartilhados; arco, velocidades, dano, pausa e captura/isqueiro preservados. Sem imagens novas ou recoloração.
- [x] Instalação reproduzível, 293 testes/36 arquivos, build e diff aprovados. Conferência no jogo por comandos legais: launcher recupera em 6 ticks, continuação aérea forte conecta, fraco pode iniciar nova receita após levantamento, garrafa menor conserva saída alta/arco. Console sem erros. Evidências em /tmp/shoto-launcher-recuperacao-6.png, /tmp/shoto-launcher-continuacao-aerea.png, /tmp/shoto-launcher-reinicio-fraco.png e /tmp/shoto-garrafa-ultimate-menor.png. Sem alteração de arte ou aprovação artística inferida.
- [x] Implementação enviada em `89adb4dd635b4a24bd8ad97244ab9c72807fa878`, com [CI aprovada](https://github.com/feittosaa/close-combat/actions/runs/40756836346). Sem merge, promoção ou release. Fechamento documental registrado também na branch dependente de personagens maiores.

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
