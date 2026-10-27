# Identidade visual — Close Combat

Regras gerais em [base.md](base.md); definições de personagens, cenários, peças aprovadas e progresso exclusivamente na [pipeline](pipeline.md).

## Linguagem artística

Ilustração 2D original com referência estética em Hades: contorno preto expressivo com variação de espessura, desenho angular, massas de cor chapada, sombras recortadas, contraste forte e textura pictórica controlada. Personagens, retratos, cenários, interface e efeitos devem pertencer ao mesmo universo visual.

A paleta é livre por personagem e ambiente; não precisa reproduzir as cores da referência externa. A [referência interna de traço](assets/art/menu/patio-solar.png) exemplifica a linguagem compartilhada. Não copiar personagens, figurinos, logotipos ou interfaces de outros jogos.

## Identidade dos personagens

Toda produção ou revisão usa o turnaround canônico do personagem como referência primária de identidade, junto às poses existentes para continuidade. Referências canônicas ficam em `assets/art/characters/<id>/turnaround.png`; escolhas individuais e respectivos materiais são registradas somente na pipeline.

Preservar rosto, relação cabeça/corpo, anatomia, silhueta, roupa, materiais e acessórios entre poses. A cor do material deve permanecer reconhecível durante o movimento; sombras podem acompanhar os planos. Folhas derivadas orientam a ação, mas não substituem a referência canônica.

Não aumentar cabeça ou corpo para enfatizar um golpe, nem mudar tom de pele, roupa ou acessórios entre quadros. Conferir assimetrias e espelhamento. Correções de cor não devem produzir posterização, manchas, bordas coloridas ou rachaduras nas sombras.

## Animação

Antecipação, contato e recuperação precisam ser legíveis. Usar transições autoradas, continuidade dos membros, apoios estáveis e proporções constantes. A raiz não deriva com braços, roupas ou variação da silhueta. Locomoção real pertence à simulação.

Preservar uma pose opaca quando misturas de alpha criarem transparência ou piscadas. Não alongar regras de combate para acomodar uma folha. Holds, orientação, escala, células e pivôs são declarados nos manifestos, sem inferência de gameplay a partir dos pixels. Processo geral em [docs/animacao.md](docs/animacao.md).

## Cenários e interface

Cenários de combate são panoramas ultrawide, com proporção mínima 21:9, compostos com espaço lateral e sem depender de ampliação excessiva. Devem oferecer profundidade ilustrada, faixa de luta limpa e contraste favorável aos personagens. Camadas compartilham enquadramento e origem; objetos decorativos não adquirem colisão por estarem desenhados. Evitar perspectivas que façam os pés flutuarem.

HUD e menus usam sombras de tinta, acentos contidos, títulos com serifa e números/comandos de leitura clara. Feedback deve distinguir acerto e bloqueio sem esconder os lutadores. A câmera e a apresentação seguem as regras compartilhadas de base.md; não corrigir proporções por zoom ou escala variável em execução.

## Produção e aprovação

Imagens exploratórias dependem de aval manual antes da integração. Manter no checkout somente arte consumida pelo jogo, fontes ativas necessárias para reproduzi-la e referências canônicas vigentes. Variantes substituídas e propostas rejeitadas ficam no histórico Git.

Exportar sprites em PNG RGBA com alpha verdadeiro, enquadramento fixo e margens suficientes. Fundos opacos podem ser RGB. Preservar a procedência e os parâmetros de preparação em metadados; detalhes de uma peça e seu estado de aprovação ficam na pipeline.

Revisar no jogo em velocidade normal, câmera lenta e passo único: silhueta, contraste, proporções, rosto, materiais, transições, direção, pés, contato, ciclos, extremos da arena e dois lados. Testes e build não substituem essa revisão nem a aprovação artística manual.
