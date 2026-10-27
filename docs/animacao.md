# Produção e revisão de animações

Este processo se aplica a qualquer personagem. Regras gerais em [base.md](../base.md), direção em [identidade-visual.md](../identidade-visual.md) e definições individuais na [pipeline](../pipeline.md).

## Autoria

1. Partir da referência canônica de identidade e das poses existentes de ligação.
2. Definir a intenção e as fases da ação conforme os dados de combate, sem inventar tempos ou alcance na imagem.
3. Conferir silhueta, rosto, proporções, figurino, materiais e identidade dos membros.
4. Completar os intervalos necessários à trajetória e às transições, mantendo a escala corporal e a raiz.
5. Exportar fontes ativas e atlas de enquadramento fixo, com alpha verdadeiro e margem para a ação completa.
6. Declarar sequência, dimensões, pivôs, orientação, escala e holds no manifesto; não vincular colisões aos pixels.
7. Rever a ação completa e registrar na pipeline o resultado e a aprovação manual.

## Reprodução

A animação acompanha o tempo lógico de combate. Pausa, micro pausa de contato, passo único, reset e espelhamento devem preservar sua fase. O tempo do round é independente do tempo de animação quando a regra de contato o exige.

A simulação aplica locomoção e gravidade. Atlas não devem acrescentar deriva artificial ao personagem. A raiz deve seguir um apoio autorado, sem centralização automática pela silhueta variável. Manter membros consistentes entre preparação, extensão, recolhimento e retorno.

Usar transições desenhadas quando a troca direta produzir estalo. Interrupções devem retornar a partir da profundidade já alcançada, sem saltar para poses que não ocorreram. Misturas não podem produzir transparência, imagens duplas ou piscadas.

## Conferência

Rever ambos os lados, mudanças de direção, entrada e saída dos estados, ciclos completos e sua junção. Conferir contato, bloqueio e erro, pausas, reinício e extremos da câmera. Sobrepor caixas quando necessário, preservando a distinção entre desenho e regras físicas.

Validar determinismo em diferentes FPS e correspondência entre fase lógica e pose. Fontes de preparação devem reproduzir os atlas ativos; alterações somente documentais ou limpeza de arquivos não devem mudar seus pixels. Aproximações e estados sem arte precisam ser explícitos na pipeline, nunca apresentados como animação final.
