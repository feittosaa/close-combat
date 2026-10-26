import { TutorialSession } from '../training/TutorialSession';
import { TutorialHud } from '../ui/TutorialHud';
import { ControlSettings } from '../ui/ControlSettings';
import { getPlayerLayout, getSystemControls } from '../input/controlSettings';
import { InputHistory } from '../training/InputHistory';
import { formatCommand, formatMoveTitle } from '../ui/commandNotation';
import { PauseMenu } from '../ui/PauseMenu';
// src/scenes/FightScene.ts
import Phaser from 'phaser';
import type { CharacterState } from '../engine/characters/CharacterState';
import { defaultCharacter, getCharacterById } from '../engine/data/characters';
import { createGameConfig } from '../engine/data/gameConfig';
import { Simulation } from '../engine/simulation/Simulation';
import { CommandBuffer } from '../input/CommandBuffer';
import { KeyboardInput } from '../input/KeyboardInput';
import type { FrameInput } from '../input/types';
import { preloadShotoSprites } from '../rendering/animations/shotoSprites';
import { CombatantView } from '../rendering/CombatantView';
import { HitboxView } from '../rendering/HitboxView';
import { defaultStage, getStageById } from '../rendering/stages/stageCatalog';
import { createStageLayout } from '../rendering/stages/stageLayout';
import { preloadStage, StageView } from '../rendering/stages/StageView';
import { CombatHud } from '../ui/CombatHud';
import { PlayerInputDisplay } from '../ui/PlayerInputDisplay';
import { TrainingSession } from '../training/TrainingSession';
import { TrainingHud } from '../ui/TrainingHud';
import { ArcadeController } from '../engine/combat/ArcadeController';
import { arcadeOpponents, opponentFor, type FightSetup, type MatchMode } from './matchSetup';

export class FightScene extends Phaser.Scene {
  private selectedFighter = defaultCharacter;
  private opponentFighter = defaultCharacter;
  private mode: MatchMode = 'versus';
  private arcadeIndex = 0;
  private bot?: ArcadeController;
  private botRound = 0;
  private arcadeInfo?: Phaser.GameObjects.Text;
  private selectedStage = defaultStage;
  private stageView?: StageView;
  private simulation?: Simulation;
  private keyboardInputs: KeyboardInput[] = [];
  private inputHistories = [new InputHistory(), new InputHistory()];
  private commandBuffers: [CommandBuffer, CommandBuffer] = [new CommandBuffer(), new CommandBuffer()];
  private currentInputs: [FrameInput, FrameInput] = [neutralInput(), neutralInput()];
  private combatants: CombatantView[] = [];
  private inputDisplays: PlayerInputDisplay[] = [];
  private hitboxView?: HitboxView;
  private hud?: CombatHud;
  private tutorial?: TutorialSession;
  private tutorialHud?: TutorialHud;
  private training?: TrainingSession;
  private trainingHud?: TrainingHud;
  private paused = false;
  private pauseMenu?: PauseMenu;
  private pinnedMove?: Phaser.GameObjects.Text;
  private readonly trainingListeners = new Map<string, (event: KeyboardEvent) => void>();
  private readonly handledTrainingEvents = new WeakSet<KeyboardEvent>();
  private readonly trainingKeys: ReadonlyArray<readonly [string, () => void]> = [
    ['keydown-PERIOD', () => this.advanceOneFrame()],
    ['keydown-F2', () => { if (this.training) this.resetFight(); }],
    ['keydown-G', () => { this.training?.cycleOpponent(); }],
    ['keydown-L', () => { this.training?.cycleSpeed(); }],
    ['keydown-F3', () => {
      if (!this.training) return;
      this.training.autoRestore = !this.training.autoRestore;
      this.simulation?.setTrainingAutoRestore(this.training.autoRestore);
    }],
    ['keydown-F4', () => {
      if (!this.training) return;
      this.training.cycleDistance();
      this.resetFight();
    }],
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
  private advanceOneFrame(): void {
    if (!this.training?.paused || !this.simulation) return;
    const snapshot = this.simulation.snapshot();
    this.simulation.stepFrame(this.readInputs(snapshot.characters, snapshot.frame));
    this.syncViewsAndHud();
  }
  private readonly handleEscape = (event: KeyboardEvent): void => { this.pauseKey(event); };
  private readonly handlePause = (event: KeyboardEvent): void => {
    if (this.pauseMenu?.isEditing()) return;
    this.pauseKey(event);
  };
  private pauseKey(event: KeyboardEvent): void {
    if (event.code !== getSystemControls().pause && event.code !== 'Escape') return;
    if (ControlSettings.active || event.repeat || this.handledTrainingEvents.has(event)) return;
    this.handledTrainingEvents.add(event);
    this.togglePause();
  }
  private togglePause(force?: boolean): void {
    this.paused = force ?? !this.paused;
    if (!this.paused) {
      this.keyboardInputs.forEach(input => input.destroy());
      this.keyboardInputs = [new KeyboardInput(getPlayerLayout(0)), new KeyboardInput(getPlayerLayout(1))];
    }
    if (this.training) this.training.paused = this.paused;
    this.keyboardInputs.forEach(input => input.clear());
    this.simulation?.clearInputHistory();
    this.pauseMenu?.setVisible(this.paused);
    // DOM search must receive text normally, including letters used by training hotkeys.
    const keys = ['PERIOD', 'F2', 'F3', 'F4', 'G', 'H', 'I', 'L'];
    if (this.paused) this.input.keyboard?.removeCapture(keys);
    else if (this.training) this.input.keyboard?.addCapture(keys);
  }
  private readonly handleContinue = (): void => {
    if (this.tutorial && !this.paused && this.tutorial.next()) { this.training!.initialDistance = this.tutorial.lesson?.distance ?? 96; this.resetFight(); return; }
    const snapshot = this.simulation?.snapshot();
    if (this.mode !== 'arcade' || snapshot?.phase !== 'match-over' || snapshot.matchWinnerId !== 'player-1') return;
    if (this.arcadeIndex + 1 >= arcadeOpponents(this.selectedFighter.id).length) return;
    this.scene.restart({ fighterId: this.selectedFighter.id, stageId: this.selectedStage.id,
      mode: 'arcade', arcadeIndex: this.arcadeIndex + 1 });
  };
  private readonly handleRestart = (event: KeyboardEvent): void => {
    if (event.code !== getSystemControls().reset) return;
    if (!this.simulation) return;
    if (ControlSettings.active || event.repeat) return;
    event.preventDefault();
    this.handledTrainingEvents.add(event);
    if (this.training) {
      this.resetFight();
      return;
    }
    if (this.mode === 'arcade' && this.simulation.snapshot().matchWinnerId === 'player-1' &&
        this.arcadeIndex + 1 >= arcadeOpponents(this.selectedFighter.id).length) {
      this.scene.restart({ fighterId: this.selectedFighter.id, stageId: this.selectedStage.id, mode: 'arcade', arcadeIndex: 0 });
      return;
    }
    this.resetFight();
  };

  constructor() {
    super('FightScene');
  }

  init(data: FightSetup = {}): void {
    this.selectedFighter = getCharacterById(data.fighterId ?? '') ?? defaultCharacter;
    this.mode = data.mode ?? 'versus';
    this.paused = false;
    this.arcadeIndex = Math.max(0, Math.trunc(data.arcadeIndex ?? 0));
    this.opponentFighter = this.mode === 'arcade'
      ? opponentFor(this.selectedFighter.id, 'arcade', this.arcadeIndex)
      : getCharacterById(data.opponentId ?? '') ?? opponentFor(this.selectedFighter.id, this.mode);
    this.selectedStage = getStageById(data.stageId ?? '') ?? defaultStage;
    this.tutorial = this.mode === 'tutorial' || this.mode === 'combo-tutorial' ? new TutorialSession(this.selectedFighter, this.mode) : undefined;
    this.training = data.mode === 'training' || this.tutorial ? new TrainingSession() : undefined;
    if (this.tutorial) { this.training!.initialDistance = this.tutorial.lesson?.distance ?? 96; this.training!.showGeometry = false; this.training!.autoRestore = false; }
    this.bot = this.mode === 'arcade' ? new ArcadeController(this.opponentFighter, this.selectedFighter) : undefined;
    this.botRound = 0;
  }

  preload(): void {
    preloadStage(this, this.selectedStage);
    preloadShotoSprites(this);
  }

  create(): void {

    for (const key of ['shoto-idle', 'shoto-walk', 'shoto-crouch']) {
      if (this.textures.exists(key)) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    const { width, height } = this.scale;
    const config = createGameConfig(width, height);
    const stageLayout = createStageLayout(this.selectedStage, width, height, config.arena.floorY);
    // Translate the arena into the stage without changing its playable width.
    config.arena.left += stageLayout.arenaOffsetX;
    config.arena.right += stageLayout.arenaOffsetX;
    this.stageView = new StageView(this, this.selectedStage, stageLayout);
    this.simulation = new Simulation(config, [this.selectedFighter, this.opponentFighter], this.training
      ? { training: true, initialDistance: this.training.initialDistance } : {});
    this.simulation.setTrainingAutoRestore(this.training?.autoRestore ?? false);
    this.keyboardInputs = [new KeyboardInput(getPlayerLayout(0)), new KeyboardInput(getPlayerLayout(1))];
    this.commandBuffers = [new CommandBuffer(), new CommandBuffer()];

    this.combatants = [
      new CombatantView(this, 0xe45b5b),
      new CombatantView(this, 0x5b8de4),
    ];
    this.hitboxView = new HitboxView(this);
    this.hitboxView.setVisible(this.training?.showGeometry ?? false);
    this.hud = new CombatHud(this, width, [this.selectedFighter.name, this.opponentFighter.name], this.selectedStage.name, Boolean(this.training), this.mode === 'tutorial' ? 'TUTORIAL BÁSICO' : this.mode === 'combo-tutorial' ? 'TUTORIAL DE COMBOS' : 'TREINO LIVRE');
    if (this.mode === 'arcade') this.arcadeInfo = this.add.text(width / 2, 91, '', {
      color: '#f2d299', fontSize: '13px', align: 'center', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(110);
    if (this.training && !this.tutorial) {
      this.inputDisplays = [
        new PlayerInputDisplay(this, 18, 82, 'P1 · ENTRADAS', '#ff8c8c', 0),
        new PlayerInputDisplay(this, width - 218, 82, 'P2 · ENTRADAS', '#8cb4ff', 1),
      ];
      this.trainingHud = new TrainingHud(this, width, height);
      this.trainingKeys.forEach(([key, handler]) => {
        const listener = (event: KeyboardEvent): void => {
          // Phaser can revisit a queued DOM event before the queue is cleared.
          // In particular, a single-step event must never advance twice.
          if (ControlSettings.active || this.pauseMenu?.isEditing() || event.repeat || this.handledTrainingEvents.has(event)) return;
          this.handledTrainingEvents.add(event);
          handler();
        };
        this.trainingListeners.set(key, listener);
        this.input.keyboard?.on(key, listener);
      });
      this.input.keyboard?.addCapture(['PERIOD', 'F2', 'F3', 'F4', 'G', 'H', 'I', 'L']);
    }

    this.pinnedMove = this.add.text(width / 2, 155, '', { color: '#ffe0ab', backgroundColor: '#15151fdd', fontSize: '12px', wordWrap: { width: width - 80 }, align: 'center' }).setOrigin(.5, 0).setDepth(120).setScrollFactor(0);
    this.pauseMenu = new PauseMenu([this.selectedFighter, this.opponentFighter], Boolean(this.training),
      () => this.togglePause(false),
      () => this.scene.start('MenuScene', { fighterId: this.selectedFighter.id }),
      (entry, playerIndex) => { this.pinnedMove?.setText(`TREINAR · ${formatMoveTitle(entry.title,getPlayerLayout(playerIndex))}\n${formatCommand(entry.notation,getPlayerLayout(playerIndex))}`); this.togglePause(false); }, () => this.advanceOneFrame(), () => new ControlSettings(() => this.pauseMenu?.refresh()));
    window.addEventListener('keydown', this.handlePause);
    this.input.keyboard?.on('keydown-ESC', this.handleEscape);
    window.addEventListener('keydown', this.handleRestart);
    this.input.keyboard?.on('keydown-ENTER', this.handleContinue);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    if (this.tutorial) { this.tutorialHud = new TutorialHud(this, this.tutorial, this.handleContinue); this.inputDisplays.forEach(display => display.setVisible(false)); }
    this.syncViewsAndHud();
  }

  update(_time: number, delta: number): void {
    if (!this.simulation) return;

    if (!this.paused && !this.training?.paused) this.simulation.advance(delta * (this.training?.speed ?? 1), (characters, frame) => this.readInputs(characters, frame));
    this.syncViewsAndHud();
  }

  private readInputs(characters: readonly CharacterState[], frame: number): readonly FrameInput[] {
    const inputs = this.keyboardInputs.map((input, index) => input.read(characters[index]?.facing ?? (index === 0 ? 'right' : 'left')));
    const snapshot = this.simulation?.snapshot();
    const opponentInput = this.training?.opponentInput(frame, characters);
    if (opponentInput) inputs[1] = opponentInput;
    if (this.tutorial && snapshot) {
      this.tutorial.observe(snapshot, this.currentInputs[0]);
      inputs[1] = !this.tutorial.passed && this.tutorial.lesson?.guard && frame % 90 === 0 ? { direction: 'N', buttons: new Set(['1']) } : neutralInput();
      if (this.tutorial.passed) inputs[0] = neutralInput();
    }
    if (this.bot && snapshot) {
      if (this.botRound !== snapshot.round) { this.bot.reset(); this.botRound = snapshot.round; }
      inputs[1] = snapshot.phase === 'fight'
        ? this.bot.readInput(frame, characters[1], characters[0]) : neutralInput();
    }
    this.currentInputs = inputs as [FrameInput, FrameInput];
    this.currentInputs.forEach((input, index) => {
      this.commandBuffers[index]?.push(input);
      this.inputHistories[index].push(input, frame, characters[index].facing);
    });
    return this.currentInputs;
  }

  private resetFight(): void {
    this.simulation?.resetMatch(this.training?.initialDistance);
    this.bot?.reset();
    this.tutorial?.resetAttempt();
    this.botRound = 0;
    this.training?.resetInspection();
    this.keyboardInputs.forEach((input) => input.clear());
    this.commandBuffers.forEach((buffer) => buffer.clear());
    this.inputHistories.forEach(history => history.clear());
    this.currentInputs = [neutralInput(), neutralInput()];
    this.syncViewsAndHud();
  }

  private syncViewsAndHud(): void {
    const snapshot = this.simulation?.snapshot();
    if (!snapshot) return;

    this.stageView?.sync(snapshot.characters.map((character) => character.x));
    snapshot.characters.forEach((character, index) => {
      this.combatants[index]?.sync(character, snapshot.frame);
    });
    this.hitboxView?.update(snapshot.activeHitboxes, this.training ? snapshot.characters : []);
    this.hud?.update(snapshot, this.scale.width);
    if (this.arcadeInfo) {
      const count = arcadeOpponents(this.selectedFighter.id).length;
      let label = `ARCADE · LUTA ${this.arcadeIndex + 1}/${count} · COMPUTADOR`;
      if (snapshot.phase === 'match-over') {
        label = snapshot.matchWinnerId === 'player-1'
          ? this.arcadeIndex + 1 < count ? 'VITÓRIA · ENTER PARA O PRÓXIMO ADVERSÁRIO' : 'ARCADE CONCLUÍDO · R RECOMEÇAR · ESC PAUSA'
          : snapshot.matchWinnerId ? 'FIM DE JOGO · R TENTAR NOVAMENTE · ESC PAUSA' : 'EMPATE · R REPETIR · ESC PAUSA';
      }
      this.arcadeInfo.setText(label);
    }
    if (this.training) {
      this.training.observe(snapshot);
      this.trainingHud?.update(snapshot, this.training);
    }
    if (this.tutorial) this.tutorial.observe(snapshot, this.currentInputs[0]);
    this.tutorialHud?.update();
    this.stageView?.syncHudCamera();
    this.inputDisplays.forEach((display, index) => {
      display.update(this.currentInputs[index] ?? neutralInput(), this.inputHistories[index].snapshot(), snapshot.characters[index].facing);
    });
  }

  private cleanup(): void {
    window.removeEventListener('keydown', this.handlePause);
    this.input.keyboard?.off('keydown-ESC', this.handleEscape);
    this.pauseMenu?.destroy(); this.pauseMenu = undefined;
    this.pinnedMove?.destroy(); this.pinnedMove = undefined;
    this.paused = false;
    window.removeEventListener('keydown', this.handleRestart);
    this.input.keyboard?.off('keydown-ENTER', this.handleContinue);
    this.trainingListeners.forEach((listener, key) => this.input.keyboard?.off(key, listener));
    this.trainingListeners.clear();
    if (this.training) this.input.keyboard?.removeCapture(['PERIOD', 'F2', 'F3', 'F4', 'G', 'H', 'I', 'L']);
    this.keyboardInputs.forEach((input) => input.destroy());
    this.keyboardInputs = [];
    this.combatants.forEach((combatant) => combatant.destroy());
    this.combatants = [];
    this.arcadeInfo?.destroy();
    this.arcadeInfo = undefined;
    this.bot = undefined;
    this.inputDisplays.forEach((display) => display.destroy());
    this.inputDisplays = [];
    this.hitboxView?.destroy();
    this.hitboxView = undefined;
    this.hud?.destroy();
    this.hud = undefined;
    this.trainingHud?.destroy();
    this.trainingHud = undefined;
    this.tutorialHud?.destroy(); this.tutorialHud = undefined; this.tutorial = undefined;
    this.training = undefined;
    this.stageView?.destroy();
    this.stageView = undefined;
    this.simulation = undefined;
    this.commandBuffers.forEach((buffer) => buffer.clear());
    this.inputHistories.forEach(history => history.clear());
  }
}

function neutralInput(): FrameInput {
  return { direction: 'N', buttons: new Set() };
}
