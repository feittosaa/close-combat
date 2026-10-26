# Shoto — Anfitrião: entrega de animações

O usuário aprovou idle, caminhada e agachado e, posteriormente, salto, defesa, recuo, dash e backstep. Nesta revisão autorizou inserir as cinco propostas novas, uniformizar o cabelo avermelhado em todas as folhas e corrigir alinhamento/loops. O pedido posterior autoriza quatro ataques e duas guardas descritos abaixo; reações continuam indefinidas.

## Conteúdo

| Atlas | Índices | Quadros | Reprodução |
| --- | --- | --- | --- |
| idle | 0–7 | 8 | Ciclo a 6 FPS |
| walk | 8–15 | 8 | Ciclo a 10 FPS |
| crouch | 16–21 | 6 | 16,17,18,19,20,21,20,19,18,17 a 6 FPS |
| jump | 22–29 | 8 | Durações 2,4,6,10,6,4,4,2 frames lógicos, sem repetir no ar |
| defense | 30–35 | 6 | Entrada 30/31 uma vez; mantém 32,33,34,35,34,33 |
| walk-backward | 36–43 | 8 | Ciclo próprio a 10 FPS |
| dash | 44–49 | 6 | 3,4,4,4,3,2 frames após conector de 4F |
| backstep | 50–55 | 6 | 3,4,4,4,3,2 frames após conector de 4F |

Corrida removida. Quatro básicos e guardas agachada/aérea usam clipes próprios; hitstun conserva geometria provisória.

## Fontes e preparo

- `source/*-magenta.png`: fontes aprovadas preservadas.
- `source/*-auburn.png`: edições pelo `image_gen` embutido, uma por folha, alterando apenas o cabelo para vermelho acobreado escuro. As poses, vestuário e composição foram preservados. Prompts e origem em `source/auburn-edits.json`.
- `alignment.json`: raízes X/Y e escala autoradas por folha/quadro. O ponto de apoio do agachado foi corrigido; não usar centro da silhueta para alinhar braços ou abas móveis.
- `*.png`/`*.atlas.json`: 116 quadros RGBA, 21 faixas de uma linha, sem trim. Locomoção/guardas: células 768 × 768, raiz 384/720. Ataques: 1152 × 768, raiz 576/720. Largura máxima 6912 pixels, mesma escala uniforme por altura em todos os clipes.
- `preparation.json`: medidas da transformação executada. `verification.json`: limites opacos e medição independente do pé plantado.

Reproduzir da raiz do repositório com Python, Pillow, NumPy e SciPy:

```
python3 scripts/prepare-shoto-sprites.py
python3 scripts/verify-shoto-sprites.py
```

A preparação remove magenta, separa corpos, usa as raízes autoradas e empacota atlas. Não redesenha nem recolore. O salto usa raízes Y autoradas para que o movimento ilustrado não duplique a trajetória da física. A proporção agachada é preparada no PNG, sem alteração de caixas ou escala variável no runtime. O pé de apoio agachado varia 1,5 pixel no atlas (cerca de um pixel na saída Full HD com escala fixa 1,6).

## Runtime e conferência

`shotoSprites.ts` amostra o frame lógico e espelha a raiz para ambos os lados. Pausa não avança a pose; reset volta ao início. O combate é independente dos pixels. O enquadramento é fixo em 1,6; a margem compartilhada de tela limita afastamento e permite acompanhamento exclusivamente lateral.

Conferência no jogo e capturas em `docs/evidence/shoto-animacoes-alinhadas/`. Testes de seleção/loops, espelhamento, pausa/reset, enquadramento e separação não substituem a revisão artística pelo usuário.

## Conectores e dash revisado

Sete novas folhas `enter-*`, quatro desenhos cada: walk 56–59, backward 60–63, crouch 64–67, jump 68–71, defense 72–75, dash 76–79, backstep 80–83. Fontes e prompts em `source/transitions-generation.json`; ferramenta embutida image_gen. Os conectores foram produzidos a partir das fontes idle/destino, preservando cabelo vermelho acobreado, roupa e proporções. Mesmas células 768 × 768, raiz 384/720 e preparação declarada em alignment.json.

Entradas duram 8 frames, exceto salto/dash/backstep (4). Ao parar, o conector correspondente é invertido; uma entrada curta retorna apenas pelas poses já alcançadas. A preparação do salto ocupa os quatro primeiros frames de sua trajetória, mantendo os tempos de ápice/queda do restante do clipe. Dash/backstep usam o conector de 4 frames mais as seis poses principais em 20 frames (3,4,4,4,3,2), total 24. Corrida removida na revisão seguinte. Guarda entra pelo novo conector, preserva a pose fechada em blockstun e nunca reabre em cada ciclo.

`getShotoSpriteLayers` retorna uma única pose com alpha 1. A dissolução anterior de três frames foi removida porque duas camadas com alphas complementares resultavam em cobertura composta de apenas 7/9 no meio da troca, criando piscadas e imagem dupla. Os conectores de quatro desenhos e o retorno parcial continuam em uso, sem mudar tempos ou regras. A margem lateral atual é 92 unidades, preservando a escala de desenho +3%.

## Cores exibidas no jogo — revisão sem recortes

A classificação automática de material e a quantização por faixas foram removidas: criavam recortes artificiais na pele e nas dobras marfim. `prepareShotoSprites` prepara os 21 atlas uma vez com a correção RGB contínua em `src/rendering/animations/shotoPalette.ts`. Ela preserva os pixels de tinta/marfim, sombras e gradientes originais, mantém cabelo castanho discreto, pele um pouco mais morena e escurece suavemente neutros da calça. Pesos suaves sobrepõem os ajustes, sem troca binária de material, medianas por linha ou paleta limitada. A tabela de tons nesse arquivo é referência artística, não uma lista de cores impostas a cada pixel.

Fontes, células 768 × 768, alpha e raiz 384/720 permanecem. Desenho exibido uniformemente 3% maior, display 177,984 × 177,984, também na seleção; sem aumento dos colisores ou zoom dinâmico. Margem lateral passa a 92 unidades. Corrida segue removida; dash sustentado volta à caminhada após 24F. Testes de continuidade cobrem os limiares que causavam as rachaduras.

## Quatro básicos e duas guardas — branch sem integração

| Atlas | Índices | Reprodução |
| --- | --- | --- |
| light-punch | 84–89 | 2 poses no preparo, 1 no contato, 3 na recuperação |
| heavy-punch | 90–95 | Mesma distribuição pelas fases reais do soco forte |
| light-kick | 96–101 | Mesma distribuição pelas fases reais do chute fraco |
| heavy-kick | 102–107 | Mesma distribuição pelas fases reais do chute forte |
| crouch-defense | 108–111 | 0,1,2,3,2,1 a 6 FPS, sempre agachado |
| air-defense | 112–115 | 0,1,2,3,2,1 a 6 FPS, guarda aérea fechada |

Fontes magenta originais `source/*-combat.png`, prompts integrais e referências em `source/combat-generation.json`, gerados pela ferramenta embutida image_gen. A preparação usa chromakey balanceado nestas seis folhas para preservar vinho/pele. `alignment.json` registra raízes e escala por folha; a guarda aérea usa uma raiz virtual abaixo dos pés para não somar uma segunda trajetória ao salto físico. Os quatro atlas mais largos mantêm o centro como raiz e não mudam a altura/escala do personagem. A correção RGB recebe a largura real da célula, inclusive 1152, preservando sombras e alpha sem quantização.

`shotoCombatSprites.ts` consulta os dados reais do golpe e `elapsedFrames`: nenhum relógio paralelo nem mudança de balanceamento. As poses ativas coincidem com os frames ativos; o desenho não define a hitbox. Guardas são escolhidas antes da locomoção conforme grounded/crouching. `B`/`DB` durante ameaça permite guarda aérea contra altos/médios, com gravidade e movimento aéreo preservados; baixo exige chão. Não há golpes aéreos ou agachados novos.

Conferência desta entrega: `docs/evidence/shoto-golpes-guardas/`. A branch é mantida para revisão; qualquer merge em development exige pedido explícito do usuário.
