import { CONTACT_HITSTOP_FRAMES } from '../engine/combat/hitstop';
import { describe, expect, it } from 'vitest';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { shoto } from '../engine/data/fighters/shoto';
import { TutorialSession } from '../training/TutorialSession';
import { fighterMoveList } from '../training/MoveList';
import { formatCommand } from '../ui/commandNotation';
import type { AttackButton, Direction, FrameInput } from '../input/types';
import type { MoveDefinition } from '../engine/data/moves';
const input = (direction: Direction = 'N', buttons: readonly AttackButton[] = []): FrameInput => ({ direction, buttons: new Set(buttons) });
const N = input();
const config = createGameConfig(1024, 576);
const create = (distance = 64, fighter = shoto) => new Simulation(config, [fighter, fighter], { training: true, initialDistance: distance });
function step(sim: Simulation, value = N, player = 0, guard = N): void {
  const inputs = [guard, guard]; inputs[player] = value; sim.stepFrame(inputs);
}
function wait(sim: Simulation, frames = 80, player = 0, guard = N): void {
  for (let f = 0; f < frames; f++) step(sim, N, player, guard);
}
function command(sim: Simulation, move: MoveDefinition, player = 0): void {
  const sequence = move.input.sequence ?? [];
  for (const direction of sequence.slice(0, -1)) step(sim, input(direction), player);
  step(sim, input(sequence[sequence.length-1] ?? (move.crouching ? 'D' : 'N'), move.input.buttons), player);
}
function untilContact(sim: Simulation, player = 0, guard = N, continuous = false): void {
  for (let i = 0; i < 400; i++) {
    if (sim.snapshot().hitEvents.some(e => e.attackerId === `player-${player + 1}`)) return;
    if(continuous)expect(sim.snapshot().characters[1-player].mode, `Defender escaped combo: ${sim.snapshot().characters[player].attack?.moveId}`).toBe('hitstun');
    step(sim, N, player, guard);
  }
  throw new Error(`No contact: ${JSON.stringify(sim.snapshot().characters.map(c => ({x:c.x,y:c.y,attack:c.attack,mode:c.mode})))}`);
}
function untilContactOrIdle(sim: Simulation): void {
  for (let i = 0; i < 20; i++) step(sim);
}
const move = (id: string) => shoto.moves.find(m => m.id === id)!;

describe('manual Shoto catalogue', () => {
  it('registers the authored punch and kick strings', () => {
    expect(shoto.combos?.map(c => c.notation)).toEqual([
      '1,1,1','2,2,2','1,1,2','1,1,1+2','3,3,4','3,4',
    ]);
    expect(formatCommand('b,bd,d,df,f,1+2')).toContain('←,↙,↓,↘,→,');
    expect(formatCommand('f,d,fd,4')).toContain('→,↓,↘,');
    expect(fighterMoveList(shoto).filter(e => e.categories.includes('special'))).toHaveLength(6);
  });

  it.each([0,1])('executes every authored string with connected hits for player %i', player => {
    for (const recipe of shoto.combos!) {
      const sim = create(56), tutorial = new TutorialSession(shoto);
      tutorial.index = tutorial.lessons.findIndex(lesson => lesson.notation === recipe.notation);
      for (const [index,id] of recipe.moveIds.entries()) {
        command(sim, move(id), player);
        untilContact(sim, player, N, index > 0);
        if (player === 0) tutorial.observe(sim.snapshot(), N);
      }
      const events = sim.snapshot().recentContacts.map(e => e.event);
      expect(events.map(e => e.moveId), recipe.notation).toEqual(recipe.moveIds);
      expect(events.every(e => e.outcome === 'hit')).toBe(true);
      expect(sim.snapshot().characters[1-player].health).toBe(1000 - recipe.moveIds.reduce((sum,id) => sum + move(id).damage,0));
      if (player === 0) expect(tutorial.passed, recipe.notation).toBe(true);
      // Completing a string does not authorize a looping continuation.
      command(sim, move(recipe.moveIds[0]), player);
      wait(sim,6);
      expect(sim.snapshot().characters[player].chain?.length ?? 0).toBeLessThanOrEqual(recipe.moveIds.length);
    }
  });

  it.each([0, 1])('allows a weak kick after a weak punch but not a weak punch after a weak kick for player %i', player => {
    const sim = create(56);
    command(sim, move('light-punch'), player); untilContact(sim, player, N, false);
    command(sim, move('light-kick'), player); untilContact(sim, player, N, true);
    command(sim, move('light-punch'), player);
    for (let frame = 0; frame < 60; frame++) step(sim, N, player);
    expect(sim.snapshot().recentContacts.map(contact => contact.event.moveId)).toEqual(['light-punch', 'light-kick']);
    expect(sim.snapshot().characters[player].attack?.moveId).not.toBe('light-punch');
  });

  it.each([0, 1])('uses faster startup only for the second and third heavy punches for player %i', player => {
    const sim = create(56);
    for (const [index, startup] of [13, 10, 10].entries()) {
      command(sim, move('heavy-punch'), player);
      for (let frame = 0; frame < 40 && (sim.snapshot().characters[player].chain?.length ?? 0) !== index + 1; frame++) step(sim, N, player);
      expect(sim.snapshot().characters[player].attack?.startupFrames).toBe(startup);
      untilContact(sim, player, N, index > 0);
    }
    expect(sim.snapshot().recentContacts.map(contact => contact.event.moveId)).toEqual(['heavy-punch', 'heavy-punch', 'heavy-punch']);
    expect(sim.snapshot().characters[player].attack?.recoveryFrames).toBe(30);

    const launcher = create(56);
    for (const id of ['light-punch', 'light-punch', 'heavy-punch']) {
      command(launcher, move(id), player);
      untilContact(launcher, player);
    }
    expect(launcher.snapshot().characters[player].attack?.startupFrames).toBeUndefined();
  });

  it('never executes a full string from a held button, whiff or an unauthorized route', () => {
    const sim = create(); for(let i=0;i<100;i++)step(sim,input('N',['1']));
    expect(sim.snapshot().recentContacts).toHaveLength(1);
    const miss=create(350);command(miss,move('light-punch'));wait(miss,7);command(miss,move('heavy-punch'));
    expect(miss.snapshot().characters[0].attack?.moveId).toBe('light-punch');
    const wrong=create();command(wrong,move('heavy-punch'));untilContact(wrong);command(wrong,move('light-kick'));wait(wrong,CONTACT_HITSTOP_FRAMES+1);
    expect(wrong.snapshot().characters[0].attack?.moveId).toBe('heavy-punch');
  });

  it.each([0,1])('o soco fraco agachado acerta guarda alta e é defendido agachado, jogador %i', player => {
    expect(move('crouch-punch').hitLevel).toBe('low');
    for (const [direction, outcome] of [['B', 'hit'], ['DB', 'block']] as const) {
      const sim = create(56);
      command(sim, move('crouch-punch'), player);
      untilContact(sim, player, input(direction));
      expect(sim.snapshot().hitEvents[0]).toMatchObject({ moveId: 'crouch-punch', outcome });
    }
  });

  it.each([0,1])('antiaéreo agachado acerta guarda baixa e é bloqueado em pé, jogador %i', player => {
    const attack = move('crouch-uppercut');
    expect(attack).toMatchObject({ hitLevel: 'mid', overhead: true });
    for (const [direction, outcome] of [['B', 'block'], ['DB', 'hit']] as const) {
      const sim = create(56);
      command(sim, attack, player);
      untilContact(sim, player, input(direction));
      expect(sim.snapshot().hitEvents[0]).toMatchObject({ moveId: attack.id, outcome });
    }
  });

  it.each([0,1])('prioritizes crouching attacks and low guard correctly for player %i', player => {
    for(const attack of shoto.moves.filter(m => m.crouching)) {
      for(const guard of [input('B'),input('DB')]) {
        const sim=create(56);command(sim,attack,player);untilContact(sim,player,guard);
        const event=sim.snapshot().hitEvents[0];
        expect(event.moveId).toBe(attack.id);
        expect(event.outcome).toBe((attack.hitLevel==='low' && guard.direction==='B') || (attack.overhead && guard.direction==='DB') ? 'hit' : 'block');
        expect(sim.snapshot().characters[player].crouching).toBe(true);
      }
    }
  });

  it.each([0,1])('supports both throws against guard, but not at range or in the air for player %i', player => {
    for(const attack of shoto.moves.filter(m => m.category==='throw')) {
      const sim=create(48);command(sim,attack,player);untilContact(sim,player,input('B'));
      expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:attack.id,outcome:'hit',damage:attack.damage});
      const far=create(150);command(far,attack,player);wait(far);expect(far.snapshot().recentContacts).toHaveLength(0);
      const air=create(48);step(air,input('U'),1-player);command(air,attack,player);wait(air);expect(air.snapshot().recentContacts).toHaveLength(0);
    }
  });

  it('merges a chord within three frames without committing its first single attack', () => {
    const sim=create();step(sim,input('N',['1']));step(sim,input('N',['1','2']));
    expect(sim.snapshot().characters[0].attack?.moveId).toBe('power-punch');
    untilContact(sim);expect(sim.snapshot().recentContacts.map(c=>c.event.moveId)).toEqual(['power-punch']);
  });

  it.each([0,1])('creates independently travelling fast/slow wine projectiles for player %i', player => {
    for(const id of ['tomato-light','tomato-heavy']) {
      const sim=create(300), attack=move(id);command(sim,attack,player);
      expect(sim.snapshot().characters[player].attack?.moveId).toBe(id);
      wait(sim,attack.startup);
      expect(sim.snapshot().projectiles).toHaveLength(1);
      const projectile=sim.snapshot().projectiles[0];
      expect(Math.abs(projectile.velocity)).toBe(attack.projectile!.speed);
      untilContact(sim,player);expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:id,damage:attack.damage});
      expect(sim.snapshot().projectiles).toHaveLength(0);
      const blocked=create(300);command(blocked,attack,player);untilContact(blocked,player,input('B'));
      expect(blocked.snapshot().hitEvents[0].outcome).toBe('block');
    }
  });

  it.each([0,1])('keeps single reversal kicks without the removed aerial extension for player %i', player => {
    for (const id of ['reversal-light','reversal-kick']) {
      const sim=create(56);command(sim,move(id),player);untilContact(sim,player);
      step(sim,input('N',['4']),player);wait(sim,CONTACT_HITSTOP_FRAMES+1);
      expect(sim.snapshot().characters[player].attack?.moveId).toBe(id);
      expect(sim.snapshot().recentContacts.map(e=>e.event.moveId)).toEqual([id]);
    }
    expect(shoto.moves.some(m=>m.id==='reversal-followup')).toBe(false);
  });

  it('builds rage on real contacts, requires a full bar and consumes it on ultimate startup', () => {
    const fastCharge={...shoto,rage:{...shoto.rage!,onHit:300}};
    const noRage=create(300);command(noRage,move('crow-ultimate'));
    expect(noRage.snapshot().characters[0].attack).toBeUndefined();
    const sim=create(56,fastCharge);command(sim,move('light-punch'));untilContact(sim);
    expect(sim.snapshot().characters.map(c=>c.rage)).toEqual([300,15]);wait(sim);
    command(sim,move('crow-ultimate'));
    expect(sim.snapshot().characters[0]).toMatchObject({rage:0,attack:{moveId:'crow-ultimate'}});
    untilContact(sim);expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:'crow-ultimate',outcome:'hit'});
    expect(sim.snapshot().hitEvents[0].damage).toBeGreaterThan(0);
    expect(sim.snapshot().characters[0].rage).toBe(0);
    sim.resetMatch();expect(sim.snapshot().projectiles).toHaveLength(0);expect(sim.snapshot().characters.map(c=>c.rage)).toEqual([0,0]);
  });

  it('keeps resource gains local to fighters that declare a rage system', () => {
    const bare={...shoto,id:'other',rage:undefined,combos:[],moves:shoto.moves.filter(m=>m.category==='basic')};
    const sim=create(56,bare);command(sim,move('light-punch'));untilContact(sim);
    expect(sim.snapshot().characters.map(c=>[c.rage,c.maxRage])).toEqual([[0,0],[0,0]]);
  });
  it('reversal ignores a real incoming melee attack while ordinary aerial kick remains vulnerable', () => {
    for(const id of ['reversal-kick','reversal-light']) {
      const sim=create(56);step(sim,input('N',['1']),1);
      command(sim,move(id));
      for(let i=0;i<10;i++)step(sim);
      expect(sim.snapshot().characters[0].health).toBe(id==='reversal-kick'?1000:980);
    }
  });

  it.each([0, 1])('chutes especiais sobem e permanecem no ar durante a maior parte da recuperação: jogador %i', player => {
    for (const id of ['reversal-light', 'reversal-kick']) {
      const sim = create(400);
      const special = move(id);
      command(sim, special, player);
      const floor = config.arena.floorY;
      let highest = floor;
      let landedAt = 0;
      for (let frame = 1; frame <= 80; frame++) {
        step(sim, N, player);
        const state = sim.snapshot().characters[player];
        highest = Math.min(highest, state.y);
        if (state.grounded) { landedAt = frame; break; }
      }
      expect(floor - highest).toBeGreaterThan(90);
      expect(landedAt).toBeGreaterThan(special.startup + special.activeFrames + special.recovery - 8);
    }
  });

  it.each([0, 1])('permits the airborne follow-up only after the light flying kick for player %i', player => {
    for (const id of ['flying-kick-light', 'flying-kick-heavy']) {
      const sim = create(400);
      const starter = move(id);
      command(sim, starter, player);
      expect(sim.snapshot().characters[player]).toMatchObject({ grounded: false, attack: { moveId: id } });
      wait(sim, starter.startup + 1, player);
      expect(sim.snapshot().characters[player].grounded).toBe(false);
      step(sim, input('N', ['3']), player);
      expect(sim.snapshot().characters[player].attack?.moveId).toBe(id === 'flying-kick-light' ? 'flying-kick-followup' : id);
    }
  });

  it.each([0, 1])('accepts the light flying follow-up after a connected kick for player %i', player => {
    const sim = create(56);
    command(sim, move('flying-kick-light'), player);
    untilContact(sim, player);
    step(sim, input('N', ['3']), player);
    wait(sim, CONTACT_HITSTOP_FRAMES + 2, player);
    expect(sim.snapshot().characters[player].attack?.moveId).toBe('flying-kick-followup');
  });

  it.each([0, 1])('permite continuar após voadoras conectadas, jogador %i', player => {
    for (const id of ['flying-kick-light', 'flying-kick-heavy']) {
      const sim = create(56);
      command(sim, move(id), player);
      untilContact(sim, player);
      expect(sim.snapshot().hitEvents[0].outcome).toBe('hit');
      step(sim, input('N', ['1']), player);
      wait(sim, CONTACT_HITSTOP_FRAMES + 2, player);
      expect(sim.snapshot().characters[player].attack?.moveId).toBe('air-light-punch');
    }
  });

  it('a projectile contact triggers hitstop independently of the round clock and resets with the match', () => {
    const sim=new Simulation(config,undefined,{initialDistance:300});
    command(sim,move('tomato-light'));untilContact(sim);
    const contact=sim.snapshot();expect(contact.hitstopFramesRemaining).toBe(CONTACT_HITSTOP_FRAMES);
    step(sim);expect(sim.snapshot().frame).toBe(contact.frame);
    expect(sim.snapshot().roundFramesRemaining).toBe(contact.roundFramesRemaining-1);
    sim.resetMatch();expect(sim.snapshot().projectiles).toEqual([]);
  });

  it('fills rage only in training and gains nothing on whiff', () => {
    const fight=new Simulation(config);fight.fillTrainingRage();
    expect(fight.snapshot().characters.map(c=>c.rage)).toEqual([0,0]);
    const practice=create();practice.fillTrainingRage();
    expect(practice.snapshot().characters.map(c=>c.rage)).toEqual([900,900]);
    const miss=create(350);command(miss,move('heavy-punch'));wait(miss);
    expect(miss.snapshot().characters.map(c=>c.rage)).toEqual([0,0]);
    const blocked=create();command(blocked,move('light-punch'));untilContact(blocked,0,input('B'));
    expect(blocked.snapshot().characters.map(c=>c.rage)).toEqual([0,5]);
  });

  it('crouching uppercut reaches an airborne opponent', () => {
    const sim=create(56);step(sim,input('U'),1);command(sim,move('crouch-uppercut'));untilContact(sim);
    expect(sim.snapshot().hitEvents[0].moveId).toBe('crouch-uppercut');
    expect(sim.snapshot().characters[1].grounded).toBe(false);
  });

  it('projectile continues after its owner is interrupted, then expires without contact', () => {
    const sim=create(56);command(sim,move('tomato-heavy'));
    // Time a reversal to interrupt after bottle release while its invulnerability avoids contact.
    wait(sim,move('tomato-heavy').startup-7);command(sim,move('reversal-kick'),1);
    untilContact(sim,1);
    expect(sim.snapshot().characters[0].mode).toBe('hitstun');
    expect(sim.snapshot().projectiles.some(p=>p.ownerId==='player-1')).toBe(true);
    wait(sim,220);expect(sim.snapshot().projectiles).toHaveLength(0);
  });

  it('rake ultimate leaves Bob with frame advantage after its knockdown, so he cannot be punished', () => {
    const sim=create(56);sim.fillTrainingRage();command(sim,move('rake-ultimate'));
    let last;
    for(let i=0;i<400&&!last;i++){step(sim);last=sim.snapshot().hitEvents.find(event=>event.volleyStep===move('rake-ultimate').multiHit!.hits-1);}
    expect(last?.frameAdvantage).toBeGreaterThanOrEqual(10);
  });

  it('rake ultimate damages shortly after its activation ends, but cannot reach a distant target', () => {
    const close=create(56);close.fillTrainingRage();command(close,move('rake-ultimate'));
    let activationEnd=-1, firstHit=-1;
    for(let i=0;i<400&&firstHit<0;i++){step(close);const snapshot=close.snapshot();
      if(activationEnd<0&&!snapshot.ultimateActivation)activationEnd=i;
      if(snapshot.hitEvents.some(event=>event.moveId==='rake-ultimate'))firstHit=i;}
    expect(firstHit-activationEnd).toBeGreaterThanOrEqual(6);
    expect(firstHit-activationEnd).toBeLessThanOrEqual(9);
    const far=create(300);far.fillTrainingRage();command(far,move('rake-ultimate'));
    let contacts=0;
    for(let i=0;i<400;i++){step(far);contacts+=far.snapshot().hitEvents.length;}
    expect(contacts).toBe(0);
  });

  it('rake ultimate hits the target in place, then its last hit knocks it down and sends it a short way', () => {
    const sim=create(56);sim.fillTrainingRage();command(sim,move('rake-ultimate'));
    untilContact(sim);
    let hitstunSeen=false;
    for(let i=0;i<200&&sim.snapshot().characters[1].mode!=='knockdown';i++){step(sim);hitstunSeen||=sim.snapshot().characters[1].mode==='hitstun';}
    const knockedX=sim.snapshot().characters[1].x;
    wait(sim,16);
    const target=sim.snapshot().characters[1];
    expect(hitstunSeen).toBe(true);
    expect(target.mode).toBe('knockdown');
    expect(target.x-knockedX).toBeGreaterThan(15);
    expect(target.x-knockedX).toBeLessThan(60);
  });

  it.each(['flying-kick-light','flying-kick-heavy'])('%s leaves Bob invulnerable until the kick ends', id => {
    const kick=move(id);
    expect(kick.invulnerability).toEqual({kind:'all',until:kick.movement!.until});
    const sim=create(120);command(sim,kick);wait(sim,kick.startup+2);
    command(sim,move('light-punch'),1);untilContactOrIdle(sim);
    expect(sim.snapshot().characters[0].mode).not.toBe('hitstun');
  });

  it.each([0,1])('gates ultimate and respects guard on either side for player %i', player => {
    const sim=create(200);sim.fillTrainingRage();command(sim,move('crow-ultimate'),player);
    expect(sim.snapshot().characters[player].rage).toBe(600);
    untilContact(sim,player,input('DB'));
    expect(sim.snapshot().hitEvents[0]).toMatchObject({moveId:'crow-ultimate',outcome:'block',damage:0});
  });

  it('chutes agachados alcançam só até onde o pé chega no desenho', () => {
    // Ponta do pé no quadro de maior extensão: (pixel − 512) × 182/512 à frente do centro, e altura acima do chão.
    for (const [id, tip, top] of [['crouch-light-kick', 86, 34], ['crouch-heavy-kick', 118, 15]] as const) {
      const { hitbox } = shoto.moves.find(move => move.id === id)!;
      expect(hitbox.forward + hitbox.width, id).toBeGreaterThanOrEqual(tip);
      expect(hitbox.forward + hitbox.width, id).toBeLessThanOrEqual(tip + 4);
      expect(-hitbox.yOffset, id).toBeGreaterThanOrEqual(top);
    }
  });
  it.each(['tomato-light', 'tomato-heavy'])('%s bloqueado de perto é punido e a distância não pode ser repetido em sequência', id => {
    const throwBlocked = (distance: number) => {
      const sim = create(distance), back = input('B');
      for (const direction of ['D', 'DF'] as const) sim.stepFrame([input(direction), back]);
      sim.stepFrame([input('F', [move(id).input.buttons[0]]), back]);
      let blocked = false;
      for (let i = 0; i < 200 && (!blocked || sim.snapshot().hitstopFramesRemaining || sim.snapshot().characters[1].mode === 'blockstun'); i++) {
        sim.stepFrame([N, back]);
        blocked ||= sim.snapshot().hitEvents.some(event => event.outcome === 'block');
      }
      expect(blocked).toBe(true);
      return sim;
    };
    const close = throwBlocked(90);
    expect(close.snapshot().characters[0].attack).toBeDefined();
    close.stepFrame([N, input('N', ['1'])]);
    for (let i = 0; i < 30; i++) close.stepFrame([N, N]);
    expect(close.snapshot().characters[0].health).toBeLessThan(1000);
    // Mesmo bloqueado a meia tela, o Bob ainda se recupera depois do adversário: não dá para encadear tomates seguros de longe.
    const far = throwBlocked(220);
    expect(far.snapshot().characters[0].attack).toBeDefined();
    expect(move(id).startup + move(id).activeFrames + move(id).recovery).toBeGreaterThanOrEqual(66);
  });
  it('rake ultimate ends with the victim lying on the ground and Bob recovered before it can act', () => {
    const sim=create(56);sim.fillTrainingRage();command(sim,move('rake-ultimate'));
    let last;
    for(let i=0;i<400&&!last;i++){step(sim);last=sim.snapshot().hitEvents.find(event=>event.volleyStep===move('rake-ultimate').multiHit!.hits-1);}
    expect(move('rake-ultimate').recovery).toBeGreaterThan(8);
    for(let i=0;i<10;i++)step(sim);
    expect(sim.snapshot().characters[1]).toMatchObject({mode:'knockdown'});
    expect(last?.defenderStunFrames).toBeGreaterThanOrEqual(36);
  });

  it('crouching light kick recovers faster than before', () => {
    expect(move('crouch-light-kick').recovery).toBeLessThan(18);
  });
});
