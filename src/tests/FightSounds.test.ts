import { afterEach, expect, it, vi } from 'vitest';
import { FightSounds, selectSoundVariant } from '../audio/FightSounds';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { cowboy } from '../engine/data/fighters/cowboy';
import { shoto } from '../engine/data/fighters/shoto';
import type { FrameInput } from '../input/types';

afterEach(() => vi.restoreAllMocks());

it('announces the round, dashes, full rage, and final result only once per event', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const play = vi.fn();
  const sounds = new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never);
  const snapshot = new Simulation(createGameConfig(1024,576)).snapshot();
  sounds.prepareRound(snapshot); sounds.prepareRound(snapshot);
  expect(play.mock.calls.filter(call => call[0] === 'sfx-round_start')).toHaveLength(1);
  snapshot.characters[0].mode = 'dashing'; snapshot.characters[0].grounded = true;
  snapshot.characters[0].rage = snapshot.characters[0].maxRage;
  sounds.observe(snapshot); sounds.observe(snapshot);
  expect(play.mock.calls.filter(call => call[0] === 'sfx-dash_1')).toHaveLength(0);
  snapshot.characters[0].mode = 'airborne'; sounds.observe(snapshot);
  snapshot.characters[0].mode = 'dashing'; snapshot.characters[0].grounded = false; sounds.observe(snapshot);
  expect(play).toHaveBeenCalledWith('sfx-air_dash_1', {volume:.2,seek:.135});
  expect(play.mock.calls.filter(call => call[0] === 'sfx-ultimate_ready')).toHaveLength(1);
  snapshot.phase = 'round-over'; snapshot.roundWinnerId = 'player-1'; snapshot.roundWins = [2,0];
  sounds.observe(snapshot); snapshot.elapsedFrames += 160; sounds.observe(snapshot); sounds.observe(snapshot);
  expect(play.mock.calls.filter(call => call[0] === 'sfx-victory')).toHaveLength(1);
});

it('uses heavy footsteps only for Grappler and plays each step once per interval', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const play = vi.fn();
  const sounds = new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never, true);
  const snapshot = new Simulation(createGameConfig(1024,576)).snapshot();
  snapshot.characters[0].fighterId = 'grappler';
  snapshot.characters[0].mode = 'moving'; snapshot.characters[1].mode = 'moving';
  sounds.observe(snapshot); sounds.observe(snapshot);
  expect(play.mock.calls.map(call => call[0])).toEqual(['sfx-heavy_step_1', 'sfx-steps_1']);
  expect(play).toHaveBeenCalledWith('sfx-heavy_step_1', {volume:.2, seek:.205});
  expect(play).toHaveBeenCalledWith('sfx-steps_1', {volume:.2,seek:.045});
  snapshot.frame += 20; sounds.observe(snapshot);
  expect(play.mock.calls.map(call => call[0])).toEqual(['sfx-heavy_step_1', 'sfx-steps_1', 'sfx-heavy_step_1', 'sfx-steps_1']);
});

it('plays one explosion sound when dynamite expires without a hit', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const play = vi.fn();
  const sounds = new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never, true);
  const snapshot = new Simulation(createGameConfig(1024,576)).snapshot();
  sounds.observe(snapshot);
  snapshot.explosions = [{x:100, y:100, kind:'dynamite', id:42, remainingFrames:12}];
  sounds.observe(snapshot); sounds.observe(snapshot);
  expect(play.mock.calls.filter(call => call[0] === 'sfx-magic_explosion_1')).toHaveLength(1);
});

it('plays the arcade loss only when the player loses the match', () => {
  const play = vi.fn();
  const sounds = new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never, true, true);
  const snapshot = new Simulation(createGameConfig(1024,576)).snapshot();
  snapshot.phase = 'match-over'; snapshot.matchWinnerId = 'player-2';
  sounds.observe(snapshot); sounds.observe(snapshot);
  expect(play.mock.calls.filter(call => call[0] === 'sfx-lose_arcade_mode')).toHaveLength(1);
});

it('selects variants with the requested weights, normalized for fewer files', () => {
  expect([.01,.51,.76,.91].map(value => selectSoundVariant(4,value))).toEqual([1,2,3,4]);
  expect([.65,.68].map(value => selectSoundVariant(2,value))).toEqual([1,2]);
  expect([.49,.50,.75,.90,.95].map(value => selectSoundVariant(5,value))).toEqual([1,2,3,4,5]);
});

it('plays lasso and landing sounds once at their corresponding transitions', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const play = vi.fn();
  const sounds = new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never);
  const sim = new Simulation(createGameConfig(1024,576),[cowboy,shoto],{training:true,initialDistance:65});
  const neutral: FrameInput = {direction:'N',buttons:new Set()};
  sim.stepFrame([{direction:'N',buttons:new Set(['1','3'])},neutral]); sounds.observe(sim.snapshot());
  for(let tick=0; tick<150; tick++) { sim.stepFrame([neutral,neutral]); sounds.observe(sim.snapshot()); }
  expect(play.mock.calls.filter(call=>call[0]==='sfx-lace_draw')).toHaveLength(1);
  expect(play.mock.calls.filter(call=>call[0]==='sfx-lace_catch')).toHaveLength(1);
  expect(play.mock.calls.filter(call=>call[0]==='sfx-grab_1')).toHaveLength(1);
  expect(play.mock.calls.filter(call=>call[0]==='sfx-throw_1')).toHaveLength(1);
  expect(play.mock.calls.filter(call=>call[0]==='sfx-landing_1')).toHaveLength(1);
});

it('plays the missed lasso sound as soon as the active frames end', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const play = vi.fn();
  const sounds = new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never, true);
  const sim = new Simulation(createGameConfig(1024,576),[cowboy,shoto],{training:true,initialDistance:400});
  const neutral: FrameInput = {direction:'N',buttons:new Set()};
  sim.stepFrame([{direction:'N',buttons:new Set(['1','3'])},neutral]); sounds.observe(sim.snapshot());
  for (let i=0; i<100 && !play.mock.calls.some(call => call[0] === 'sfx-lace_error'); i++) {
    sim.stepFrame([neutral,neutral]); sounds.observe(sim.snapshot());
  }
  expect(sim.snapshot().characters[0].attack?.moveId).toBe('throw-13');
  expect(play).toHaveBeenCalledWith('sfx-lace_error', {volume:1, seek:.415});
  for (let i=0; i<80; i++) { sim.stepFrame([neutral,neutral]); sounds.observe(sim.snapshot()); }
  expect(play.mock.calls.filter(call => call[0] === 'sfx-lace_error')).toHaveLength(1);
});

it('plays a heavy step once at the Cowboy stomp and when her ground dash finishes', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const play = vi.fn();
  const sounds = new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never, true);
  const sim = new Simulation(createGameConfig(1024,576),[cowboy,shoto],{training:true,initialDistance:300});
  const neutral: FrameInput = {direction:'N',buttons:new Set()};
  sim.stepFrame([{direction:'N',buttons:new Set(['3'])},neutral]); sounds.observe(sim.snapshot());
  for (let i=0; i<40; i++) { sim.stepFrame([neutral,neutral]); sounds.observe(sim.snapshot()); }
  expect(play.mock.calls.filter(call => call[0] === 'sfx-heavy_step_1')).toHaveLength(1);
  const snapshot = sim.snapshot();
  snapshot.characters[0].mode = 'dashing'; sounds.observe(snapshot);
  snapshot.characters[0].mode = 'neutral'; sounds.observe(snapshot); sounds.observe(snapshot);
  expect(play.mock.calls.filter(call => call[0] === 'sfx-heavy_step_1')).toHaveLength(2);
});

it.each([[.1, 'landing_1', .275], [.6, 'landing_2', .386], [.85, 'landing_3', .510], [.92, 'landing_4', .405], [.97, 'landing_5', .989]] as const)(
  'aligns landing variant %s to its measured impact', (random, name, seek) => {
    vi.spyOn(Math, 'random').mockReturnValue(random);
    const play = vi.fn();
    const sounds = new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never, true);
    const snapshot = new Simulation(createGameConfig(1024,576)).snapshot();
    snapshot.characters[0].grounded = false; sounds.observe(snapshot);
    snapshot.characters[0].grounded = true; sounds.observe(snapshot); sounds.observe(snapshot);
    expect(play).toHaveBeenCalledOnce();
    expect(play).toHaveBeenCalledWith(`sfx-${name}`, {volume:1, seek});
  },
);

it('plays taunt, ultimate and round cues once, with the victory cue delayed', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const play = vi.fn();
  const sounds = new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never);
  const sim = new Simulation(createGameConfig(1024,576),[cowboy,shoto],{training:true});
  const snapshot = sim.snapshot();
  snapshot.characters[0].tauntStartedFrame = 1;
  sounds.observe(snapshot); sounds.observe(snapshot);
  expect(play.mock.calls.filter(call=>call[0]==='sfx-pistol_draw')).toHaveLength(0);
  snapshot.elapsedFrames=41; sounds.observe(snapshot);
  expect(play.mock.calls.filter(call=>call[0]==='sfx-pistol_draw')).toHaveLength(0);
  snapshot.elapsedFrames=42; sounds.observe(snapshot);
  expect(play.mock.calls.filter(call=>call[0]==='sfx-pistol_draw')).toHaveLength(1);
  snapshot.ultimateActivation = {ownerIds:['player-1'],elapsedFrames:0,remainingFrames:149};
  sounds.observe(snapshot); sounds.observe(snapshot);
  expect(play.mock.calls.filter(call=>call[0]==='sfx-ultimate_activation')).toHaveLength(1);
  expect(play.mock.calls.filter(call=>call[0]==='sfx-pistol_draw')).toHaveLength(1);
  snapshot.elapsedFrames=84; sounds.observe(snapshot);
  expect(play.mock.calls.filter(call=>call[0]==='sfx-pistol_draw')).toHaveLength(2);
  snapshot.phase='round-over'; snapshot.roundEndReason='knockout'; snapshot.roundWinnerId='player-1'; snapshot.elapsedFrames=100;
  sounds.observe(snapshot); sounds.observe(snapshot);
  expect(play.mock.calls.some(call=>call[0]==='sfx-knockout_lose')).toBe(false);
  expect(play.mock.calls.filter(call=>call[0]==='sfx-round_win')).toHaveLength(0);
  snapshot.elapsedFrames=145; sounds.observe(snapshot); sounds.observe(snapshot);
  expect(play.mock.calls.filter(call=>call[0]==='sfx-round_win')).toHaveLength(1);
});

it('plays both ultimate cues and delayed draws when both fighters activate together', () => {
  const play = vi.fn();
  const sounds = new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never, true);
  const sim = new Simulation(createGameConfig(1024,576),[cowboy,cowboy],{training:true});
  sim.fillTrainingRage();
  const ultimate = {direction:'N' as const,buttons:new Set<'1'>(),ultimate:true};
  const neutral = {direction:'N' as const,buttons:new Set<'1'>()};
  sim.stepFrame([ultimate,ultimate]);
  expect(sim.snapshot().ultimateActivation?.ownerIds).toEqual(['player-1','player-2']);
  sounds.observe(sim.snapshot()); sounds.observe(sim.snapshot());
  expect(play.mock.calls.filter(call=>call[0]==='sfx-ultimate_activation')).toHaveLength(2);
  for (let i=0;i<42;i++) { sim.stepFrame([neutral,neutral]); sounds.observe(sim.snapshot()); }
  expect(play.mock.calls.filter(call=>call[0]==='sfx-pistol_draw')).toHaveLength(2);
});

it('plays the same arms, draw and shot cues for each fighter when both ultimates run together', () => {
  const play = vi.fn();
  const sounds = new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never, true);
  const sim = new Simulation(createGameConfig(1024,576),[cowboy,cowboy],{training:true,initialDistance:200});
  sim.fillTrainingRage();
  const ultimate = {direction:'N' as const,buttons:new Set<'1'>(),ultimate:true};
  const neutral = {direction:'N' as const,buttons:new Set<'1'>()};
  sim.stepFrame([ultimate,ultimate]);
  for (let i=0;i<500;i++) { sim.stepFrame([neutral,neutral]); sounds.observe(sim.snapshot()); }
  const count = (prefix:string) => play.mock.calls.filter(call=>String(call[0]).startsWith(prefix)).length;
  expect(count('sfx-pistol_draw')).toBe(2);
  expect(count('sfx-magical_arms')).toBe(2);
  expect(count('sfx-magical_shot') % 2).toBe(0);
});

it('warns at ten seconds once in normal play, but never in training', () => {
  const play = vi.fn();
  const scene = {cache:{audio:{exists:()=>true}},sound:{play}} as never;
  const snapshot = new Simulation(createGameConfig(1024,576)).snapshot();
  const sounds = new FightSounds(scene), training = new FightSounds(scene,true);
  snapshot.roundFramesRemaining = 601; sounds.observe(snapshot);
  expect(play.mock.calls.filter(call=>call[0]==='sfx-urgent_10_seconds_left')).toHaveLength(0);
  snapshot.roundFramesRemaining = 600; sounds.observe(snapshot); sounds.observe(snapshot); training.observe(snapshot);
  expect(play.mock.calls.filter(call=>call[0]==='sfx-urgent_10_seconds_left')).toHaveLength(1);
});

it('uses available light-hit files and the counter and push cues', () => {
  vi.spyOn(Math, 'random').mockReturnValue(.97);
  const play = vi.fn();
  const sounds = new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never);
  const snapshot = new Simulation(createGameConfig(1024,576),[cowboy,shoto]).snapshot();
  const event = {attackerId:'player-1',targetId:'player-2',moveId:'light-punch',damage:20,outcome:'hit' as const,
    pushback:0,attackerRecoveryFrames:0,defenderStunFrames:0,frameAdvantage:0,context:'counter-hit' as const};
  snapshot.hitEvents = [event]; sounds.observe(snapshot);
  expect(play).toHaveBeenCalledWith('sfx-hit_3', {volume:1.15,seek:.045});
  expect(play).toHaveBeenCalledWith('sfx-counter_hit_3', {volume:1,seek:.285});
  snapshot.hitEvents = [{...event,moveId:'push-away',context:undefined}]; sounds.observe(snapshot);
  expect(play).toHaveBeenCalledWith('sfx-push_hit_2', {volume:1,seek:.285});
});

it.each([[.1, 'heavy_hit_1', .295], [.6, 'heavy_hit_2', .022], [.8, 'heavy_hit_3', .606], [.97, 'heavy_hit_4', .4]] as const)(
  'aligns heavy-hit variant %s to its measured impact', (random, name, seek) => {
    vi.spyOn(Math, 'random').mockReturnValue(random);
    const play = vi.fn();
    const sounds = new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never);
    const snapshot = new Simulation(createGameConfig(1024,576),[shoto,shoto]).snapshot();
    snapshot.hitEvents = [{attackerId:'player-1',targetId:'player-2',moveId:'heavy-punch',damage:35,outcome:'hit',
      pushback:0,attackerRecoveryFrames:0,defenderStunFrames:0,frameAdvantage:0}];
    sounds.observe(snapshot);
    expect(play).toHaveBeenCalledWith(`sfx-${name}`, {volume:1.15, ...(seek ? {seek} : {})});
  },
);

it('plays a hit cue even when the training target is already depleted', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const play = vi.fn();
  const sounds = new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never, true);
  const snapshot = new Simulation(createGameConfig(1024,576),[shoto,shoto]).snapshot();
  snapshot.characters[1].health = 0;
  snapshot.hitEvents = [{attackerId:'player-1',targetId:'player-2',moveId:'light-punch',damage:20,outcome:'hit',
    pushback:0,attackerRecoveryFrames:0,defenderStunFrames:0,frameAdvantage:0}];
  sounds.observe(snapshot);
  expect(play).toHaveBeenCalledWith('sfx-hit_1', {volume:1.15});
});

it('cancels a delayed pistol draw if the taunt is interrupted', () => {
  const play = vi.fn();
  const sounds = new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never);
  const snapshot = new Simulation(createGameConfig(1024,576),[cowboy,shoto]).snapshot();
  snapshot.characters[0].tauntStartedFrame = 1; sounds.observe(snapshot);
  snapshot.characters[0].tauntStartedFrame = undefined; snapshot.elapsedFrames = 10; sounds.observe(snapshot);
  snapshot.elapsedFrames = 35; sounds.observe(snapshot);
  expect(play.mock.calls.some(call => call[0] === 'sfx-pistol_draw')).toBe(false);
});

it.each(['hit','block'] as const)('plays magic and %s once per simulation event', outcome => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const play=vi.fn();
  const sounds=new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never);
  const sim=new Simulation(createGameConfig(1024,576),[cowboy,shoto],{training:true,initialDistance:65});
  const neutral:FrameInput={direction:'N',buttons:new Set()};
  const guard:FrameInput={direction:outcome==='block'?'B':'N',buttons:new Set()};
  const attack:FrameInput={direction:'N',buttons:new Set(['1'])};
  sim.stepFrame([attack,guard]);sounds.observe(sim.snapshot());
  for(let i=0;i<80;i++){sim.stepFrame([neutral,guard]);sounds.observe(sim.snapshot());}
  const keys=play.mock.calls.map(call=>call[0]);
  expect(keys.filter(key=>key==='sfx-magical_shot_1')).toHaveLength(1);
  expect(keys.filter(key=>key==='sfx-magical_arms_1')).toHaveLength(1);
  expect(keys.filter(key=>key===`sfx-${outcome}_1`)).toHaveLength(1);
  expect(play).toHaveBeenCalledWith('sfx-magical_shot_1', {volume:.392,seek:.035});
  expect(play).toHaveBeenCalledWith('sfx-magical_arms_1', {volume:.8,seek:.365});
  expect(play).toHaveBeenCalledWith(`sfx-${outcome}_1`, {volume:1.15,...(outcome === 'block' ? {seek:.045} : {})});
  expect(keys.some(key=>key.startsWith('sfx-perfect_block'))).toBe(false);
});

it('plays the three grab shots separately while the defender is captured', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const play = vi.fn();
  const sounds = new FightSounds({cache:{audio:{exists:()=>true}},sound:{play}} as never);
  const sim = new Simulation(createGameConfig(1024,576),[cowboy,shoto],{training:true,initialDistance:65});
  const neutral: FrameInput = {direction:'N',buttons:new Set()};
  sim.stepFrame([{direction:'N',buttons:new Set(['2','4'])},neutral]); sounds.observe(sim.snapshot());
  for (let tick=0;tick<110;tick++) { sim.stepFrame([neutral,neutral]); sounds.observe(sim.snapshot()); }
  expect(play.mock.calls.filter(call => call[0] === 'sfx-magical_shot_1')).toHaveLength(3);
});
