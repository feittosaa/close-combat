# Ayla, Gris, projéteis e fluxo inicial

Raiz: `base.md`. Solicitação e conferência final: **21/10/2026**.

## Entrega concluída

- [x] Ayla: limpar os recortes jogáveis, substituir contatos contaminados e completar as solas da vitória.
- [x] Ayla jogável, com atlas, pivôs, escala, estados e fases dos 18 golpes mapeados.
- [x] Livros por personagem com zero a N especiais; hitboxes próprias de cada golpe e projétil.
- [x] Hurtboxes por personagem/postura, tamanho corporal e velocidades individuais.
- [x] Projéteis independentes, defesa, contato, expiração, clash, reset e limpeza entre rounds.
- [x] Cinco especiais de Ayla, com quartos de círculo relativos ao oponente, onda rasteira e erupção.
- [x] Gris: arte própria conforme a ficha, movimentação de referência e tesoura gigante dourada empunhada.
- [x] Gris: recortes isolados, alinhamento, atlas/manifesto, 17 golpes, quatro especiais, colisões e velocidades próprias.
- [x] Gris jogável; arma, orientação, contato, erro, defesa, dano, salto e vitória conferidos na apresentação.
- [x] Menu inicial com configurações, treino, PvP e arcade PvE.
- [x] Escolha de personagem apenas para P1; P2 definido pelo modo.
- [x] Seletor de cenário com Cais.
- [x] Testes, build, diff e inspeção visual do combate e do fluxo dos três modos.

## Recursos e mapeamento

| Personagem | Recortes selecionados | PNGs de runtime | Clipes/associações | Golpes | Especiais |
| --- | --- | --- | --- | --- | --- |
| Ayla | 249 | 8 | 83 | 18 | 5 |
| Gris | 110 | 13 | 84 | 17 | 4 |

Os atlas expõem somente os recortes selecionados. Os PNGs de origem são preservados sem edição de pixels; desenhos rejeitados eventualmente presentes neles não são usados pelo jogo. Nomes, coordenadas, pivôs, escala e texturas estão nos catálogos, atlas e manifestos. As fontes e prompts ficam junto dos assets no repositório, sem dependência do cache de geração.

As instruções de entrega e comandos de cada personagem estão em `src/assets/sprites/characters/ayla/README.md` e `src/assets/sprites/characters/gris/README.md`. Os livros ficam em `src/engine/data/fighters/`; a lógica não infere caixas de colisão dos pixels.

## Conferência visual e correções

A prévia local voltou a funcionar após a reabertura da aba. O bloqueio de conexão anterior foi resolvido. A revisão utilizou o jogo real e suas entradas de teclado, incluindo pausa/avanço de quadro do treino; não alterou vida, dano, posição ou regras para produzir resultados.

- **Gris:** as pranchas corporais foram inspecionadas e os pivôs horizontais passaram a usar eixos de corpo autorados por pose, evitando que o pé mais baixo deslocasse o corpo nos cortes. A tesoura foi vista em guarda, cortes, rasteira, aéreo, especiais, dano, queda e vitória. O projétil de energia permanece separado da arma física. Foram ajustadas as caixas dos chutes e da tesoura ascendente conforme os contatos desenhados. Extensão e recolhimento dos chutes foram separados entre ativo e recuperação.
- **Ayla:** os cinco especiais foram executados e inspecionados. A conjuração da onda usa a pose de soco no chão; a erupção mostra o pilar completo desde a ativação de sua área de dano. O antiaéreo cobre o arco do pé durante o giro, e o chute com avanço mantém o pouso na recuperação. A onda foi executada também após trocar de lado por salto, com desenho, direção e caixa espelhados.
- **Menu:** seleção por teclado, confirmação de uma página por tecla, retorno, configurações, P1 e Cais conferidos. A fila de teclado do menu possui proteção contra revisitar o mesmo evento.
- **Treino:** entrada dos dois personagens, pausa, quadro a quadro, reset, distância, guarda de projétil e geometria conferidos. O projétil da Gris foi bloqueado após sair das mãos, com a tesoura ainda empunhada.
- **PvP:** Ayla contra Gris, controle de P2 pelo teclado numérico com dano real em P1, vitória de P1, poses finais e revanche com vida/tempo restaurados.
- **Arcade:** combate da IA, derrota, nova tentativa, vitória, passagem para luta 2/2, conclusão da sequência e reinício para luta 1/2 observados. A verificação incluiu partidas completas contra Ayla e Gris, com entradas normais de defesa e punição.

### Evidências preservadas

- `docs/evidence/menu/selection.png`, `stage.png`, `settings.png`, `pvp.png` e `fighters.png`.
- `docs/evidence/menu/pvp-victory.png`.
- `docs/evidence/menu/arcade-defeat.png`, `arcade-victory.png`, `arcade-next.png` e `arcade-complete.png`. O reinício após a conclusão foi observado na prévia com vida completa, round 1, luta 1/2 e Ayla novamente como adversária.
- `docs/evidence/ayla/crimson-wave.png`, `crimson-wave-left.png`, `ruby-eruption.png`, `scarlet-rush.png`, `rising-kick.png` e `leaping-kick.png`.
- `docs/evidence/gris/idle.png`, `standing-rp-hit.png`, `standing-lk.png`, `golden-arc.png`, `silk-step.png`, `royal-cleave.png`, `crouching-rk.png`, `rising-shear.png`, `air-rk.png` e `victory.png`.

Capturas com sufixo `before-box` documentam a comparação anterior aos ajustes, não a geometria final.

## Verificação automatizada

**138 testes passaram**, em 11 arquivos. TypeScript/build concluídos; `git diff --check` sem erros.

- `Projectiles.test.ts`: contagens variáveis de especiais, comandos dos dois lados, livros locais, emissão única, persistência, guarda, clash, colisão varrida, expiração e reset.
- `AylaAnimations.test.ts` e `GrisAnimations.test.ts`: cobertura de estados/fases/texturas, contatos isolados, separação de arma/efeito, dimensões visuais do pilar e extensão dos chutes somente no contato.
- `ArcadeController.test.ts` e `ArcadeReplay.test.ts`: entradas comuns da IA, determinismo e partidas completas de dois rounds contra os dois personagens, sem forçar acertos ou modificar o estado de combate.
- Demais testes preservam parser, movimento, guarda, simulação, dados locais e reprodução das animações.

## Limites de conteúdo

Tempos, dano, alcances e dificuldade da IA são valores provisórios de protótipo; esta entrega não representa balanceamento competitivo. Algumas intensidades compartilham poses, conforme os READMEs dos personagens. Configurações permanece como página reservada, conforme solicitado. Combos completos e outros itens gerais da pipeline continuam fora desta entrega.

## Ajuste de cadência da Gris — 21/10/2026

Após o feedback sobre loops abruptos e a tesoura piscando, a apresentação foi ajustada sem mudar o livro de combate:

- Idle com ciclo de 48 frames lógicos (0,8 s). Caminhada, dash e agachamento retornam pelas poses intermediárias; a defesa sustenta as poses de guarda.
- Menu e arena usam o mesmo amostrador de holds do manifesto. O menu anteriormente ignorava `frameDurations`.
- Cortes fortes em pé, agachados e aéreos, Arco Dourado, Passo de Seda, Corte Régio e Tesoura Ascendente sustentam uma pose no contato e mostram o seguimento no começo da recuperação. A tesoura estendida permanece visível por 16–26 frames no conjunto contato/seguimento, conforme o golpe.
- A hitbox continua existindo somente na fase ativa. Permanecer com a arma estendida durante o seguimento não causa dano extra. Startup, atividade, recuperação lógica, dano, stun e caixas não foram alterados nesta revisão.
- Revisão no treino: forte em pé após oito frames de recuperação, especial com projétil, dois cortes especiais, antiaéreo, forte agachado e aéreo. As poses de seguimento permaneceram visíveis sem hitbox corpo a corpo na recuperação. Evidências: `docs/evidence/gris/strong-follow-through.png` e `golden-arc-follow-through.png`.
- Suíte completa: **138 testes passaram**. Os novos casos cobrem a volta dos loops, os holds iguais no menu/arena e a duração da exibição dos cortes.
