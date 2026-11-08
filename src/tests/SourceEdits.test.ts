import { describe, expect, it } from 'vitest';
// @ts-expect-error Node's built-in module is available to the test runner.
import { readFileSync } from 'node:fs';
import { editCss, editFighter, editHud, literal } from '../dev/sourceEdits';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const shotoSource = read('../engine/data/fighters/shoto.ts'), cowboySource = read('../engine/data/fighters/cowboy.ts');
const cssSource = read('../style.css'), hudSource = read('../ui/hudTheme.ts');
const none = { moves: {}, recipes: {}, combos: {} };
const line = (source: string, id: string) => source.split('\n').findIndex(text => text.includes(`{ id: '${id}'`));

describe('salvar ajustes do modo desenvolvedor no código', () => {
  it('sem ajustes, nenhum arquivo muda', () => {
    expect(editFighter(shotoSource, 'shoto', none)).toBe(shotoSource);
    expect(editCss(cssSource, {})).toBe(cssSource);
    expect(editHud(hudSource, {})).toBe(hudSource);
  });

  it('grava tempos, dano e recuos só no golpe ajustado, inclusive no golpe aéreo de mesmo nome', () => {
    const edited = editFighter(shotoSource, 'shoto', { ...none, moves: { shoto: { 'light-punch': { startup: 9, damage: 22, pushbackBlock: 7 } } } });
    const lines = edited.split('\n'), at = line(edited, 'light-punch');
    expect(lines[at]).toContain('startup: 9, activeFrames: 3, recovery: 15,');
    expect(lines[at + 1]).toContain('damage: 22, hitstun: 15, blockstun: 8, pushback: { hit: 1, block: 7 },');
    expect(lines[line(edited, 'air-light-punch')]).toBe(shotoSource.split('\n')[line(shotoSource, 'air-light-punch')]);
    expect(edited.split('\n').filter((text, index) => text !== shotoSource.split('\n')[index])).toHaveLength(2);
  });

  it('retempera receitas existentes, acrescentando o campo quando falta, e adiciona receitas novas ao fim da lista', () => {
    const recipe = { id: 'dev-x', name: 'Teste', notation: '1,2', moveIds: ['light-punch', 'heavy-punch'], recoveryFrames: 12 };
    const edited = editFighter(cowboySource, 'cowboy', {
      moves: {}, recipes: { cowboy: { 'rapid-kicks': { startupFrames: [7, 7, 7], recoveryFrames: 20 } } }, combos: { cowboy: [recipe] },
    });
    const lines = edited.split('\n');
    expect(lines[line(edited, 'rapid-kicks')]).toContain("continueOnHit: true, startupFrames: [7, 7, 7], recoveryFrames: 20 },");
    expect(lines[line(edited, 'dev-x')]).toBe(`    ${literal(recipe)},`);
    expect(lines[line(edited, 'dev-x') - 1]).toContain("{ id: 'air-heavy-heavy'");
    expect(lines[line(edited, 'dev-x') + 1]).toBe('  ],');
    expect(literal(recipe)).toBe("{ id: 'dev-x', name: 'Teste', notation: '1,2', moveIds: ['light-punch', 'heavy-punch'], recoveryFrames: 12 }");
  });

  it('edita nome, etapas e opções de uma receita existente, removendo opções desmarcadas', () => {
    const edited = editFighter(cowboySource, 'cowboy', { ...none, recipes: { cowboy: { 'rapid-kicks': {
      name: 'Chutes', moveIds: ['light-kick', 'heavy-kick'], continueOnHit: null, endsBasicChain: true,
    } } } });
    expect(edited.split('\n')[line(edited, 'rapid-kicks')])
      .toBe("    { id: 'rapid-kicks', name: 'Chutes', notation: '3,3,3', moveIds: ['light-kick', 'heavy-kick'], endsBasicChain: true },");
  });

  it('aplica a edição de uma receita criada no painel na própria receita nova', () => {
    const recipe = { id: 'dev-y', name: 'Teste', notation: '3,4', moveIds: ['light-kick', 'heavy-kick'], recoveryFrames: 12 };
    const edited = editFighter(cowboySource, 'cowboy', { moves: {}, recipes: { cowboy: { 'dev-y': { name: 'Novo', recoveryFrames: null } } }, combos: { cowboy: [recipe] } });
    expect(edited.split('\n')[line(edited, 'dev-y')]).toBe("    { id: 'dev-y', name: 'Novo', notation: '3,4', moveIds: ['light-kick', 'heavy-kick'] },");
  });

  it('recusa golpes e receitas que não existem no arquivo', () => {
    expect(() => editFighter(shotoSource, 'shoto', { ...none, moves: { shoto: { inexistente: { startup: 1 } } } })).toThrow('inexistente');
  });

  it('grava cores do :root e do HUD no formato original', () => {
    expect(editCss(cssSource, { 'css:--cream': '#ffffff' })).toContain('--ink: #0b0a0a; --cream: #ffffff; --cream-dim: #b8aa90;');
    const hud = editHud(hudSource, { 'hud:gold': '#123456', 'hud:players.1': '#ABCDEF', 'hud:playerText.0': '#000000' });
    expect(hud).toContain('rail: 0x221b16, gold: 0x123456, lightGold');
    expect(hud).toContain('players: [0xc8463a, 0xabcdef], playerText: [\'#000000\', \'#9fd8d1\']');
  });
});
