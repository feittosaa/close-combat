import { expect, it, vi } from 'vitest';
import { StagePresentation } from '../rendering/StagePresentation';
import { Simulation } from '../engine/simulation/Simulation';
import { createGameConfig } from '../engine/data/gameConfig';
import { defaultCharacter } from '../engine/data/characters';

it('excludes effects created after the presentation update from the dimmer camera', () => {
  const object = () => {
    const value = { setName: vi.fn(), setOrigin: vi.fn(), setScrollFactor: vi.fn(), setDepth: vi.fn(), setVisible: vi.fn(), destroy: vi.fn() };
    Object.values(value).forEach(method => method.mockReturnValue(value));
    return value;
  };
  const title = object(), dimmer = object(), effect = object();
  const camera = { setViewport: vi.fn(), ignore: vi.fn() };
  const scene = { add: { image: () => title, rectangle: () => dimmer }, cameras: { add: () => camera, remove: vi.fn() },
    scale: { width: 1920, height: 1080 }, children: { list: [title, dimmer] } };
  const presentation = new StagePresentation(scene as never, 'saloon');
  scene.children.list.push(effect);
  presentation.syncCamera();
  expect(camera.ignore).toHaveBeenCalledWith([title, effect]);
  presentation.destroy();
});

it.each(['saloon', 'fazenda', 'sala-treino'])('uses the %s presentations for intros and results', theme => {
  const makeObject = () => {
    const object = { width:1000, height:400, setName:vi.fn(), setOrigin:vi.fn(), setScrollFactor:vi.fn(), setDepth:vi.fn(), setVisible:vi.fn(),
      setTexture:vi.fn(), setPosition:vi.fn(), setDisplaySize:vi.fn(), setAlpha:vi.fn(), setSize:vi.fn(), destroy:vi.fn() };
    Object.values(object).forEach(value => { if (typeof value === 'function') value.mockReturnValue(object); });
    return object;
  };
  const title = makeObject(), dimmer = makeObject();
  const scene = { add: { image:()=>title, rectangle:()=>dimmer }, cameras:{add:()=>({setViewport:vi.fn(),ignore:vi.fn()}),remove:vi.fn()},
    scale:{width:1920,height:1080}, children:{list:[title,dimmer]} };
  const presentation = new StagePresentation(scene as never, theme);
  const snapshot = new Simulation(createGameConfig(1024,576)).snapshot();
  expect(presentation.update(snapshot, 100, 1024)).toBe(true);
  expect(title.setTexture).toHaveBeenLastCalledWith(`presentation:${theme}:ready`);
  presentation.update(snapshot, 1000, 1024);
  expect(title.setTexture).toHaveBeenLastCalledWith(`presentation:${theme}:fight`);
  presentation.update(snapshot, 400, 1024); presentation.update(snapshot, 16, 1024);
  snapshot.phase = 'round-over'; snapshot.roundWinnerId = snapshot.characters[0].characterId; snapshot.roundEndedFrame = 1; snapshot.frame = 20;
  presentation.update(snapshot, 16, 1024);
  expect(title.setTexture).toHaveBeenLastCalledWith(`presentation:${theme}:round-win`);
  snapshot.roundWinnerId = snapshot.characters[1].characterId;
  presentation.update(snapshot, 16, 1024);
  expect(title.setTexture).toHaveBeenLastCalledWith(`presentation:${theme}:round-lose`);
  snapshot.roundEndReason = 'time';
  presentation.update(snapshot, 16, 1024);
  expect(title.setTexture).toHaveBeenLastCalledWith(`presentation:${theme}:timeout`);
  snapshot.frame = 80; presentation.update(snapshot, 16, 1024);
  expect(title.setTexture).toHaveBeenLastCalledWith(`presentation:${theme}:round-lose`);
  snapshot.roundWins = [0, 2]; snapshot.roundEndReason = 'knockout';
  presentation.update(snapshot, 16, 1024);
  expect(title.setTexture).toHaveBeenLastCalledWith(`presentation:${theme}:lose`);
  snapshot.roundWins = [2, 0]; snapshot.roundWinnerId = snapshot.characters[0].characterId;
  presentation.update(snapshot, 16, 1024);
  expect(title.setTexture).toHaveBeenLastCalledWith(`presentation:${theme}:victory`);
  presentation.destroy();
});

it('shows the final result at full opacity over a 20% dimmer before the victory pose begins', () => {
  const makeObject = () => {
    const object = {width:1000,height:400,setName:vi.fn(),setOrigin:vi.fn(),setScrollFactor:vi.fn(),setDepth:vi.fn(),setVisible:vi.fn(),
      setTexture:vi.fn(),setPosition:vi.fn(),setDisplaySize:vi.fn(),setAlpha:vi.fn(),setSize:vi.fn(),destroy:vi.fn()};
    Object.values(object).forEach(value => { if (typeof value === 'function') value.mockReturnValue(object); });
    return object;
  };
  const title = makeObject(), dimmer = makeObject();
  const scene = {add:{image:()=>title,rectangle:()=>dimmer},cameras:{add:()=>({setViewport:vi.fn(),ignore:vi.fn()}),remove:vi.fn()},
    scale:{width:1920,height:1080},children:{list:[title,dimmer]}};
  const presentation = new StagePresentation(scene as never, 'sala-treino');
  const snapshot = new Simulation(createGameConfig(1024,576)).snapshot();
  snapshot.phase = 'round-over'; snapshot.roundWinnerId = snapshot.characters[1].characterId;
  snapshot.roundWins = [0,2]; snapshot.roundEndedFrame = 100; snapshot.frame = 120;
  presentation.update(snapshot, 16, 1024);
  expect(title.setTexture).toHaveBeenLastCalledWith('presentation:sala-treino:lose');
  expect(title.setAlpha).toHaveBeenLastCalledWith(1);
  expect(dimmer.setAlpha).toHaveBeenLastCalledWith(.2);
  expect(title.setDepth).toHaveBeenCalledWith(130);
  expect(dimmer.setDepth).toHaveBeenCalledWith(129);
  snapshot.frame = 260;
  presentation.update(snapshot, 16, 1024);
  expect(title.setVisible).toHaveBeenLastCalledWith(false);
  expect(dimmer.setVisible).toHaveBeenLastCalledWith(false);
  presentation.destroy();
});

it('waits one second after the next round resets before displaying ready', () => {
  const object = () => {
    const value = {width:1000,height:400,setName:vi.fn(),setOrigin:vi.fn(),setScrollFactor:vi.fn(),setDepth:vi.fn(),setVisible:vi.fn(),
      setTexture:vi.fn(),setPosition:vi.fn(),setDisplaySize:vi.fn(),setAlpha:vi.fn(),setSize:vi.fn(),destroy:vi.fn()};
    Object.values(value).forEach(method => { if (typeof method === 'function') method.mockReturnValue(value); });
    return value;
  };
  const title = object(), dimmer = object();
  const scene = {add:{image:()=>title,rectangle:()=>dimmer},cameras:{add:()=>({setViewport:vi.fn(),ignore:vi.fn()}),remove:vi.fn()},
    scale:{width:1920,height:1080},children:{list:[title,dimmer]}};
  const presentation = new StagePresentation(scene as never, 'saloon');
  const snapshot = new Simulation(createGameConfig(1024,576)).snapshot();
  presentation.update(snapshot, 1400, 1024);
  snapshot.round = 2;
  expect(presentation.update(snapshot, 500, 1024)).toBe(true);
  expect(title.setVisible).toHaveBeenLastCalledWith(false);
  expect(presentation.update(snapshot, 499, 1024)).toBe(true);
  expect(title.setVisible).toHaveBeenLastCalledWith(false);
  presentation.update(snapshot, 1, 1024);
  expect(title.setTexture).toHaveBeenLastCalledWith('presentation:saloon:ready');
  presentation.destroy();
});

it.each(['saloon', 'fazenda', 'sala-treino'])('follows real timeout results through both rounds in %s', theme => {
  const object = () => {
    const value = { width: 1000, height: 400, setName: vi.fn(), setOrigin: vi.fn(), setScrollFactor: vi.fn(), setDepth: vi.fn(),
      setVisible: vi.fn(), setTexture: vi.fn(), setPosition: vi.fn(), setDisplaySize: vi.fn(), setAlpha: vi.fn(), setSize: vi.fn(), destroy: vi.fn() };
    Object.values(value).forEach(method => { if (typeof method === 'function') method.mockReturnValue(value); });
    return value;
  };
  const title = object(), dimmer = object();
  const scene = { add: { image: () => title, rectangle: () => dimmer }, cameras: { add: () => ({ setViewport: vi.fn(), ignore: vi.fn() }), remove: vi.fn() },
    scale: { width: 1920, height: 1080 }, children: { list: [title, dimmer] } };
  const config = createGameConfig(1024, 576);
  const simulation = new Simulation({ ...config, match: { ...config.match, roundDurationFrames: 1 } },
    [defaultCharacter, { ...defaultCharacter, maxHealth: defaultCharacter.maxHealth - 100 }]);
  const presentation = new StagePresentation(scene as never, theme);
  const neutral = { direction: 'N' as const, buttons: new Set<never>() };
  for (let round = 1; round <= 2; round++) {
    presentation.update(simulation.snapshot(), 1400, 1024);
    simulation.stepFrame([neutral, neutral]);
    expect(simulation.snapshot()).toMatchObject({ round, phase: 'round-over', roundEndReason: 'time', roundWinnerId: 'player-1' });
    for (let age = 1; age <= 80; age++) {
      simulation.stepFrame([neutral, neutral]);
      presentation.update(simulation.snapshot(), 1000 / 60, 1024);
      if (age === 20) expect(title.setTexture).toHaveBeenLastCalledWith(`presentation:${theme}:timeout`);
      if (age === 80) expect(title.setTexture).toHaveBeenLastCalledWith(`presentation:${theme}:${round === 1 ? 'round-win' : 'victory'}`);
    }
    while (simulation.snapshot().phase === 'round-over') simulation.stepFrame([neutral, neutral]);
  }
  expect(simulation.snapshot()).toMatchObject({ phase: 'match-over', matchWinnerId: 'player-1' });
  presentation.destroy();
});
