import { HUD, hudText, drawHudPanel } from './hudTheme';
import Phaser from 'phaser';
import type { AttackButton, FrameInput } from '../input/types';
import { BUTTON_COLORS, getPlayerLayout, keyLabel } from '../input/controlSettings';
import type { InputHistoryEntry } from '../training/InputHistory';
import { DIRECTION_ARROWS, screenDirection } from './commandNotation';
const directions=['UB','U','UF','B','N','F','DB','D','DF'] as const;
const buttons=['1','2','3','4'] as const;
export class PlayerInputDisplay {
  private readonly root:Phaser.GameObjects.Container;
  private readonly directionKeys=new Map<string,Phaser.GameObjects.Text>();
  private readonly attackKeys=new Map<AttackButton,Phaser.GameObjects.Text>();
  private readonly rows: {stamp:Phaser.GameObjects.Text; direction:Phaser.GameObjects.Text; buttons:Phaser.GameObjects.Text[]}[]=[];
  constructor(scene:Phaser.Scene,x:number,y:number,title:string,accent:string,private readonly playerIndex=0){
    const background=scene.add.graphics();drawHudPanel(background,x,y,180,238,playerIndex===0?HUD.players[0]:HUD.players[1],.86);
    const heading=scene.add.text(x+10,y+7,title,{...hudText(12,true,accent)});
    directions.forEach((direction,index)=>this.directionKeys.set(direction,scene.add.text(x+58+(index%3)*24,y+25+Math.floor(index/3)*15,DIRECTION_ARROWS[direction],{color:HUD.muted,fontSize:'14px'})));
    buttons.forEach((button,index)=>this.attackKeys.set(button,scene.add.text(x+10+index*42,y+74,'',{color:BUTTON_COLORS[button],backgroundColor:'#33272b',fontSize:'13px',fontStyle:'bold',fixedWidth:34,align:'center',padding:{top:4,bottom:4}})));
    const historyLabel=scene.add.text(x+10,y+104,'HISTÓRICO · MAIS RECENTE ↑',{color:'#b8b0c5',fontSize:'9px'});
    for(let row=0;row<10;row++){
      const yy=y+120+row*11;
      this.rows.push({stamp:scene.add.text(x+9,yy,'',{fontSize:'9px',color:'#a8a2b4'}),direction:scene.add.text(x+65,yy,'',{fontSize:'12px',color:'#f1e2bf'}),buttons:buttons.map((b,i)=>scene.add.text(x+85+i*21,yy,'',{fontSize:'10px',fontStyle:'bold',color:BUTTON_COLORS[b]}))});
    }
    this.root=scene.add.container(0,0,[background,heading,...this.directionKeys.values(),...this.attackKeys.values(),historyLabel,...this.rows.flatMap(row=>[row.stamp,row.direction,...row.buttons])]).setScrollFactor(0).setDepth(100);
  }
  update(input:FrameInput,history:readonly InputHistoryEntry[],facing:'left'|'right'='right'):void {
    const layout=getPlayerLayout(this.playerIndex);
    this.directionKeys.forEach((text,dir)=>text.setColor(screenDirection(input.direction,facing)===dir?'#ffe09b':HUD.muted));
    this.attackKeys.forEach((text,button)=>text.setText(keyLabel(layout.buttons[button])).setBackgroundColor(input.buttons.has(button)?'#754835':'#33272b').setColor(BUTTON_COLORS[button]));
    const entries=history.slice(-10).reverse();
    this.rows.forEach((row,index)=>{
      const entry=entries[index];row.stamp.setText(entry?`${entry.frame} · ${entry.duration}F`:'');
      const direction=entry ? screenDirection(entry.input.direction,entry.facing) : undefined;
      row.direction.setText(direction?DIRECTION_ARROWS[direction]:'');
      row.buttons.forEach((text,i)=>text.setText(entry?.input.buttons.has(buttons[i])?keyLabel(layout.buttons[buttons[i]]):''));
    });
  }
  destroy():void{this.root.destroy(true);}
  setVisible(visible:boolean):void{this.root.setVisible(visible);}
}
