import { LOGICAL_VIEW } from '../rendering/presentation';
import type Phaser from 'phaser';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import { contactLabel, MODE_LABELS } from './combatLabels';
import { getSystemControls, keyLabel } from '../input/controlSettings';
import { HUD, hudText, drawDiamond, healthBarFill } from './hudTheme';

/** Minimal HUD; all values and round markers reflect the same simulation snapshot. */
export class CombatHud {
  private readonly root: Phaser.GameObjects.Container;
  private readonly healthGraphics: Phaser.GameObjects.Graphics;
  private readonly timer: Phaser.GameObjects.Text;
  private readonly roundLabel: Phaser.GameObjects.Text;
  private readonly hitLabel: Phaser.GameObjects.Text;
  private readonly resultLabel: Phaser.GameObjects.Text;
  private readonly modeLabels: Phaser.GameObjects.Text[];
  private readonly healthLabels: Phaser.GameObjects.Text[];
  private readonly pauseHint: Phaser.GameObjects.Text;
  private lastImpactLabel = '';
  private lastImpactFrame = Number.NEGATIVE_INFINITY;
  private readonly barWidth = 360;
  private readonly sidePadding = 28;

  constructor(scene: Phaser.Scene, width: number, fighterNames: readonly [string,string] = ['JOGADOR 1','JOGADOR 2'], stageName = '', private readonly training = false, private readonly practiceLabel = 'TREINO LIVRE') {
    const decoration=scene.add.graphics();
    const labels=[scene.add.text(28,31,`P1  /  ${fighterNames[0].toUpperCase()}`,hudText(13,true)),
      scene.add.text(width-28,31,`P2  /  ${fighterNames[1].toUpperCase()}`,hudText(13,true)).setOrigin(1,0)];
    this.healthGraphics=scene.add.graphics();
    this.healthLabels=[scene.add.text(388,33,'',hudText(10,false,HUD.goldText)).setOrigin(1,0),
      scene.add.text(width-388,33,'',hudText(10,false,HUD.goldText))];
    this.modeLabels=[scene.add.text(30,49,'',hudText(10,false,HUD.muted)),
      scene.add.text(width-30,49,'',hudText(10,false,HUD.muted)).setOrigin(1,0)];
    this.timer=scene.add.text(width/2,6,'99',hudText(30,true)).setOrigin(.5,0);
    this.roundLabel=scene.add.text(width/2,41,'ROUND 1',hudText(10,false,HUD.goldText)).setOrigin(.5,0);
    const stageLabel=scene.add.text(width/2,61,stageName.toUpperCase(),hudText(9,false,HUD.muted)).setOrigin(.5,0);
    this.hitLabel=scene.add.text(width/2,78,'',{...hudText(11,false,HUD.goldText),align:'center',wordWrap:{width:540}}).setOrigin(.5,0).setVisible(training);
    this.resultLabel=scene.add.text(width/2,98,'',{...hudText(17,true),stroke:'#17131a',strokeThickness:4,align:'center'}).setOrigin(.5,0);
    this.pauseHint=scene.add.text(width/2,LOGICAL_VIEW.height-18,'',hudText(10,false,HUD.muted)).setOrigin(.5).setVisible(!training);
    this.root=scene.add.container(0,0,[decoration,...labels,this.healthGraphics,...this.healthLabels,...this.modeLabels,
      this.timer,this.roundLabel,stageLabel,this.hitLabel,this.resultLabel,this.pauseHint]).setScrollFactor(0).setDepth(100);
  }

  update(snapshot: SimulationSnapshot, width: number): void {
    this.timer.setText(this.training?'∞':String(Math.ceil(snapshot.roundFramesRemaining/60)).padStart(2,'0'));
    this.roundLabel.setText(this.training?this.practiceLabel:`ROUND ${snapshot.round}`).setFontSize(this.training?9:10);
    const winner=snapshot.characters.findIndex(c=>c.characterId===(snapshot.phase==='match-over'?snapshot.matchWinnerId:snapshot.roundWinnerId));
    const reset=keyLabel(getSystemControls().reset);
    const outcome=snapshot.roundEndReason==='knockout'?'K.O.':snapshot.roundEndReason==='time'?'TEMPO':'EMPATE';
    this.resultLabel.setText(snapshot.phase==='match-over' ? `${winner<0?'EMPATE':`P${winner+1} VENCE A LUTA`} · ${reset} REINICIAR`
      : snapshot.phase==='round-over'?`${outcome}${winner<0?'':` · P${winner+1} VENCE`}`:'');
    this.pauseHint.setText(`${keyLabel(getSystemControls().pause)} / ESC · PAUSA`);
    const latest=snapshot.recentContacts[snapshot.recentContacts.length-1];
    if(snapshot.frame<this.lastImpactFrame){this.lastImpactLabel='';this.lastImpactFrame=Number.NEGATIVE_INFINITY;}
    if(latest&&latest.frame>this.lastImpactFrame){this.lastImpactLabel=contactLabel(latest.event);this.lastImpactFrame=latest.frame;}
    this.hitLabel.setText(snapshot.frame-this.lastImpactFrame<=90?this.lastImpactLabel:'');
    this.healthGraphics.clear();
    snapshot.characters.forEach((character,index)=>{
      const x=index===0?this.sidePadding:width-this.sidePadding-this.barWidth;
      const g=this.healthGraphics;
      g.fillStyle(HUD.rail).fillRect(x,10,this.barWidth,17);
      const fill=healthBarFill(character.health,character.maxHealth,x+3,this.barWidth-6,index===1);
      if(fill.width>0){
        g.fillStyle(HUD.players[index]).fillRect(fill.x,12,fill.width,13);
        g.fillStyle(HUD.lightGold,.45).fillRect(fill.x,12,fill.width,1);
        g.fillStyle(0x000000,.22).fillRect(fill.x,24,fill.width,1);
      }
      g.lineStyle(1,HUD.gold,.9).strokeRect(x,10,this.barWidth,17);
      for(let round=0;round<2;round++)drawDiamond(g,index===0?420+round*16:width-420-round*16,19,3,HUD.lightGold,snapshot.roundWins[index]>round);
      this.healthLabels[index]?.setText(`${Math.max(0,character.health)} / ${character.maxHealth}`);
      this.modeLabels[index]?.setText(this.training?MODE_LABELS[character.mode]:index===0?'JOGADOR 1':'JOGADOR 2')
        .setColor(character.mode==='hitstun'?'#f09a84':character.mode==='blockstun'||character.mode==='blocking'?'#95d7d0':HUD.muted);
    });
  }
  destroy():void{this.root.destroy(true);}
}
