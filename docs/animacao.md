> **Histórico do protótipo anterior — substituído em 25/10/2026.** Este registro preserva evidências e decisões antigas; elenco, combos, números e tarefas abaixo não são especificação ativa. Consulte [base.md](../base.md), [pipeline.md](../pipeline.md) e [identidade-visual.md](../identidade-visual.md). Referências de seções/etapas abaixo pertencem às versões antigas, recuperáveis no Git. Não continuar a produção do elenco retirado.

# Produção e revisão de animações

**Raiz:** [`base.md`](../base.md), especialmente §§7, 13 e 16. **Plano:** Etapa 3 de [`pipeline.md`](../pipeline.md).

## Resultado procurado

Animação 2D desenhada em poses nítidas, com antecipação, aceleração, contato e recuperação reconhecíveis. A continuidade entre ações precisa preservar escala, volume, direção, figurino e apoio dos pés. Mais desenhos não garantem maior fluidez: a distribuição de tempo entre as poses deve comunicar peso e intenção.

O relógio de luta é de 60 Hz. A quantidade de desenhos por segundo varia por ação; uma pose pode durar vários frames lógicos, e um golpe rápido pode trocar poses em frames consecutivos. Não aplicar interpolação de movimento ou blend de imagens que borre a silhueta.

## Fontes de verdade

| Informação | Responsável |
| --- | --- |
| Duração, dano, alcance, stun, pushback e cancelamentos | Livro `moves` do personagem |
| Corpo, hurtboxes em pé/agachado/no ar | Perfil `collision` do personagem |
| Posição, modo, trajetória e frame de entrada no estado | Simulação |
| Desenhos, sequência, holds, orientação e tamanho de apresentação | Manifesto/atlas do personagem |
| Câmera e camadas de cenário | Sistema compartilhado de cenários |

O sprite permanece ancorado na posição lógica. Escala por quadro corrige erros de normalização do atlas; não redimensionar cada desenho pela altura total de sua silhueta. No Tester, 393–395 usam 0.78 para manter cabeça/membros próximos do idle e altura baixa de aproximadamente 97 unidades; os pés ficam na âncora 252. Escala e origem são reaplicadas ao trocar de quadro, inclusive ao levantar. Não acrescentar um avanço visual independente para disfarçar falta de alcance; deslocamentos de combate devem estar declarados nos dados. Ajustes de desenho/pivô não podem arrastar o collider.

## Estrutura de entrega por personagem

```text
src/assets/sprites/characters/<id>/
  README.md                  # origem, edição, exportação e limitações
  <id>-atlas.png             # PNG RGBA, células uniformes
  sources/                   # arquivo editável, quando disponível
src/assets/animations/
  <id>.json                  # índices, sequência, holds e associações
```

Preservar o arquivo de edição e a origem dos recursos. O atlas atual do Tester é uma base de desenvolvimento fornecida pelo usuário; a existência de 399 quadros não implica 399 poses revisadas ou animação final pronta.

## Contrato do manifesto

| Campo | Uso |
| --- | --- |
| `textureKey` | Identificação da textura |
| `frameSize` | Tamanho real e uniforme da célula, sem trim variável |
| `totalFrames` | Quantidade válida de quadros, excluindo células vazias da última linha |
| `displaySize` | Tamanho da célula no mundo, mantendo a proporção dos dois eixos |
| `footAnchorY` | Coordenada vertical da linha de apoio na célula; padrão: altura da célula |
| `frameTransforms` | Correções autoradas por índice: escala uniforme e âncora vertical opcional; valores finitos e positivos |
| `clips[].key` | Chave única por ação/fase |
| `start`, `end` | Intervalo inclusivo; `frames` explícito tem precedência |
| `frames` | Ordem dos desenhos; permite retorno e holds sem duplicar imagens |
| `frameRate` | Cadência padrão quando não existem durações por pose |
| `repeat` | `-1`: loop; `0`: uma vez; positivo: repetições adicionais |
| `frameDurations` | Uma duração positiva por entrada da sequência; em ataques funciona como peso dentro da fase |
| `sourceFacesLeft` | Direção da arte original daquele clipe |
| `airbornePoses` | Poses de subida, ápice e descida e limiar de velocidade do ápice |
| `moveClips` | Associação explícita dos IDs de golpes aos clipes |
| `provisionalMoves` | Registro de golpes com poses aproximadas/reutilizadas; não concede aprovação visual |

Os clipes de estado atuais usam `idle`, `walk`, `dash`, `jump`, `crouch`, `defense`, `hit`, `blockstun`, `grabbed`, `knockdown` e `throw-recovery`. Os ataques usam `{personagem}-{nome-do-clipe}-{startup|active|recovery}`. O recuo usa `walk-backward` e o backdash usa `backdash`, ambos mantendo a frente orientada ao adversário. Ayla usa quadros dedicados de recuo; Gris e Tester usam poses próprias de guarda como solução provisória até a produção de passos completos.

Exemplo de holds: três poses com `frameDurations: [2, 1, 3]` duram dois, um e três frames num clipe de estado. Numa fase de ataque com 12 frames, os mesmos pesos ocupam quatro, dois e seis frames. O golpe continua com a duração de 12 frames registrada no livro.

Em reações com stun, a sequência é distribuída pela duração lógica da reação. Loops retomam a primeira pose ao final do ciclo sem duplicar os extremos. Espelhamento durante a mesma ação não deve voltar à primeira pose.

## Matriz de produção do Tester

“Associado” indica que há uma sequência acessível pelo estado/golpe. Não significa que o desenho, o alcance aparente e a transição final foram aprovados.

| Família | Situação atual | Próxima revisão |
| --- | --- | --- |
| Idle/guarda neutra | Loop de poses com holds e espelhamento | Continuidade de cabeça, mãos, respiração e retorno após golpes |
| Caminhada/avanço/recuo | Clipes distintos de avanço e recuo; sem inverter a frente ao recuar | Pés, deslizamento e troca de direção sem salto de fase |
| Dash | Avanço e backdash distintos | Arte própria de aceleração/freio, se a regra continuar usando dash |
| Agachamento | Pose baixa sustentada | Entrada e saída próprias, volume e altura em relação à hurtbox |
| Salto | Três poses seguem subida/ápice/descida | Preparação, aterrissagem e continuidade dos ataques aéreos |
| Guarda alta/baixa | Guarda em pé; baixa usa agachamento | Forma de contato por altura e reentrada na guarda |
| Blockstun | Poses de guarda distribuídas pelo stun | Recuo de impacto sem ajoelhar ou cair |
| Hitstun comum | 144–145–144, reação em pé | Altura/intensidade distintas; não reutilizar giro/queda |
| Socos e chutes principais | Fases de preparo/contato/recuperação associadas | Alcance aparente, escala dos membros e retorno à guarda |
| Socos agachados/aéreos | Baixos 255–258; aéreos reutilizam o soco fechado 52–54–56 | Autoria de contato e silhueta própria para cada variação |
| Direcionais, chords e soco ascendente | Parte reutiliza socos principais | Distinguir as propriedades do livro com poses próprias |
| Captura/arremesso/recuperação | Alcance das mãos e recuperação provisórios | Sincronizar os dois corpos; evitar teleporte ou giro indevido |
| Queda/levantada | Material no atlas; sistema completo ainda pendente | Especificar regras antes de conectar novos estados |

Todos os 26 golpes precisam ter `startup`, `active` e `recovery` associados. `provisionalMoves` delimita as reutilizações introduzidas para remover o fallback silencioso em idle. A validação exige cobertura; uma entrega com falta de arte deve declarar sua aproximação e permanecer pendente na revisão visual.

## Processo de autoria

1. **Definir a ação:** comando, nível, posição inicial/final, alcance e três fases. Escolher o livro do personagem como base, sem inventar frames na imagem.
2. **Desenhar poses principais:** postura inicial, antecipação, contato e recuperação; verificar silhueta em tamanho real de luta.
3. **Distribuir holds:** registrar sequência e duração/peso de cada desenho. Tornar a intenção visível sem alongar a fase lógica para acomodar arte.
4. **Completar intervalos:** acrescentar apenas desenhos que melhorem aceleração, trajetória ou continuidade. Preservar proporções e roupa.
5. **Exportar:** PNG RGBA, células idênticas, pivô dos pés estável, margem que comporte golpes e sem fundo/HUD embutidos.
6. **Associar e revisar:** validar manifesto, abrir treino, conferir ambos os lados e sobrepor hurtboxes/hitboxes.
7. **Aprovar por ação:** anotar qual clip está revisado e quais ainda são aproximações; não aprovar o personagem inteiro de uma vez.

Ferramentas generativas podem apoiar conceitos e poses, mas a sequência final exige controle de desenho e alinhamento. Não aceitar uma spritesheet gerada apenas porque o número de quadros coincide.

## Roteiro de revisão no treino

| Caso | Observar |
| --- | --- |
| Idle → andar → parar → recuar | Ciclo contínuo; direção correta; pés estáveis |
| Em pé → agachar → levantar | Mesmo corpo e figurino, sem escala variável ou locomoção |
| Salto vertical/frente/trás | Subida/ápice/descida, espelhamento e posição lógica |
| Ataque no chão e no ar | Separação das fases, contato na pose ativa e retorno sem estalo |
| Ataque bloqueado/fora de alcance | Guarda não cai; defensor só recebe pushback no contato |
| Alto contra agachado; médio/baixo contra guardas | Desenho compatível com a geometria e o nível real |
| Hitstun/bloqueio repetido | Reação recomeça quando há novo contato, sem travar no quadro anterior |
| Troca de lado e câmera nas extremidades | Espelhamento, escala e apoio permanecem corretos |
| Pausa e avanço por `.` | Um passo lógico muda apenas a pose correspondente; pausa congela o desenho |
| Reset, round e retorno ao menu | Sem clipe/listener de ação anterior persistindo |

Para cada golpe, registrar pelo menos: dois lados, curta/média distância, contato/erro/bloqueio e entrada no primeiro frame legal após recuperação. Guardar capturas e uma sequência de entradas quando houver defeito reproduzível.

## Cadência revisada

Conforme base.md, os strikes receberam +2F de preparo, +1F ativo e +4F de recuperação a pedido do usuário. Isso muda o combate e a vantagem, não apenas o desenho. O manifesto distribui os desenhos dentro desses tempos: contato sustentado e início de recolhimento próximo do ápice, seguido de retorno progressivo. O chute forte em pé usa 64–57–58 / 69 / 69–58–57–64; o aéreo forte usa 121–122 / 123 / 123–122–121.

O corpo não recebe tint de preparo/atividade/stun; a geometria de treino usa alfa constante. A visibilidade do sprite não é controlada pela existência de uma hitbox.

## Limites da primeira entrega

- Ainda não há hitstop, aterrissagem dedicada, blend desenhado entre todos os estados ou reação específica para cada intensidade.
- As poses de captura e queda continuam provisórias; a nova lógica não acrescenta launcher, juggle nem levantada.
- A direção de arte final é ilustrada em alta definição; o cenário atual em pixel art é material provisório e sua harmonização fica na Etapa 3.
- A equivalência entre FPS e os casos de borda de holds/transições ainda precisam de cobertura automatizada. O build e uma inspeção visual isolada não substituem essa entrega.
