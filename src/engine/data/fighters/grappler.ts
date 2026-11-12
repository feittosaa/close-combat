import type { CharacterDefinition } from '../characters';
import { shoto } from './shoto';
import { RAGE_LEVEL } from '../../combat/rage';

// Dados provisórios próprios do Grappler: golpes mais lentos que os de Bob e caixas ampliadas (15% e, na tela, mais 10%).
const SIZE = 1.15 * 1.1;
const scaleBox = (box: CharacterDefinition['collision']['hurtboxes']['standing']) => ({
  offsetX: box.offsetX * SIZE, offsetY: box.offsetY * SIZE, width: box.width * SIZE, height: box.height * SIZE,
});
export const grappler: CharacterDefinition = {
  id: 'grappler', name: 'Grappler', maxHealth: shoto.maxHealth, defaultUltimateId:'ultimate-grab',
  movement: { ...shoto.movement, walkSpeed: shoto.movement.walkSpeed * .85,
    backwardWalkSpeed: shoto.movement.walkSpeed * .85 * .85,
    dashSpeed: shoto.movement.dashSpeed * .85, backdashSpeed: shoto.movement.backdashSpeed * .85, backdash: false, dash: false },
  collision: { bodyWidth: shoto.collision.bodyWidth * SIZE, hurtboxes: {
    standing: scaleBox(shoto.collision.hurtboxes.standing), crouching: scaleBox(shoto.collision.hurtboxes.crouching),
    airborne: scaleBox(shoto.collision.hurtboxes.airborne), knockdown: scaleBox(shoto.collision.hurtboxes.knockdown),
  } },
  juggle: shoto.juggle, rage: shoto.rage, moves: [
    { id:'light-punch', name:'Soco fraco', category:'basic', input:{buttons:['1']}, startup:10, activeFrames:3, recovery:18, damage:20, hitstun:15, blockstun:8, pushback:{hit:1, block:4}, hitLevel:'high', hitbox:{forward:32, yOffset:-192, width:81.3, height:44.8} },
    { id:'heavy-punch', name:'Soco forte', category:'basic', input:{buttons:['2']}, startup:16, activeFrames:4, recovery:28, damage:35, hitstun:18, blockstun:10, pushback:{hit:1, block:6}, hitLevel:'high', hitbox:{forward:38, yOffset:-190, width:70, height:50} },
    { id:'light-kick', name:'Chute fraco', category:'basic', input:{buttons:['3']}, startup:12, activeFrames:4, recovery:23, damage:25, hitstun:20, blockstun:9, pushback:{hit:1, block:5}, hitLevel:'low', hitbox:{forward:24.2, yOffset:-38.5, width:71.5, height:38.5} },
    { id:'heavy-kick', name:'Chute forte', category:'basic', oncePerCombo:'heavy-kick', input:{buttons:['4']}, startup:20, activeFrames:5, recovery:34, damage:45, hitstun:20, blockstun:11, pushback:{hit:1, block:8}, hitLevel:'mid', overhead:true, hitbox:{forward:55, yOffset:-190, width:90, height:100} },
    { id:'air-light-punch', name:'Soco fraco aéreo', category:'basic', input:{buttons:['1']}, airborne:true, notation:'no ar + 1', startup:10, activeFrames:3, recovery:18, damage:20, hitstun:15, blockstun:8, pushback:{hit:1, block:4}, hitLevel:'high', hitbox:{forward:40, yOffset:-75, width:55, height:55} },
    { id:'air-heavy-punch', name:'Soco forte aéreo', category:'basic', input:{buttons:['2']}, airborne:true, notation:'no ar + 2', startup:16, activeFrames:4, recovery:28, damage:35, hitstun:18, blockstun:10, pushback:{hit:1, block:6}, hitLevel:'high', hitbox:{forward:35, yOffset:-100, width:65, height:65} },
    { id:'crouch-punch', name:'Soco rápido abaixado', category:'crouching', input:{buttons:['1']}, crouching:true, notation:'d+1', startup:8, activeFrames:3, recovery:17, damage:18, hitstun:14, blockstun:8, pushback:{hit:1, block:3}, hitLevel:'low', hitbox:{forward:55, yOffset:-65, width:55, height:45} },
    { id:'crouch-uppercut', name:'Soco forte abaixado', category:'crouching', input:{buttons:['2']}, crouching:true, notation:'d+2', startup:14, activeFrames:6, recovery:34, damage:42, hitstun:24, blockstun:11, pushback:{hit:1, block:7}, hitLevel:'low', comboFinisher:true, hitbox:{forward:45, yOffset:-45, width:55, height:45} },
    { id:'crouch-light-kick', name:'Rasteiro rápido', category:'crouching', input:{buttons:['3']}, crouching:true, notation:'d+3', startup:11, activeFrames:4, recovery:15, damage:22, hitstun:15, blockstun:9, pushback:{hit:1, block:4}, hitLevel:'low', hitbox:{forward:50, yOffset:-70, width:70, height:45} },
    { id:'crouch-heavy-kick', name:'Chute baixo de longo alcance', category:'crouching', oncePerCombo:'heavy-kick', input:{buttons:['4']}, crouching:true, notation:'d+4', startup:18, activeFrames:5, recovery:36, damage:40, hitstun:23, blockstun:13, pushback:{hit:1, block:8}, hitLevel:'low', hitbox:{forward:45, yOffset:-80, width:70, height:50} },
    { id:'ultimate-grab', name:'Ultimate — Agarrão giratório', category:'ultimate', shortcutOnly:true, notation:'atalho de ultimate', input:{buttons:[]}, rageCost:RAGE_LEVEL, commandGrab:{launch:{velocity:-15,forward:0,recovery:20},airTarget:'also'}, startup:20, activeFrames:4, recovery:60, damage:480, hitstun:40, blockstun:0, pushback:{hit:0,block:0}, hitLevel:'mid', hitbox:{forward:10,yOffset:-185,width:90,height:175} },
    { id:'throw-13', name:'Agarrão normal', category:'throw', oncePerCombo:true, input:{buttons:['1','3']}, startup:20, activeFrames:4, recovery:35, damage:75, hitstun:33, blockstun:0, pushback:{hit:45,block:0}, hitLevel:'mid', knockdown:true, throwFlight:{frames:18,liftSpeed:-5}, hitbox:{forward:15,yOffset:-185,width:90,height:175} },
    { id:'double-punch', name:'Soco duplo', category:'power', oncePerCombo:true, input:{buttons:['1','2']}, startup:15, activeFrames:4, recovery:35, damage:100, hitstun:25, blockstun:15, pushback:{hit:4,block:10}, hitLevel:'mid', hitbox:{forward:35,yOffset:-180,width:95,height:65} },
    { id:'hammer-punch', name:'Martelada', category:'special', input:{buttons:['1','2'],sequence:['D','DF','F']}, startup:22, activeFrames:5, recovery:38, damage:140, hitstun:28, blockstun:16, pushback:{hit:5,block:10}, hitLevel:'mid', overhead:true, hitbox:{forward:25,yOffset:-95,width:90,height:95} },
    { id:'grab-headbutt', name:'Agarrão com cabeçada', category:'throw', oncePerCombo:true, commandGrab:{}, input:{buttons:['1'],sequence:['D','DF','F']}, startup:22, activeFrames:14, recovery:25, damage:100, hitstun:52, blockstun:0, pushback:{hit:0,block:0}, hitLevel:'mid', hitbox:{forward:15,yOffset:-185,width:90,height:175} },
    { id:'grab-slam', name:'Agarrão ao chão', category:'throw', oncePerCombo:true, commandGrab:{}, input:{buttons:['2'],sequence:['D','DF','F']}, startup:24, activeFrames:14, recovery:24, damage:120, hitstun:45, blockstun:0, pushback:{hit:0,block:0}, hitLevel:'mid', knockdown:true, hitbox:{forward:15,yOffset:-185,width:90,height:175} },
    { id:'grab-launcher', name:'Agarrão lançador', category:'throw', oncePerCombo:true, commandGrab:{launch:{velocity:-12,forward:35,recovery:5}}, input:{buttons:['2'],sequence:['D','DB','B']}, startup:24, activeFrames:4, recovery:32, damage:165, hitstun:35, blockstun:0, pushback:{hit:0,block:0}, hitLevel:'mid', hitbox:{forward:15,yOffset:-185,width:90,height:175} },
    { id:'grab-throw', name:'Arremesso distante', category:'throw', oncePerCombo:true, commandGrab:{}, input:{buttons:['2'],sequence:['B','DB','D','DF','F']}, startup:27, activeFrames:4, recovery:20, damage:190, hitstun:35, blockstun:0, pushback:{hit:300,block:0}, hitLevel:'mid', knockdown:true, wallBounce:true, throwFlight:{frames:22,liftSpeed:-5}, hitbox:{forward:15,yOffset:-185,width:90,height:175} },
    { id:'air-grab', name:'Agarrão aéreo', category:'throw', oncePerCombo:true, airborne:true, commandGrab:{downwardVelocity:9,airTarget:'only'}, input:{buttons:['1','2']}, startup:18, activeFrames:4, recovery:25, damage:180, hitstun:35, blockstun:0, pushback:{hit:0,block:0}, hitLevel:'mid', knockdown:true, hitbox:{forward:10,yOffset:-140,width:105,height:135} },
    { id:'grab-low', name:'Agarrão baixo', category:'throw', oncePerCombo:true, comboFinisher:true, commandGrab:{groundOnly:true}, input:{buttons:['3'],sequence:['D','DB','B']}, startup:34, activeFrames:4, recovery:30, damage:120, hitstun:35, blockstun:0, pushback:{hit:0,block:0}, hitLevel:'low', knockdown:true, hitbox:{forward:10,yOffset:-65,width:110,height:65} },
  ],
  combos: [{ id:'grab-chain', name:'A TODO VAPOR!', notation:'d,df,f,1 · d,df,f,2 · d,db,b,3', moveIds:['grab-headbutt','grab-slam','grab-low'] },
    { id:'grab-ground-followup', name:'LEVANTA!', notation:'d,df,f,2 · d,db,b,3', moveIds:['grab-slam','grab-low'] },
    { id: 'dev-mwcsxgt5', name: 'TIRO DE CANHÃO!', notation: '1,2,1+2', moveIds: ['light-punch', 'heavy-punch', 'double-punch'] },],
};
