> **REPROVADO PELO USUÁRIO.** Este registro documenta a tentativa v3 e suas checagens técnicas, que não detectaram as regressões de movimento e identidade. A arte foi retirada do runtime e a base anterior foi restaurada. Não tratar as capturas/fontes desta pasta como aprovação artística.

# Shoto — figurino v3 e caminhada de 16 desenhos

Revisão na mesma branch `codex/feature-shoto-golpes-guardas`, sem integração. Turnaround original mantém a identidade; referência complementar `assets/art/characters/shoto/turnaround-costume-v3.png` incorpora as decisões posteriores de figurino.

## Alteração entregue

- Todas as folhas e os sete conectores usam mangas dobradas três quartos, antebraços expostos, relógio de pulseira escura somente no pulso esquerdo, direito nu, nenhum bracelete dourado e nenhuma fivela/cinto.
- Calça carvão quase preta, camisa vinho, paletó marfim, cabelo castanho discretamente avermelhado e pele morena. Correções feitas nas imagens com image_gen, sem quantização ou novo filtro no personagem.
- Soco e chute fortes regenerados usando a referência corrigida e o idle, sem reutilizar o corpo/cabeça inflados das fontes anteriores.
- Caminhada frontal com oito chaves e oito intermediárias novas, 20 FPS, mesmo período de 48 frames lógicos e mesma velocidade de movimento. Dois atlas evitam textura excessivamente larga.
- 128 desenhos em 22 atlas; fontes anteriores preservadas. Fontes escolhidas e hashes em `assets/art/characters/shoto/wardrobe-v3-delivery.json`; prompts e etapas nos demais `wardrobe-v3-*.json`.

## Verificação

Instalação reproduzível, 168 testes/22 arquivos, build e checagem de diff. Preparação e verificador de pixels executados localmente: fundo transparente, sem recorte, pés no chão, deriva dos pés agachados até 3 px, 16 desenhos distintos de caminhada. A largura da parte superior da cabeça do idle tem mediana 100 px; soco forte 100–105 px, chute forte 97–101 px, mesma escala de atlas. Esta medição detecta inflação, mas não homologa rosto/figurino.

Conferência no jogo em `http://127.0.0.1:4190/`, treino manual pausado por frame: quatro básicos nos dois lados; guardas baixa/aérea com bloqueios reais; troca chave/intermediária e ciclo da caminhada; retorno, salto, pausa e reset. A escala de exibição, câmera fixa, gravidade, colisores, danos e tempos de combate permanecem os aprovados.

Capturas `soco-forte*.png` e `chute-forte*.png` comparam as poses ativas ao adversário em idle na mesma arena/escala; as demais mostram os golpes fracos, caminhada e guardas. As capturas não substituem a validação artística manual do usuário. A CI remota executa testes/build; a verificação dos pixels e a conferência artística são registros locais separados. Resultado remoto é registrado em pipeline.md após o push.
