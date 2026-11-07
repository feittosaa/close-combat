# Auditoria de performance — Close Combat

Auditoria feita em 2026-11-07 na branch `revisao-codigo`, a partir da `development` (`aa56062`). A primeira etapa implementou só o que tinha equivalência demonstrável. Depois o usuário autorizou quatro propostas: recorte das folhas, carregamento por partida, shader único de cor e luz, e atlas por qualidade sob demanda. Essas mudanças foram implementadas e conferidas no navegador.

## 1. Resumo executivo

- **Memória de textura, o maior problema, foi reduzida ~5×.** Antes, o boot decodificava tudo: ≈2,4 GB RGBA na qualidade normal e ≈8,8 GB na alta, sem contar as artes de menu. Agora cada partida mantém só os seus dois lutadores (recortados), o seu cenário e os seus títulos. O pior caso é ≈0,47 GB na normal e ≈1,5 GB na alta.
- **Recorte das folhas:** 84% da área dos quadros era transparente. As folhas de personagem caíram de 2 116 para 359 MB na qualidade normal e de 8 463 para 1 436 MB na alta. O tamanho, o pivô e a posição de cada quadro foram preservados.
- **CPU/GPU por frame:** o HUD deixou de redesenhar e reenviar texturas de texto sem mudança de cor (6 → 0 por frame em partidas, 42 → 0 no treino). A paleta alternativa e a luz de cenário passaram a ser um único pipeline compartilhado, sem PostFX por sprite.
- **Travamentos no início das lutas:**
  - Cada sprite com cor ou luz criava um PostFX próprio no primeiro desenho, que compilava um programa de shader e criava um framebuffer de tela inteira.
  - Cada textura terminava de ir para a GPU só no primeiro uso, como o título FIGHT ou uma pose nova.
  - Agora o pipeline de cor é compilado uma vez, e toda textura da partida é desenhada e sincronizada com a GPU antes do READY, ainda sob a tela de carregamento.
- **Bundle:** os atlas JSON das duas qualidades saíram do JS (2 198 329 → 1 991 780 B; gzip 480,5 → 477,4 KB). Cada partida baixa só os layouts da qualidade em uso.
- **Lógica de combate é barata e não foi alterada:** ~5,5 µs por passo. `snapshot()` custa ~17–40 µs e é chamado 3–4 vezes por frame (proposta pendente).

## 2. Arquitetura analisada

- **Stack real:** TypeScript 5.8, Phaser 3.90 (renderer `AUTO` → WebGL, fallback Canvas), Vite 6, Vitest 3. Scripts Python (Pillow/NumPy) preparam os sprites. Sem outras dependências de runtime.
- **Fluxo:** `main.ts` registra o loader `packedAtlas` e cria o `Phaser.Game` (cenas `BootScene` → `MenuScene` → `FightScene`). Em desenvolvimento, carrega antes `src/dev` por import dinâmico opaco ao bundler; o build de produção não contém esse código.
- **Loop:** `FightScene.update(delta)` → `Simulation.advance` com `FixedStepClock` (passos de 60 Hz, até 5 de recuperação). Cada passo lê entradas, executa `Simulation.step` e chama `observeFrame` com um snapshot. Depois `syncViewsAndHud` atualiza cenário/câmera, lutadores, projéteis, hitboxes, HUD e apresentação.
- **Renderização:** `Image` com atlas por ação. Paleta alternativa e luz de cenário são um único `MultiPipeline` compartilhado (`character-color`), que lê a cor de cada sprite em `pipelineData`. No renderer Canvas, a paleta usa `getImageData` com cache por quadro. HUD em `Text`/`Graphics` com câmera própria; menus, pausa, resultado e vitória são DOM.
- **Assets:** o boot carrega a arte do menu, os ícones, os efeitos de contato e os sons. `FightScene.preload` chama `preloadMatchAssets`: libera texturas de lutadores, cenários e temas que a partida não usa e enfileira só o que falta, mostrando a tela de carregamento enquanto isso.

## 3. Problemas encontrados

| Prioridade | Arquivo | Problema | Impacto | Risco | Status |
|---|---|---|---|---|---|
| Alta | `BootScene.ts`, `FightScene.ts` | Tudo carregado e decodificado no boot | ≈2,4 / 8,8 GB de texturas residentes | Médio (fluxo de carregamento) | **Corrigido** (autorizado) |
| Alta | Folhas em `src/assets/sprites/characters` | Quadros sem recorte: 84% transparente | VRAM/RAM ~6× maior | Médio (pipeline de assets) | **Corrigido** (autorizado) |
| Alta | `CombatHud.ts`, `PlayerInputDisplay.ts` | `setColor`/`setBackgroundColor` todo frame redesenham texto e reenviam textura | 6 / 42 uploads por frame | Nenhum | **Corrigido** |
| Média | `palettePipeline.ts`, `characterColor.ts` | Paleta e luz em dois PostFX por sprite | Passe extra de framebuffer | Médio | **Corrigido** (autorizado) |
| Média | `cowboySprites.ts`, `shotoSprites.ts` | Atlas JSON das duas qualidades no bundle | +≈200 KB de JS, só uma qualidade usada | Baixo | **Corrigido** (autorizado) |
| Média | `Simulation.ts` (`snapshot`) + `FightScene` | `structuredClone` em 3–4 snapshots por frame; 2/3 do custo é o perfil de colisão estático | ~17–40 µs cada + lixo para o GC | Médio (contrato testado) | Proposta |
| Média | `src/assets/audio/effects` (83 WAV) | PCM sem compressão: 32 MB | Download e RAM de áudio | Alto se lossy; baixo sem perdas | Proposta |
| Baixa | `StageView.syncHudCamera`, `StagePresentation.syncCamera`, `sharpenSceneText` | Percorrem todos os objetos da cena todo frame | O(n), sem GPU | Baixo | Proposta |
| Baixa | `getPlayerLayout`, `characterColor`, `CombatantView` | Pequenas alocações por frame | Micro | Baixo | Não justificado |

## 4. Otimizações implementadas

### 4.1 Cor de texto do HUD só muda quando muda

- **Onde:** `src/ui/hudTheme.ts` (`setTextColor`, `setTextBackground`), `CombatHud.update`, `PlayerInputDisplay.update`.
- **Problema:** no Phaser 3.90, `TextStyle.setColor`/`setBackgroundColor` chamam `updateText()` sem comparar o valor: medem, redesenham o canvas e chamam `canvasToTexture`.
- **Solução:** as atualizações por frame só chamam o Phaser quando a cor difere do estilo atual.
- **Equivalência:** com a cor igual, o redesenho omitido daria pixels idênticos; com a cor diferente, a chamada original acontece na mesma ordem.
- **Validação:** teste em `HudPresentation.test.ts`, que falha no código anterior.

### 4.2 Recorte das folhas de personagem

- **Onde:** `scripts/pack-sprites.py` (chamado por `prepare-sprites.py`), `<folha>.packed.json` ao lado de cada atlas (normal e alta) e `src/rendering/packedAtlas.ts` (`load.packedAtlas`).
- **Problema:** cada quadro ocupava a célula inteira (ex.: 1024×1024), mas o desenho cobre em média 16% dela.
- **Solução:** o script mede a caixa dos pixels com alpha > 0 em cada quadro e acrescenta 2 px de margem transparente. Em seguida, empacota os retângulos em prateleiras, escolhendo a largura de menor área sem passar do maior lado da folha original (com 2 px entre quadros). O layout é um atlas JSON-hash do Phaser com `trimmed`, `spriteSourceSize` e `sourceSize`, mais a origem de cada recorte na folha original. Ao carregar, `PackedAtlasFile` decodifica a folha original como `ImageBitmap` (fora da thread principal), copia os recortes para um canvas compacto, registra o atlas e fecha o bitmap (`close()`), liberando na hora os pixels decodificados. O PNG e o atlas originais não mudam.
- **Equivalência:**
  - Python: os 1 624 quadros (duas qualidades) foram reconstruídos a partir do layout e são idênticos aos originais, considerando zero os texels com alpha 0, que não têm cor no upload pré-multiplicado. Nenhum retângulo se sobrepõe.
  - Teste `SpriteIntake`: todo layout está em dia com o hash do PNG e do atlas, e `fullFrames` devolve exatamente os quadros do atlas original.
  - Firefox (WebGL): 136 folhas, cada quadro em 3 transformações (escala 0,37/0,61/1, posições fracionárias, espelhado ou não). São 2 436 renderizações, recortada contra original, sem deslocamento de quadro. Largura, altura e origem do `Image` são idênticas.
  - Diferença medida: até 1/255 por canal só em texels semitransparentes de borda, vindo do arredondamento do alpha pré-multiplicado na cópia pelo canvas 2D. Texels opacos e transparentes são idênticos. Depois da filtragem bilinear na tela, a diferença é de até 2/255 por canal.
- **Resultado (calculado pelas dimensões, RGBA):**
  - Qualidade normal: 780 → 173 MB e 1 336 → 186 MB nas folhas dos dois personagens.
  - Qualidade alta: 3 120 → 693 MB e 5 343 → 743 MB.
  - A maior folha compacta tem 6 154 px de lado (a original tinha 6 144).

### 4.3 Carregamento por partida

- **Onde:** `src/rendering/matchAssets.ts`, `BootScene`, `FightScene.preload`, `src/ui/loadingScreen.ts` e `DeveloperPanel`.
- **Solução:**
  - O boot carrega só a arte do menu, os ícones, os efeitos de contato e os sons.
  - Antes de cada luta, `preloadMatchAssets` remove as texturas de outros lutadores (`<id>-*`), cenários (`stage:<id>:*`) e temas de título (`presentation:<tema>:*`), e enfileira só o que falta.
  - Se há algo a carregar, a mesma tela de carregamento do boot aparece entre a confirmação e a luta. Revanche e próxima luta do Arcade no mesmo cenário reaproveitam o que já está carregado.
  - O painel de desenvolvedor carrega tudo enquanto está aberto, para o navegador de sprites continuar completo.
- **Equivalência:** o carregamento termina no `preload`, antes do `create`; nada é carregado durante o combate. O teste `FightAssetReadiness` cobre o boot sem assets de partida, a carga por partida, a revanche sem nova carga e a liberação só do cenário trocado.
- **Conferido no Firefox:** a tela de carregamento aparece entre a seleção e o treino e some na luta, nas qualidades normal e alta.
- **Resultado (pior caso: dois lutadores diferentes no maior cenário):** ≈466 MB na qualidade normal (antes ≈2,4 GB) e ≈1,5 GB na alta (antes ≈8,8 GB), sem contar menu e efeitos compartilhados. Em troca, aparece uma tela de carregamento na primeira luta de cada combinação.

### 4.4 Pipeline de cor compartilhado (paleta e luz)

- **Onde:** `palettePipeline.ts` (`registerCharacterColor`) e `CharacterColorEffect.apply` (`characterColor.ts`).
- **Problema:** cada sprite com paleta alternativa ou luz de cenário recebia instâncias próprias de `PostFXPipeline`. No primeiro desenho, cada instância compilava e linkava um programa de shader e criava um framebuffer do tamanho da tela. Isso acontecia ao surgirem os lutadores no início da luta e, já em combate, os 6 braços do tiro em sequência, a poeira, o laço, os projéteis e cada impacto roxo. A cada quadro, cada sprite ainda era redesenhado num framebuffer cheio antes de voltar à tela.
- **Solução:** um único pipeline derivado do `MultiPipeline` do Phaser, registrado e compilado no `create` da luta. Ele aplica a paleta e a luz direto na amostra da textura, com os valores de cada sprite em `pipelineData`, e troca os uniforms (com flush) só quando a cor muda entre sprites. Nenhum sprite cria shader ou framebuffer durante a luta.
- **Equivalência:** o shader reproduz os dois arredondamentos para 8 bits que a cadeia antiga fazia ao gravar em framebuffer e mantém as regras de cor em `mediump`, como antes.
  - Medido no Firefox (WebGL) contra a cadeia antiga de dois PostFX, recriada do código anterior: 136 folhas × 4 combinações de paleta e luz, lendo o segundo quadro de cada caso, porque no primeiro o PostFX ainda não aplica.
  - Resultado: por sprite, no máximo 3 pixels diferem mais de 60/255 (69 no total dos 544 casos), sempre em pixels exatamente no limiar das regras de cor. No máximo 124 pixels por sprite diferem mais de 2/255; o resto fica em ±1–2.
  - Correção: a medição anterior ("544 casos idênticos" para a fusão dos dois PostFX) não era válida, porque comparava os primeiros quadros, em que nenhum dos lados aplicava o efeito.
- **Travamentos medidos** (Firefox headless, Texas espelhada no Saloon noite com paleta alternativa, golpes durante a luta, 4 rodadas):
  - Antes: 9 instâncias de PostFX criadas durante a luta e um quadro de 66 ms na passagem do READY para o FIGHT.
  - Depois: 0 instâncias, nenhum quadro acima de 25 ms no início da luta e só um quadro isolado de 33 ms mais tarde, em 2 das 4 rodadas.

### 4.4.1 Tudo pronto antes do READY

- **Onde:** `primeMatchTextures` (`matchAssets.ts`), chamado no `create` da luta antes de fechar a tela de carregamento, e `FightScene.preload`.
- **Solução:** depois que o carregamento termina, cada textura carregada é desenhada uma vez fora da tela, numa textura 4×4. Isso inclui as folhas dos dois personagens com efeitos e projéteis, os efeitos de contato, as camadas e os quadros animados do cenário, os títulos, o overlay da ultimate e os ícones. Também é desenhada uma imagem pelo pipeline de cor, e depois `gl.finish()` espera a GPU. Uploads que o driver adia para o primeiro uso acontecem aí, sob a tela de carregamento. A arte de corpo inteiro da tela de vitória dos dois lutadores é baixada e decodificada no `preload` e passada à `VictoryScreen`.

- **Aviso `generateMipmap ... lazy initialization` (Firefox):** vinha da textura de aquecimento de 4×4, que é potência de 2. O Phaser gera mipmaps de texturas vazias nesse tamanho, e o navegador precisa zerá-las antes. Com 3×3, o `generateMipmap` em textura vazia sumiu. Medido instrumentando `texImage2D`/`generateMipmap` no Firefox: durante a luta, o único upload é o texto do cronômetro, uma vez por segundo.
- **Travada alguns segundos após o início da primeira luta:** as folhas originais eram decodificadas em `<img>`, e o Firefox libera esses pixels quando bem entende, na thread principal.
  - Medido: soltar o `<img>` logo após a cópia produziu, nas 3 partidas, um quadro de ~100–116 ms cerca de 2,6 s depois do início, ou seja, o descarte fica adiado para dentro do round.
  - Sem soltar, o descarte acontece mais tarde, por conta do navegador; daí a travada só na primeira luta, a que carrega as folhas.
  - Com `ImageBitmap` + `close()`, a memória é liberada sob a tela de carregamento, e o quadro de ~100 ms não apareceu em 8 partidas.
  - Restam quadros isolados de 33–50 ms em momentos aleatórios (4 a 12 s), como antes, sem ligação com o início do round. A causa não foi identificada no navegador headless.

### 4.5 Atlas por qualidade sob demanda

- **Onde:** `cowboySprites.ts` e `shotoSprites.ts` importam só as URLs dos layouts (`?url&no-inline`); o loader baixa o da qualidade em uso.
- **Resultado:** o bundle JS caiu de 2 198 329 para 1 991 780 B. Os 272 layouts (1,1 MB) são arquivos separados, e cada partida baixa só os seus.

## 5. Comparação antes e depois

Ambiente: Fedora 43, Linux 6.19, Node 22.22, Firefox headless (WebGL) via WebDriver BiDi.

| Métrica | Antes | Depois | Procedimento |
|---|---|---|---|
| Testes | 858/858 | 860/860 | `npx vitest run` |
| `tsc --noEmit` | ok | ok | `npx tsc --noEmit -p tsconfig.json` |
| Bundle JS | 2 198 329 B (480,52 KB gzip) | 1 991 780 B (477,44 KB gzip) | `npx vite build --outDir <tmp>` |
| Texturas de partida, qualidade normal | ≈2,4 GB (tudo no boot) | ≤ ≈0,47 GB | dimensões dos PNGs/layouts × 4 B |
| Texturas de partida, qualidade alta | ≈8,8 GB | ≤ ≈1,5 GB | idem |
| Redesenhos de texto por frame estável | 6 / 42 | 0 / 0 | teste com contagem |
| PostFX criados durante a luta (Saloon noite, espelhada) | 9 | 0 | contagem de `bootFX` no Firefox |
| Maior quadro após o início da luta | 66 ms (READY → FIGHT) | 33 ms isolado, durante golpes | rAF no Firefox headless, 4 rodadas |
| `Simulation.step` / `snapshot` | ~5,5 / ~17–40 µs | inalterado | benchmark determinístico (hash `6124bdf205623ade`) |

FPS, frame time (P95/P99), GC e memória lida do driver **não foram medidos**: o Firefox headless desta máquina não expõe essas métricas de forma confiável. Os números de memória são calculados a partir das dimensões das texturas. Procedimento para medir: `npm run dev`; no Chrome, DevTools → Performance numa luta de treino com inputs visíveis (30 s parado e 30 s golpeando) e `chrome://gpu`/aba Memory após o boot e após a primeira luta, nas duas qualidades.

## 6. Oportunidades não implementadas

1. **Snapshots por frame.** Reaproveitar o snapshot do último passo em `syncViewsAndHud`, ou não clonar o perfil de colisão estático. `Simulation.test.ts` exige que mutar a cópia não afete a simulação; os consumidores precisariam ser auditados. Ganho de ~20–80 µs por frame.
2. **Cópia exata na GPU no recorte.** Copiar os recortes com `copyTexSubImage2D` a partir da textura original eliminaria a diferença de 1/255 nas bordas semitransparentes e a cópia em RAM do canvas. Exige um caminho próprio para restaurar após perda de contexto WebGL e outro para o renderer Canvas.
3. **Recompressão sem perdas** (oxipng para PNG, FLAC para áudio). Muda arquivos-fonte, então exige aprovação.
4. **Varredura de câmeras** só quando a lista de objetos muda. Ganho pequeno.
5. **Phaser num chunk próprio** (`manualChunks`), para cache entre versões.

## 7. Análise de memória e assets

| Grupo | Original (RGBA) | Recortado (RGBA) |
|---|---|---|
| Folhas do personagem com 80 ações, normal / alta | 780 / 3 120 MB | 173 / 693 MB |
| Folhas do personagem com 56 ações, normal / alta | 1 336 / 5 343 MB | 186 / 743 MB |
| Cenários (normal), por cenário | 19–57 MB | carregado só o da partida |
| Títulos de luta, por tema | 25–50 MB | carregado só o tema da partida |
| Efeitos de contato | 80 MB | compartilhados (boot) |

- A cópia em canvas fica como fonte da textura, ocupando na RAM o tamanho recortado. A imagem original decodificada é descartada depois da cópia.
- Texturas liberadas com `textures.remove` destroem a textura WebGL. Só são liberadas no `preload` da próxima luta, quando nenhum objeto da luta anterior existe mais.
- Caches de cor (`WeakMap` por sprite) e mapas de projéteis, explosões e impactos são liberados no `destroy` da cena. `comboHistory` é limitado a 12 e `recentContacts` a 20. Listeners de janela têm remoção correspondente.

## 8. Riscos de regressão

Conferir no jogo:
- **Recorte:** bordas dos sprites, sobretudo nos quadros em que o desenho encosta na borda da célula e nas folhas de qualidade alta. Ciclo completo de cada ação nos dois lados.
- **Pipeline de cor:** paleta alternativa dos dois personagens nos cenários iluminados (Saloon noite, dia e retrô, e Fazenda). Atenção aos poucos pixels no limiar das regras de cor (fios de cabelo e palha).
- **Início da luta e dos rounds:** sem travamentos na passagem para READY e FIGHT, nem ao aparecerem os efeitos pela primeira vez. Na primeira luta após abrir o jogo, conferir os primeiros 15 s. Se ainda travar, gravar um perfil no Firefox Profiler (about:profiling) durante a travada.
- **Carregamento:** tela entre seleção e luta, Arcade trocando de adversário e cenário, revanche, retorno ao menu e nova luta.
- **Painel de desenvolvedor:** a substituição de imagem de uma folha usa os quadros originais completos, sem recorte. A aba Sprites lista todas as folhas depois que a carga termina.
- **HUD:** cores do combo breaker, contagem de combo e destaque do display de inputs.

Hipótese não confirmada: `StageSelectionView` encadeia `setTimeout` no sorteio de cenário sem cancelamento; se a cena mudar durante a animação, o callback ainda roda.

## 9. Recomendações futuras

| Ordem | Ação | Impacto | Risco | Esforço |
|---|---|---|---|---|
| 1 | Medir FPS/GC/VRAM no navegador (seção 5) | Baseline real | Nenhum | Baixo |
| 2 | Reduzir snapshots por frame | Médio (CPU/GC) | Médio | Baixo |
| 3 | Recompressão sem perdas de PNG/WAV | Médio (download) | Baixo (com aprovação) | Baixo |
| 4 | Cópia exata na GPU no recorte | Baixo (exatidão, RAM) | Médio | Médio |
| 5 | Varreduras de câmera só quando a cena muda | Baixo | Baixo | Baixo |

## 10. Conclusão

**Comprovado:**
- **Recorte:** os quadros são idênticos em posição, tamanho e pivô, com diferença de no máximo 1/255 só em texels semitransparentes de borda. Conferido em Python (todos os quadros, das duas qualidades), no teste de layout e no WebGL.
- **Pipeline de cor compartilhado:** elimina a criação de shader e framebuffer durante a luta. Difere da cadeia anterior em no máximo 3 pixels por sprite acima de 60/255, nos limiares das regras de cor.
- **Aquecimento:** toda textura da partida chega à GPU antes do READY. O quadro de 66 ms na passagem para o FIGHT sumiu nas medições.
- **Carregamento por partida:** reduz a textura residente de ≈2,4/8,8 GB para no máximo ≈0,47/1,5 GB, coberto por teste e conferido no navegador nas duas qualidades.
- **HUD:** não redesenha texto sem mudança de cor.
- **Bundle JS:** 9,4% menor.

**Limitações:** FPS, frame time, GC e memória real do driver não foram medidos. A revisão visual humana de todos os ciclos ainda é necessária.
