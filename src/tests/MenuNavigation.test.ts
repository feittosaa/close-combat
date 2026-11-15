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
