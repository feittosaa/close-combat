import { t } from '../i18n/i18n';
import { HUD, hudText, drawHudPanel } from './hudTheme';
import Phaser from 'phaser';
import type { AttackButton, FrameInput } from '../input/types';
import { BUTTON_COLORS, getPlayerLayout, keyLabel } from '../input/controlSettings';
import type { InputHistoryEntry } from '../training/InputHistory';
import { DIRECTION_ARROWS, screenDirection } from './commandNotation';
import type { ComboRecord } from '../engine/simulation/Simulation';
const directions=['UB','U','UF','B','N','F','DB','D','DF'] as const;
const buttons=['1','2','3','4'] as const;
export class PlayerInputDisplay {
  private readonly root:Phaser.GameObjects.Container;
  private readonly directionKeys=new Map<string,Phaser.GameObjects.Text>();
  private readonly rageKey: Phaser.GameObjects.Text;
  private readonly attackKeys=new Map<AttackButton,Phaser.GameObjects.Text>();
  private readonly comboBest: Phaser.GameObjects.Text;
  private readonly comboRows: Phaser.GameObjects.Text;
  private readonly rows: {stamp:Phaser.GameObjects.Text; direction:Phaser.GameObjects.Text; buttons:Phaser.GameObjects.Text[]}[]=[];
  constructor(scene:Phaser.Scene,x:number,y:number,title:string,accent:string,private readonly playerIndex=0){
    const background=scene.add.graphics();drawHudPanel(background,x,y,180,238,playerIndex===0?HUD.players[0]:HUD.players[1],.86);
    const heading=scene.add.text(x+10,y+7,title,{...hudText(12,true,accent)});
    this.rageKey=scene.add.text(x+135,y+7,'',hudText(10,true,HUD.goldText));
    directions.forEach((direction,index)=>this.directionKeys.set(direction,scene.add.text(x+58+(index%3)*24,y+25+Math.floor(index/3)*15,DIRECTION_ARROWS[direction],hudText(14,true,HUD.muted))));
    buttons.forEach((button,index)=>this.attackKeys.set(button,scene.add.text(x+10+index*42,y+74,'',{color:BUTTON_COLORS[button],backgroundColor:'#221b16',fontSize:'13px',fontStyle:'bold',fixedWidth:34,align:'center',padding:{top:4,bottom:4}})));
    const historyLabel=scene.add.text(x+10,y+104,t('training.history'),hudText(9,false,HUD.muted));
    for(let row=0;row<10;row++){
      const yy=y+120+row*11;
      this.rows.push({stamp:scene.add.text(x+9,yy,'',hudText(9,false,HUD.muted)),direction:scene.add.text(x+65,yy,'',hudText(12,true,HUD.ivory)),buttons:[...buttons.map((b,i)=>scene.add.text(x+85+i*18,yy,'',{fontSize:'10px',fontStyle:'bold',color:BUTTON_COLORS[b]})),scene.add.text(x+157,yy,'',hudText(10,true,HUD.goldText))]});
    }
    // Second part of the inputs menu: combo history, best combo pinned on top.
    const comboY=y+244, comboBackground=scene.add.graphics();drawHudPanel(comboBackground,x,comboY,180,96,playerIndex===0?HUD.players[0]:HUD.players[1],.86);
    const comboHeading=scene.add.text(x+10,comboY+7,t('training.comboHistory'),hudText(10,true,accent));
    this.comboBest=scene.add.text(x+10,comboY+24,'',hudText(12,true,HUD.ivory));
    this.comboRows=scene.add.text(x+10,comboY+43,'',{...hudText(11,false,HUD.muted),lineSpacing:3});
    this.root=scene.add.container(0,0,[background,comboBackground,comboHeading,this.comboBest,this.comboRows,heading,this.rageKey,...this.directionKeys.values(),...this.attackKeys.values(),historyLabel,...this.rows.flatMap(row=>[row.stamp,row.direction,...row.buttons])]).setScrollFactor(0).setDepth(100);
  }
  update(input:FrameInput,history:readonly InputHistoryEntry[],facing:'left'|'right'='right',combos:readonly ComboRecord[]=[]):void {
    const layout=getPlayerLayout(this.playerIndex);
    this.updateCombos(combos);
    this.rageKey.setText(keyLabel(layout.rageAction)).setColor(input.rageAction ? '#ffffff' : HUD.muted);
    this.directionKeys.forEach((text,dir)=>text.setColor(screenDirection(input.direction,facing)===dir?'#efe4cc':HUD.muted));
    this.attackKeys.forEach((text,button)=>text.setText(keyLabel(layout.buttons[button])).setBackgroundColor(input.buttons.has(button)?'#5a3a2c':'#221b16').setColor(BUTTON_COLORS[button]));
    const entries=history.slice(-10).reverse();
    this.rows.forEach((row,index)=>{
      const entry=entries[index];row.stamp.setText(entry?`${entry.frame} · ${entry.duration}F`:'');
      const direction=entry ? screenDirection(entry.input.direction,entry.facing) : undefined;
      row.direction.setText(direction?DIRECTION_ARROWS[direction]:'');
      row.buttons.forEach((text,i)=>text.setText(i === 4 ? (entry?.input.rageAction ? keyLabel(layout.rageAction) : '') : entry?.input.buttons.has(buttons[i]) ? keyLabel(layout.buttons[buttons[i]]) : ''));
    });
  }
  private updateCombos(combos:readonly ComboRecord[]):void {
    const finished=combos.filter(combo=>combo.hits>1);
    const best=finished.reduce<ComboRecord|undefined>((top,combo)=>!top||combo.damage>top.damage||(combo.damage===top.damage&&combo.hits>top.hits)?combo:top,undefined);
    const row=(combo:ComboRecord)=>t('training.comboRow',{hits:combo.hits,damage:combo.damage});
    this.comboBest.setText(best?`${t('training.comboBest')} · ${row(best)}`:'');
    this.comboRows.setText(finished.filter(combo=>combo!==best).slice(-3).reverse().map(row).join('\n'));
  }
  destroy():void{this.root.destroy(true);}
  setVisible(visible:boolean):void{this.root.setVisible(visible);}
}
