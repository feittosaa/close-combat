# Shoto — bancada de autoria e balanceamento

> 25/10/2026 · Documento ativo subordinado a [base.md](../base.md). Implementação em [pipeline.md](../pipeline.md).

## Estado

Nome provisório: **Shoto**. Aparência, características e animações finais indefinidas. Kit inicial autorizado: quatro básicos em pé. Os valores abaixo são técnicos e provisórios, sem homologação de balanceamento. **Nenhuma receita de combo recebida em detalhe, implementada ou homologada nesta revisão.** Não adaptar o catálogo de Ayla ou qualquer outro livro anterior.

`1,1,1`, `2,2,2` e `3,3,3` são exemplos das notas de combos fechados. Aguardam definição individual pelo usuário; não são uma fila automática de implementação. Não gerar outras sequências a partir de “etc.”.

## Registro por receita a receber

Usar esta ficha somente quando o usuário enviar uma receita:

| Campo | Informação a registrar |
| --- | --- |
| Identificação e estado | Proposta, em ajuste ou homologada; revisão dos dados |
| Sequência enviada | Entradas exatas e contexto inicial |
| Intenção | Função do starter, passos e conclusão |
| Regras | Janelas, cancelamentos, confirmação e condições de interrupção |
| Medições | Dano, duração, distância inicial/final, transporte e recuperação |
| Defesa | Bloqueio, erro, interrupção, punição e retorno ao controle |
| Recursos | Interação aprovada com breaker, drive rush, rage e rage art |
| Cenários | Lados, centro/canto aplicável, distâncias e reprodução por entradas |
| Evidência | Testes, conferência no jogo e decisão do usuário |

Manter valores desconhecidos explicitamente pendentes. Receitas de tutorial só entram após homologação e precisam de todos os contatos na ordem no mesmo combo. Não validar pela digitação isolada.

## Marco para expandir o elenco

Definir com o usuário os critérios de dano, risco, recursos e respostas defensivas do shoto. Fechar as receitas aprovadas e a ficha-base antes de iniciar outro arquétipo. A referência anime fighter não fornece números automaticamente.

## Ficha inicial implementada

Fonte de verdade executável: `src/engine/data/fighters/shoto.ts`. Vida 1000; body 48; hurtbox em pé 48×144, agachada 48×90 e aérea 48×136. Caixas relativas aos pés e centro horizontal do lutador, espelhadas pelo motor.

| Entrada | Nome | S / A / R | Dano | Hit / block stun | Pushback hit / block | Caixa: avanço, Y, largura, altura |
| --- | --- | --- | --- | --- | --- | --- |
| `1` | Soco fraco | 6 / 2 / 12F | 20 | 10 / 6F | 6 / 4 | 20, −120, 42, 28 |
| `2` | Soco forte | 10 / 3 / 18F | 35 | 14 / 8F | 9 / 6 | 20, −122, 58, 32 |
| `3` | Chute fraco | 8 / 3 / 15F | 25 | 12 / 7F | 7 / 5 | 20, −74, 62, 30 |
| `4` | Chute forte | 13 / 4 / 22F | 45 | 16 / 9F | 12 / 8 | 20, −92, 78, 38 |

Socos altos, chutes médios; todos recuperam em acerto/erro/bloqueio e têm um contato. Sem variantes agachadas/aéreas, acordes ou cancelamentos. Nenhum desses números constitui aprovação do balanceamento final. A futura comparação entre arquétipos ainda depende do ajuste manual desta base.
