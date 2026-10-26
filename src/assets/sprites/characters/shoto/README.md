# Shoto — Anfitrião: entrega de animações

O usuário aprovou idle, caminhada e agachado e, posteriormente, salto, defesa, recuo, dash e backstep. Nesta revisão autorizou inserir as cinco propostas novas, uniformizar o cabelo avermelhado em todas as folhas e corrigir alinhamento/loops. Nenhuma aprovação de novos ataques ou reações é inferida.

## Conteúdo

| Atlas | Índices | Quadros | Reprodução |
| --- | --- | --- | --- |
| idle | 0–7 | 8 | Ciclo a 6 FPS |
| walk | 8–15 | 8 | Ciclo a 10 FPS |
| crouch | 16–21 | 6 | 16,17,18,19,20,21,20,19,18,17 a 6 FPS |
| jump | 22–29 | 8 | Durações 2,4,6,10,6,4,4,2 frames lógicos, sem repetir no ar |
| defense | 30–35 | 6 | Entrada 30/31 uma vez; mantém 32,33,34,35,34,33 |
| walk-backward | 36–43 | 8 | Ciclo próprio a 10 FPS |
| dash | 44–49 | 6 | 2 frames lógicos por pose |
| backstep | 50–55 | 6 | 2 frames lógicos por pose |

Corrida reutiliza 45–48. Defesa baixa usa a pose agachada já aprovada; não há desenho específico de guarda baixa. Ataques e hitstun conservam geometria provisória.

## Fontes e preparo

- `source/*-magenta.png`: fontes aprovadas preservadas.
- `source/*-auburn.png`: edições pelo `image_gen` embutido, uma por folha, alterando apenas o cabelo para vermelho acobreado escuro. As poses, vestuário e composição foram preservados. Prompts e origem em `source/auburn-edits.json`.
- `alignment.json`: raízes X/Y e escala autoradas por folha/quadro. O ponto de apoio do agachado foi corrigido; não usar centro da silhueta para alinhar braços ou abas móveis.
- `*.png`/`*.atlas.json`: 84 quadros RGBA, quinze faixas de uma linha, células fixas 768 × 768, sem trim, raiz 384/720. Largura máxima de atlas 6144 pixels.
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

`getShotoSpriteLayers` mistura a pose anterior e a atual durante três frames, com informações do snapshot em vez de tempo real ou histórico do renderizador. Permite suavizar interrupções entre ações sem atrasar o controle, alterar colisores ou avançar durante pausa. A margem lateral fixa passou a 88 unidades para acomodar as poses largas (meia célula corresponde a 86,4 unidades de mundo).

## Cores exibidas no jogo — revisão sem recortes

A classificação automática de material e a quantização por faixas foram removidas: criavam recortes artificiais na pele e nas dobras marfim. `prepareShotoSprites` prepara os 15 atlas uma vez com a correção RGB contínua em `src/rendering/animations/shotoPalette.ts`. Ela preserva os pixels de tinta/marfim, sombras e gradientes originais, mantém cabelo castanho discreto, pele um pouco mais morena e escurece suavemente neutros da calça. Pesos suaves sobrepõem os ajustes, sem troca binária de material, medianas por linha ou paleta limitada. A tabela de tons nesse arquivo é referência artística, não uma lista de cores impostas a cada pixel.

Fontes, células 768 × 768, alpha e raiz 384/720 permanecem. Desenho exibido uniformemente 3% maior, display 177,984 × 177,984, também na seleção; sem aumento dos colisores ou zoom dinâmico. Margem lateral passa a 92 unidades. Corrida segue removida; dash sustentado volta à caminhada após 24F. Testes de continuidade cobrem os limiares que causavam as rachaduras.
