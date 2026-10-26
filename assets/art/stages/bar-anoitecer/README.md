# Fontes do Bar ao Anoitecer

Geradas com a ferramenta integrada de imagens em 26/10/2026. Referências internas: `assets/art/menu/patio-solar.png` para o traço e turnaround original do Shoto para o ambiente inicial. Captura de Guilty Gear Xrd Rev 2 enviada pelo usuário orientou apenas continuidade espacial de piso/cenário, sem copiar personagens, arquitetura ou interface.

`objetos.png`: folha original com três itens independentes, alpha verdadeiro. `preparation.json`: regiões da folha, limites alpha locais, altura final, X e base Y de cada item. O runtime usa três telas RGBA de referência idêntica, com itens menores; nenhum objeto está fundido ao bar.

`generation.json`: prompt da edição final do fundo e descrição da geração dos objetos. A pintura opaca final está diretamente em `src/assets/scenes/bar-anoitecer/layers/bar.png`, preservada em resolução nativa.
