> **Histórico do protótipo anterior — substituído em 25/10/2026.** Este registro preserva evidências e decisões antigas; elenco, combos, números e tarefas abaixo não são especificação ativa. Consulte [base.md](../base.md), [pipeline.md](../pipeline.md) e [identidade-visual.md](../identidade-visual.md). Referências de seções/etapas abaixo pertencem às versões antigas, recuperáveis no Git. Não continuar a produção do elenco retirado.

# Combate autoral — validação de 23/10/2026

Raiz: [`base.md`](../base.md), §1.3. Catálogo de autoria: [`ayla-golpes.md`](./ayla-golpes.md). Branch de objetivo: `codex/feature-combate-organico`.

## Evidência por requisito

| Requisito | Evidência |
| --- | --- |
| 18 bases por personagem; golpe preservado ao avançar/recuar | `OrganicCombat.test.ts`: seis básicos em pé em N/F/B, seis aéreos após salto real, agachamento em D/DF/DB e contagem de 18 bases por livro |
| Cinco ou seis levantamentos | Seis por Ayla/Gris; todos conectam e lançam por entradas comuns no teste parametrizado |
| Quatro especiais, projétil e dois agarrões | Contagem de dados, projétil conectando a distância 220 e ambos os agarrões/quebras com troca de lado verificados na simulação; Ayla também conferida no básico |
| Ultimate | Limite de vida/tentativa por round e reset testados; executada na última lição básica |
| 80 entradas da Ayla | Teste de contagem, IDs/comandos únicos e prefixos válidos; documento numerado de 01 a 80 sem lacunas |
| Strings com escolhas | 55 etapas autorais com elos e conclusões de lançamento, dano, extensão, postura e carry; dados editáveis por etapa com `tuning` |
| Tutorial básico | As onze lições concluídas no navegador com Ayla; currículo completo de Ayla/Gris testado com entradas comuns |
| Tutorial de combos progressivo | As duas receitas concluídas no navegador com Ayla e Gris; Enter avança e R limpa a tentativa concluída. Testes também cobrem as duas receitas contra Ayla, Gris e Tester |
| Mesmas regras da luta | Tutorial observa eventos/IDs do motor e não injeta acertos; digitar fora de alcance não conclui. Setup apenas define distância e vida inicial da lição de ultimate |
| Elenco público simples | Seleção de P1 contém Ayla e Gris; Tester é somente ferramenta interna/NPC. Teste exige o contrato autoral para todo personagem selecionável |
| Instalação, testes, build e whitespace | `npm ci`, 389 testes, `npm run build`, `git diff --check`; CI remota é verificada separadamente antes da integração |

## Conferência no navegador

Execução real em Cais, pelo menu público. P1 com teclas padrão: J/K/N/M e WASD. As receitas foram digitadas como toques separados, soltando J entre repetições; nenhuma atribuição direta de ataque, teleporte, dano ou aprovação da lição foi usada.

- [Tutorial básico concluído](./evidence/combat/ayla-tutorial-basico.png).
- [Ayla — combo 1](./evidence/combat/ayla-tutorial-combo-1.png) e [combo 2](./evidence/combat/ayla-tutorial-combo-2.png).
- [Gris — combo 1](./evidence/combat/gris-tutorial-combo-1.png) e [combo 2](./evidence/combat/gris-tutorial-combo-2.png).
- [Seleção pública do elenco autoral](./evidence/combat/elenco-autoral.png).

Foi observado o estado concluído, o avanço 1/2 → 2/2, o reset da tentativa 2/2, a pausa por Esc e o retorno ao menu. O HUD autoral apresenta o nome do tutorial e não anuncia Fulgor. O básico inclui guarda contra um ataque real do dummy; após sucesso ele deixa de gerar novos ataques. A sequência de arcade preserva Tester como NPC de abertura e os adversários autorais seguintes.

## Limites da aprovação

Aprovação funcional e visual dos fluxos observados. Arte continua reaproveitada, inclusive poses de finalização/juggle; não homologa 80 animações exclusivas. Valores de dano, tempo e alcance permanecem a bancada inicial de autoria pedida pelo usuário. As duas receitas introdutórias estão verificadas; o catálogo não equivale a uma alegação de teste manual exaustivo de todas as rotas possíveis ou de balanceamento competitivo definitivo.

O estado confirmado de integração e CI fica registrado em `pipeline.md` e no relato da entrega. Esta mudança não constitui promoção de release para `main`.
