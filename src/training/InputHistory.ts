import type { FrameInput } from '../input/types';
export interface InputHistoryEntry { input: FrameInput; frame: number; duration: number; facing: 'left'|'right' }
/** Edge history survives long neutral pauses. It does not feed the command parser. */
export class InputHistory {
  private entries: InputHistoryEntry[]=[];
  push(input:FrameInput,frame:number,facing:'left'|'right'):void {
    const last=this.entries[this.entries.length-1];
    if(last && last.facing===facing && last.input.direction===input.direction && last.input.dash===input.dash && last.input.buttons.size===input.buttons.size && [...input.buttons].every(b=>last.input.buttons.has(b))){last.duration++;return;}
    this.entries.push({input:{...input,buttons:new Set(input.buttons)},frame,duration:1,facing});
    if(this.entries.length>24)this.entries.shift();
  }
  snapshot():readonly InputHistoryEntry[]{return this.entries.map(entry=>({...entry,input:{...entry.input,buttons:new Set(entry.input.buttons)}}));}
  clear():void {this.entries=[];}
}
