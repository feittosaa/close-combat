import { expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
vi.mock('../ui/StageSelectionView', () => ({ renderStageSelection: vi.fn(), renderStageDraw: vi.fn((_root, _candidates, _winner, _instant, done: () => void) => done()) }));
vi.stubGlobal('HTMLButtonElement', class {});

type Menu = {
  page: string; mode: string; scene: { start: ReturnType<typeof vi.fn> }; render: () => void; init: (data: object) => void;
  handleKey: (event: Partial<KeyboardEvent>) => void; arcadeRun: { stages: string[] };
  picker?: { cursors: number[]; ready: boolean[]; plateFor?: number; active: number[] };
};
const key = (name: string, code = name) => ({ key: name, code, repeat: false, target: null, preventDefault: () => undefined });
const p1 = { left: key('a', 'KeyA'), right: key('d', 'KeyD'), confirm: key('j', 'KeyJ') };
const p2 = { left: key('ArrowLeft'), right: key('ArrowRight'), confirm: key('1', 'Numpad1') };

async function stageMenu(data: object = { selectVersus: true }, mode = 'versus'): Promise<Menu> {
  const { MenuScene } = await import('../scenes/MenuScene');
  const menu = new MenuScene() as unknown as Menu;
  menu.scene = { start: vi.fn() }; menu.render = vi.fn(); menu.init(data); menu.page = 'stage'; menu.mode = mode;
  return menu;
}
const started = (menu: Menu) => menu.scene.start.mock.calls[0][1];

it('os dois jogadores escolhem ao mesmo tempo, cada um com as suas teclas, e escolhas iguais não sorteiam', async () => {
  const menu = await stageMenu();
  menu.handleKey(p2.confirm);                       // P2: Fazenda (cursor inicial)
  expect(menu.picker?.ready).toEqual([false, true]);
  menu.handleKey(p1.confirm);                       // P1: Fazenda
  expect(started(menu)).toMatchObject({ stageId: 'fazenda', mode: 'versus' });
});

it('cada jogador move só o seu cursor: P1 com A/D e P2 com as setas', async () => {
  const menu = await stageMenu();
  menu.handleKey(p1.right); menu.handleKey(p1.right);
  menu.handleKey(p2.left);                          // volta ao «?»
  expect(menu.picker?.cursors).toEqual([2, 3]);
});

it('escolhas diferentes vão ao sorteio e a luta começa num dos dois cenários', async () => {
  const menu = await stageMenu();
  menu.handleKey(p1.confirm);                       // P1: Fazenda
  menu.handleKey(p2.right);                         // P2: Saloon
  menu.handleKey(p2.confirm);                       // abre a variação de P2
  expect(menu.picker?.plateFor).toBe(1);
  menu.handleKey(p2.right); menu.handleKey(p2.confirm);   // Noite
  expect(['fazenda', 'saloon-noite']).toContain(started(menu).stageId);
});

it('se os dois escolhem o Saloon, as variações abrem uma de cada vez', async () => {
  const menu = await stageMenu();
  menu.handleKey(p1.right); menu.handleKey(p2.right);
  menu.handleKey(p1.confirm); menu.handleKey(p2.confirm);   // P1 abre a placa; P2 espera
  expect(menu.picker?.plateFor).toBe(0);
  menu.handleKey(p1.confirm);                       // P1: Dia, e a placa passa a P2
  expect(menu.picker?.plateFor).toBe(1);
  menu.handleKey(p2.confirm);                       // P2: Dia também → mesmo cenário, sem sorteio
  expect(started(menu).stageId).toBe('saloon-dia');
});

it('na revanche só o vencedor escolhe o cenário, sem sorteio, e o aleatório vale como escolha', async () => {
  const menu = await stageMenu({ selectVersus: true, stageChooser: 1 });
  expect(menu.picker?.active ?? [1]).toEqual([1]);
  menu.handleKey(p2.left);                          // «?» aleatório
  menu.handleKey(p2.confirm);
  expect(['fazenda', 'saloon-dia', 'saloon-noite', 'saloon', 'sala-treino']).toContain(started(menu).stageId);
});

it('Esc fecha a variação, depois desfaz as escolhas e só então volta aos personagens', async () => {
  const menu = await stageMenu();
  menu.handleKey(p1.right); menu.handleKey(p1.confirm);
  expect(menu.picker?.plateFor).toBe(0);
  menu.handleKey(key('Escape'));
  expect(menu.picker?.plateFor).toBeUndefined();
  menu.handleKey(p2.confirm);
  menu.handleKey(key('Escape'));
  expect(menu.picker?.ready).toEqual([false, false]);
  menu.handleKey(key('Escape'));
  expect(menu.page).toBe('fighter');
});

it('o Arcade não tem escolha de cenário: depois do personagem a luta começa e a jornada inteira é sorteada', async () => {
  const menu = await stageMenu({}, 'arcade');
  menu.page = 'fighter';
  const confirm = () => (menu as unknown as { confirmFighter: () => void }).confirmFighter();
  confirm(); confirm();                             // personagem e cor
  expect(menu.scene.start).toHaveBeenCalledOnce();
  expect(started(menu).arcadeRun.stages).toHaveLength(started(menu).arcadeRun.opponents.length);
  expect(started(menu).arcadeRun.stages).not.toContain('sala-treino');
  expect(menu.page).toBe('fighter');
});
