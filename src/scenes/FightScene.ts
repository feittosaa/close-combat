import { LOGICAL_VIEW, getHudLogicalWidth } from '../rendering/presentation';
import { VictoryScreen } from '../ui/VictoryScreen';
import { HUD_FONT } from '../ui/hudTheme';
import { t } from '../i18n/i18n';
import { TutorialSession } from '../training/TutorialSession';
import { TutorialHud } from '../ui/TutorialHud';
import { ControlSettings } from '../ui/ControlSettings';
import { getPlayerLayout, getSystemControls, getTrainingControls } from '../input/controlSettings';
import { InputHistory } from '../training/InputHistory';
import { formatCommand, formatMoveTitle } from '../ui/commandNotation';
import { PauseMenu } from '../ui/PauseMenu';
import { loadDeveloperPanel } from '../devMode';
// src/scenes/FightScene.ts
import Phaser from 'phaser';
import type { CharacterState } from '../engine/characters/CharacterState';
import { defaultCharacter, getCharacterById } from '../engine/data/characters';
import { createGameConfig } from '../engine/data/gameConfig';
import { Simulation } from '../engine/simulation/Simulation';
import { CommandBuffer } from '../input/CommandBuffer';
import { KeyboardInput } from '../input/KeyboardInput';
import { GamepadInput, gamepads, mergeInputs, type PadPress } from '../input/GamepadHub';
import type { FrameInput } from '../input/types';
import { settleAfterRound } from '../rendering/animations/cowboySprites';
import { RESULT_TITLE_END_FRAME } from '../rendering/roundEnd';
import { ProjectileView } from '../rendering/ProjectileView';
import { RushEffect } from '../rendering/RushEffect';
import { characterColor } from '../rendering/characterColor';
import { registerCharacterColor } from '../rendering/palettePipeline';
import { preloadContactEffects } from '../rendering/contactEffects';
import { StagePresentation } from '../rendering/StagePresentation';
import { CombatantView } from '../rendering/CombatantView';
import { HitboxView } from '../rendering/HitboxView';
import { defaultStage } from '../rendering/stages/stageCatalog';
import { createStageLayout, getStageArenaBounds } from '../rendering/stages/stageLayout';
import { StageView } from '../rendering/stages/StageView';
import { preloadMatchAssets, primeMatchTextures } from '../rendering/matchAssets';
import { showLoadingScreen } from '../ui/loadingScreen';
import { CombatHud } from '../ui/CombatHud';
import { fighterArt, preloadFighterIcons } from '../ui/fighterArt';
import { PlayerInputDisplay } from '../ui/PlayerInputDisplay';
import { TrainingSession } from '../training/TrainingSession';
import { TrainingHud } from '../ui/TrainingHud';
import { ArcadeController, type ArcadeDifficulty } from '../engine/combat/ArcadeController';
import { createArcadeRun, isTrainingMode, opponentFor, stageForMatch, matchPalettes, type ArcadeRun, type FightSetup, type MatchMode } from './matchSetup';
import { FightSounds, preloadFightSounds } from '../audio/FightSounds';
import { UltimateOverlay } from '../ui/UltimateOverlay';
import type { HitEvent } from '../engine/combat/AttackResolver';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';

/** Rounds of loading again the files that failed, before the match starts without them. */
const MAX_LOAD_ATTEMPTS = 5;

export class FightScene extends Phaser.Scene {
  private selectedFighter = defaultCharacter;
  private alternatePalettes: [boolean, boolean] = [false, false];
  private opponentFighter = defaultCharacter;
  private mode: MatchMode = 'versus';
  private arcadeIndex = 0;
  private arcadeRun?: ArcadeRun;
  private difficulty?: ArcadeDifficulty;
  private bot?: ArcadeController;
  private botRound = 0;
  private selectedStage = defaultStage;
  private stageView?: StageView;
  private stagePresentation?: StagePresentation;
  private closeLoadingScreen?: () => void;
  private victoryArt = new Map<string, HTMLImageElement>();
  private victoryArtReady: Promise<void> = Promise.resolve();
  private loadAttempts = 0;
  private introBlocked = false;
  private knockoutAt?: number;
  private knockoutSlowRemaining = 0;
  private resultMenu?: HTMLElement;
  private victoryScreen?: VictoryScreen;
  private resultMenuIndex = 0;
  private resultActions: { label: string; run: () => void }[] = [];
  private readonly alignResultMenu = (): void => {
    if (!this.resultMenu) return;
    const rect = this.game.canvas.getBoundingClientRect();
    const height = Math.min(rect.height, rect.width * LOGICAL_VIEW.height / LOGICAL_VIEW.width);
    Object.assign(this.resultMenu.style, {left:`${rect.left + rect.width / 2}px`, top:`${rect.top + (rect.height - height) / 2 + height * .84}px`, maxWidth:`${rect.width * .94}px`});
  };
  private readonly resultMenuKey = (event: KeyboardEvent): void => {
    if (!this.resultMenu || event.repeat) return;
    const layouts = [getPlayerLayout(0), getPlayerLayout(1)];
    const up = event.code === 'ArrowUp' || layouts.some(layout => event.code === layout.directions.up);
    const down = event.code === 'ArrowDown' || layouts.some(layout => event.code === layout.directions.down);
    const confirm = event.code === 'Enter' || layouts.some(layout => event.code === layout.buttons['1']);
    if (up || down || confirm) { event.preventDefault(); if (confirm) event.stopImmediatePropagation(); this.chooseResult(up ? 'up' : down ? 'down' : 'confirm'); }
  };
  private chooseResult(action: 'up' | 'down' | 'confirm'): void {
    if (action === 'confirm') { this.resultActions[this.resultMenuIndex]?.run(); return; }
    this.resultMenuIndex = (this.resultMenuIndex + (action === 'up' ? -1 : 1) + this.resultActions.length) % this.resultActions.length;
    this.renderResultMenu();
  }
  /** Controller outside the pause: Start pauses, Select restarts free training, and A/✕ and the d-pad drive the end-of-match menu. */
  private readonly onPad = (press: PadPress): void => {
    if (this.resultMenu && (press.action === 'up' || press.action === 'down' || press.action === 'confirm')) { this.chooseResult(press.action); return; }
    if (press.action === 'start' && !this.resultMenu) this.togglePause(true);
    else if (press.action === 'select' && this.mode === 'training' && this.simulation) this.resetFight(true);
    else if (press.action === 'confirm') this.handleContinue();
  };
  private releasePad?: () => void;
  private ultimateOverlay?: UltimateOverlay;
  private simulation?: Simulation;
  private fightSounds?: FightSounds;
  private pendingVisualHits: HitEvent[] = [];
  private keyboardInputs: KeyboardInput[] = [];
  private readonly gamepadInputs = [new GamepadInput(0), new GamepadInput(1)];
  private inputHistories = [new InputHistory(), new InputHistory()];
  private commandBuffers: [CommandBuffer, CommandBuffer] = [new CommandBuffer(), new CommandBuffer()];
  private currentInputs: [FrameInput, FrameInput] = [neutralInput(), neutralInput()];
  private projectileView?: ProjectileView;
  private rushEffect?: RushEffect;
  private rushActive = [false, false];
  private combatants: CombatantView[] = [];
  private inputDisplays: PlayerInputDisplay[] = [];
  private hitboxView?: HitboxView;
  private hud?: CombatHud;
  private hudWidth = 0;
  private resultFloorY = 0;
  private resultGravity = 0;
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
    ['step', () => this.advanceOneFrame()],
    ['reset', () => { if (this.training) this.resetFight(!this.tutorial); }],
    ['opponent', () => { this.training?.cycleOpponent(); }],
    ['speed', () => { this.training?.cycleSpeed(); }],
    ['autoLife', () => {
      if (!this.training) return;
      this.training.autoRestore = !this.training.autoRestore;
      this.simulation?.setTrainingAutoRestore(this.training.autoRestore);
    }],
    ['distance', () => {
      if (!this.training) return;
      this.training.cycleDistance();
      this.resetFight(!this.tutorial);
    }],
    ['geometry', () => {
      if (!this.training) return;
      this.training.showGeometry = !this.training.showGeometry;
      this.hitboxView?.setVisible(this.training.showGeometry);
    }],
    ['inputs', () => {
      if (!this.training) return;
      this.training.showInputs = !this.training.showInputs;
      this.inputDisplays.forEach((display) => display.setVisible(this.training!.showInputs));
    }],
  ];
  private advanceOneFrame(): void {
    if (!this.training?.paused || !this.simulation || this.introBlocked) return;
    const snapshot = this.simulation.snapshot();
    this.simulation.stepFrame(this.readInputs(snapshot.characters, snapshot.frame));
    this.observeFrame(this.simulation.snapshot());
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
    this.clearHeldInputs();
    this.simulation?.clearInputHistory();
    this.pauseMenu?.setVisible(this.paused);
    // DOM search must receive text normally, including letters used by training hotkeys.
  }
  /** Developer tools over the pause, in any mode; tuning reaches the next action and the HUD is redrawn with the new colours. */
  private openDeveloper(): void {
    if (import.meta.env.MODE !== 'development') return;
    void loadDeveloperPanel().then(({ DeveloperPanel }) => new DeveloperPanel(this, () => this.pauseMenu?.refresh(), () => { this.hudWidth = 0; this.syncViewsAndHud(); }));
  }
  private canContinueArcade(snapshot: SimulationSnapshot): boolean {
    return snapshot.phase === 'match-over' && snapshot.matchWinnerId === 'player-1' && snapshot.roundEndedFrame !== undefined &&
      snapshot.frame - snapshot.roundEndedFrame >= RESULT_TITLE_END_FRAME;
  }
  private readonly handleContinue = (): void => {
    if (this.tutorial && !this.paused && this.tutorial.next()) { this.training!.initialDistance = this.tutorial.lesson?.distance ?? 96; this.resetFight(); return; }
    if (this.resultMenu) return;
    const snapshot = this.simulation?.snapshot();
    if (this.mode !== 'arcade' || !snapshot || !this.canContinueArcade(snapshot)) return;
    if (this.arcadeIndex + 1 >= this.arcadeRun!.opponents.length) return;
    this.scene.restart({ fighterId: this.selectedFighter.id, mode: 'arcade', fighterPalette: this.alternatePalettes[0] ? 1 : 0,
      arcadeIndex: this.arcadeIndex + 1, arcadeRun: this.arcadeRun, difficulty: this.difficulty });
  };
  private readonly handleRestart = (event: KeyboardEvent): void => {
    if (this.mode !== 'training' || event.code !== getSystemControls().reset || !this.simulation) return;
    if (ControlSettings.active || event.repeat) return;
    event.preventDefault();
    this.handledTrainingEvents.add(event);
    this.resetFight(true);
  };

  constructor() {
    super('FightScene');
  }

  init(data: FightSetup = {}): void {
    this.selectedFighter = getCharacterById(data.fighterId ?? '') ?? defaultCharacter;
    this.mode = data.mode ?? 'versus';
    this.paused = false;
    this.arcadeIndex = Math.max(0, Math.trunc(data.arcadeIndex ?? 0));
    this.arcadeRun = this.mode === 'arcade' ? data.arcadeRun ?? createArcadeRun() : undefined;
    this.opponentFighter = getCharacterById(this.arcadeRun?.opponents[this.arcadeIndex] ?? data.opponentId ?? '') ?? opponentFor(this.selectedFighter.id);
    this.alternatePalettes = matchPalettes(data, this.selectedFighter.id === this.opponentFighter.id);
    this.selectedStage = stageForMatch(this.mode,this.arcadeRun?.stages[this.arcadeIndex] ?? data.stageId);
    this.tutorial = this.mode === 'tutorial' ? new TutorialSession(this.selectedFighter) : undefined;
    this.training = data.mode === 'training' || this.tutorial ? new TrainingSession() : undefined;
    if (this.tutorial) { this.training!.initialDistance = this.tutorial.lesson?.distance ?? 96; this.training!.showGeometry = false; this.training!.autoRestore = false; }
    this.difficulty = data.difficulty;
    this.bot = this.mode === 'arcade' ? new ArcadeController(this.opponentFighter, this.selectedFighter, this.difficulty) : undefined;
    this.botRound = 0;
    this.resultMenuIndex = 0;
  }

  private renderResultMenu(): void {
    if (!this.resultMenu) return;
    this.resultMenu.replaceChildren(...this.resultActions.map((action, index) => {
      const button = document.createElement('button');
      button.textContent = action.label;
      button.className = index === this.resultMenuIndex ? 'selected' : '';
      button.onclick = action.run;
      return button;
    }));
  }

  private showResultMenu(snapshot: SimulationSnapshot): void {
    if (this.resultMenu || (this.mode !== 'versus' && this.mode !== 'arcade')) return;
    const setup = { fighterId: this.selectedFighter.id, opponentId: this.opponentFighter.id, stageId: this.selectedStage.id,
      mode: this.mode, arcadeRun: this.arcadeRun, difficulty: this.difficulty, fighterPalette: this.alternatePalettes[0] ? 1 as const : 0 as const, opponentPalette: this.alternatePalettes[1] ? 1 as const : 0 as const };
    this.resultActions = [];
    if (this.mode === 'arcade') {
      // Opponents and sceneries are always drawn, and the fighter cannot change: win to continue, lose to retry, or give up.
      const won = snapshot.matchWinnerId === 'player-1', lastFight = this.arcadeIndex + 1 >= this.arcadeRun!.opponents.length;
      if (!won) this.resultActions.push({label:t('result.rematch'), run:() => this.scene.restart({...setup, arcadeIndex:this.arcadeIndex})});
      else if (!lastFight) this.resultActions.push({label:t('result.continue'), run:() => this.scene.restart({...setup, arcadeIndex:this.arcadeIndex + 1})});
    }
    if (this.mode === 'versus') {
      this.resultActions.push({label:t('result.rematch'), run:() => this.scene.restart(setup)});
      this.resultActions.push({label:t('result.changeFighter'), run:() => this.scene.start('MenuScene', {fighterId:this.selectedFighter.id, selectVersus:true, ...(snapshot.matchWinnerId ? { stageChooser: snapshot.matchWinnerId === 'player-1' ? 0 : 1 } : {})})});
    }
    this.resultActions.push({label:t(this.mode === 'arcade' && this.resultActions.length ? 'result.giveUp' : 'result.mainMenu'), run:() => this.scene.start('MenuScene', {fighterId:this.selectedFighter.id})});
    // The champion screen closes a PvP match and the whole Arcade run (a win over the last opponent).
    const champion = snapshot.matchWinnerId === 'player-1' ? this.selectedFighter : snapshot.matchWinnerId === 'player-2' ? this.opponentFighter : undefined;
    const arcadeCleared = this.mode === 'arcade' && snapshot.matchWinnerId === 'player-1' && this.arcadeIndex + 1 >= this.arcadeRun!.opponents.length;
    if (champion && (this.mode === 'versus' || arcadeCleared)) this.victoryScreen = new VictoryScreen(this.game.canvas, this.selectedStage, champion.id, champion.name, this.victoryArt.get(champion.id),
      this.mode === 'versus' ? snapshot.matchWinnerId === 'player-1' ? 1 : 2 : undefined);
    this.resultMenu = document.createElement('nav');
    this.resultMenu.className = 'match-result-menu';
    this.resultMenu.setAttribute('aria-label', t('result.label'));
    document.body.appendChild(this.resultMenu);
    this.alignResultMenu();
    this.renderResultMenu();
    window.addEventListener('resize', this.alignResultMenu);
    window.addEventListener('keydown', this.resultMenuKey, true);
  }

  preload(): void {
    this.loadAttempts = 0;
    this.queueMatchAssets();
    // The champion screen's full-body art is fetched and decoded with the match, not when it ends.
    const victoryIds = typeof Image === 'undefined' ? [] : [this.selectedFighter.id, this.opponentFighter.id].filter(id => fighterArt[id]);
    this.victoryArt = new Map(victoryIds.map(id => { const image = new Image(); image.src = fighterArt[id].fullbody; return [id, image]; }));
    this.victoryArtReady = Promise.all([...this.victoryArt.values()].map(image => image.decode().catch(() => undefined))).then(() => undefined);
    // Fighters and stages that the previous match did not use are loaded here, between selection and the fight.
    if (this.load.list.size) this.closeLoadingScreen = showLoadingScreen();
  }

  /** Queues whatever the match draws or plays and is not in memory yet: icons, contact effects, sounds, both fighters and the stage. */
  private queueMatchAssets(): void {
    preloadFighterIcons(this);
    preloadContactEffects(this);
    preloadFightSounds(this);
    preloadMatchAssets(this, [this.selectedFighter.id, this.opponentFighter.id], this.selectedStage);
  }

  /**
   * The match starts only with every asset in memory: a file whose download or decode failed is queued and loaded
   * again under the loading screen, and the champion art is decoded, before the fight is built.
   */
  create(): void {
    this.queueMatchAssets();
    if (this.load.list.size && this.loadAttempts < MAX_LOAD_ATTEMPTS) {
      this.loadAttempts += 1;
      this.closeLoadingScreen ??= showLoadingScreen();
      this.load.once(Phaser.Loader.Events.COMPLETE, () => this.create());
      this.load.start();
      return;
    }
    if (this.load.list.size) { console.error('Close Combat: assets still missing after retries', this.load.list.entries.map(file => file.key)); this.load.reset(); }
    void this.victoryArtReady.then(() => { if (this.sys.isActive()) this.startMatch(); });
  }

  private startMatch(): void {
    registerCharacterColor(this);
    // Every texture of the match reaches the GPU before READY, while the loading screen still covers the change.
    primeMatchTextures(this);
    // The loading screen leaves only after the first frame of the fight is drawn, so no first draw happens in sight.
    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => { this.closeLoadingScreen?.(); this.closeLoadingScreen = undefined; });
    const { width, height } = LOGICAL_VIEW;
    const config = createGameConfig(width, height);
    this.resultFloorY = config.arena.floorY;
    this.resultGravity = config.movement.gravity;
    const stageLayout = createStageLayout(this.selectedStage, width, height, config.arena.floorY);
    // The full panorama defines the walls; shared viewport separation still limits lone retreat.
    Object.assign(config.arena,getStageArenaBounds(stageLayout));
    this.stageView = new StageView(this, this.selectedStage, stageLayout);
    // Practice (training and tutorial) starts without READY/FIGHT; the training room keeps them when it hosts a PvP match.
    this.stagePresentation = new StagePresentation(this, this.selectedStage.id, config.match.roundCount, !isTrainingMode(this.mode));
    this.ultimateOverlay = new UltimateOverlay(this, this.selectedStage.id);
    this.simulation = new Simulation(config, [this.selectedFighter, this.opponentFighter], this.training
      ? { training: true, initialDistance: this.training.initialDistance } : {});
    this.fightSounds = new FightSounds(this, Boolean(this.training), this.mode === 'arcade', config.match.roundCount);
    this.simulation.setTrainingAutoRestore(this.training?.autoRestore ?? false);
    this.keyboardInputs = [new KeyboardInput(getPlayerLayout(0)), new KeyboardInput(getPlayerLayout(1))];
    this.commandBuffers = [new CommandBuffer(), new CommandBuffer()];

    this.projectileView = new ProjectileView(this);
    this.rushEffect = new RushEffect(this);
    this.combatants = [
      new CombatantView(this, 0xe45b5b),
      new CombatantView(this, 0x5b8de4),
    ];
    this.hitboxView = new HitboxView(this);
    this.hitboxView.setVisible(this.training?.showGeometry ?? false);
    this.hudWidth = 0;
    if (this.training && !this.tutorial) {
      this.trainingKeys.forEach(([key, handler]) => {
        const listener = (event: KeyboardEvent): void => {
          // Phaser can revisit a queued DOM event before the queue is cleared.
          // In particular, a single-step event must never advance twice.
          if (event.code !== getTrainingControls()[key as keyof ReturnType<typeof getTrainingControls>] || ControlSettings.active || this.pauseMenu?.isEditing() || event.repeat || this.handledTrainingEvents.has(event)) return;
          event.preventDefault();
          this.handledTrainingEvents.add(event);
          handler();
        };
        this.trainingListeners.set(key, listener);
        window.addEventListener('keydown', listener);
      });
    }

    this.pinnedMove = this.add.text(width / 2, 155, '', { color: '#ffe0ab', backgroundColor: '#15151fdd', fontSize: '12px', fontFamily: HUD_FONT, wordWrap: { width: width - 80 }, align: 'center' }).setOrigin(.5, 0).setDepth(120).setScrollFactor(0);
    this.pauseMenu = new PauseMenu([this.selectedFighter, this.opponentFighter], Boolean(this.training),
      () => this.togglePause(false),
      () => this.scene.start('MenuScene', { fighterId: this.selectedFighter.id }),
      (entry, playerIndex) => { this.pinnedMove?.setText(`${t('training.pinned', { title: formatMoveTitle(entry.title,getPlayerLayout(playerIndex)) })}\n${formatCommand(entry.notation,getPlayerLayout(playerIndex))}`); this.togglePause(false); }, () => this.advanceOneFrame(), () => new ControlSettings(() => this.pauseMenu?.refresh()), () => { this.simulation?.fillTrainingRage(); this.syncViewsAndHud(); },
      import.meta.env.MODE === 'development' ? { label: 'Desenvolvedor', open: () => this.openDeveloper() } : undefined);
    window.addEventListener('keydown', this.handlePause);
    this.releasePad = gamepads.subscribe(this.onPad);
    this.input.keyboard?.on('keydown-ESC', this.handleEscape);
    window.addEventListener('keydown', this.handleRestart);
    this.input.keyboard?.on('keydown-ENTER', this.handleContinue);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    if (this.tutorial) { this.tutorialHud = new TutorialHud(this, this.tutorial, this.handleContinue); this.inputDisplays.forEach(display => display.setVisible(false)); }
    this.syncViewsAndHud();
  }

  update(_time: number, delta: number): void {
    if (!this.simulation) return;

    const current = this.simulation.snapshot();
    this.fightSounds?.prepareRound(current);
    const intro = this.stagePresentation?.update(current, this.paused ? 0 : delta, getHudLogicalWidth(this.scale));
    if (this.introBlocked && !intro) {
      this.clearHeldInputs();
      this.commandBuffers.forEach(buffer => buffer.clear());
    }
    this.introBlocked = Boolean(intro);
    this.simulation?.setPreFight(!this.paused && Boolean(this.stagePresentation?.moveOnly));
    if (!intro && !this.paused && !this.training?.paused) {
      const slow = this.knockoutSlowRemaining > 0;
      if (slow) this.knockoutSlowRemaining = Math.max(0, this.knockoutSlowRemaining - delta);
      const round = current.round;
      this.simulation.advance(delta * (this.training?.speed ?? 1) * (slow ? .25 : 1), (characters, frame) => this.readInputs(characters, frame), snapshot => {
        const newlyKnockedOut = snapshot.knockoutStartedAt !== undefined && snapshot.knockoutStartedAt !== this.knockoutAt;
        this.observeFrame(snapshot);
        return snapshot.round === round && !newlyKnockedOut;
      });
    }
    this.syncViewsAndHud();
  }

  private observeFrame(snapshot: SimulationSnapshot): void {
    if (snapshot.knockoutStartedAt !== undefined && snapshot.knockoutStartedAt !== this.knockoutAt) {
      this.knockoutAt = snapshot.knockoutStartedAt; this.knockoutSlowRemaining = 2000;
    }
    if (snapshot.knockoutStartedAt === undefined) this.knockoutAt = undefined;
    this.fightSounds?.observe(snapshot);
    snapshot.characters.forEach((character, index) => {
      if (character.rush && !this.rushActive[index]) this.rushEffect?.play(character.x, character.y);
      this.rushActive[index] = Boolean(character.rush);
    });
    this.pendingVisualHits.push(...snapshot.hitEvents);
  }

  private readInputs(characters: readonly CharacterState[], frame: number): readonly FrameInput[] {
    const inputs = this.keyboardInputs.map((input, index) => {
      const facing = characters[index]?.facing ?? (index === 0 ? 'right' : 'left');
      return mergeInputs(input.read(facing), this.gamepadInputs[index].read(facing));
    });
    const snapshot = this.tutorial || this.bot ? this.simulation?.snapshot() : undefined;
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
        ? this.bot.readInput(frame, characters[1], characters[0], snapshot.projectiles) : neutralInput();
    }
    if (this.simulation?.hasKnockout()) inputs.fill(neutralInput());
    this.currentInputs = inputs as [FrameInput, FrameInput];
    this.currentInputs.forEach((input, index) => {
      this.commandBuffers[index]?.push(input);
      this.inputHistories[index].push(input, frame, characters[index].facing);
    });
    return this.currentInputs;
  }

  /** `reposition` is free training's reset: fighters go back to the centre and keep their rage. */
  private resetFight(reposition = false): void {
    this.simulation?.resetMatch(this.training?.initialDistance, reposition);
    this.stagePresentation?.reset();
    this.knockoutAt = undefined; this.knockoutSlowRemaining = 0; this.introBlocked = false;
    this.fightSounds?.reset();
    this.pendingVisualHits = [];
    this.bot?.reset();
    this.tutorial?.resetAttempt();
    this.botRound = 0;
    this.training?.resetInspection();
    this.clearHeldInputs();
    this.commandBuffers.forEach((buffer) => buffer.clear());
    // Free training keeps the input history; only the fighters go back to the centre.
    if (!this.training || this.tutorial) this.inputHistories.forEach(history => history.clear());
    this.currentInputs = [neutralInput(), neutralInput()];
    this.syncViewsAndHud();
  }

  /** Keys and buttons held through a pause, reset or the round start count again only after being released. */
  private clearHeldInputs(): void {
    this.keyboardInputs.forEach(input => input.clear());
    this.gamepadInputs.forEach(input => input.clear());
  }

  private resizeHud(width: number): void {
    if (Math.abs(width - this.hudWidth) < .01) return;
    this.hudWidth = width;
    this.hud?.destroy();
    this.hud = new CombatHud(this, width, [this.selectedFighter.name, this.opponentFighter.name],
      Boolean(this.training), t(this.mode === 'tutorial' ? 'hud.tutorial' : 'hud.freeTraining'), [this.selectedFighter.id,this.opponentFighter.id]);
    this.trainingHud?.destroy(); this.trainingHud = undefined;
    this.inputDisplays.forEach(display => display.destroy()); this.inputDisplays = [];
    if (this.training && !this.tutorial) {
      this.trainingHud = new TrainingHud(this, width, LOGICAL_VIEW.height);
      this.inputDisplays = [new PlayerInputDisplay(this, 18, 104, t('training.inputs', { player: 1 }), '#eca58a', 0),
        new PlayerInputDisplay(this, width - 198, 104, t('training.inputs', { player: 2 }), '#8dd5ca', 1)];
      this.inputDisplays.forEach(display => display.setVisible(this.training!.showInputs));
    }
    this.pinnedMove?.setX(width / 2);
    this.tutorialHud?.setCenter(width / 2);
  }

  private syncViewsAndHud(): void {
    const snapshot = this.simulation?.snapshot();
    if (!snapshot) return;
    if (snapshot.phase === 'match-over') this.showResultMenu(snapshot);

    this.resizeHud(getHudLogicalWidth(this.scale));
    const visualFrame = snapshot.roundEndedFrame ?? snapshot.frame;
    const resultElapsed = snapshot.phase !== 'fight' && snapshot.roundWinnerId ? this.stagePresentation?.resultElapsed(snapshot.frame) : undefined;
    // After the round ends, a fighter still in the air falls at once; the victory/defeat pose clock starts later, with the title.
    const sinceRoundEnd = snapshot.phase !== 'fight' && snapshot.roundEndedFrame !== undefined ? snapshot.frame - snapshot.roundEndedFrame : undefined;
    const shown = sinceRoundEnd === undefined ? snapshot.characters : snapshot.characters.map(character =>
      settleAfterRound(character, sinceRoundEnd, this.resultFloorY, this.resultGravity, Boolean(snapshot.roundWinnerId) && snapshot.roundWinnerId !== character.characterId));
    const cameraCharacters = shown;
    this.stageView?.sync(cameraCharacters.map(character => character.x), cameraCharacters.map(character => character.y), visualFrame);
    this.ultimateOverlay?.update(Boolean(snapshot.ultimateActivation), this.game.loop.delta);
    const layout = createStageLayout(this.selectedStage, LOGICAL_VIEW.width, LOGICAL_VIEW.height, this.resultFloorY);
    shown.forEach((character, index) => {
      const result = resultElapsed !== undefined
        ? {winner: snapshot.roundWinnerId === character.characterId, elapsed: resultElapsed} : undefined;
      const color = characterColor(this.selectedStage, layout, character.x, this.cameras.main.scrollX,
        this.alternatePalettes[index]);
      this.combatants[index]?.sync(character, visualFrame, snapshot.ultimateActivation?.ownerIds.includes(character.characterId) ? snapshot.ultimateActivation.elapsedFrames : undefined, result, color);
    });
    const alternateOwnerIds = new Set(snapshot.characters.filter((_, index) => this.alternatePalettes[index]).map(character => character.characterId));
    this.projectileView?.sync(snapshot.projectiles,snapshot.explosions,visualFrame,this.pendingVisualHits.splice(0),snapshot.characters,alternateOwnerIds);
    this.hitboxView?.update(snapshot.activeHitboxes, this.training ? snapshot.characters : []);
    this.hud?.update(snapshot, this.hudWidth);
    if (this.training) {
      this.training.observe(snapshot);
      this.trainingHud?.update(snapshot, this.training);
    }
    if (this.tutorial) this.tutorial.observe(snapshot, this.currentInputs[0]);
    this.tutorialHud?.update();
    this.stageView?.syncHudCamera();
    this.inputDisplays.forEach((display, index) => {
      display.update(this.currentInputs[index] ?? neutralInput(), this.inputHistories[index].snapshot(), snapshot.characters[index].facing,
        snapshot.comboHistory.filter(combo => combo.attackerId === snapshot.characters[index].characterId));
    });
    this.stagePresentation?.syncCamera();
  }

  private cleanup(): void {
    this.closeLoadingScreen?.(); this.closeLoadingScreen = undefined; this.victoryArt.clear();
    window.removeEventListener('keydown', this.resultMenuKey, true);
    window.removeEventListener('resize', this.alignResultMenu);
    this.resultMenu?.remove(); this.resultMenu = undefined; this.resultActions = [];
    this.victoryScreen?.destroy(); this.victoryScreen = undefined;
    window.removeEventListener('keydown', this.handlePause);
    this.input.keyboard?.off('keydown-ESC', this.handleEscape);
    this.pauseMenu?.destroy(); this.pauseMenu = undefined;
    this.pinnedMove?.destroy(); this.pinnedMove = undefined;
    this.paused = false;
    window.removeEventListener('keydown', this.handleRestart);
    this.releasePad?.(); this.releasePad = undefined;
    this.input.keyboard?.off('keydown-ENTER', this.handleContinue);
    this.trainingListeners.forEach(listener => window.removeEventListener('keydown', listener));
    this.trainingListeners.clear();
    this.keyboardInputs.forEach((input) => input.destroy());
    this.keyboardInputs = [];
    this.combatants.forEach((combatant) => combatant.destroy());
    this.combatants = []; this.projectileView?.destroy(); this.projectileView = undefined;
    this.rushEffect?.destroy(); this.rushEffect = undefined; this.rushActive = [false, false];
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
    this.stagePresentation?.destroy(); this.stagePresentation = undefined;
    this.ultimateOverlay?.destroy(); this.ultimateOverlay = undefined;
    this.stageView?.destroy();
    this.stageView = undefined;
    this.simulation = undefined;
    this.fightSounds = undefined;
    this.commandBuffers.forEach((buffer) => buffer.clear());
    this.inputHistories.forEach(history => history.clear());
  }
}

function neutralInput(): FrameInput {
  return { direction: 'N', buttons: new Set() };
}
