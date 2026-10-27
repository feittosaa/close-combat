# Instruções para trabalhar neste repositório

- Ler `base.md` como documentação raiz e seguir `pipeline.md`.
- Priorizar código limpo, legível e bem organizado: nomes claros, responsabilidades coesas e a solução mais simples que atenda ao escopo. Não incluir código morto, duplicações, abstrações especulativas, dependências, arquivos ou conteúdo sem necessidade comprovada.
- `base.md`, `identidade-visual.md`, READMEs, este arquivo e os demais Markdown contêm somente princípios duradouros, contratos gerais e processos aplicáveis ao projeto inteiro. Estado de implementação, tarefas atuais, personagens, cenários, números específicos, pendências, validações e histórico ficam exclusivamente em `pipeline.md`. Não espalhar fichas ou diários de entrega por novos Markdown.
- Seguir `docs/ci-cd.md`: uma branch por objetivo, validação antes do push, integração em `development` e promoção posterior para `main` somente mediante autorização explícita. Dependências de branches ainda não integradas devem ser registradas na pipeline.
- O usuário autoriza commits e push das branches concluídas após validação. Qualquer merge/integração, promoção para `main` ou release exige pedido explícito. CI verde não substitui essa autorização.
- Preservar alterações existentes. Não fazer force push nem reescrever tags publicadas.
- Antes de concluir: instalação reproduzível, testes, build e checagem de diff. Mudanças visuais ou de controles exigem também conferência no jogo.
- Atualizar a pipeline e relatar o estado real do remoto; distinguir validação local, CI remota e aprovação artística.
- Após merge explicitamente autorizado e CI aprovada em `development`, encerrar a branch finalizada local/remota somente após conferir ancestralidade e ausência de trabalho ativo. Preservar branches com trabalho pendente, `main`, `development` e tags.
- Qualquer arte de personagem deve usar sua referência canônica vigente e as poses existentes. Conferir identidade, proporções, materiais, acessórios, membros, transições e alinhamento no ciclo completo. As definições individuais pertencem à pipeline e aos manifestos próprios.
- Manter somente artes usadas pelo jogo, fontes ativas de preparação e referências canônicas. Ao substituir uma peça, atualizar os consumidores e retirar variantes sem uso do checkout; o Git preserva o histórico.
- Imagens rejeitadas, não aprovadas ou experimentais não devem permanecer como alternativas acumuladas no checkout. Preservar somente propostas em revisão ativa explicitamente registradas na pipeline e necessárias ao trabalho autorizado; aprovação pendente não equivale a aprovação artística.
- Em cada alteração, revisar o que ficou obsoleto no escopo: remover código, imports, dependências, assets e arquivos substituídos ou sem uso, atualizando consumidores e manifestos. Conferir referências e uso antes de excluir; preservar trabalho em andamento de outras tarefas. Não manter sobras apenas para possível uso futuro; o Git preserva o histórico.
- Não editar assets para ocultar falhas do motor nem alterar colisões ou regras para acomodar um desenho. Não inferir novos conteúdos, comandos, combos ou mecânicas por conveniência.
