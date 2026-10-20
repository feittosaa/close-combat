// src/scenes/FightScene.ts
import Phaser from 'phaser';
import type { CharacterState } from '../engine/characters/CharacterState';
import testerManifest from '../assets/animations/tester.json';
import testerAtlasUrl from '../assets/sprites/characters/tester/tester-atlas.png';
import { defaultCharacter, getCharacterById } from '../engine/data/characters';
import { createGameConfig } from '../engine/data/gameConfig';
import { Simulation } from '../engine/simulation/Simulation';
import { CommandBuffer } from '../input/CommandBuffer';
import { KeyboardInput } from '../input/KeyboardInput';
import { PLAYER_ONE_KEYS, PLAYER_TWO_KEYS } from '../input/keyboardLayouts';
import type { FrameInput } from '../input/types';
import { CombatantView } from '../rendering/CombatantView';
import { validateAnimationCoverage, validateAnimationManifest } from '../rendering/animations/AnimationPlayback';
import type { CharacterAnimationManifest } from '../rendering/animations/AnimationPlayback';
import { HitboxView } from '../rendering/HitboxView';
import { defaultStage, getStageById } from '../rendering/stages/stageCatalog';
import { createStageLayout } from '../rendering/stages/stageLayout';
import { preloadStage, StageView } from '../rendering/stages/StageView';
import { CombatHud } from '../ui/CombatHud';
import { PlayerInputDisplay } from '../ui/PlayerInputDisplay';
import { TrainingSession } from '../training/TrainingSession';
import { TrainingHud } from '../ui/TrainingHud';

export class FightScene extends Phaser.Scene {
  private selectedFighter = defaultCharacter;
  private selectedManifest: CharacterAnimationManifest = testerManifest;
  private selectedStage = defaultStage;
  private stageView?: StageView;
  private simulation?: Simulation;
  private keyboardInputs: KeyboardInput[] = [];
  private commandBuffers: [CommandBuffer, CommandBuffer] = [new CommandBuffer(), new CommandBuffer()];
  private currentInputs: [FrameInput, FrameInput] = [neutralInput(), neutralInput()];
  private combatants: CombatantView[] = [];
  private inputDisplays: PlayerInputDisplay[] = [];
  private hitboxView?: HitboxView;
  private hud?: CombatHud;
  private training?: TrainingSession;
  private trainingHud?: TrainingHud;
  private readonly trainingListeners = new Map<string, (event: KeyboardEvent) => void>();
  private readonly trainingKeys: ReadonlyArray<readonly [string, () => void]> = [
    ['keydown-P', () => { if (this.training) this.training.paused = !this.training.paused; }],
    ['keydown-PERIOD', () => {
      if (!this.training?.paused || !this.simulation) return;
      const snapshot = this.simulation.snapshot();
      this.simulation.stepFrame(this.readInputs(snapshot.characters, snapshot.frame));
      this.syncViewsAndHud();
    }],
    ['keydown-F2', () => { if (this.training) this.resetFight(); }],
    ['keydown-G', () => { this.training?.cycleDummy(); }],
    ['keydown-H', () => {
      if (!this.training) return;
      this.training.showGeometry = !this.training.showGeometry;
      this.hitboxView?.setVisible(this.training.showGeometry);
    }],
    ['keydown-I', () => {
      if (!this.training) return;
      this.training.showInputs = !this.training.showInputs;
      this.inputDisplays.forEach((display) => display.setVisible(this.training!.showInputs));
    }],
  ];
  private readonly handleEscape = (): void => { this.scene.start('MenuScene'); };
  private readonly handleRestart = (): void => {
    if (!this.simulation?.isMatchOver()) return;
    this.resetFight();
  };

  constructor() {
    super('FightScene');
  }

  init(data: { fighterId?: string; stageId?: string; mode?: 'versus' | 'training' } = {}): void {
    this.selectedFighter = getCharacterById(data.fighterId ?? '') ?? defaultCharacter;
    this.selectedManifest = testerManifest;
    this.selectedStage = getStageById(data.stageId ?? '') ?? defaultStage;
    this.training = data.mode === 'training' ? new TrainingSession() : undefined;
  }

  preload(): void {
    preloadStage(this, this.selectedStage);
    if (this.textures.exists(this.selectedManifest.textureKey)) return;
    this.load.spritesheet(this.selectedManifest.textureKey, testerAtlasUrl, {
      frameWidth: this.selectedManifest.frameSize.width,
      frameHeight: this.selectedManifest.frameSize.height,
    });
  }

  create(): void {
    validateAnimationManifest(this.selectedManifest);
    validateAnimationCoverage(this.selectedManifest, this.selectedFighter.id, this.selectedFighter.moves);

    const { width, height } = this.scale;
    const config = createGameConfig(width, height);
    const stageLayout = createStageLayout(this.selectedStage, width, height, config.arena.floorY);
    // Translate the arena into the stage without changing its playable width.
    config.arena.left += stageLayout.arenaOffsetX;
    config.arena.right += stageLayout.arenaOffsetX;
    this.stageView = new StageView(this, this.selectedStage, stageLayout);
    this.simulation = new Simulation(config, [this.selectedFighter, this.selectedFighter], this.training
      ? { training: true, initialDistance: 96 } : {});
    this.keyboardInputs = [new KeyboardInput(PLAYER_ONE_KEYS), new KeyboardInput(PLAYER_TWO_KEYS)];
    this.commandBuffers = [new CommandBuffer(), new CommandBuffer()];

    this.combatants = [
      new CombatantView(this, config.arena.left, config.arena.floorY, 0xe45b5b, this.selectedManifest.textureKey, this.selectedManifest),
      new CombatantView(this, config.arena.right, config.arena.floorY, 0x5b8de4, this.selectedManifest.textureKey, this.selectedManifest),
    ];
    this.hitboxView = new HitboxView(this);
    this.hitboxView.setVisible(Boolean(this.training));
    this.hud = new CombatHud(this, width, [this.selectedFighter.name, this.selectedFighter.name], this.selectedStage.name, Boolean(this.training));
    this.inputDisplays = [
      new PlayerInputDisplay(this, 18, 78, 'P1 · WASD / J K N M', '#ff8c8c'),
      new PlayerInputDisplay(this, width - 218, 78, 'P2 · SETAS / NUMPAD', '#8cb4ff'),
    ];
    if (this.training) {
      this.trainingHud = new TrainingHud(this, width, height);
      this.trainingKeys.forEach(([key, handler]) => {
        const listener = (event: KeyboardEvent): void => { if (!event.repeat) handler(); };
        this.trainingListeners.set(key, listener);
        this.input.keyboard?.on(key, listener);
      });
      this.input.keyboard?.addCapture(['P', 'PERIOD', 'F2', 'G', 'H', 'I']);
    }

    this.input.keyboard?.on('keydown-ESC', this.handleEscape);
    this.input.keyboard?.on('keydown-R', this.handleRestart);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.syncViewsAndHud();
  }

  update(_time: number, delta: number): void {
    if (!this.simulation) return;

    if (!this.training?.paused) this.simulation.advance(delta, (characters, frame) => this.readInputs(characters, frame));
    this.syncViewsAndHud();
  }

  private readInputs(characters: readonly CharacterState[], frame: number): readonly FrameInput[] {
    const inputs = this.keyboardInputs.map((input, index) => input.read(characters[index]?.facing ?? (index === 0 ? 'right' : 'left')));
    const dummyInput = this.training?.dummyInput(frame, characters);
    if (dummyInput) inputs[1] = dummyInput;
    this.currentInputs = inputs as [FrameInput, FrameInput];
    this.currentInputs.forEach((input, index) => this.commandBuffers[index]?.push(input));
    return this.currentInputs;
  }

  private resetFight(): void {
    this.simulation?.resetMatch();
    this.commandBuffers.forEach((buffer) => buffer.clear());
    this.currentInputs = [neutralInput(), neutralInput()];
    this.syncViewsAndHud();
  }

  private syncViewsAndHud(): void {
    const snapshot = this.simulation?.snapshot();
    if (!snapshot) return;

    this.stageView?.sync(snapshot.characters.map((character) => character.x));
    snapshot.characters.forEach((character, index) => this.combatants[index]?.sync(character, snapshot.frame));
    this.hitboxView?.update(snapshot.activeHitboxes, snapshot.frame, this.training ? snapshot.characters : []);
    this.hud?.update(snapshot, this.scale.width);
    if (this.training) this.trainingHud?.update(snapshot, this.training);
    this.inputDisplays.forEach((display, index) => {
      display.update(this.currentInputs[index] ?? neutralInput(), this.commandBuffers[index]?.snapshot() ?? []);
    });
  }

  private cleanup(): void {
    this.input.keyboard?.off('keydown-ESC', this.handleEscape);
    this.input.keyboard?.off('keydown-R', this.handleRestart);
    this.trainingListeners.forEach((listener, key) => this.input.keyboard?.off(key, listener));
    this.trainingListeners.clear();
    if (this.training) this.input.keyboard?.removeCapture(['P', 'PERIOD', 'F2', 'G', 'H', 'I']);
    this.keyboardInputs.forEach((input) => input.destroy());
    this.keyboardInputs = [];
    this.combatants.forEach((combatant) => combatant.destroy());
    this.combatants = [];
    this.inputDisplays.forEach((display) => display.destroy());
    this.inputDisplays = [];
    this.hitboxView?.destroy();
    this.hitboxView = undefined;
    this.hud?.destroy();
    this.hud = undefined;
    this.trainingHud?.destroy();
    this.trainingHud = undefined;
    this.training = undefined;
    this.stageView?.destroy();
    this.stageView = undefined;
    this.simulation = undefined;
    this.commandBuffers.forEach((buffer) => buffer.clear());
  }
}

function neutralInput(): FrameInput {
  return { direction: 'N', buttons: new Set() };
}
