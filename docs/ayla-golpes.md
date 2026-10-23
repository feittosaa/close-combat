# Ayla — catálogo autoral inicial de 80 entradas

Revisão de 23/10/2026. Raiz: [`../base.md`](../base.md), §1.3. Esta é a ficha inicial para moldar o jogo: nomes, comportamento, strings e balanceamento são editáveis. Não é reprodução de Kazuya nem lista de frames importados.

**Contagem:** 18 ataques base + 55 etapas de strings + quatro especiais + dois agarrões + uma ultimate = **80**. Uma linha de string representa seu contato novo, não uma ação automática com todos os golpes anteriores. Receitas que reutilizam esses contatos não aumentam a contagem. Os seis starters estão distribuídos em cinco conclusões de string e um especial; não são seis normais adicionais.

`1` soco leve · `2` soco forte · `3` chute leve · `4` chute forte. `+` simultâneo (tolerância de 3F), `,` sequência, `→` próxima ação de combo. `AG` agachada; `AR` no ar. Frente/trás não alteram nenhum golpe. A notação é lógica; a interface mostra as teclas remapeadas.

As associações atuais de animação são provisórias: golpes fortes duplos e várias strings compartilham clipes. Esta lista não representa 80 animações finalizadas. Parâmetros são locais de protótipo e exigem inspeção visual e balanceamento por matchup.

## 18 ataques base — entradas 01–18

| Nº | ID | Comando | Nome | Intenção / comportamento inicial |
| --- | --- | --- | --- | --- |
| 01 | `standing-lp` | `1` | Soco leve | Toque rápido / início de string |
| 02 | `standing-rp` | `2` | Soco forte | Impacto médio / punição |
| 03 | `standing-lk` | `3` | Chute leve | Controle de espaço |
| 04 | `standing-rk` | `4` | Chute forte | Alcance / compromisso |
| 05 | `standing-pp` | `1+2` | Quebra-rubi | Porradão / finalizador |
| 06 | `standing-kk` | `3+4` | Arco duplo | Golpe duplo / posição |
| 07 | `crouching-lp` | `AG 1` | Soco leve | Toque rápido / início de string; postura baixa |
| 08 | `crouching-rp` | `AG 2` | Soco forte | Impacto médio / punição; postura baixa |
| 09 | `crouching-lk` | `AG 3` | Chute leve | Controle de espaço; postura baixa |
| 10 | `crouching-rk` | `AG 4` | Chute forte | Alcance / compromisso; postura baixa |
| 11 | `crouching-pp` | `AG 1+2` | Martelo baixo | Porradão / finalizador; postura baixa |
| 12 | `crouching-kk` | `AG 3+4` | Varredura dupla | Golpe duplo / posição; postura baixa |
| 13 | `air-lp` | `AR 1` | Soco leve | Toque rápido / início de string; preserva trajetória e gravidade |
| 14 | `air-rp` | `AR 2` | Soco forte | Impacto médio / punição; preserva trajetória e gravidade |
| 15 | `air-lk` | `AR 3` | Chute leve | Controle de espaço; preserva trajetória e gravidade |
| 16 | `air-rk` | `AR 4` | Chute forte | Alcance / compromisso; preserva trajetória e gravidade |
| 17 | `air-pp` | `AR 1+2` | Queda rubra | Porradão / finalizador; preserva trajetória e gravidade |
| 18 | `air-kk` | `AR 3+4` | Tesoura aérea | Golpe duplo / posição; preserva trajetória e gravidade |

Os quatro básicos simples mantêm dados individuais do livro de Ayla. Duplos usam preparo +3F e dano ×1,2 em relação ao soco/chute forte da mesma postura, caixa própria e conclusão aérea em descida. São pontos de partida para revisão, não metas finais. Dano por contato/escala nunca é retirado do desenho.

## 55 etapas de strings — entradas 19–73

Cada linha pressupõe o prefixo indicado pelo próprio comando. Só o último token é a entrada nova; os anteriores precisam ter sido executados. Cada prefixo aparece antes de suas continuações. O jogador pode interromper a sequência ou mudar sua conclusão. Entradas não mudam com a direção horizontal. Nesta versão, strings partem dos básicos em pé; os demais contextos conservam os seis básicos próprios.

| Nº | Comando completo | Nome | Função da etapa nova |
| --- | --- | --- | --- |
| 19 | `1,1` | Faísca · elo 1 | Elo |
| 20 | `1,1,2` | Faísca · Ascensão 1 | Levantamento / starter |
| 21 | `1,1,1+2` | Faísca · Ruptura 1 | Dano alto / finalizador |
| 22 | `1,2` | Faísca · elo 2 | Elo |
| 23 | `1,2,1+2` | Faísca · Ruptura 2 | Dano alto / finalizador |
| 24 | `1,2,3+4` | Faísca · Transporte 2 | Wall carry |
| 25 | `1,4` | Faísca · elo 4 | Elo |
| 26 | `1,4,1+2` | Faísca · Ruptura 4 | Dano alto / finalizador |
| 27 | `1,4,3+4` | Faísca · Recolher 4 | Postura de recolhimento |
| 28 | `2,1` | Ruptura · elo 1 | Elo |
| 29 | `2,1,1+2` | Ruptura · Ascensão 1 | Levantamento / starter |
| 30 | `2,1,3+4` | Ruptura · Transporte 1 | Wall carry |
| 31 | `2,2` | Ruptura · elo 2 | Elo |
| 32 | `2,2,1+2` | Ruptura · Rebate 2 | Extensor aéreo |
| 33 | `2,2,3+4` | Ruptura · Transporte 2 | Wall carry |
| 34 | `2,4` | Ruptura · elo 4 | Elo |
| 35 | `2,4,1+2` | Ruptura · Ruptura 4 | Dano alto / finalizador |
| 36 | `2,4,3+4` | Ruptura · Recolher 4 | Postura de recolhimento |
| 37 | `3,1` | Passo · elo 1 | Elo |
| 38 | `3,1,1+2` | Passo · Rebate 1 | Extensor aéreo |
| 39 | `3,1,3+4` | Passo · Transporte 1 | Wall carry |
| 40 | `3,2` | Passo · elo 2 | Elo |
| 41 | `3,2,1+2` | Passo · Ruptura 2 | Dano alto / finalizador |
| 42 | `3,2,3+4` | Passo · Ascensão 2 | Levantamento / starter |
| 43 | `3,4` | Passo · elo 4 | Elo |
| 44 | `3,4,1+2` | Passo · Ruptura 4 | Dano alto / finalizador |
| 45 | `3,4,3+4` | Passo · Recolher 4 | Postura de recolhimento |
| 46 | `4,1` | Giro · elo 1 | Elo |
| 47 | `4,1,1+2` | Giro · Ascensão 1 | Levantamento / starter |
| 48 | `4,1,3+4` | Giro · Transporte 1 | Wall carry |
| 49 | `4,2` | Giro · elo 2 | Elo |
| 50 | `4,2,1+2` | Giro · Ruptura 2 | Dano alto / finalizador |
| 51 | `4,2,3+4` | Giro · Transporte 2 | Wall carry |
| 52 | `4,4` | Giro · elo 4 | Elo |
| 53 | `4,4,1+2` | Giro · Ruptura 4 | Dano alto / finalizador |
| 54 | `4,4,3+4` | Giro · Recolher 4 | Postura de recolhimento |
| 55 | `1+2,1` | Impacto · elo 1 | Elo |
| 56 | `1+2,1,1+2` | Impacto · Ruptura 1 | Dano alto / finalizador |
| 57 | `1+2,1,3+4` | Impacto · Transporte 1 | Wall carry |
| 58 | `1+2,2` | Impacto · elo 2 | Elo |
| 59 | `1+2,2,1+2` | Impacto · Ruptura 2 | Dano alto / finalizador |
| 60 | `1+2,2,3+4` | Impacto · Ascensão 2 | Levantamento / starter |
| 61 | `1+2,4` | Impacto · elo 4 | Elo |
| 62 | `1+2,4,1+2` | Impacto · Ruptura 4 | Dano alto / finalizador |
| 63 | `1+2,4,3+4` | Impacto · Recolher 4 | Postura de recolhimento |
| 64 | `3+4,1` | Espiral · elo 1 | Elo |
| 65 | `3+4,1,1+2` | Espiral · Ruptura 1 | Dano alto / finalizador |
| 66 | `3+4,1,3+4` | Espiral · Transporte 1 | Wall carry |
| 67 | `3+4,2` | Espiral · elo 2 | Elo |
| 68 | `3+4,2,1+2` | Espiral · Ruptura 2 | Dano alto / finalizador |
| 69 | `3+4,2,3+4` | Espiral · Transporte 2 | Wall carry |
| 70 | `3+4,4` | Espiral · elo 4 | Elo |
| 71 | `3+4,4,1+2` | Espiral · Ruptura 4 | Dano alto / finalizador |
| 72 | `3+4,4,3+4` | Espiral · Recolher 4 | Postura de recolhimento |
| 73 | `1,1,1+2,3+4` | Faísca · Despedida | Wall carry |

**Valores iniciais por função:** elo/carry/extensor/postura: 30 de dano; levantamento: 42; dano alto: 80. Preparo das novas etapas: levantamento 12F, dano alto 11F, demais 8F; três frames ativos; hitstun 26F. Janela da continuação: após atividade do prefixo até +24F. Startups são frames anteriores à atividade; não converter automaticamente em convenção externa iN.

- Elos e conclusões comuns avançam 5 unidades e empurram 2 no acerto; carry avança 22 e empurra 19. Bloqueio empurra 7. A geometria inicial das strings tem faixa vertical −134..−22 e alcance individual derivado do golpe correspondente; revisar contra pose e corpo reais.
- Levantamentos: `1,1,2`, `2,1,1+2`, `3,2,3+4`, `4,1,1+2`, `1+2,2,3+4`. O sexto é o especial Ascensão rubra.
- Extensores: `2,2,1+2` e `3,1,1+2`; renovam o ar dentro do orçamento, sem gerar infinitos.
- Posturas: conclusões `…,4,3+4` recuam 9 unidades líquidas (recolhimento 14 menos avanço base 5), com evasão alta do frame 4 ao fim da atividade e postura indicada por 30F. Não criam outro catálogo de botões nem mudam `1` para outro golpe.
- Dano alto acelera a descida com velocidade mínima 4. Carry pode causar splat elegível na borda. Esses resultados dependem de contato, altura e posição reais.
- Não classificar uma string como ininterruptível ou segura apenas por estar nesta tabela. Medir risco/defesa nos dados e replays.

## Quatro especiais — entradas 74–77

| Nº | ID | Comando | Nome | Função | Preparo / ativos / recuperação no bloqueio | Dano |
| --- | --- | --- | --- | --- | --- | --- |
| 74 | `crimson-wave` | `1+4` | Onda rubra | Projétil rasteiro, disputa de distância | 16 / 3 / 26F | 72 |
| 75 | `scarlet-rush` | `2+3` | Investida escarlate | Aproximação e transporte | 12 / 8 / 25F | 85 |
| 76 | `rising-kick` | `1+2+3` | Ascensão rubra | Sexto launcher; resposta vertical | 9 / 9 / 30F | 88 |
| 77 | `leaping-kick` | `2+3+4` | Queda escarlate | Finalização de dano / descida | 14 / 8 / 24F | 82 |

Onda rubra: velocidade 6 unidades/F, vida útil 120F, máximo de uma onda ativa, caixa 48×30, hit baixo; segue viajando se Ayla for interrompida. Investida desloca 4 unidades por frame ativo. Ascensão reaproveita provisoriamente a animação do giro, mas lança o alvo; não salta automaticamente com a atacante. Queda também reaproveita animação existente e não ganha novo comando direcional. Estes especiais não exigem medidor. A Erupção Rubra anterior fica apenas no arquivo legado.

## Dois agarrões — entradas 78–79

| Nº | ID | Comando | Nome | Resultado | Dano / quebra |
| --- | --- | --- | --- | --- | --- |
| 78 | `forward-throw` | `1+3` | Laço rubro | Arremessa à frente, mantém lado | 102 / `1` em 14F |
| 79 | `reverse-throw` | `2+4` | Virada escarlate | Troca os lados | 90 / `2` em 14F |

Alcance inicial 65 unidades, preparo 6F, um frame de tentativa e recuperação 24F; quebra deixa 12F de recuperação. Exigem alvo em pé, no chão, à frente e disponível para captura. Guarda não impede; agachamento, salto e afastamento evitam. Não acertam juggle, queda protegida nem alvo já em ataque/stun. A direção mantida não muda o arremesso. Ajustar alcance/janela/dano após testes humanos.

## Ultimate — entrada 80

| Nº | ID | Comando | Nome | Regra |
| --- | --- | --- | --- | --- |
| 80 | `ultimate` | `1+2+3+4` | Coração incandescente | 180 dano base, preparo 24F, 4 ativos, 36F de recuperação bloqueada; médio bloqueável, finaliza o ar |

Disponível com vida até 25%, uma tentativa por round. Consome ao iniciar, inclusive se errar ou for bloqueada. Sem cinemática/QTE nesta entrega; usa pose provisória do golpe duplo. Aplica escala de combo e não cria uma garantia de vitória.

## Receitas iniciais e progressão

| Desafio | Rota | Aprendizado |
| --- | --- | --- |
| Combo 1 | `1,1,2 → 1+2` | Confirmar o launcher e acertar o porradão |
| Combo 2 | `1,1,2 → 1,1,1+2` | Recomeçar com dois toques e concluir com dano alto |

O tutorial verifica contato real de toda a receita em um combo contínuo; não basta digitar a sequência. Os exemplos são receitas abertas, não macros. O jogador controla ritmo, aproximação e decisão de parar. Novas rotas com os outros starters, extensor, postura e carry devem ser homologadas e então entrar na progressão, sem inflar a contagem de 80 entradas.

## Ficha de balanceamento a preencher pelo usuário

Para cada ID/comando, anotar: intenção; nível alto/médio/baixo; preparo/ativos/recuperação; dano; vantagem real no acerto/bloqueio; alcance/caixa; avanço; recuo; altura de juggle; orçamento aéreo; resultado em counter hit; risco de erro; splat; estado final; animação/efeito; medição e decisão. Diferenciar proposto, executável e homologado.

Prioridades: validar as duas rotas simples, ajustar seis starters por risco/alcance, comparar dano vs carry vs extensor, medir aberturas por round e só então ampliar receitas e refinar o restante do elenco. Os números deste documento são partida inicial de autoria, não compromisso com o balanceamento definitivo.

Cada etapa de `aylaStrings.ts` aceita `tuning` para ajustar preparo, atividade, recuperação, dano, stun, avanço, recuo e caixa individualmente. Exemplo de edição: `tuning: { startup: 10, damage: 36 }`. O construtor resolve esses dados nos contatos reais; mudanças não dependem de trocar o papel da string.

Fontes executáveis: `src/engine/data/combat/aylaStrings.ts`, `organicBook.ts` e `src/engine/data/fighters/ayla.ts`. O livro importado anterior está excluído dos comandos públicos e é conservado somente para regressão/rastreabilidade.
