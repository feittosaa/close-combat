import { RAGE_LEVEL, RAGE_SEGMENT } from '../engine/combat/rage';
import { LOGICAL_VIEW } from '../rendering/presentation';
import type Phaser from 'phaser';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import { contactLabel, stateLabel } from './combatLabels';
import { t } from '../i18n/i18n';
import { getSystemControls, keyLabel } from '../input/controlSettings';
import { placeFighterIcon } from './fighterArt';
import { HUD, hudText, drawRoundMarker, healthBarFill, setTextColor } from './hudTheme';

/** How long a combo breaker notice stays up after the freeze, in frames. */
const BREAKER_NOTICE_FRAMES = 90;

/** Minimal HUD; all values and round markers reflect the same simulation snapshot. */
export class CombatHud {
  private readonly root: Phaser.GameObjects.Container;
  private readonly healthGraphics: Phaser.GameObjects.Graphics;
  private readonly timer: Phaser.GameObjects.Text;
  private readonly roundLabel: Phaser.GameObjects.Text;
  private readonly hitLabel: Phaser.GameObjects.Text;
  private readonly modeLabels: Phaser.GameObjects.Text[];
  private readonly rageLabels: Phaser.GameObjects.Text[];
  private readonly rageLevels: Phaser.GameObjects.Text[];
  private readonly comboCounts: Phaser.GameObjects.Text[];
  private readonly comboWords: Phaser.GameObjects.Text[];
  private readonly comboDetails: Phaser.GameObjects.Text[];
  private readonly breakerLabels: Phaser.GameObjects.Text[];
  private readonly pauseHint: Phaser.GameObjects.Text;
  private lastImpactLabel = '';
  private lastImpactFrame = Number.NEGATIVE_INFINITY;
  private readonly barWidth: number;
  private readonly sidePadding = 82;

  constructor(scene: Phaser.Scene, width: number, fighterNames: readonly [string,string] = [t('hud.player', { player: 1 }),t('hud.player', { player: 2 })], private readonly training = false, private readonly practiceLabel = t('hud.freeTraining'), fighterIds?: readonly [string,string],
    /** Free training lifts the rage bars above its footer panel; matches and the tutorial keep them at the bottom. */
    private readonly rageRaised = training) {
    this.barWidth = Math.max(360, width / 2 - this.sidePadding - 90);
    const decoration=scene.add.graphics();
    // The timer hangs from the top edge on an ink plaque with rounded lower corners and a doubled cream rule.
    const plaque = { tl: 0, tr: 0, bl: 14, br: 14 };
    decoration.fillStyle(HUD.ink,.94).fillRoundedRect(width/2-40,-2,80,66,plaque);
    decoration.lineStyle(2,HUD.gold,.95).strokeRoundedRect(width/2-40,-2,80,66,plaque);
    decoration.lineStyle(1,HUD.gold,.4).strokeRoundedRect(width/2-35,-2,70,61,{ tl: 0, tr: 0, bl: 10, br: 10 });
    // Only the fighter's name under each bar; side and portrait already tell the players apart.
    const labels=[scene.add.text(fighterIds ? 82 : 28,30,fighterNames[0].toUpperCase(),hudText(18,true)),
      scene.add.text(width-(fighterIds ? 82 : 28),30,fighterNames[1].toUpperCase(),hudText(18,true)).setOrigin(1,0)];
    const portraits = fighterIds ? fighterIds.map((id,index) => { const icon = scene.add.image(0,0,`fighter-icon-${id}`); placeFighterIcon(icon,id,index === 0 ? 40 : width-40,39,76); return icon; }) : [];
    this.healthGraphics=scene.add.graphics();
    this.rageLabels=[scene.add.text(45,heightForRage(rageRaised)+12,'',hudText(10,true,HUD.goldText)),scene.add.text(width-45,heightForRage(rageRaised)+12,'',hudText(10,true,HUD.goldText)).setOrigin(1,0)];
    this.rageLevels=[scene.add.text(24,heightForRage(rageRaised)+5,'0',hudText(16,true,HUD.goldText)).setOrigin(.5),scene.add.text(width-24,heightForRage(rageRaised)+5,'0',hudText(16,true,HUD.goldText)).setOrigin(.5)];
    this.modeLabels=[scene.add.text(fighterIds ? 82 : 30,53,'',hudText(10,false,HUD.muted)),
      scene.add.text(width-(fighterIds ? 82 : 30),53,'',hudText(10,false,HUD.muted)).setOrigin(1,0)];
    this.timer=scene.add.text(width/2,4,'99',hudText(28,true)).setOrigin(.5,0);
    this.roundLabel=scene.add.text(width/2,38,'ROUND 1',hudText(10,true,HUD.goldText)).setOrigin(.5,0);
    this.hitLabel=scene.add.text(width/2,78,'',{...hudText(11,false,HUD.goldText),align:'center',wordWrap:{width:540}}).setOrigin(.5,0).setVisible(training);
    // Combos: a large hit count under each health bar, on the player's own side, with the damage beneath it.
    const comboX = training ? 210 : 30;
    this.comboCounts=[scene.add.text(comboX,88,'',{...hudText(58,true),strokeThickness:6}),
      scene.add.text(width-comboX,88,'',{...hudText(58,true),strokeThickness:6}).setOrigin(1,0)];
    this.comboWords=[scene.add.text(comboX,118,'',hudText(18,true)),scene.add.text(width-comboX,118,'',hudText(18,true)).setOrigin(1,0)];
    this.comboDetails=[scene.add.text(comboX+2,154,'',hudText(13,true,HUD.goldText)),
      scene.add.text(width-comboX-2,154,'',{...hudText(13,true,HUD.goldText),align:'right'}).setOrigin(1,0)];
    // Combo breaker outcome, shown in the combo slot of the fighter who tried it.
    this.breakerLabels=[scene.add.text(comboX,100,'',{...hudText(30,true),strokeThickness:5}),
      scene.add.text(width-comboX,100,'',{...hudText(30,true),strokeThickness:5}).setOrigin(1,0)];
    this.pauseHint=scene.add.text(width/2,LOGICAL_VIEW.height-18,'',hudText(10,false,HUD.muted)).setOrigin(.5).setVisible(!training);
    this.root=scene.add.container(0,0,[decoration,this.healthGraphics,...portraits,...labels,...this.modeLabels,...this.rageLabels,...this.rageLevels,
      this.timer,this.roundLabel,this.hitLabel,...this.comboCounts,...this.comboWords,...this.comboDetails,...this.breakerLabels,this.pauseHint]).setScrollFactor(0).setDepth(100);
  }

  update(snapshot: SimulationSnapshot, width: number): void {
    this.timer.setText(this.training?'∞':String(Math.ceil(snapshot.roundFramesRemaining/60)).padStart(2,'0'));
    this.roundLabel.setText(this.training?this.practiceLabel:t('hud.round', { round: snapshot.round })).setFontSize(this.training?9:10);
    this.pauseHint.setText(t('hud.pauseHint', { key: keyLabel(getSystemControls().pause) }));
    const latest=snapshot.recentContacts[snapshot.recentContacts.length-1];
    if(snapshot.frame<this.lastImpactFrame){this.lastImpactLabel='';this.lastImpactFrame=Number.NEGATIVE_INFINITY;}
    if(latest&&latest.frame>this.lastImpactFrame){this.lastImpactLabel=contactLabel(latest.event);this.lastImpactFrame=latest.frame;}
    this.hitLabel.setText(snapshot.frame-this.lastImpactFrame<=90?this.lastImpactLabel:'');
    snapshot.characters.forEach((character,index) => {
      const notice = snapshot.breakerNotices.find(entry => entry.characterId === character.characterId && snapshot.frame - entry.frame <= BREAKER_NOTICE_FRAMES);
      const breaker = this.breakerLabels[index]!;
      setTextColor(breaker.setText(notice ? t('hud.breakerSuccess') : ''),
        HUD.ivory);
      const combo = snapshot.comboHistory.filter(record => record.attackerId === character.characterId).pop();
      const shown = !notice && combo && combo.hits > 1 && (combo.active || snapshot.frame - combo.lastFrame <= 120) ? combo : undefined;
      const count = this.comboCounts[index]!, word = this.comboWords[index]!;
      setTextColor(count.setText(shown ? String(shown.hits) : ''), HUD.ivory);
      // The word sits beside the number, on the inner side, so the count always reads first.
      word.setText(shown ? t('hud.comboHits') : '').setX(index === 0 ? count.x + count.width + 6 : count.x - count.width - 6);
      this.comboDetails[index]?.setText(shown ? t('hud.comboDamage', { damage: shown.damage }) : '');
    });
    this.healthGraphics.clear();
    snapshot.characters.forEach((character,index)=>{
      const x=index===0?this.sidePadding:width-this.sidePadding-this.barWidth;
      const g=this.healthGraphics;
      // Health: a square ink case with a cream rim and a flat fill in the player's colour.
      g.fillStyle(HUD.ink,.92).fillRect(x-4,6,this.barWidth+8,25);
      g.fillStyle(HUD.rail).fillRect(x,10,this.barWidth,17);
      const fill=healthBarFill(character.health,character.maxHealth,x+3,this.barWidth-6,index===1);
      if(fill.width>0) g.fillStyle(HUD.players[index]).fillRect(fill.x,12,fill.width,13);
      g.lineStyle(2,HUD.gold,.95).strokeRect(x-4,6,this.barWidth+8,25);
      for(let round=0;round<2;round++)drawRoundMarker(g,index===0?width/2-52-round*14:width/2+52+round*14,40,4,HUD.players[index],snapshot.roundWins[index]>round);
      if(character.maxRage>0){
        const rageWidth=260, rageX=index===0?45:width-45-rageWidth, rageY=heightForRage(this.rageRaised);
        // Rage: one separate cell per meter section; each bar fills white, then yellow, then red, from the outer edge inwards.
        const sections = RAGE_LEVEL / RAGE_SEGMENT, gap = 4, cell = (rageWidth - 10 - gap * (sections - 1)) / sections;
        for (let section = 0; section < sections; section++) {
          const order = index === 0 ? section : sections - 1 - section, cellX = rageX + 5 + section * (cell + gap);
          g.fillStyle(HUD.ink,.95).fillRoundedRect(cellX - 2, rageY - 2, cell + 4, 14, 4);
          g.fillStyle(HUD.rail).fillRoundedRect(cellX, rageY, cell, 10, 3);
          for (const [level, color] of HUD.rage.entries()) {
            const amount = Math.max(0, Math.min(1, (character.rage - level * RAGE_LEVEL - order * RAGE_SEGMENT) / RAGE_SEGMENT));
            const part = healthBarFill(amount, 1, cellX, cell, index === 1);
            if (part.width > 0) g.fillStyle(color).fillRoundedRect(part.x, rageY, part.width, 10, Math.min(3, part.width / 2));
          }
          g.lineStyle(1, HUD.gold, .8).strokeRoundedRect(cellX - 2, rageY - 2, cell + 4, 14, 4);
        }
        // The completed rage levels sit in a small seal at the outer end of the rail.
        const sealX = index === 0 ? 24 : width - 24;
        g.fillStyle(HUD.ink, .95).fillCircle(sealX, rageY + 5, 13);
        g.lineStyle(1.5, HUD.gold, .95).strokeCircle(sealX, rageY + 5, 13);

      }
      this.rageLabels[index]?.setText(character.rush?'RUSH':'');
      this.rageLevels[index]?.setText(character.maxRage > 0 ? String(Math.min(3, Math.floor(character.rage / RAGE_LEVEL))) : '');
      // Fighting states are training instrumentation; a match shows only names, bars and the round.
      setTextColor(this.modeLabels[index]!.setText(this.training?stateLabel(character.mode):''),
        character.mode==='hitstun'?'#f09a84':character.mode==='blockstun'||character.mode==='blocking'?'#95d7d0':HUD.muted);
    });
  }
  destroy():void{this.root.destroy(true);}
}

function heightForRage(raised: boolean): number { return LOGICAL_VIEW.height - (raised ? 122 : 39); }
