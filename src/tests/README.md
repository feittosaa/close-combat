# Testes

Cobertura da base atual do Shoto, independente do navegador: dados/seleção, input, geometria, ataque e recuperação, guarda, trades, movimento, rounds, treino, tutorial vazio e IA. Controles e câmera usam os contratos preservados; animação genérica usa dados sintéticos sem sprites do elenco retirado.

A rastreabilidade dos testes substituídos com a retirada das regras está em `docs/shoto-migracao.md`. Executar `npm test -- --run`, build e diff antes da entrega. Conferência visual no jogo é separada da cobertura automatizada.

Raiz de regras: [base.md](../../base.md).
