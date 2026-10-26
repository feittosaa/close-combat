# Manifesto de CI/CD — Close Combat

Este manifesto rege a entrega de mudanças. `base.md` continua sendo a raiz das regras do jogo; `pipeline.md` acompanha execução e pendências.

## Fluxo de branches

`codex/feature-<objetivo>` → `development` → `main` → tag `vX.Y.Z`.

- `development`: integração das features concluídas e validadas.
- `main`: versões estáveis, promovidas a partir de `development` após validação conjunta.
- Uma branch por objetivo, criada a partir de `origin/development` atualizado. Usar `codex/feature-<nome>`, `codex/fix-<nome>` ou `codex/chore-<nome>` conforme a mudança. Não misturar objetivos independentes.
- Antes de começar, conferir branch, remoto e alterações locais. Preservar trabalho existente; não carregar mudanças de outra tarefa por acidente.
- Não desenvolver diretamente em `development` ou `main`. Não usar force push nas branches compartilhadas nem substituir tags publicadas.

## Contrato de cada entrega

1. Registrar objetivo, critérios de conclusão e limites em `pipeline.md`. Atualizar `base.md` quando houver mudança de regra.
2. Implementar na branch própria, com commits descritivos e somente arquivos do objetivo.
3. Concluir todos os critérios do objetivo. Uma entrega parcial não equivale a uma feature 100% terminada. Se houver bloqueio, registrar o motivo e manter a branch sem integração.
4. Executar `npm ci`, `npm test -- --run`, `npm run build` e `git diff --check`. A CI usa `git show --format= --check HEAD` para conferir o commit recebido. Nenhum teste pode falhar, ser removido ou enfraquecido para liberar a entrega.
5. Para arte, animações, interface ou controles, conferir também no jogo e registrar evidência. Testes e build não substituem revisão visual.
6. Com objetivo concluído e verificações aprovadas, criar o commit final e executar `git push -u origin <branch>`. O push é parte da conclusão autorizada da tarefa; não deixar a entrega apenas local.
7. Aguardar a CI do commit enviado. Se falhar, corrigir na mesma branch, repetir verificações e enviar novamente. Nunca declarar CI remota aprovada com base apenas nos testes locais.
8. Integrar a feature em `development` por PR preferencialmente, preservando rastreabilidade do objetivo. A integração exige a CI verde do commit atual e todos os critérios concluídos. Se a base mudar, atualizar a branch e validar novamente. Atualizar e enviar `development`; conferir a CI da integração antes de declarar a entrega encerrada.

9. Após confirmar a integração e a CI de `development`, encerrar a branch finalizada: verificar ancestralidade no remoto atualizado e ausência de checkout/trabalho ativo, remover a referência remota e usar `git branch -d` para a local. Conferir a remoção no remoto. Não apagar `development`, `main`, tags ou branches com trabalho pendente. Branches dependentes absorvidas pela mesma integração também devem ser encerradas. Se uma branch antiga tiver commit único ainda não integrado, auditar e preservar seu histórico antes de removê-la; nunca fazer force push nem descartar código por inferência.

A autorização do usuário para esse fluxo vale para os próximos objetivos deste projeto: concluir, testar, commitar, enviar a branch e integrar features prontas em `development`. Não repetir pedidos de confirmação para essas ações rotineiras. Restrições reais do remoto devem ser respeitadas e reportadas.

## Promoção de versão

Promover `development` para `main` no fechamento de uma versão, após validar o conjunto integrado e registrar o escopo da release. A conclusão de uma feature não promove automaticamente todas as mudanças de `development` para `main`. Sem pedido ou marco de release definido, a feature permanece integrada em `development`.

1. Atualizar referências remotas, conferir os commits da promoção e confirmar que todos pertencem ao escopo concluído.
2. Atualizar `package.json` e `package-lock.json` com a nova versão em branch própria, atualizar notas de versão e integrar em `development` pelo mesmo processo de validação.
3. Abrir PR de `development` para `main`; exigir CI verde e revisão funcional/visual aplicável. Resolver divergências preservando o trabalho das duas branches e repetir a validação.
4. Após integrar e conferir a CI de `main`, criar uma tag anotada `vX.Y.Z` no commit exato aprovado de `main` e enviá-la ao remoto.
5. A versão da tag deve corresponder à de `package.json`. Usar SemVer: PATCH para correções compatíveis, MINOR para funcionalidades compatíveis e MAJOR para quebra de compatibilidade. Durante `0.x`, registrar explicitamente alterações incompatíveis nas notas da versão.
6. Conferir a CI da tag. O build fica disponível como artefato do GitHub Actions. Hospedagem e publicação de GitHub Release exigem configuração própria; o envio da tag não significa que o jogo foi implantado em um site.
7. Sincronizar `development` com eventuais commits exclusivos da promoção antes de iniciar a próxima feature. Não apagar nem mover tags existentes; corrigir por nova versão.

## Automação e proteção

`.github/workflows/ci.yml` valida pushes de branches de trabalho, `development`, `main`, PRs e tags de versão. Executa instalação reproduzível, testes e build. Em tags, verifica versão e ancestralidade em `main` antes de disponibilizar o artefato.

Configurar no GitHub proteção de `development` e `main`: exigir PR, check `Validar projeto`, branch atualizada e impedir force push/exclusão. Esses controles são configurações do remoto e não são aplicados apenas por existir este arquivo. Não contornar uma proteção para completar uma tarefa.

## Relato de conclusão

Registrar branch, objetivo concluído, testes/build, evidência visual quando aplicável, commit enviado, resultado real da CI e integração em `development`. Em releases, registrar também commit de `main` e tag publicada. Se rede, credenciais ou proteção bloquearem uma etapa, informar exatamente o que ficou pendente; não declarar push, merge ou release sem confirmação do remoto.
