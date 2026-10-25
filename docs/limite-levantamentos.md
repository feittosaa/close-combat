> **Histórico do protótipo anterior — substituído em 25/10/2026.** Este registro preserva evidências e decisões antigas; elenco, combos, números e tarefas abaixo não são especificação ativa. Consulte [base.md](../base.md), [pipeline.md](../pipeline.md) e [identidade-visual.md](../identidade-visual.md). Referências de seções/etapas abaixo pertencem às versões antigas, recuperáveis no Git. Não continuar a produção do elenco retirado.

# Suspensão e limite de levantamentos

Ayla mantém o alvo no ar por aproximadamente 56F sem novos contatos (antes, cerca de 38F), preservando altura de 80–100 unidades. Lançamento −6,8 e gravidade 0,24; no juggle, gravidade 0,2 + 0,012 por contato aéreo. O salto livre não muda. Acertos aéreos comuns substituem o impulso por −2,8 + 0,025 por contato, até −0,4; segundo launcher −4, Screw −4,5. Todos levantam menos que o lançamento inicial.

Cada combo permite dois levantamentos. O primeiro launcher conta um; o próximo no ar conta dois. No terceiro, o golpe causa dano, mas força descida com velocidade mínima 8 e gravidade 0,8. Launchers de counter hit e tentativas de Screw aéreo usam o mesmo orçamento; hits comuns não consomem levantamento. Parry baixo inicia o orçamento com um levantamento. O orçamento está nos dados de combate de cada personagem, aplicado aos alvos individuais.

Durante a descida forçada e os 26F de queda no chão, a vítima fica imune a strikes, projéteis e agarrões, inclusive contatos enfileirados no mesmo frame. Parede não pode suspender essa queda. Ao levantar ou reiniciar, proteção e orçamento são limpos. A regra não limita a quantidade total de golpes comuns; limita renovações por levantamento. As receitas importadas com três elétricos permanecem como referência de comandos, mas sua continuação após o terceiro launcher é interrompida pela nova regra autoral.

O treino mostra `LEV 1/2`, `LEV 2/2` e `QUEDA FORÇADA · IMUNE`; o contato que dispara o limite também identifica a queda protegida. Os desenhos de reação existentes continuam provisórios; nenhuma caixa depende dos pixels.

## Verificação

340 testes aprovados: três elétricos por entradas reais contra Ayla, Gris, Tester e Dummy; menor impulso aéreo; Screw no orçamento; invalidação de projétil já enfileirado; imunidade com controles positivos; aterrissagem, 26F de proteção e novo combo após recuperação. As rotas anteriores de nove contatos e parede seguem cobertas. Build e diff aprovados.

Conferência visual com teclado no treino pausado: terceiro contato no frame 45, alvo caído e imune no frame 57, neutro sem imunidade no frame 83. Capturas em `docs/evidence/limite-levantamentos/`. CI e integração remotas são informadas na entrega.
