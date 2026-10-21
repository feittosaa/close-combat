# Instruções para trabalhar neste repositório

- Ler `base.md` como documentação raiz e seguir `pipeline.md`.
- Seguir `docs/ci-cd.md` em toda entrega: uma branch por objetivo, validação antes do push, integração de features completas em `development` e promoção posterior para `main` com tag de versão.
- O usuário autoriza commits, push das branches concluídas e integração de features prontas em `development` após validação. Promoções para `main` seguem o marco de release definido no manifesto.
- Preservar alterações existentes e manter objetivos independentes em branches distintas. Não fazer force push nem reescrever tags publicadas.
- Antes de concluir: testes, build e checagem de diff; mudanças visuais também exigem conferência no jogo.
- Atualizar a documentação e relatar o estado real do remoto. Não confundir validação local com CI remota aprovada.
