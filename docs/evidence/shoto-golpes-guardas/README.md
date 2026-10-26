# Quatro básicos e duas guardas — 26/10/2026

Branch `codex/feature-shoto-golpes-guardas`, sem merge em development. Fontes/prompts preservados em `src/assets/sprites/characters/shoto/source/combat-generation.json`. São 32 novos desenhos (seis por ataque, quatro por guarda), total 116 em 21 atlas.

## Conferência no jogo

Build de produção na prévia local 4190, treino com pausa e avanço por frame. Os quatro contatos foram capturados em ambos os lados: soco fraco frame 7, forte frame 11, chute fraco frame 9, forte frame 14 após reset. Arquivos `soco-*.png` e `chute-*.png`; sufixo `-p2` indica espelhamento. Em distância 96, jab erra sem deslocar o alvo; os demais contatos causam o dano já existente (35/25/45). Hitstun continua geometria técnica, pois não faz parte dos sprites solicitados.

`guarda-agachada.png` e `guarda-agachada-p1.png`: chute médio bloqueado por DB, vida 1000, dano 0 e clipe agachado fechado. `guarda-aerea.png` e `guarda-aerea-p1.png`: segundo jogador manual, aproximação antes do salto e jab adversário durante B aéreo; frame 20, distância 84, dano 0, blockstun 6. Corpo inteiro, guardas fechadas, sem cortes/alpha de transição. Foram conferidos retorno à pose neutra/reset, cores e escala comuns, e execução sem pausa.

Capturas mostram os estados e contatos; não substituem a homologação artística do usuário. Desenhos não definem colisão: caixas técnicas preservadas mostram o alcance/altura real dos quatro básicos.

## Validação automatizada

Instalação reproduzível, 164 testes em 22 arquivos, build e diff aprovados. Verificador independente: 116 frames transparentes sem clipping; pés no chão alinhados, deriva do agachado 1,5 pixel. Testes novos percorrem todas as seis poses dos quatro ataques, sincronização de fases e espelhamento; bloqueios agachado/aéreo com comandos reais dos dois jogadores, gravidade/aterrissagem, locomoção aérea sem ameaça, pausa/reset e clipes idênticos em 30/60/120/144 FPS. Regressão de opacidade anterior preservada.

Tempos, comandos, dano e caixas dos básicos permanecem os mesmos. A mudança de regra necessária é permitir guarda B/DB contra altos/médios no ar; gravidade continua e baixos exigem chão. Não foram adicionados ataques aéreos/agachados.

## Entrega

AGENTS.md, base.md e docs/ci-cd.md exigem pedido explícito para qualquer merge em development. Commit/push e CI da feature são separados da integração; estado remoto final registrado na pipeline e no relato de conclusão. Sem promoção para main ou alteração de tags.
