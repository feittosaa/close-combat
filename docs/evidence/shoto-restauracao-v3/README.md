# Recuperação da base anterior à v3

A v3 foi rejeitada pelo usuário por regressões de identidade, cor e continuidade dos movimentos. Esta entrega retira essa tentativa do jogo e restaura o conjunto de `61ccbf9`, sem gerar arte nova, sem reinterpretar cores e sem recalibrar proporções.

`baseline-match.json` registra comparação byte a byte de 44 arquivos ativos: 21 PNGs, 21 atlas, alinhamento e módulo de reprodução. Todos coincidem com a base anterior. As intermediárias v3 saíram do runtime e foram arquivadas, junto ao histórico das fontes/prompts, sem reescrever commits.

Validação local: npm ci, 168 testes/22 arquivos, build, verificador dos 120 quadros, checagem de diff e conferência da prévia no treino. Capturas de idle, caminhada, agachamento, salto e golpes fortes documentam a recuperação; não são aprovação artística dos detalhes que já estavam pendentes antes da v3.

Mangas/acessórios, proporção dos golpes fortes, fluidez e ampliação da caminhada continuam pendentes. As próximas correções precisam preservar o conjunto existente e comparar uma animação completa por vez, inclusive lado dos membros e retorno. Nenhuma contagem de quadros, medida de silhueta ou CI verde pode substituir a validação artística.

Branch mantida: `codex/feature-shoto-golpes-guardas`. Sem merge em development ou main. O resultado remoto é registrado em pipeline.md após o envio.
