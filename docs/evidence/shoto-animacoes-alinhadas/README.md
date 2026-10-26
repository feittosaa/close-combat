# Conferência de animações revisadas

Build de produção no Fedora, navegador em 127.0.0.1:4190, canvas 1920 × 1080. As capturas são redimensionadas pela janela do navegador.

- `em-pe.png`: proporção em pé de cerca de 40% da altura, cabelo avermelhado.
- `agachado-inicio.png`, `agachado-retorno.png`: inspeção após 50 passos com baixo mantido; apoio estável, retorno por poses intermediárias.
- `salto-apice.png`: salto completo com câmera de escala/altura fixas.
- `recuo.png`, `dash.png`, `backstep.png`: folhas próprias selecionadas pelo movimento real.
- `defesa.png`: P2 entra em guarda alta diante de soco forte real; o atacante conserva geometria por não possuir arte de ataque aprovada.

Verificação independente dos 56 quadros: transparência sem magenta opaco, sem corte, pés no piso nos estados de chão; desvio horizontal do apoio agachado de 1,5 pixel no atlas. Resultado em `src/assets/sprites/characters/shoto/verification.json`.

Também conferidos `salto-p2.png` (espelhamento e pose recolhida no ápice), `afastamento-maximo.png` (ambos inteiros com mesma escala) e `canto-direito.png` (acompanhamento lateral até o limite físico). Reset retorna à raiz e pose inicial; pausa/avanço de frame não deriva a animação.
