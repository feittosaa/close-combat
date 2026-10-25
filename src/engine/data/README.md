> **Transição de design — 25/10/2026.** Este README descreve o protótipo ainda presente no código/assets. Referências a elenco, combos, balanceamento, parry e etapas antigas não definem o novo design. Seguir [base.md](../../../base.md) e [pipeline.md](../../../pipeline.md); preservar infraestrutura útil, retirar o conteúdo anterior e não produzir novos assets para o elenco removido.

<!-- src/engine/data/README.md -->

Tipos e definições configuráveis de personagens e golpes. `characters.ts` registra Tester como padrão temporário e Dummy como segundo lutador de teste. Cada definição tem seu próprio array `moves` (golpes, especiais, agarrões, aéreos e cancelamentos) e `collision` (largura corporal e hurtboxes em pé, agachada e aérea). `moves.ts` declara apenas o livro provisório do Tester; para adicionar um personagem, crie e associe um novo livro à respectiva definição. O livro do personagem é a fonte de verdade; não use IDs para buscar dados globais. `MoveDefinition.hitbox` é a hitbox de ataque daquele golpe; `hitLevel`, frames, dano e propriedades especiais também pertencem ao golpe. Coordenadas e regras estão em `base.md` §7.5. Não registrar números de balanceamento sem decisão documentada em `base.md`.


Livros autorais: `combat/organicBook.ts` constrói ações a partir de seeds individuais; `aylaStrings.ts` e `grisStrings.ts` definem rotas próprias. Seis bases por postura não criam um catálogo global de propriedades. Entradas antigas de Ayla ficam `legacy` e fora do parser/lista. A baseline de autoria é `docs/ayla-golpes.md`; o contrato externo anterior é histórico.
