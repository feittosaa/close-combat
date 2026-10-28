# Close Combat

Jogo de luta 2D para navegador de computador, com simulação determinística e arte ilustrada original.

- [Base](base.md): princípios e decisões gerais.
- [Identidade visual](identidade-visual.md): linguagem artística e critérios de produção.
- [Pipeline](pipeline.md): conteúdo específico, estado do trabalho, tarefas e validações.
- [CI/CD](docs/ci-cd.md): processo de entrega.

## Executar

Usar Node.js 22 e npm.

```sh
npm ci
npm run dev
```

## Validar

```sh
npm test -- --run
npm run build
git diff --check
```

Para conferir a versão compilada, executar `npm run preview`. Mudanças visuais e de controles também precisam de revisão no navegador; testes e build não comprovam qualidade visual.

## Organização

`src/engine/` contém simulação, dados, colisão e combate; `src/input/` adapta entradas; `src/rendering/` apresenta o estado; `src/scenes/` organiza o fluxo; `src/ui/` e `src/training/` oferecem interface e ferramentas. Assets ativos ficam em `src/assets/`; referências canônicas e metadados de arte em `assets/art/`. Testes ficam em `src/tests/`.

O motor decide as regras; a apresentação não altera gameplay. Controles são remapeáveis. Dados e manifestos descrevem cada conteúdo, e seus detalhes de design pertencem exclusivamente à pipeline.
