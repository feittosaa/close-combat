import type Phaser from 'phaser';
import type { HitEvent } from '../engine/combat/AttackResolver';
import type { MoveDefinition } from '../engine/data/moves';
import hitLight from '../assets/sprites/effects/contact/hit-light.png';
import hitHeavy from '../assets/sprites/effects/contact/hit-heavy.png';
import hitSweep from '../assets/sprites/effects/contact/hit-sweep.png';
import blockLight from '../assets/sprites/effects/contact/block-light.png';
import blockHeavy from '../assets/sprites/effects/contact/block-heavy.png';
import blockSweep from '../assets/sprites/effects/contact/block-sweep.png';
import blockPerfect from '../assets/sprites/effects/contact/block-perfect.png';
import blockPerfectHeavy from '../assets/sprites/effects/contact/block-perfect-heavy.png';
import hitBlue from '../assets/sprites/effects/contact/hit-blue.png';
import blockBlue from '../assets/sprites/effects/contact/block-blue.png';
import hitWine from '../assets/sprites/effects/contact/hit-wine.png';
import blockWine from '../assets/sprites/effects/contact/block-wine.png';
import hitOrange from '../assets/sprites/effects/contact/hit-orange.png';
import blockOrange from '../assets/sprites/effects/contact/block-orange.png';
import hitGreen from '../assets/sprites/effects/contact/hit-green.png';
import blockGreen from '../assets/sprites/effects/contact/block-green.png';
import wallBounce from '../assets/sprites/effects/contact/wall-bounce.png';

const sheets = {
  'hit-light': hitLight, 'hit-heavy': hitHeavy, 'hit-sweep': hitSweep,
  'block-light': blockLight, 'block-heavy': blockHeavy, 'block-sweep': blockSweep,
  'block-perfect': blockPerfect, 'block-perfect-heavy': blockPerfectHeavy,
  'hit-blue': hitBlue, 'block-blue': blockBlue, 'hit-wine': hitWine, 'block-wine': blockWine,
  'hit-orange': hitOrange, 'block-orange': blockOrange, 'hit-green': hitGreen, 'block-green': blockGreen,
} as const;

type Sheet = keyof typeof sheets;
export function preloadContactEffects(scene: Phaser.Scene): void {
  if (!scene.textures.exists('wall-bounce')) scene.load.image('wall-bounce', wallBounce);
  for (const [name, url] of Object.entries(sheets)) {
    const key = `contact-${name}`;
    if (!scene.textures.exists(key)) scene.load.spritesheet(key, url, { frameWidth: name === 'hit-heavy' ? 464 : 362, frameHeight: 724 });
  }
}

export function contactEffectKey(event: HitEvent, move?: MoveDefinition): Sheet {
  const sweep = move?.hitLevel === 'low' && (move.knockdown || move.id === 'crouch-heavy-kick');
  const push = move?.id === 'push-away';
  const heavy = move?.category === 'power' || move?.category === 'ultimate' ||
    move?.input.buttons.some(button => button === '2' || button === '4');
  if (event.perfectBlock) return heavy ? 'block-perfect-heavy' : 'block-perfect';
  let color: 'blue' | 'wine' | 'orange' | 'green' | undefined;
  if (move?.category === 'special' || move?.category === 'ultimate') {
    if (event.stage === 'explosion' || move.projectile?.visual === 'molotov') color = 'orange';
    else if (move.projectile?.visual === 'bullet' || move.projectile?.visual === 'dynamite') color = 'blue';
    else if (move.projectile?.visual === 'glass') color = 'wine';
    else if (move.projectile?.visual === 'bottle') color = 'green';
  }
  return `${event.outcome}-${color ?? (sweep || push ? 'sweep' : heavy ? 'heavy' : 'light')}`;
}
