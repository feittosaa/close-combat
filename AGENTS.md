# Instruções para trabalhar neste repositório

- Ler `base.md` como documentação raiz e seguir `pipeline.md`.
- Seguir `docs/ci-cd.md` em toda entrega: uma branch por objetivo, validação antes do push, integração de features completas em `development` e promoção posterior para `main` com tag de versão.
- O usuário autoriza commits e push das branches concluídas após validação. Qualquer merge/integração em `development` exige pedido explícito do usuário para a entrega; CI verde ou feature concluída não autorizam merge automático. Esta regra substitui a autorização anterior, vale para todos os próximos pedidos e não expira ao terminar a conversa. Promoções para `main` também exigem pedido explícito e seguem o marco de release do manifesto.
- Preservar alterações existentes e manter objetivos independentes em branches distintas. Não fazer force push nem reescrever tags publicadas.
- Antes de concluir: testes, build e checagem de diff; mudanças visuais também exigem conferência no jogo.
- Atualizar a documentação e relatar o estado real do remoto. Não confundir validação local com CI remota aprovada.

- Após merge e CI aprovada em `development`, encerrar a branch finalizada local e remotamente, verificando ancestralidade e ausência de trabalho ativo. Preservar branches com trabalho pendente, `main`, `development` e tags.
