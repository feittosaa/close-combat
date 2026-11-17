import { expect, it, vi } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { sm0g } from '../engine/data/fighters/sm0g';
import { bob } from '../engine/data/fighters/bob';
import { getSm0gPose } from '../rendering/animations/sm0gSprites';
import { sm0gEffects } from '../rendering/sm0gEffects';
import { CombatantView } from '../rendering/CombatantView';

const state = new Simulation(createGameConfig(1024,576),[sm0g,bob]).snapshot().characters[0];
const move = sm0g.moves.find(move => move.id === 'ultimate-soco')!;
const at = (elapsedFrames:number, facing:'left'|'right'='right') => ({...state, facing, attack:{moveId:move.id,buttons:['2' as const],elapsedFrames,hasHit:false}});

it('começa no segundo desenho, acompanha cada pose e espelha o braço', () => {
  for (let elapsed=0;elapsed<move.startup+move.activeFrames+move.recovery;elapsed++) {
    const right=at(elapsed), left=at(elapsed,'left'), pose=getSm0gPose(right,0);
    const effect=sm0gEffects(right)[0], mirrored=sm0gEffects(left)[0];
    if(pose.drawing===0) { expect(effect).toBeUndefined(); continue; }
    expect(effect).toMatchObject({name:'ultimate-soco',frame:pose.drawing-1});
    expect(mirrored.x).toBeCloseTo(-effect.x);
    expect(mirrored.y).toBeCloseTo(effect.y);
  }
});

it('mostra o último desenho do efeito por um quadro após a animação corporal', () => {
  const graphics:Record<string, ReturnType<typeof vi.fn>>={};
  for(const name of ['clear','setDepth','fillStyle','fillRect','lineStyle','strokeRect','destroy']) graphics[name]=vi.fn().mockReturnValue(graphics);
  const sprite:Record<string, ReturnType<typeof vi.fn>>={};
  for(const name of ['setDepth','setTexture','setOrigin','setScale','setPosition','setFlipX','setVisible','destroy']) sprite[name]=vi.fn().mockReturnValue(sprite);
  const scene={add:{graphics:()=>graphics,image:()=>sprite},textures:{exists:(key:string)=>key==='contact-sm0g-ultimate-soco'}};
  const view=new CombatantView(scene as never,0);
  view.sync(at(move.startup+move.activeFrames+move.recovery-1),100);
  expect(sprite.setTexture).toHaveBeenLastCalledWith('contact-sm0g-ultimate-soco','4');
  view.sync(state,101);
  expect(sprite.setTexture).toHaveBeenLastCalledWith('contact-sm0g-ultimate-soco','5');
  expect(sprite.setVisible).toHaveBeenLastCalledWith(true);
  view.sync(state,102);
  expect(sprite.setVisible).toHaveBeenLastCalledWith(false);
  view.destroy();
});

it('usa a mesma preparação e vapor da primeira ultimate', () => {
  for (const frame of [0,24,25,45,74]) {
    const punch = at(0);
    const grab = {...punch, attack:{...punch.attack, moveId:'ultimate-grab'}};
    expect(getSm0gPose(punch,0,frame)).toEqual(getSm0gPose(grab,0,frame));
    expect(sm0gEffects(punch,frame)).toEqual(sm0gEffects(grab,frame));
  }
});
