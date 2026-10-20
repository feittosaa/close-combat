# Close Combat — Documento Principal de Design

> **Status:** documento-base inicial  
> **Versão:** 0.1.0  
> **Idioma:** português (Brasil)  
> **Título do jogo:** Close Combat  
> **Objetivo deste arquivo:** ser a referência central de design e implementação. Quando uma regra mudar, atualizar este documento para evitar que o código, os personagens e os sistemas sigam interpretações diferentes.

---

## 1. Visão geral

O projeto é um jogo de luta **100% 2D**, com partidas centradas em leitura do oponente, execução de comandos, defesa, agarrões, punições, vantagem de frames e controle de distância.

A direção de arte deve seguir o guia autoral em [`identidade-visual.md`](./identidade-visual.md): ilustração 2D de alta definição, silhuetas marcantes, poses expressivas, animação desenhada em quadros e a leitura imediata de um jogo de luta clássico. Esse guia é a base visual para personagens, cenários, efeitos, interface e materiais promocionais.

O combate é um jogo de luta técnico em plano 2D, com quatro botões de ataque, comandos simultâneos, agarrões, defesa, vantagem de frames, punições e golpes de execução precisa. Personagens, nomes, animações, trilha sonora, efeitos, interface e propriedades específicas devem ser originais.

### 1.1 Pilares de design

1. **Combate técnico, mas legível:** os jogadores devem conseguir entender por que um golpe acertou, foi defendido, foi punido ou perdeu a disputa.
2. **Poucos botões, muitas possibilidades:** quatro botões de ataque, direções, comandos simultâneos, sequências e decisões de tempo criam profundidade sem exigir uma lista enorme de botões.
3. **Precisão recompensada:** comandos executados no momento certo podem gerar versões superiores dos golpes, com risco e recompensa claros.
4. **Defesa ativa:** bloquear é importante, mas parries, esquivas verticais, quebras de agarrão e leitura do adversário devem criar decisões interessantes.
5. **2D de verdade:** não existe movimentação lateral de profundidade nem sidestep 3D. Distância, altura dos ataques, avanço, recuo, salto e agachamento formam o espaço de combate.
6. **Acesso fácil:** o jogo deve abrir em navegadores modernos e o código-fonte deve estar disponível no GitHub.

### 1.2 Objetivo da primeira versão jogável

Construir primeiro um protótipo sólido de combate local entre dois jogadores, com personagens de teste, cenário simples, comandos confiáveis e informação de frames. Conteúdo, efeitos e recursos online vêm depois de a base de luta funcionar.

---

## 2. Plataforma e direção técnica

### 2.1 Alvos

- **Plataforma principal:** navegador de computador moderno.
- **Distribuição pública:** repositório GitHub com código-fonte, instruções de execução e versões marcadas por release.
- **Demo hospedada:** build estático que possa ser publicado, por exemplo, no GitHub Pages.
- **Uso offline:** planejar suporte a PWA/cache offline depois que o fluxo principal estiver estável. O comportamento offline deve ser testado; não presumir que abrir `index.html` diretamente via `file://` funcionará em todos os navegadores.
- **Desktop nativo:** empacotamento futuro opcional, por exemplo com Tauri, caso passe a existir uma necessidade real de executável instalado.

### 2.2 Stack inicial sugerida

- **TypeScript** para tipos claros e manutenção do sistema de combate.
- **Vite** para desenvolvimento local e geração do build web.
- **Phaser** para renderização, cenas, animações, áudio e entrada de controles.
- **Motor de combate próprio**, separado do renderizador, para comandos, colisões de luta, hitboxes, hurtboxes, frames e resolução de ataques.
- **Vitest** ou ferramenta equivalente para testes unitários da lógica pura.

Phaser não deve decidir sozinho se um golpe acertou. A física genérica de um motor de jogo não substitui as regras específicas de um jogo de luta.

### 2.3 Regras técnicas fundamentais

- A simulação de combate usa **60 frames de lógica por segundo** como padrão inicial: um frame equivale a aproximadamente **16,67 ms**.
- A renderização pode variar conforme o dispositivo, mas a lógica de luta deve avançar em passos fixos e não depender da taxa de atualização do monitor.
- Separar claramente **simulação**, **renderização**, **entrada**, **dados dos personagens** e **interface**.
- As regras centrais devem poder ser testadas sem abrir o navegador ou renderizar sprites.
- A ordem de resolução dentro de cada frame deve ser determinística: ler entradas, atualizar estados, avançar animações de combate, verificar colisões, resolver hit/guard/parry/throw, aplicar stun e atualizar recursos.
- Nenhuma regra de vantagem ou execução deve depender apenas de temporizadores visuais em milissegundos; ela deve usar frames da simulação.

### 2.4 Distribuição pelo GitHub

O repositório deve conter o código-fonte e um README com os requisitos, comandos e controles. O fluxo inicial previsto é:

- `npm install` — instalar dependências.
- `npm run dev` — iniciar o servidor de desenvolvimento.
- `npm run test` — executar os testes.
- `npm run build` — gerar a versão web de produção.
- `npm run preview` — testar localmente o build produzido.

Os scripts acima são a interface desejada do projeto e precisam ser configurados no `package.json` quando o código for criado. Os releases podem disponibilizar um arquivo compactado de uma versão específica. O lançamento em navegador e o download do código-fonte são requisitos iniciais; instalador nativo é uma etapa opcional posterior.

---

## 3. Convenções de controle

### 3.1 Botões de ataque

O jogo usa a notação numérica popularizada por jogos de luta da família Tekken. Os números representam **botões**, não direções.

| Notação | Nome em inglês | Nome em português | Sigla |
|---|---|---|---|
| `1` | Left Punch | Soco fraco / esquerdo | `LP` |
| `2` | Right Punch | Soco forte / direito | `RP` |
| `3` | Left Kick | Chute fraco / esquerdo | `LK` |
| `4` | Right Kick | Chute forte / direito | `RK` |

Combinações simultâneas são representadas com `+`:

- `1+2`: pressionar os dois socos ao mesmo tempo.
- `3+4`: pressionar os dois chutes ao mesmo tempo.
- `1+3` e `2+4`: combinações que podem ser usadas para agarrões ou golpes especiais, conforme o personagem.
- `1, 2, 4`: pressionar uma sequência em ordem, não simultaneamente.

**Regra de leitura:** `+` significa simultâneo dentro de uma janela de tolerância configurável; a vírgula significa sequência. No protótipo, o buffer guarda 30 frames e considera simultâneos pressionamentos separados por até 3 frames, inclusive. Esses valores são provisórios.

Se um botão puder formar um chord registrado, seu golpe simples aguarda o fechamento dessa janela. Um chord registrado corresponde ao conjunto exato de botões e tem prioridade sobre golpes simples. Uma combinação sem golpe cadastrado dentro da janela é consumida e ignorada; seus botões não viram ataques simples acidentais.

### 3.2 Direções

As direções são relativas ao adversário, e não fixas à tela. `F` e `B` trocam de lado quando o personagem troca de posição em relação ao oponente.

| Símbolo | Significado |
|---|---|
| `F` | Frente, na direção do adversário |
| `B` | Trás, afastando-se do adversário |
| `U` | Cima |
| `D` | Baixo |
| `DF` | Baixo + frente |
| `DB` | Baixo + trás |
| `UF` | Cima + frente |
| `UB` | Cima + trás |
| `N` | Neutro, sem direção pressionada |

Exemplos de comandos possíveis: `DF+1`, `F,F+2`, `D,DF+3`, `B+1+2` e `UF+4`. São **exemplos de notação**, não golpes já atribuídos a personagens.

### 3.3 Semidireções e diagonais

O jogo aceita entradas diagonais. `UF`, por exemplo, significa cima + frente no mesmo instante ou dentro da janela de combinação. Elas podem ser usadas para:

- golpes especiais;
- saltos direcionais e saltos para trás;
- aproximações com ataque;
- golpes que mudam propriedades conforme a direção;
- comandos de execução precisa.

Como a luta é 2D, as diagonais **não criam um segundo eixo de profundidade**. Elas combinam altura e direção horizontal. O motor deve preservar a entrada diagonal na memória de comandos para que um `DF` não seja interpretado apenas como `D` ou apenas como `F`.

### 3.4 Controles físicos e remapeamento

A notação de luta é independente da tecla física. O jogador poderá usar teclado e, quando implementado, controle compatível com a API Gamepad do navegador. A interface deve exibir o mapeamento atual e permitir remapeamento dos quatro ataques e das direções.

O jogo não deve exigir que o usuário tenha um layout de teclado específico. A configuração padrão será definida no protótipo e documentada no README.

### 3.5 Mapeamento provisório do protótipo local

Para viabilizar os primeiros testes locais de dois jogadores no mesmo teclado, o protótipo usará temporariamente:

| Ação | Jogador 1 | Jogador 2 |
|---|---|---|
| Direita / esquerda / cima / baixo | `D` / `A` / `W` / `S` | setas `→` / `←` / `↑` / `↓` |
| Botões `1`, `2`, `3`, `4` | `J`, `K`, `N`, `M` | `NumPad 1`, `NumPad 2`, `NumPad 3`, `NumPad 4` |

Esse mapeamento existe para o protótipo e deverá ser remapeável antes de ser tratado como configuração final. Direções horizontais são convertidas para frente/trás relativamente ao lado atual do oponente; cima e baixo permanecem direções verticais.

---

## 4. Personalização das cores dos botões

No primeiro login, cada jogador poderá escolher um esquema de cores para identificar visualmente os quatro botões de ataque. A cor é uma preferência de interface e **não altera o dano, os frames ou qualquer propriedade de combate**.

### 4.1 Exemplos de paletas

| Paleta | `1 / LP` | `2 / RP` | `3 / LK` | `4 / RK` |
|---|---|---|---|---|
| **Paleta A** | Rosa | Verde | Azul | Vermelho |
| **Paleta B** | Azul | Amarelo | Verde | Rosa |

As cores acima são exemplos iniciais. Os nomes devem vir acompanhados de amostras visuais e rótulos acessíveis; a cor nunca deve ser o único indicador de um botão.

### 4.2 Regras de interface

- Seleção de paleta, com prévia dos quatro botões.
- Identificar sempre o botão pelo número e pela sigla, além da cor.
- Manter contraste adequado e evitar depender apenas da distinção cromática.
- Guardar a preferência localmente no navegador quando isso for implementado.
- A personalização de cor não pode confundir os indicadores de jogador 1 e jogador 2; aplicar uma borda, marca ou rótulo de jogador independente da paleta.

---

## 5. Estrutura de uma partida

### 5.1 Fluxo inicial

1. Tela inicial.
2. Escolha do modo de jogo.
3. Seleção dos personagens de cada jogador.
4. Carregamento do cenário.
5. Contagem regressiva e início da luta.
6. Fim do round por condição de vitória ou tempo, se houver limite configurado.
7. Tela de resultado, revanche ou retorno ao menu.

### 5.2 Escopo dos primeiros modos

**MVP obrigatório:** dois jogadores locais no mesmo computador (teclado e/ou controle, conforme suporte implementado) contra um adversário humano.

**Depois do MVP:** modo individual contra IA simples, treino com reinício rápido e exibição de dados de combate. Multijogador online é uma etapa futura e não deve ser anunciado como funcional antes de existir sincronização e testes reais.

### 5.3 Regras de vitória

A estrutura deverá permitir partidas por rounds, vida e cronômetro. Os valores iniciais (quantidade de rounds, duração e vida) serão ajustáveis em configuração, não espalhados como números fixos pelo código. Empates e interrupções precisam ter comportamento definido antes de a partida ranqueada ou online existir.

---

## 6. Movimento 2D

O combate acontece em um único plano horizontal. Os personagens podem se aproximar e se afastar, saltar, agachar e usar movimentos especiais, mas não podem atravessar o cenário em profundidade.

### 6.1 Movimentos básicos

- Andar para frente e para trás.
- Saltar verticalmente ou em diagonal, caso o personagem permita.
- Agachar.
- Permanecer neutro.
- Recuperar-se após ataques, bloqueios, quedas e outros estados.
- Avançar ou recuar durante golpes cuja animação mova o personagem.

A aceleração, velocidade e distância de salto podem variar por personagem, desde que os dados sejam explícitos e testáveis.

### 6.1.1 Comandos direcionais provisórios

Na primeira versão local, segurar `F`/`B` anda; tocar duas vezes na mesma direção no chão dentro de 12 frames inicia um dash de até 12 frames enquanto a direção continuar pressionada. Dash não pode iniciar nem continuar no ar; os toques feitos durante o salto não contam para um dash após aterrissar. O dash usa velocidade 6 unidades por frame; a caminhada usa 3. Enquanto agachado, o personagem anda à metade da velocidade normal. Durante golpes aéreos, a direção horizontal continua controlando a trajetória e a gravidade continua atuando. Os valores são configuráveis e provisórios. As direções continuam relativas ao oponente.

### 6.2 Espaçamento entre personagens

- Os personagens não devem atravessar um ao outro livremente quando estiverem em estados que exigem colisão corporal.
- Um personagem no ar pode cruzar sobre o oponente quando a diferença vertical entre as posições de chão dos dois for pelo menos a largura corporal configurada. No chão, a colisão continua impedindo a passagem. Depois da troca, `F`/`B` acompanham o novo lado do oponente.
- Ataques podem mover o atacante e aplicar empurrão no oponente.
- O empurrão após acerto e bloqueio é uma propriedade do golpe.
- O posicionamento perto da parede pode limitar recuo e criar situações de pressão, desde que a regra de parede seja consistente.
- Não há sidestep de profundidade. Evasões devem ocorrer por movimento horizontal, salto, agachamento, invulnerabilidade específica ou mecânica expressamente definida.

---

## 7. Modelo de ataque e colisão

Cada golpe deve ser definido como dados, em vez de depender de regras particulares escondidas na animação.

### 7.1 Fases do golpe

- **Startup (inicialização):** frames antes de o golpe poder acertar.
- **Active (ativo):** frames em que a hitbox causa contato.
- **Recovery (recuperação):** frames depois da atividade em que o atacante ainda não pode agir normalmente.

Um golpe pode ter vários segmentos ativos, movimentação durante a animação, propriedades aéreas, cancelamentos e efeitos especiais. Cada exceção precisa estar registrada nos dados ou em uma habilidade bem delimitada.

### 7.2 Hitboxes e hurtboxes

- **Hitbox:** região que pode atingir o oponente.
- **Hurtbox:** região vulnerável do personagem.
- **Throw box:** região usada para detectar agarrões.
- **Parry window / região ou condição de parry:** janela de tempo e regras que permitem aparar ataques específicos.

A arte e a colisão não precisam ocupar exatamente o mesmo espaço, mas precisam corresponder visualmente o bastante para parecer justas. O modo de treino deve, no futuro, permitir visualizar hitboxes e hurtboxes.

### 7.3 Categorias de ataque

O motor deve suportar, no mínimo:

- alto;
- médio;
- baixo;
- aéreo;
- agarrão;
- especial;
- ataque desbloqueável, caso esse tipo seja adotado depois.

Categorias definem interação com defesa e movimentação. O comportamento exato de cada categoria deve ser configurável por golpe, sem presumir que todos os personagens obedecem a uma única animação ou alcance.

### 7.4 Prioridade e colisões simultâneas

A resolução de dois golpes que se conectam no mesmo frame precisa seguir uma regra estável. O projeto deve considerar: troca de golpes (*trade*), cancelamento de ataques por hit, invulnerabilidade, armadura e interrupção por agarrão. O resultado não pode variar conforme a ordem de renderização dos sprites.

Regra do protótipo: todos os contatos do frame são detectados antes de aplicar dano, então dois strikes válidos podem trocar golpes (*trade*) mesmo que cada um cause hitstun no outro. A ordem de resolução é agarrão, invulnerabilidade contra strikes, parry, bloqueio e acerto. Invulnerabilidade é declarada no golpe por número de frames e categoria; `strikeInvulnerableStartupFrames` protege apenas durante os primeiros frames do startup contra golpes normais, sem cancelar nem causar dano ao atacante. O `test-rising-punch` tem 5 frames dessa propriedade para servir de exemplo. Agarrões não são strikes e não são evitados por essa propriedade; armadura não está implementada e não altera esta regra.

### 7.5 Dados específicos por personagem

Cada personagem possui seu próprio livro `moves` e perfil `collision`. O livro contém golpes básicos, direcionais, aéreos, especiais, agarrões e regras de cancelamento; nomes e números não são globais nem precisam ser iguais entre personagens. Um golpe define sua hitbox de ataque junto de startup, frames ativos e recuperação. O motor resolve o golpe pelo personagem que o executa, portanto dois livros podem até reutilizar um ID se forem diferentes.

No protótipo, o ritmo-base dos golpes é definido pelo tipo de golpe, não por uma velocidade global do personagem: o soco leve Tester usa 6 frames de startup, 3 ativos e 9 de recuperação; o soco pesado usa 9 de startup, 3 ativos e 16 de recuperação. As poses do ápice ficam visíveis durante os três frames ativos. Variações de outros golpes devem declarar seus próprios frames no livro de golpes, sem alterar a cadência de caminhada do personagem.

O perfil de colisão define `bodyWidth` para movimento/contato entre corpos e hurtboxes separadas `standing`, `crouching` e `airborne`. Cada hurtbox usa `offsetX` em relação ao centro horizontal e `offsetY` em relação aos pés, com largura e altura em pixels lógicos. No ar o motor usa sempre `airborne`; no chão escolhe entre em pé e agachada. Hitboxes de ataque usam `forward` medido a partir do centro na direção do oponente, `yOffset` em relação aos pés e dimensões próprias por golpe. Todos os valores podem variar por personagem.

---

## 8. Defesa

Defender-se deve ser uma decisão ativa, baseada na direção do adversário e na leitura da categoria do ataque.

### 8.1 Bloqueio básico

- Segurar `B` bloqueia ataques que o personagem pode defender em pé.
- Segurar `DB` defende baixos e deve ser vulnerável a golpes médios que atinjam personagens agachados.
- Ataques altos podem ser evitados por agachamento quando suas propriedades permitirem.
- O bloqueio produz um estado de **blockstun** e pode causar empurrão.
- Certos ataques podem ser desbloqueáveis ou exigir uma defesa específica; isso deve ficar claro pela animação, pelo efeito ou por um indicador de treino.

O jogo deve evitar situações em que a defesa falha por uma direção confusa. A direção defensiva é sempre relativa ao oponente, mesmo após troca de lado.

Para o protótipo: `B` bloqueia ataques altos e médios quando o personagem está em pé; `DB` bloqueia baixos; um ataque alto é evitado ao agachar; ataques médios acertam `DB`; baixos acertam `B`. Um bloqueio bem-sucedido entra em blockstun e aplica o pushback definido no golpe. Os tempos e distâncias iniciais são provisórios.

### 8.2 Stun e recuperação

- **Hitstun:** tempo em que o personagem não pode agir depois de ser atingido.
- **Blockstun:** tempo em que não pode agir enquanto se recupera do bloqueio.
- **Knockdown:** estado de queda no qual as ações disponíveis são específicas.
- **Recovery:** período de recuperação de ataque, esquiva, agarrão ou ação especial.

Ações defensivas não devem poder cancelar qualquer estado arbitrariamente. Regras como recuperação rápida, tech roll, invulnerabilidade ao levantar e reversões precisam ser definidas por sistema ou personagem.

---

## 9. Agarrões

Agarrões são uma ferramenta de curta distância para enfrentar adversários que bloqueiam com frequência. Eles seguem a lógica de leitura e resposta comum a jogos de luta técnicos, adaptada ao formato 2D.

### 9.1 Comandos

`1+3` e `2+4` são candidatos a comandos básicos de agarrão. A atribuição final pode variar por personagem e deverá constar nos dados de golpes. Um comando simultâneo não pode ser tratado como dois ataques independentes se houver um agarrão válido configurado para aquela combinação.

### 9.2 Regras de interação

- Os agarrões comuns exigem proximidade suficiente.
- Bloquear não deve neutralizar um agarrão comum válido.
- Agachar, escapar do alcance, possuir uma propriedade específica ou quebrar o agarrão podem ser respostas possíveis, conforme a classe de agarrão.
- Alguns agarrões podem ter comandos de quebra diferentes, como pressionar `1`, `2`, `1+2` ou outra combinação indicada pelo tipo de agarrão.
- A janela de quebra precisa ser consistente e legível; não deve ser decidida aleatoriamente.
- Um agarrão que falha deve ter recuperação para que a tentativa possa ser punida.

Os valores de alcance, startup, janela de quebra, dano e recuperação serão definidos golpe a golpe. Não implementar todos os agarrões como uma animação sem regras próprias.

**Padrão provisório de teste:** Tester tem agarrão frontal `1+3` e agarrão forte `2+4`. Ambos só alcançam um alvo em pé, no chão, à frente do atacante e a até 76 unidades; bloqueio não os impede, mas agachar, estar no ar ou já estar em ataque/stun evita o agarrão. A direção mantida quando o comando é reconhecido escolhe o arremesso: `F`/`DF`/`UF` lança à frente, `B`/`DB`/`UB` lança para trás; sem direção, usa frente. Cada golpe configura a distância lançada nas duas direções, relativa ao atacante e ao seu facing. Um arremesso para trás pode cruzar o alvo por cima do atacante e inverter os lados; o facing relativo é atualizado após o lançamento. Após conectar, o defensor tem 6 frames para pressionar o chord oposto (`2+4` quebra `1+3`, e vice-versa). A quebra não causa dano e deixa o atacante em 12 frames de recuperação. Sem quebra, o agarrão causa dano e hitstun dos dados do golpe; se errar o alcance, usa a recuperação normal. Os números são provisórios.

---

## 10. Especiais cinematográficos com comandos durante a cena

Alguns especiais podem iniciar uma sequência cinematográfica curta. Durante a cena, o jogador executa entradas indicadas na tela — por exemplo, pressionar botões específicos, repetir uma sequência ou confirmar um comando dentro de uma janela de tempo. A ideia é manter a referência de especiais interativos de jogos de luta/ação como Naruto: Ultimate Ninja 5.

### 10.1 Fluxo recomendado

1. O especial é ativado ao cumprir seu comando, requisito de recurso e condição de combate.
2. A animação cinematográfica começa e a interface mostra claramente a sequência ou o ritmo esperado.
3. O jogador executa os comandos durante janelas definidas em frames.
4. O resultado dos inputs altera a qualidade ou os efeitos do especial dentro de limites balanceados.
5. O especial termina e os dois personagens retornam a estados válidos de combate.

### 10.2 Evitar que o QTE decida tudo

- O especial precisa ter um resultado-base definido antes do minijogo de inputs.
- Executar melhor a sequência pode aumentar dano, recuperar menos recurso, acrescentar um efeito ou melhorar uma propriedade específica; não precisa aumentar tudo ao mesmo tempo.
- O ganho por acerto deve ter um limite máximo.
- Erros não devem tornar a cena interminável nem bloquear a partida sem razão.
- Instruções, contagem de tempo e feedback precisam ser legíveis.
- Deve existir uma opção de acessibilidade para reduzir efeitos visuais e, se necessário, simplificar ou desativar a sequência de inputs sem tornar o sistema obrigatório para todo tipo de partida.

### 10.3 Multiplayer e equidade

No modo local, a sequência pode ser resolvida pela mesma simulação determinística. Para um eventual modo online, a mecânica precisará ser testada com latência e diferenças de dispositivos. A cena não deve congelar a comunicação ou conceder vantagem por um comportamento de entrada que só funcione em uma máquina específica.

---

## 11. Golpes fortificados por execução precisa (*frame perfect*)

Alguns movimentos terão uma versão reforçada quando o comando é executado numa janela de tempo muito estreita. A referência conceitual é o tipo de recompensa de precisão visto em golpes elétricos como o de Kazuya, sem que isso obrigue a copiar nome, animação, comando ou valores exatos.

### 11.1 Regras

- A versão normal deve funcionar mesmo quando o tempo não é perfeito, se o comando-base tiver sido reconhecido.
- A versão reforçada só é ativada dentro de uma janela específica, definida em frames.
- A janela deve ser configurável por golpe, mas curta o bastante para recompensar consistência e não mero apertar repetido.
- A versão reforçada deve ter uma propriedade observável e balanceável: por exemplo, startup menor, vantagem diferente, efeito visual/sonoro, dano ou capacidade de combo alterada.
- A melhoria não deve conceder todas as vantagens simultaneamente por padrão.
- O feedback visual/sonoro deve confirmar a execução correta sem depender apenas de um indicador textual.

**Padrão provisório de comando:** o especial de teste de Tester usa `F,N,DF+2`. O parser registra também a soltura para neutro. A variante precisa é reconhecida se `2` for pressionado no mesmo frame de `DF` ou no frame lógico seguinte; fora dessa janela, o comando ainda executa a variante normal. A variante precisa aumenta apenas o dano em 20 pontos. Como cancel de teste, `test-jab` pode cancelar para o soco ascendente ou para esse especial somente depois de acertar, até 8 frames após o contato; bloqueio e erro não abrem cancel. Os valores servem à validação do sistema.

### 11.2 Exemplo conceitual de definição

Um golpe pode aceitar o comando `F`, depois `N`, depois `DF+2`. Se `2` for reconhecido no intervalo de frame configurado após a última direção, o motor cria a versão reforçada; caso contrário, executa a versão normal ou não executa o golpe, conforme o desenho daquele personagem. Isso é apenas um exemplo de comando: o comando e a janela finais serão definidos personagem por personagem.

### 11.3 Repetibilidade e treino

A janela exata precisa ser medida pelo frame de lógica, nunca por uma aproximação variável de milissegundos. O modo de treino deverá ajudar a identificar se o comando foi executado no tempo correto, quando esse modo for implementado.

---

## 12. Parry: defesa por leitura e tempo

O sistema terá parries para **golpes específicos**, não uma resposta universal para toda situação. A ideia é recompensar reconhecer um ataque e responder na janela adequada.

### 12.1 Propriedades configuráveis de parry

O parry usa sempre o mesmo comando defensivo: **pressionar `B` no frame exato em que o golpe toca**. A direção é relativa ao oponente e precisa ser um novo pressionamento naquele frame; manter `B` pressionado continua sendo bloqueio comum e não prolonga a janela de parry. A janela universal é de um frame de lógica e não varia por personagem ou por golpe.

Cada golpe declara apenas se pode ser aparado (`parryable`). Um ataque sem essa propriedade nunca sofre parry, embora ainda possa ser bloqueado pelas regras normais. Categorias e casos especiais podem restringir essa elegibilidade nos dados do golpe, sem mudar o comando ou a janela global. No protótipo, o sucesso cancela o golpe e deixa o atacante em hitstun por 18 frames, abrindo uma janela para punição; o defensor não recebe dano nem empurrão. O parry só é reconhecido por um novo pressionamento de `B` no frame exato do contato. Um pressionamento fora desse frame não produz parry: o ataque segue sua resolução normal, então o defensor recebe o golpe se não estiver bloqueando. Manter `B` antes e durante o contato continua sendo bloqueio comum.

### 12.2 Regras de equilíbrio

- Um parry bem-sucedido cancela o ataque aparado e atordoa o atacante por 18 frames para permitir punição.
- Um parry fora do frame exato falha; o ataque resolve normalmente e acerta o defensor, a menos que ele esteja em bloqueio comum válido.
- Um parry não deve funcionar contra toda categoria de ataque a menos que seja uma habilidade rara, explícita e balanceada.
- Golpes com vários hits precisam definir se o parry evita um hit, a sequência completa ou apenas uma parte.
- A janela não deve ser tão ampla que substitua o bloqueio como defesa padrão.
- O estado de parry não pode ser acionado retroativamente depois que o golpe já acertou.

As primeiras implementações devem testar parry contra um conjunto pequeno de movimentos, antes de ampliar para todo o elenco.

---

## 13. Sistema de frames e vantagem

O combate usa frames como unidade oficial de tempo. Startup, atividade, recuperação, hitstun, blockstun, janela de parry e janelas de execução precisam ser mensuráveis em frames.

### 13.1 Números de frames

Cada golpe deve expor no mínimo:

- startup;
- duração ativa;
- recovery;
- hitstun causado;
- blockstun causado;
- empurrão no acerto e no bloqueio;
- alcance;
- categorias de acerto e propriedades especiais.

Esses valores iniciais serão ajustados com testes. Não preencher a lista inteira de golpes com números arbitrários apresentados como balanceamento final.

### 13.2 Vantagem no acerto e no bloqueio

A vantagem indica qual personagem pode agir primeiro depois que um golpe é acertado ou bloqueado.

Como convenção de documentação, calcular a vantagem no evento de contato assim:

`Vantagem = recuperação restante do atacante − stun restante do defensor`

- Resultado **positivo**: o atacante recupera-se antes e tem vantagem.
- Resultado **zero**: ambos voltam a poder agir no mesmo momento.
- Resultado **negativo**: o atacante se recupera depois e está em desvantagem.

Exemplo hipotético: se o atacante ainda precisa de 12 frames para recuperar-se e o defensor fica em stun por 17 frames, o atacante tem `+5`. Se o atacante precisa de 20 frames e o defensor fica em stun por 15, o atacante tem `−5`.

Essa convenção deve ser usada de modo consistente no código, nos dados de golpes e na interface de treino. A implementação precisa testar casos de borda para não haver diferença de um frame causada por contar ou não o frame do impacto.

### 13.3 Punições

Um golpe com recuperação negativa pode ser punido se o adversário tiver um ataque cujo startup, alcance e estado permitam acertar antes de o atacante voltar a agir. A punição depende de **vantagem e distância**, e não apenas do número de frames.

O jogo deve suportar situações como:

- seguro ao bloquear;
- punível por um golpe rápido;
- punível somente por um golpe de maior alcance;
- risco de whiff punish quando o ataque erra;
- recompensa por bloquear uma opção arriscada.

### 13.4 Cancelamentos e combos

Cancelamentos são exceções definidas por golpe ou sistema. O motor pode permitir, por exemplo, cancelar um ataque em outro durante uma janela específica quando o primeiro acerta. Não presumir que todo golpe pode ser cancelado.

As rotas de combo precisam respeitar estados, hitstun, alcance e regras de recuperação. A prioridade é evitar loops infinitos ou sequências sem saída. Limites como deterioração de combo, recuperação aérea ou redução de dano são opções de balanceamento, não decisões fechadas nesta versão do documento.

---

## 14. Distância, alcance e controle de espaço

A distância afeta se ataques acertam, se um agarrão alcança, se a pressão pode continuar e se um erro pode ser punido.

### 14.1 Medição

O motor deve usar unidades de mundo consistentes, sem atrelar todas as regras ao tamanho físico de pixels na tela. O alcance efetivo de um ataque resulta da posição e do formato da hitbox em relação à hurtbox do oponente.

### 14.2 Conceitos de distância

- **Curta:** região em que agarrões e golpes rápidos de curto alcance são ameaças reais.
- **Média:** região em que os jogadores disputam aproximação, pokes e controle de espaço.
- **Longa:** região em que a maior parte dos golpes curtos não alcança; avançar, esperar ou usar um movimento de longo alcance pode ser melhor.
- **Fora de alcance:** o ataque não toca o oponente e pode deixar o atacante vulnerável à punição por erro (*whiff punish*).

Essas categorias são descrições de design e treino, não limites fixos universais. Personagens e golpes podem usar alcances diferentes.

### 14.3 Pushback e posicionamento

Empurrão no contato é configurado por golpe e pode ser diferente no acerto e no bloqueio. A posição na tela, a parede e a velocidade de movimento precisam ser levadas em conta ao determinar se uma sequência realmente alcança. O motor não deve presumir que uma punição possível em curta distância também será possível após grande empurrão.

---

## 15. Dados de personagens e golpes

Personagens devem ser definidos por dados e componentes reutilizáveis sempre que possível. O primeiro protótipo precisa de pelo menos dois personagens de teste para validar confronto, lado, defesa, alcance e comandos.

### 15.1 Dados mínimos por personagem

- identificador estável e nome;
- atributos básicos, como vida e velocidade de movimento;
- referências aos sprites, animações, sons e efeitos;
- estado inicial e estados suportados;
- lista de golpes e comandos;
- propriedades especiais, recursos e regras próprias;
- configuração de colisão corporal e hurtboxes por estado/animação.

### 15.2 Dados mínimos por golpe

| Campo | Descrição |
|---|---|
| `id` | Identificador estável do golpe |
| `input` | Comando reconhecido, incluindo direções, botões e janelas |
| `startup` | Frames até o golpe poder acertar |
| `active` | Um ou mais intervalos ativos |
| `recovery` | Frames de recuperação |
| `hitstun` | Stun causado no acerto |
| `blockstun` | Stun causado no bloqueio |
| `hitLevel` | Alto, médio, baixo, aéreo, agarrão ou outra categoria |
| `range` | Alcance / configuração das hitboxes |
| `pushback` | Empurrão no acerto e no bloqueio |
| `properties` | Cancelamento, invulnerabilidade, armadura, parry etc. |
| `perfectWindow` | Janela de execução precisa, quando aplicável |
| `cinematic` | Configuração do especial interativo, quando aplicável |

Não é obrigatório que cada golpe use todos os campos; campos opcionais devem ter um padrão seguro e documentado. Os nomes finais podem ser adaptados à implementação, mas precisam manter as mesmas ideias e semântica.

---

## 16. Interface e feedback de combate

A interface precisa priorizar a leitura da luta e não cobrir os personagens sem necessidade.

### Elementos de partida

- barras de vida;
- temporizador e marcador de round;
- identificação dos jogadores;
- efeitos visuais e sonoros claros para acerto, bloqueio, parry e golpe fortalecido;
- indicadores de instrução nos especiais cinematográficos;


### Ferramentas de treino planejadas

- exibir startup, active e recovery do golpe recente;
- mostrar vantagem de frames no acerto e no bloqueio;
- alternar visualização de hitboxes e hurtboxes;
- reiniciar rapidamente posições e vida;
- permitir que o adversário de treino repita ataques;
- indicar a sequência de comandos detectada pelo parser de inputs.
- historico de botoes pressionados.
- sinalização das paletas de controle escolhidas.

As ferramentas de treino não são necessárias para a primeira tela do MVP, mas a arquitetura deve permitir adicioná-las sem reescrever o motor de combate.

---

## 17. Arquitetura lógica sugerida

Uma organização possível, sujeita à estrutura real do repositório:

```text
src/
  app/              # entrada do app, rotas/telas e configuração
  scenes/            # menu, seleção, partida e resultado
  rendering/         # apresentação Phaser: sprites, animações, efeitos e câmera
    animations/      # mapeamento dos modos lógicos para animações visuais
  input/             # teclado, gamepad, remapeamento e buffer de comandos
  engine/
    simulation/      # relógio fixo e ordem de atualização
    combat/          # estados, golpes, defesa, agarrões, parry e combos
    collision/       # hitboxes, hurtboxes, throws e checagem de contato
    characters/      # estado e comportamento dos personagens
    data/            # tipos e definições de personagens/golpes
  ui/                # HUD, seleção de paleta e menus
  assets/
    animations/      # sequências/exportações de animação
    sprites/         # spritesheets e imagens-fonte por categoria
    scenes/          # fundos, props e arte dos cenários/arenas
  tests/             # testes automatizados de regras
```

Essa árvore é uma orientação, não uma exigência de criar todos os diretórios antecipadamente. A divisão importante é manter a lógica de combate desacoplada da representação visual.

No projeto atual, os arquivos de arte carregáveis ficam em `src/assets/animations/`, `src/assets/sprites/` e `src/assets/scenes/`. As classes Phaser de menu e luta ficam em `src/scenes/`; os adaptadores de animação Phaser ficam em `src/rendering/animations/`. Sprite sheets devem manter os quadros de um personagem juntos quando compartilharem escala e ponto de pivô. Arte e nomes devem ser originais; não colocar código de cena ou regras de combate dentro dos diretórios de imagens.

### 17.1 Parser de comandos

O parser mantém um buffer curto de entradas com direções e botões por frame. Deve reconhecer:

- toques e comandos simultâneos;
- sequências com direções anteriores;
- tempo máximo entre partes de um comando;
- troca correta de `F` e `B` conforme o lado;
- tolerância configurável para entradas simultâneas;
- prioridade de reconhecimento quando um comando também corresponde a um golpe mais simples.

A prioridade de comando precisa ser previsível. Uma entrada `1+3`, por exemplo, não deve às vezes acionar um agarrão e às vezes dois ataques sem uma regra explícita.

Prioridade provisória no protótipo: primeiro o comando com mais botões que corresponda exatamente à entrada; depois a variante com direção explícita; por fim o comando genérico. Em empate, manter a ordem declarada nos dados dos golpes. O buffer retém os últimos 30 frames e a janela de simultaneidade é de 3 frames, incluindo o frame inicial e final.

### 17.2 Máquina de estados

Cada personagem deve ter estados claros, como neutro, movimento, startup, ativo, recuperação, bloqueio, hitstun, blockstun, agarrado, agarrando, queda, levantando, parry e especial cinematográfico. Ações incompatíveis não devem ser ativadas ao mesmo tempo sem uma regra específica de cancelamento ou interrupção.

### 17.3 Ordem de resolução de um frame

A ordem final será confirmada por testes, mas deve ser explícita e estável. Uma sugestão inicial:

1. Capturar as entradas do frame.
2. Atualizar o buffer e reconhecer comandos.
3. Aplicar movimento e transições autorizadas de estado.
4. Atualizar as fases dos golpes e posições de hitboxes/hurtboxes.
5. Detectar contatos entre ataques, corpos e agarrões.
6. Resolver regras de invulnerabilidade, parry, defesa, agarrão e acerto conforme prioridade definida.
7. Aplicar dano, stun, empurrão, cancelamentos e consumo de recursos.
8. Avançar timers e determinar quem volta a poder agir.
9. Emitir eventos para a camada visual/sonora.

A lista é uma proposta; o importante é que a ordem seja documentada, testada e nunca dependa do acaso ou da taxa de quadros de renderização.

---

## 18. Testes e critérios de qualidade

O projeto deve crescer com testes pequenos e reproduzíveis. No mínimo, criar testes para:

- `F` e `B` mudando corretamente quando os personagens trocam de lado;
- reconhecimento de `1`, `2`, `3`, `4` e combinações simultâneas;
- comandos diagonais;
- startup, janela ativa e recovery;
- acerto versus bloqueio;
- bloqueio alto/baixo e categorias de ataque;
- agarrões, alcance e quebra;
- parry bem-sucedido, falho e incompatível com uma categoria;
- janela frame-perfect, incluindo o último frame válido e o primeiro inválido;
- vantagem positiva, neutra e negativa;
- distância, empurrão e whiff punish;
- golpes que se acertam simultaneamente;
- sequência cinematográfica e seus limites de sucesso;
- a mesma sequência de inputs produzindo o mesmo resultado na mesma versão da simulação.

### Critérios mínimos de qualidade

- Nenhum ataque muda de resultado só porque a renderização caiu de 60 FPS para menos.
- Toda propriedade especial possui uma regra escrita e um teste representativo.
- O jogador recebe feedback consistente quando um comando é reconhecido ou falha.
- Os golpes não usam valores de frame duplicados e contraditórios em vários arquivos.
- É possível ajustar o balanceamento alterando dados, sem reescrever toda a lógica.

---

## 19. Plano de desenvolvimento

### Fase 1 — Fundação

- Criar repositório e projeto TypeScript/Vite/Phaser.
- Mostrar uma tela de menu simples e carregar uma cena de luta.
- Desenhar dois bonecos provisórios e barras de vida.
- Implementar o relógio fixo de 60 frames e controles básicos.
- Implementar movimento horizontal, salto e agachamento.

**Pronto quando:** dois jogadores conseguem mover-se sem troca incorreta de lado ou dependência do FPS de renderização.

### Fase 2 — Núcleo de luta

- Implementar parser de direções e os quatro botões.
- Criar dados de golpes com startup, active e recovery.
- Implementar hitboxes, hurtboxes, dano, hitstun e blockstun.
- Implementar bloqueio alto/baixo, empurrão e rounds.
- Criar testes da simulação.

**Pronto quando:** uma luta básica com ataques, defesa e fim de round é reproduzível e testável.

### Fase 3 — Sistemas técnicos

- Implementar vantagem de frames e casos de punição.
- Acrescentar agarrões e regras de quebra.
- Adicionar comandos diagonais e movimentos especiais.
- Implementar janelas frame-perfect.
- Adicionar parry para um conjunto pequeno de golpes.

**Pronto quando:** os principais sistemas podem ser combinados sem estados travados ou resultados inconsistentes.

### Fase 4 — Identidade e apresentação

- Criar seleção de personagens e paletas coloridas dos quatro botões.
- Adicionar arte, animações, efeitos e áudio originais.
- Implementar um especial cinematográfico interativo.
- Melhorar HUD, menus, feedback e acessibilidade.

**Pronto quando:** uma partida completa demonstra a identidade visual e ao menos um exemplo de cada sistema principal previsto para a primeira versão.

### Fase 5 — Publicação

- Preparar README com instalação e controles.
- Configurar testes e build no fluxo de trabalho do GitHub.
- Publicar a versão web em uma página estática.
- Publicar releases versionados e verificar o pacote em uma instalação limpa.
- Avaliar PWA/offline e empacotamento desktop como tarefas separadas.

**Pronto quando:** uma pessoa que não desenvolveu o projeto consegue abrir a demo ou seguir as instruções do repositório sem depender de passos não documentados.

---

## 20. Decisões em aberto

As decisões abaixo não impedem o início do protótipo. Até serem confirmadas, usar padrões configuráveis e evitar espalhar suposições pelo código. As regras provisórias de rounds, sequências e elenco de teste estão definidas nesta especificação e implementadas na Etapa 2 de `pipeline.md`.

- **Direção exata da arte:** proporção dos sprites, resolução-base, animação quadro a quadro ou híbrida e quantidade de quadros por golpe.
- **Formato da arena:** limites, paredes, cenários e interações com o ambiente.
- **Mapeamento físico padrão:** teclas iniciais e prioridade de teclado/controle.
- **Sistema de recursos:** barra de especial, custo de golpes e recuperação de recurso.
- **Alcance dos QTEs:** quais especiais os usam, se o defensor também participa e como o desempenho altera o resultado.
- **Parry:** comandos definitivos, duração, categorias aparáveis e punição por erro.
- **Agarrões:** comandos padrão, tipos, janelas de quebra e diferenças entre personagens.
- **Movimentos verticais:** conjunto de saltos, evasões e regras de ataques que acertam personagens no ar.
- **Online:** se fará parte de uma versão futura e qual estratégia de sincronização será usada.
- **Acessibilidade:** opções de simplificação de QTE, remapeamento, contraste, redução de efeitos e leitura sem cor.

### Valores provisórios do primeiro protótipo

Os valores abaixo servem apenas para validar movimento e interface na fundação. São configuráveis e não representam decisões de balanceamento:

- velocidade horizontal: `3` unidades de mundo por frame;
- impulso inicial do salto: `-11` unidades por frame;
- gravidade: `0,55` unidades por frame²;
- largura corporal por personagem: Tester `54` e Dummy `60` unidades (provisório; definida no perfil `collision`);
- vida inicial: `1000`;
- duração provisória do round: `99` segundos;
- quantidade inicial de rounds: `2`;
- pausa após o resultado do round: `90` frames.

`match.maxHealth` configura o teto de vida do protótipo; a vida de cada personagem não pode exceder esse teto.

Reavaliar esses valores ao testar sensação de controle e regras de round; manter a configuração fora da lógica de renderização.

### Primeiro personagem provisório

O primeiro personagem de teste é **Tester** (`tester`), personagem principal e padrão temporário para os dois lados da luta. Seus atributos iniciais são 1000 de vida, velocidade de caminhada 3 e impulso de salto -11. Ele usa os golpes básicos, direcionais, abaixados e aéreos listados abaixo. Esses dados servem à validação do motor, não definem balanceamento nem identidade final.

Os sprites-fonte de cada personagem ficam em `src/assets/sprites/characters/{id}/`; o manifesto de animações fica em `src/assets/animations/{id}.json`; o mapeamento entre modos de combate, golpes e nomes de animação fica em `src/rendering/animations/`. Consulte os READMEs dessas pastas para o formato esperado dos atlas e manifestos. Os dados de combate são independentes da arte: cada definição em `characters.ts` tem seu livro `moves` e perfil `collision`; cada golpe define sua hitbox de ataque, e cada personagem tem hurtboxes em pé, agachada e aérea.

### Golpes provisórios para validar teclado e hitboxes

Até os personagens e golpes oficiais serem definidos, os botões `1`–`4` disparam ataques básicos de teste. Estes parâmetros são exclusivamente provisórios:

| Botão | Startup | Ativo | Recovery | Dano | Nível |
|---|---:|---:|---:|---:|---|
| `1` | 4 | 2 | 10 | 45 | alto |
| `2` | 6 | 3 | 14 | 65 | médio |
| `3` | 7 | 3 | 16 | 60 | baixo |
| `4` | 9 | 4 | 19 | 85 | médio |

Tester também tem dois chords provisórios para exercitar o parser; números sem decisão de balanceamento:

| Comando | Variante de teste | Startup | Ativo | Recovery | Dano | Nível |
|---|---|---:|---:|---:|---:|---|
| `1+2` | soco duplo | 6 | 2 | 14 | 75 | médio |
| `3+4` | chute duplo | 8 | 3 | 17 | 90 | médio |

Comandos direcionais também terão variantes provisórias, reconhecidas no frame em que o botão é pressionado:

| Comando | Variante de teste | Startup | Ativo | Recovery | Dano | Nível |
|---|---|---:|---:|---:|---:|---|
| `F+1` | soco avançando | 5 | 2 | 12 | 55 | alto |
| `DF+2` | soco ascendente | 8 | 3 | 17 | 75 | médio |
| `D+3` | rasteira | 7 | 3 | 18 | 70 | baixo |
| `UF+4` | chute saltando | 8 | 4 | 20 | 80 | médio |
| `B+1` | jab recuando | 6 | 2 | 14 | 50 | alto |
| `DB+2` | cotovelo baixo recuando | 9 | 3 | 18 | 70 | médio |
| `UB+4` | chute saltando para trás | 9 | 4 | 21 | 78 | médio |

Golpes abaixados são selecionados ao pressionar um botão mantendo a direção exata `D` no chão. As diagonais `DF` e `DB` continuam selecionando suas variantes direcionais (ou bloqueio, quando não há ataque), enquanto o personagem adota postura baixa. `D+3` continua sendo a rasteira já cadastrada:

| Comando | Variante de teste | Startup | Ativo | Recovery | Dano | Nível |
|---|---|---:|---:|---:|---:|---|
| `D+1` | jab curto agachado | 5 | 2 | 12 | 42 | médio |
| `D+2` | gancho agachado | 7 | 3 | 16 | 62 | médio |
| `D+3` | rasteira | 7 | 3 | 18 | 70 | baixo |
| `D+4` | chute varrido agachado | 8 | 3 | 19 | 72 | baixo |

Variantes aéreas provisórias ficam disponíveis ao pressionar um botão enquanto o lutador não está no chão. Elas substituem a variante terrestre para aquele botão; direção horizontal pode ser mantida para controlar deslocamento, sem alterar a escolha do golpe nesta etapa:

| Comando no ar | Variante de teste | Startup | Ativo | Recovery | Dano | Nível |
|---|---|---:|---:|---:|---:|---|
| `1` | soco aéreo | 5 | 3 | 13 | 50 | alto |
| `2` | golpe aéreo forte | 7 | 3 | 17 | 68 | médio |
| `3` | chute aéreo descendente | 6 | 3 | 16 | 62 | médio |
| `4` | chute aéreo forte | 9 | 4 | 21 | 82 | médio |

Os golpes usam hitboxes retangulares de teste e atingem uma vez por execução. `F` e `B` selecionam variantes distintas para os botões 1, 2 e 4; `D+1`, `D+2` e `D+4` selecionam golpes abaixados, e `D+3` é a rasteira. Variantes aéreas substituem a escolha terrestre enquanto o personagem está no ar. Os golpes básicos causam 12–21 frames de hitstun, 10 frames de blockstun e 18 unidades de pushback no acerto/12 no bloqueio. Valores dos demais golpes são provisórios por golpe, não balanceamento final.

A interface identifica os modos neutro, movimento, dash, no ar, agachado, preparo, ativo, recuperação, defesa, atordoado, bloqueio, agarrado e caído. A hitbox visual aparece apenas nos frames ativos e usa a mesma geometria da checagem de acerto.

Na primeira implementação, um ataque é iniciado por um novo comando reconhecido. `1+2` e `3+4` selecionam os chords de teste de Tester; combinações sem golpe cadastrado são ignoradas, sem virar ataques simples. Comandos de um botão que possam integrar um chord registrado aguardam o fechamento da janela de 3 frames. No chão, `D` seleciona variante abaixada quando existir; as demais direções selecionam a variante exata e por fim o golpe básico. No ar, escolhe o golpe aéreo do botão. Sequências usam direções relativas ao personagem: `F,F+2` exige soltar e pressionar frente novamente; `D,DF+3` aceita a transição direta de baixo para diagonal. Os passos precisam caber em 12 frames; a sequência reconhecida tem prioridade sobre o golpe simples do mesmo botão.

### Regras provisórias de round e elenco

`roundCount` indica o número exato de rounds da luta local. Cada round termina por nocaute (vida chega a zero) ou tempo; no tempo, vence quem tiver mais vida. Vida igual ou nocaute duplo gera empate e não concede ponto. A luta mostra o resultado por 90 frames antes de iniciar o próximo round. Depois do último round, vence quem ganhou mais rounds; igualdade gera empate. `R` reinicia a luta completa usando os valores atuais da configuração. O round reiniciado limpa vida, posições, golpes, stun, dash, buffer e marcador de rounds.

O elenco inclui `Tester` e `Dummy` (`dummy`) para validar atributos e associação de golpes por personagem. Dummy é apenas um segundo conjunto mínimo de dados, não um personagem final.

### Comandos de sequência provisórios de Tester

| Comando | Variante de teste | Startup | Ativo | Recovery | Dano | Nível |
|---|---|---:|---:|---:|---:|---|
| `F,F+2` | soco de avanço duplo | 8 | 3 | 18 | 80 | médio |
| `D,DF+3` | chute de entrada diagonal | 7 | 3 | 17 | 68 | médio |

---

## 21. Princípios para futuras contribuições

1. Este arquivo é a referência inicial para regras e decisões do jogo.
2. Não introduzir uma mecânica nova sem descrever seu propósito, entradas, estados, condições de sucesso/falha e interação com defesa.
3. Toda regra temporal deve usar frames da simulação, salvo quando for explicitamente uma regra de interface.
4. Toda propriedade de golpe deve ser fácil de inspecionar e ajustar.
5. Não misturar animação visual com a autoridade da lógica de combate.
6. Não reutilizar personagens, sprites, sons, nomes de golpes ou outros recursos protegidos dos jogos de referência. Criar uma identidade original baseada nas características gerais que inspiram o projeto.
7. Priorizar primeiro uma luta pequena e consistente; expandir elenco e conteúdo depois que os sistemas forem confiáveis.
8. Quando o comportamento implementado divergir deste documento, atualizar o código ou registrar e documentar conscientemente a decisão de design — não deixar divergências acidentais.

---

## Resumo da proposta

Um jogo de luta 2D para navegador, distribuído pelo GitHub, com visual que combina energia de sprites clássicos e animação expressiva; combate técnico baseado em quatro botões (`1`–`4`), comandos direcionais e simultâneos; defesa alta/baixa, agarrões, parries específicos, frame advantage, controle de distância e golpes fortalecidos por execução precisa; além de especiais cinematográficos com sequências interativas de botões. A implementação deve começar com uma simulação própria, determinística e testável, para que a profundidade do combate não dependa da camada visual.
