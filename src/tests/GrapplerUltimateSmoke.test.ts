import { expect, it, vi } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { grappler } from '../engine/data/fighters/grappler';
import { shoto } from '../engine/data/fighters/shoto';
import { getGrapplerPose } from '../rendering/animations/grapplerSprites';
import { grapplerEffects } from '../rendering/grapplerEffects';
import { CombatantView } from '../rendering/CombatantView';

const state = new Simulation(createGameConfig(1024,576),[grappler,shoto]).snapshot().characters[0];
const move = grappler.moves.find(move => move.id === 'ultimate-soco')!;
const at = (elapsedFrames:number, facing:'left'|'right'='right') => ({...state, facing, attack:{moveId:move.id,buttons:['2' as const],elapsedFrames,hasHit:false}});

it('começa no segundo desenho, acompanha cada pose e espelha o braço', () => {
  for (let elapsed=0;elapsed<move.startup+move.activeFrames+move.recovery;elapsed++) {
    const right=at(elapsed), left=at(elapsed,'left'), pose=getGrapplerPose(right,0);
    const effect=grapplerEffects(right)[0], mirrored=grapplerEffects(left)[0];
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
  const scene={add:{graphics:()=>graphics,image:()=>sprite},textures:{exists:(key:string)=>key==='contact-grappler-ultimate-soco'}};
  const view=new CombatantView(scene as never,0);
  view.sync(at(move.startup+move.activeFrames+move.recovery-1),100);
  expect(sprite.setTexture).toHaveBeenLastCalledWith('contact-grappler-ultimate-soco','4');
  view.sync(state,101);
  expect(sprite.setTexture).toHaveBeenLastCalledWith('contact-grappler-ultimate-soco','5');
  expect(sprite.setVisible).toHaveBeenLastCalledWith(true);
  view.sync(state,102);
  expect(sprite.setVisible).toHaveBeenLastCalledWith(false);
  view.destroy();
});

it('usa a mesma preparação e vapor da primeira ultimate', () => {
  for (const frame of [0,24,25,45,74]) {
    const punch = at(0);
    const grab = {...punch, attack:{...punch.attack, moveId:'ultimate-grab'}};
    expect(getGrapplerPose(punch,0,frame)).toEqual(getGrapplerPose(grab,0,frame));
    expect(grapplerEffects(punch,frame)).toEqual(grapplerEffects(grab,frame));
  }
});
