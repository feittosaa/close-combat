import { expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scene: class {} } }));

it('volta da escolha de dificuldade do Arcade ao menu principal com Esc', async () => {
  const { MenuScene } = await import('../scenes/MenuScene');
  const menu = new MenuScene() as unknown as { page: string; render: () => void; handleKey: (event: Partial<KeyboardEvent>) => void };
  menu.render = vi.fn();
  menu.page = 'difficulty';
  menu.handleKey({ key: 'Escape', code: 'Escape', repeat: false, target: null, preventDefault: () => undefined });
  expect(menu.page).toBe('home');
  expect(menu.render).toHaveBeenCalled();
});


it('navega por personagens indisponíveis sem permitir confirmá-los', async () => {
  const { MenuScene } = await import('../scenes/MenuScene');
  const menu = new MenuScene() as unknown as { page:string; render:()=>void; pointFighter:(player:0|1,id:string)=>void; moveFighter:(player:0|1,step:-1|1)=>void; confirmFighter:(player:0|1)=>void; selectionPreview:(string|undefined)[]; selection:{choosingColor:boolean[]} };
  menu.render=vi.fn(); menu.page='fighter';
  menu.pointFighter(0,'setplay');
  menu.confirmFighter(0);
  expect(menu.selection.choosingColor[0]).toBe(false);
  menu.moveFighter(0,1);
  expect(menu.selectionPreview[0]).toBe('shoto');
  menu.confirmFighter(0);
  expect(menu.selection.choosingColor[0]).toBe(true);
});
