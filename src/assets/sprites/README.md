# Sprites

Organizar fontes ativas e atlas por personagem, efeito ou interface. Exportar enquadramento fixo, alpha verdadeiro e margens suficientes para a ação completa. Dados de células, pivôs, orientação e reprodução ficam nos manifestos. Nas folhas de efeito de contato, um desenho que atravessa a grade ganha corte próprio em `effects/contact/frames.json` (retângulo na folha e posição dentro do quadro de tamanho fixo), sem editar a imagem; a aba Sprites do modo desenvolvedor ajusta e salva esses cortes.

Não manter variantes substituídas ou arte rejeitada no checkout. O histórico Git preserva essas versões. Aprovação e detalhes individuais ficam na pipeline.

## Entrada de sprites

Todo PNG adicionado ou trocado aqui passa automaticamente por `npm run sprites:prepare` (antes de `npm run dev` e `npm run build` e, com o servidor aberto, a cada arquivo novo ou alterado):

1. limpeza do fundo `#FA02F8` — só saem pixels com o matiz do fundo, inclusive o halo misturado ao contorno; tons escuros e pouco saturados desse matiz (sombras arroxeadas da arte) só saem quando encostam no fundo, para não furar o desenho; a transparência existente é preservada;
2. medição das folhas de personagem, da qual o motor deriva o tamanho automático de cada animação.
3. recorte do layout de cada folha de personagem (`<folha>.packed.json`, nas duas qualidades): o jogo guarda na memória só a parte desenhada de cada quadro, com o tamanho e o pivô do atlas original. O PNG e o atlas originais não mudam; um teste impede layout desatualizado.

A mesma etapa limpa a pose de vitória (`src/assets/art/characters/<id>/fullbody*.png`) e o ícone (`selection-icon.png`) de cada personagem, inclusive quando o modo desenvolvedor grava uma imagem nova. A pose também é recortada até o desenho (as laterais por igual, para manter o centro), e o enquadramento `victory` de `fighterArt.ts` é corrigido na mesma proporção. O ícone não é recortado, porque o enquadramento da grade e a janela do HUD dependem das suas dimensões; a arte de seleção é um fundo e fica intacta. Execuções simultâneas (mais de um servidor aberto) esperam umas pelas outras.

As duas etapas podem ser ajustadas à mão depois. O tamanho validado fica no `calibration.json` de cada personagem: o modo desenvolvedor ajusta o tamanho da animação na aba Sprites e o botão `Salvar tamanhos no código` grava o ajuste (o mesmo que `npm run sprites:apply-scales -- <arquivo exportado>`). Uma imagem desenhada de propósito em tons do fundo entra em `keep` de `prepared.json` e não volta a ser limpa. `prepared.json` registra o conteúdo já preparado de cada PNG e a versão da limpeza: mudar a limpeza faz todos os sprites passarem de novo, sem alterar tamanhos validados. Um teste impede sprite sem preparação ou folha sem medição.
