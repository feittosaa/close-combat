// src/scenes/FightScene.ts
import Phaser from 'phaser';
import { defaultCharacter } from '../engine/data/characters';
import { createGameConfig } from '../engine/data/gameConfig';
import { Simulation } from '../engine/simulation/Simulation';
import { CommandBuffer } from '../input/CommandBuffer';
import { KeyboardInput } from '../input/KeyboardInput';
import { PLAYER_ONE_KEYS, PLAYER_TWO_KEYS } from '../input/keyboardLayouts';
import type { FrameInput } from '../input/types';
import { CombatantView } from '../rendering/CombatantView';
import { HitboxView } from '../rendering/HitboxView';
import { CombatHud } from '../ui/CombatHud';
import { PlayerInputDisplay } from '../ui/PlayerInputDisplay';

export class FightScene extends Phaser.Scene {
  private simulation?: Simulation;
  private keyboardInputs: KeyboardInput[] = [];
  private commandBuffers: [CommandBuffer, CommandBuffer] = [new CommandBuffer(), new CommandBuffer()];
  private currentInputs: [FrameInput, FrameInput] = [neutralInput(), neutralInput()];
  private combatants: CombatantView[] = [];
  private inputDisplays: PlayerInputDisplay[] = [];
  private hitboxView?: HitboxView;
  private hud?: CombatHud;
  private readonly handleEscape = (): void => { this.scene.start('MenuScene'); };

  constructor() {
    super('FightScene');
  }

  create(): void {
    const { width, height } = this.scale;
    const config = createGameConfig(width, height);
    this.simulation = new Simulation(config, [defaultCharacter, defaultCharacter]);
    this.keyboardInputs = [new KeyboardInput(PLAYER_ONE_KEYS), new KeyboardInput(PLAYER_TWO_KEYS)];
    this.commandBuffers = [new CommandBuffer(), new CommandBuffer()];

    this.add.rectangle(width / 2, config.arena.floorY + 44, width, 88, 0x24232b);
    this.add.rectangle(width / 2, config.arena.floorY, width, 4, 0xf4f0e8, 0.7);
    this.combatants = [
      new CombatantView(this, config.arena.left, config.arena.floorY, 0xe45b5b),
      new CombatantView(this, config.arena.right, config.arena.floorY, 0x5b8de4),
    ];
    this.hitboxView = new HitboxView(this);
    this.hud = new CombatHud(this, width, [defaultCharacter.name, defaultCharacter.name]);
    this.inputDisplays = [
      new PlayerInputDisplay(this, 18, 78, 'P1 · WASD / J K N M', '#ff8c8c'),
      new PlayerInputDisplay(this, width - 218, 78, 'P2 · SETAS / NUMPAD', '#8cb4ff'),
    ];

    this.input.keyboard?.on('keydown-ESC', this.handleEscape);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.syncViewsAndHud();
  }

  update(_time: number, delta: number): void {
    if (!this.simulation) return;

    this.simulation.advance(delta, (characters) => {
      this.currentInputs = this.keyboardInputs.map((input, index) => {
        const facing = characters[index]?.facing ?? (index === 0 ? 'right' : 'left');
        const frameInput = input.read(facing);
        this.commandBuffers[index]?.push(frameInput);
        return frameInput;
      }) as [FrameInput, FrameInput];
      return this.currentInputs;
    });
    this.syncViewsAndHud();
  }

  private syncViewsAndHud(): void {
    const snapshot = this.simulation?.snapshot();
    if (!snapshot) return;

    snapshot.characters.forEach((character, index) => this.combatants[index]?.sync(character));
    this.hitboxView?.update(snapshot.activeHitboxes, snapshot.frame);
    this.hud?.update(snapshot, this.scale.width);
    this.inputDisplays.forEach((display, index) => {
      display.update(this.currentInputs[index] ?? neutralInput(), this.commandBuffers[index]?.snapshot() ?? []);
    });
  }

  private cleanup(): void {
    this.input.keyboard?.off('keydown-ESC', this.handleEscape);
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
    this.simulation = undefined;
    this.commandBuffers.forEach((buffer) => buffer.clear());
  }
}

function neutralInput(): FrameInput {
  return { direction: 'N', buttons: new Set() };
}
