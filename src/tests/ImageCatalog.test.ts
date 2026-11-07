import { describe, expect, it } from 'vitest';
import { imageFolder, textureFolder } from '../dev/imageCatalog';

const labels = { shoto: 'Bob', cowboy: 'Texas', saloon: 'Saloon · Retrô' };

describe('developer image folders', () => {
  it('groups images by section, character and sprites', () => {
    expect(imageFolder('src/assets/scenes/saloon/presentation/ready.png', labels)).toEqual(['Títulos de luta', 'Saloon']);
    expect(imageFolder('src/assets/scenes/saloon/layers/back.png', labels)).toEqual(['Cenários', 'Saloon · Retrô']);
    expect(imageFolder('src/assets/art/characters/cowboy/fullbody.png', labels)).toEqual(['Personagens', 'Texas']);
    expect(imageFolder('src/assets/sprites/characters/cowboy/idle.png', labels)).toEqual(['Personagens', 'Texas', 'Sprites']);
    expect(imageFolder('src/assets/sprites/characters/shoto/high/idle.png', labels)).toEqual(['Personagens', 'Bob', 'Sprites', 'Alta qualidade']);
    expect(imageFolder('assets/art/characters/shoto/revisao/a.png', labels)).toEqual(['Personagens', 'Bob', 'Referências', 'Revisão']);
    expect(imageFolder('src/assets/sprites/effects/contact/hit-light.png', labels)).toEqual(['Efeitos de golpes', 'Contato']);
    expect(imageFolder('assets/art/wallpapers/bob-menu.png', labels)).toEqual(['Menus e wallpapers']);
  });

  it('places loaded textures in the same folders', () => {
    const ids = ['shoto', 'cowboy'];
    expect(textureFolder('presentation:saloon:victory', labels, ids)).toEqual(['Títulos de luta', 'Saloon']);
    expect(textureFolder('stage:saloon:back', labels, ids)).toEqual(['Cenários', 'Saloon · Retrô']);
    expect(textureFolder('cowboy-victory', labels, ids)).toEqual(['Personagens', 'Texas', 'Sprites']);
    expect(textureFolder('fighter-icon-shoto', labels, ids)).toEqual(['Personagens', 'Bob']);
    expect(textureFolder('contact-hit-light', labels, ids)).toEqual(['Efeitos de golpes', 'Contato']);
    expect(textureFolder('menu-solar', labels, ids)).toEqual(['Menus e wallpapers']);
  });
});
