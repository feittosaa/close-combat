# Encerramento de branches

Auditoria solicitada pelo usuário: branches finalizadas devem ser encerradas após integração e CI de development. Nenhuma tag foi alterada.

## Limpeza das branches já integradas

20 referências locais/remotas removidas após fetch, confirmação de ancestralidade em origin/development, ausência de PR aberto e inspeção de worktrees. Os commits continuam alcançáveis no histórico de development.

| Branch encerrada | Último commit |
| --- | --- |
| codex/chore-reinicio-design-shoto | `f1bbbefd8750a1dafe28c1356ae90e6d5a3360db` |
| codex/feature-artes-tela-inicial | `d8918d14a18e3f49fda21d65c68b95e450279aad` |
| codex/feature-combate-ayla | `83eaac7890cbc76e06ffcade74c1b3b5cc00a5ac` |
| codex/feature-combate-organico | `014cd7ff55d9000b3ea9796b389c30c149e90b6c` |
| codex/feature-direcao-tekken7-ayla | `f41c0aeabd80a08e13ea36e3b8c82a46d61d214d` |
| codex/feature-fluidez-corrida-treino | `41d732ba67d5146024afcab6af2f6e1553a7a863` |
| codex/feature-fluxo-ci-cd | `30c2be82d6751de303195a3a94f7e6946c63d4b6` |
| codex/feature-gris-recovery-floor-controls | `17ab8e9f7c37951890a8d13b8bec3f49652b5ddf` |
| codex/feature-limite-levantamentos | `404ed56295571358b4f742eccca7aa6a5caedb00` |
| codex/feature-movimento-tecnico | `d93a77f4342950746dd7339c1ba249fce34a32dd` |
| codex/feature-shoto-inicial | `6b032cb4ba08abcdd4fec86d20d6b0d514624c95` |
| codex/fix-alinhamento-juggle | `50711e75872831649d59f90ae2edd73e69bab3b1` |
| codex/fix-camera-floor-distance | `ae04506809e5a75bd5537cd1a9450e9e608bd83b` |
| codex/fix-recuo-acertos | `5d901e336dc758151e3b2350bc15c8e87bb0e356` |
| codex/fix-recuperacao-queda | `8f6dce9565c62d0fbd80dd95fb9eeb9e37882f12` |
| codex/fix-remove-vertical-zoom | `49f6017cc20ff6ec573dd833b7b51b5fad23a6d9` |
| codex/fix-retorno-idle-queda | `e2fae28d8decdf9ddc09049b268fae9bd3617d8f` |
| codex/fix-uniform-grounded-camera | `cb7ab085b29f6a5d3984244fc1dcbb33b200bae7` |
| codex/test-animation-fps-pause-reset | `051123fa9423d8fbcc0cb84a18da6d520782a437` |
| codex/test-stage-camera-contract | `b59bc490172a1630a6a4569ade2782e22334988b` |

## Branches preservadas durante a entrega

- `codex/feature-hud-enquadramento`: trabalho ativo.
- `codex/feature-apresentacao-1080p`, `codex/feature-menu-diurno` e `codex/feature-shoto-sprites`: dependências absorvidas pela branch ativa; encerrar somente após integração em development.
- `codex/feature-gravidade-juggle`: código já integrado; commit único `1da3a3a06d2867d7b08c6687134c9d37d3a5ec41` altera apenas a pipeline histórica. Preservar no histórico sem aplicar seu conteúdo antes de encerrar.
- `main` e `development`: permanentes.
