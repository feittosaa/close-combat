import { describe, expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { ayla } from './fixtures/referenceFighters';
import { getCharacterById } from '../engine/data/characters';
import { aylaMove } from '../engine/data/combat/aylaCombatBook';
import { applyStrikeReaction } from '../engine/combat/CombatRuntime';
import { ArcadeController } from '../engine/combat/ArcadeController';
import { getCharacterAnimationKey } from '../rendering/animations/CharacterAnimationMap';
import { AttackResolver } from '../engine/combat/AttackResolver';
import type { Direction, FrameInput } from '../input/types';
import type { CharacterState } from '../engine/characters/CharacterState';
import type { ProjectileState } from '../engine/combat/Projectile';
const input=(direction:Direction='N',attack=false):FrameInput=>({direction,buttons:new Set(attack?['2']:[])});
const N=input(); const electric=aylaMove('f,n,d,df:2');
function step(sim:Simulation,value=N,frames=1){for(let f=0;f<frames;f++)sim.stepFrame([value,N]);}
function wait(sim:Simulation,until:()=>boolean){for(let f=0;f<180 && !until();f++)step(sim);expect(until()).toBe(true);}
function launch(sim:Simulation){wait(sim,()=>!sim.snapshot().characters[0].attack);for(const value of [input('F'),N,input('D'),input('DF',true)])step(sim,value);}
function game(target='ayla'){return new Simulation(createGameConfig(1800,700),[ayla,getCharacterById(target)!],{training:true,initialDistance:96});}
describe('limite de dois levantamentos por combo',()=>{
  it.each(['ayla','gris','tester','dummy'])('terceiro elétrico derruba %s e protege até levantar',target=>{
    const sim=game(target);
    for(let count=1;count<=3;count++){
      launch(sim);wait(sim,()=>sim.snapshot().recentContacts.length>=count);
      const victim=sim.snapshot().characters[1];expect(victim.combo?.launches).toBe(count);
      if(count<3){expect(victim.verticalVelocity).toBeLessThan(0);expect(victim.combo?.forcedFall).not.toBe(true);}
      if(count===2)expect(victim.verticalVelocity).toBe(-4);
    }
    const broken=sim.snapshot().characters[1];expect(broken.combo?.forcedFall).toBe(true);expect(broken.verticalVelocity).toBeGreaterThanOrEqual(8);
    const health=broken.health;let falling=0;
    while(!sim.snapshot().characters[1].grounded && falling<30){step(sim);falling++;expect(sim.snapshot().characters[1].health).toBe(health);}
    expect(falling).toBeLessThan(20);expect(sim.snapshot().characters[1].mode).toBe('knockdown');expect(sim.snapshot().characters[1].combo?.forcedFall).toBe(true);
    step(sim,N,25);expect(sim.snapshot().characters[1].combo?.forcedFall).toBe(true);step(sim);
    expect(sim.snapshot().characters[1].combo).toBeUndefined();expect(sim.snapshot().characters[1].mode).toBe('knockdown');
    sim.stepFrame([N,{direction:'N',buttons:new Set(['1'])}]);expect(sim.snapshot().characters[1].mode).toBe('startup');
    sim.resetMatch();
    expect(sim.snapshot().characters[1].combo).toBeUndefined();
  });
  it('Screw compartilha o limite e acerto aéreo normal tem impulso menor',()=>{
    const [attacker,target]=game().snapshot().characters as CharacterState[];
    const hit=electric.combat!.strikes[0];applyStrikeReaction(attacker,target,electric,hit,10,false);expect(target.combo?.launches).toBe(1);
    const initial=target.verticalVelocity;const jab=aylaMove('1');applyStrikeReaction(attacker,target,jab,jab.combat!.strikes[0],10,false);
    expect(target.combo?.launches).toBe(1);expect(Math.abs(target.verticalVelocity)).toBeLessThan(Math.abs(initial));expect(target.verticalVelocity).toBeGreaterThan(-3);
    const screw=aylaMove('df+1,df+2');applyStrikeReaction(attacker,target,screw,screw.combat!.strikes[0],10,false);
    expect(target.combo?.launches).toBe(2);expect(target.combo?.screwUsed).toBe(true);expect(Math.abs(target.verticalVelocity)).toBeLessThan(Math.abs(initial));
    target.combo!.wallFrames=20;
    applyStrikeReaction(attacker,target,electric,hit,10,false);expect(target.combo?.forcedFall).toBe(true);expect(target.combo?.wallFrames).toBe(0);
  });
  it('terceiro levantamento invalida contatos já enfileirados no mesmo frame',()=>{
    const [attacker,target]=game().snapshot().characters as CharacterState[];
    attacker.x=target.x-50;target.grounded=false;target.mode='hitstun';
    target.combo={attackerId:attacker.characterId,hits:2,damage:100,launches:2,screwUsed:false,wallUsed:false,wallFrames:0,moveIds:[]};
    const move={...electric,combat:{...electric.combat!,strikes:electric.combat!.strikes.map(s=>({...s,hitbox:{forward:0,yOffset:-180,width:200,height:240}}))}};
    attacker.attack={moveId:move.id,buttons:['2'],elapsedFrames:move.startup,hasHit:false,preciseExecution:false};
    const projectile:ProjectileState={id:1,ownerId:attacker.characterId,fighterId:attacker.fighterId,moveId:move.id,x:target.x-50,y:target.y,previousX:target.x-50,facing:'right',ageFrames:1,remainingFrames:120,hasHit:false,definition:{forward:0,yOffset:0,speed:0,lifetimeFrames:120,hitbox:{forward:0,yOffset:-180,width:200,height:240},animationId:'test',maxActive:1}};
    const health=target.health;const resolver=new AttackResolver(()=>move);
    const events=resolver.resolve([attacker,target],[N,N],[new Set(),new Set()],[false,false],[projectile]);
    expect(events).toHaveLength(1);expect(events[0].forcedFall).toBe(true);expect(events[0].frameAdvantage).toBeUndefined();
    expect(target.health).toBe(health-events[0].damage);expect(projectile.hasHit).toBe(false);expect(target.combo?.hits).toBe(3);
  });
  it.each([['melee',true],['projectile',true],['throw',true],['melee',false],['projectile',false]] as const)('imunidade bloqueia %s no chão=%s', (kind,grounded)=>{
    const [attacker,target]=game().snapshot().characters as CharacterState[];
    target.grounded=grounded;target.mode=kind==='throw'?'neutral':grounded?'knockdown':'hitstun';target.combo={attackerId:attacker.characterId,hits:3,damage:100,launches:3,forcedFall:true,screwUsed:true,wallUsed:false,wallFrames:0,moveIds:[]};
    attacker.x=target.x-50;
    const original=kind==='throw'?aylaMove('1+3'):electric;
    const move={...original,hitLevel:'mid' as const,combat:{...original.combat!,strikes:original.combat!.strikes.map(s=>({...s,hitLevel:'mid' as const,canHitGround:true,hitbox:{forward:0,yOffset:-180,width:200,height:240}}))}};
    attacker.attack={moveId:move.id,buttons:['2'],elapsedFrames:move.startup,hasHit:false,preciseExecution:false};
    const definition={forward:0,yOffset:0,speed:0,lifetimeFrames:120,damage:90,hitstun:20,blockstun:10,pushback:{hit:0,block:0},hitLevel:'mid' as const,hitbox:{forward:0,yOffset:-180,width:200,height:240},animationId:'test',maxActive:1};
    const projectile:ProjectileState={id:1,ownerId:attacker.characterId,fighterId:attacker.fighterId,moveId:move.id,x:target.x-50,y:target.y,previousX:target.x-50,facing:'right',ageFrames:1,remainingFrames:120,hasHit:false,definition};
    const resolver=new AttackResolver(()=>move);const health=target.health;
    const events=resolver.resolve([attacker,target],[N,N],[new Set(),new Set()],[false,false],kind==='projectile'?[projectile]:[]);
    expect(events).toEqual([]);expect(target.health).toBe(health);expect(target.combo?.launches).toBe(3);expect(target.mode).toBe(kind==='throw'?'neutral':grounded?'knockdown':'hitstun');
    target.combo!.forcedFall=false;
    const unprotected=resolver.resolve([attacker,target],[N,N],[new Set(),new Set()],[false,false],kind==='projectile'?[projectile]:[]);
    expect(unprotected.length).toBeGreaterThan(0);
  });
  it('o Arcade encerra a queda protegida, volta ao idle e pode receber um novo launcher', () => {
    const sim = game();
    const fighter = getCharacterById('ayla')!;
    const controller = new ArcadeController(fighter, ayla);
    for (let count = 1; count <= 3; count++) {
      launch(sim);
      wait(sim, () => sim.snapshot().recentContacts.length >= count);
    }
    expect(sim.snapshot().characters[1].combo?.forcedFall).toBe(true);
    wait(sim, () => sim.snapshot().characters[1].grounded);
    for (let frame = 0; frame < 60 && sim.snapshot().characters[1].mode === 'knockdown'; frame++) {
      const snapshot = sim.snapshot();
      sim.stepFrame([N, controller.readInput(snapshot.frame, snapshot.characters[1], snapshot.characters[0], snapshot.projectiles)]);
    }
    step(sim, N, 2);
    const recovered = sim.snapshot().characters[1];
    expect(recovered.mode).toBe('neutral');
    expect(getCharacterAnimationKey(recovered)).toBe('ayla-idle');
    expect(recovered.combo).toBeUndefined();
    const health = recovered.health;
    launch(sim);
    wait(sim, () => sim.snapshot().characters[1].health < health);
    expect(sim.snapshot().characters[1].combo?.launches).toBe(1);
    expect(sim.snapshot().characters[1].combo?.forcedFall).not.toBe(true);
  });

});
