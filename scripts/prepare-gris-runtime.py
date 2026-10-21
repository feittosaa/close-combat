"""Author explicit Gris atlas metadata; preserve all source PNG pixels unchanged."""
from pathlib import Path
from PIL import Image
from scipy.ndimage import label,find_objects
import numpy as np, json, shutil

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'src/assets/sprites/characters/gris/sources';OUT=SOURCE.parent/'runtime'
OUT.mkdir(exist_ok=True)
ROWS={
 'movement':['idle','walk','crouch','jump'],
 'normals':['standing-lp','standing-rp','standing-lk','standing-rk'],
 'crouching':['crouching-lp','crouching-rp','crouching-lk','crouching-rk'],
 'air':['air-lp','air-rp','air-lk','air-rk'],
 'specials':['golden-arc','rising-shear','silk-step','royal-cleave'],
 'reactions':['hit','knockdown','getup','victory'],
 'defense':['defense','crouch-defense','forward-throw','taunt'],
}
REPLACED=['standing-rp','crouching-rp','golden-arc','silk-step','royal-cleave']
SCALES={'movement':.61,'normals':.63,'crouching':.61,'air':.61,'specials':.67,'reactions':.60,'defense':.60}
# Body axes authored by inspecting the 1280-wide source previews. A sole can be
# farther forward than the hips, so bottom-pixel medians are not actor pivots.
BODY_AXES={
 'idle':[200,500,805,1115], 'walk':[200,510,815,1135],
 'crouch':[205,515,825,1140], 'jump':[200,510,815,1140],
 'standing-lp':[165,460,800,1120], 'standing-lk':[175,450,795,1120],
 'standing-rk':[175,450,805,1130], 'crouching-lp':[185,485,800,1120],
 'crouching-lk':[190,495,800,1120], 'crouching-rk':[190,460,800,1115],
 'air-lp':[200,475,795,1120], 'air-rp':[195,470,790,1130],
 'air-lk':[190,475,800,1135], 'air-rk':[190,475,800,1140],
 'rising-shear':[200,500,820,1120], 'hit':[230,505,810,1130],
 'knockdown':[155,480,760,1090], 'getup':[145,500,830,1125],
 'victory':[180,500,810,1120], 'defense':[190,470,780,1100],
 'crouch-defense':[185,500,805,1110], 'forward-throw':[160,470,775,1115],
 'taunt':[180,490,805,1125],
}
CLEAN_AXES={
 'standing-rp':[285,870,310,1010], 'crouching-rp':[285,840,300,1020],
 'golden-arc':[300,820,300,1080], 'silk-step':[260,890,340,995],
 'royal-cleave':[325,850,345,1035],
}
CANVAS,CENTER,FLOOR=2048,1024,1600
frames={};named={};transforms={};textures={};atlases={};components={};sources=[];original={};clips=[];actions={};excluded=[]

def load(sheet):
 p=SOURCE/f'gris-{sheet}.png';im=Image.open(p);assert im.mode=='RGBA' and im.getextrema()[3][0]==0,p
 shutil.copy2(p,OUT/p.name)
 a=np.array(im);ls,n=label(a[:,:,3]>16,structure=np.ones((3,3)));cs=np.bincount(ls.ravel());boxes=[]
 for i,sl in enumerate(find_objects(ls)):
  if cs[i+1]>800:
   y,x=sl;boxes.append((i+1,x.start,y.start,x.stop,y.stop))
 components[sheet]=(a,ls,cs,boxes)
 atlases[sheet]={'frames':{},'meta':{'image':p.name,'size':{'w':im.width,'h':im.height},'format':'RGBA8888','scale':'1'}}
 sources.append({'key':f'gris-{sheet}','image':f'gris/runtime/{p.name}','atlas':f'gris/runtime/gris-{sheet}.atlas.json'})
 return im.width,im.height,boxes

def clean(sheet,b):
 own,x,y,x1,y1=b;a,ls,cs,_=components[sheet]
 hist=np.bincount(ls[y:y1,x:x1].ravel(),minlength=len(cs));foreign=[j for j in np.where((hist>16)&(cs>800))[0] if j not in [0,own]]
 return not foreign and min(x,y)>0 and x1<a.shape[1] and y1<a.shape[0]

def add(name,sheet,b,scale,root_x=None,root_y=None,effect=False):
 if name in named:return named[name]
 own,x,y,x1,y1=b;a,ls,cs,_=components[sheet]
 assert clean(sheet,b),('contaminated/boundary frame',name)
 if root_x is None:
  band=(ls[max(y,y1-12):y1,x:x1]==own)
  xs=np.where(band)[1]
  root_x=x+float(np.median(xs)) if len(xs) else (x+x1)/2
 if root_y is None:root_y=y1
 idx=len(named);named[name]=idx
 rect={'x':x,'y':y,'w':x1-x,'h':y1-y}
 ox,oy=round(CENTER+x-root_x),round(FLOOR+y-root_y)
 assert ox>=0 and oy>=0 and ox+rect['w']<=CANVAS and oy+rect['h']<=CANVAS,name
 gold=(a[y:y1,x:x1,0]>120)&(a[y:y1,x:x1,1]>70)&(a[y:y1,x:x1,2]<a[y:y1,x:x1,1]*.78)&(a[y:y1,x:x1,0]<a[y:y1,x:x1,1]*2.05)&(a[y:y1,x:x1,3]>16)
 assert int(gold.sum())>300,(name,'missing golden weapon/energy')
 frames[str(idx)]={'name':name,'sheet':sheet,'sourceRect':rect,'rootX':root_x,'footY':root_y,'scale':scale,'goldPixels':int(gold.sum()),'weaponReviewed':not effect}
 transforms[str(idx)]={'scale':scale};textures[str(idx)]=f'gris-{sheet}'
 atlases[sheet]['frames'][str(idx)]={'frame':rect,'rotated':False,'trimmed':True,'spriteSourceSize':{'x':ox,'y':oy,'w':rect['w'],'h':rect['h']},'sourceSize':{'w':CANVAS,'h':CANVAS}}
 return idx

def make_clip(name,ids,loop=False,rate=12,durations=None):
 clip={'key':f'gris-{name}','start':min(ids),'end':max(ids),'frames':ids,'frameRate':rate,'repeat':-1 if loop else 0,'sourceFacesLeft':False}
 if durations is not None:clip['frameDurations']=durations
 return clip

def return_loop(ids):
 return ids+ids[-2:0:-1]

for sheet,names in ROWS.items():
 w,h,boxes=load(sheet)
 for row,name in enumerate(names):
  rowboxes=sorted([b for b in boxes if int((b[2]+b[4])/2/(h/4))==row],key=lambda b:b[1])
  assert len(rowboxes)==4,(sheet,row,len(rowboxes))
  original[name]=(sheet,rowboxes)
  if name in REPLACED:continue
  selected=[i for i,b in enumerate(rowboxes) if clean(sheet,b)]
  if name=='crouching-rk' or name=='air-rk':selected=[0,3]
  if name=='rising-shear':selected=[0,1,3]
  for i,b in enumerate(rowboxes):
   if i not in selected:excluded.append(f'gris-{name}-{i:02d}')
  ids=[]
  for i in selected:
   b=rowboxes[i];root_x=BODY_AXES[name][i]*w/1280
   ids.append(add(f'gris-{name}-{i:02d}',sheet,b,SCALES[sheet],root_x=root_x))
  actions[name]=ids

for name in REPLACED:
 sheet='clean-'+name;w,h,boxes=load(sheet)
 assert len(boxes)==4,(sheet,'expected four complete bodies',len(boxes))
 # A square quadrant grid avoids all wide-weapon intersections of the source strip.
 order=sorted(boxes,key=lambda b:(int((b[2]+b[4])/2/(h/2)),b[1]))
 assert all(clean(sheet,b) for b in order),('replacement not isolated',sheet)
 # Per-sheet authored scale; final standing body and face are checked in the review page.
 scale=.34
 actions[name]=[add(f'gris-{name}-clean-{i:02d}',sheet,b,scale,root_x=CLEAN_AXES[name][i]*w/1280) for i,b in enumerate(order)]

# Heavy low/aerial kicks share isolated extended-leg contact drawings, preserving the weapon.
actions['crouching-rk']=[actions['crouching-rk'][0],actions['crouching-lk'][2],actions['crouching-rk'][-1]]
actions['air-rk']=[actions['air-rk'][0],actions['air-lk'][2],actions['air-rk'][-1]]
for name,ids in actions.items():
 loop=name in ['idle','walk','crouch','defense','crouch-defense']
 durations=None
 if name=='idle':ids=return_loop(ids);durations=[14,10,14,10]
 elif name=='walk':ids=return_loop(ids);durations=[7]*len(ids)
 elif name=='crouch':ids=return_loop(ids);durations=[10]*len(ids)
 elif name in ['defense','crouch-defense']:ids=ids[1:3];durations=[12]*len(ids)
 clips.append(make_clip(name,ids,loop,10 if loop else 12,durations))
 if name=='jump':clips[-1]['airbornePoses']={'rising':ids[0],'apex':ids[1],'falling':ids[2],'apexSpeed':2}

moves=[n for names in ROWS.values() for n in names if n.startswith(('standing-','crouching-','air-'))]+['golden-arc','rising-shear','silk-step','royal-cleave','forward-throw']
for name in moves:
 ids=actions[name]
 startup,active,recovery=([ids[0]],ids[1:-1],[ids[-1],ids[0]])
 recovery_weights=None
 # Keep each cut readable through contact and follow-through. The weapon can
 # remain extended during recovery; only the engine's active phase can hit.
 if name in REPLACED:
  active=[ids[1]]
  recovery=[ids[2],ids[1],ids[3],ids[0]]
  recovery_weights=[5,2,3,2]
 elif name=='air-rp':
  active=[ids[1]]
  recovery=[ids[2],ids[3],ids[0]]
  recovery_weights=[5,3,2]
 elif name=='rising-shear':
  recovery=[ids[1],ids[2],ids[0]]
  recovery_weights=[3,4,2]
 if name=='standing-lk':startup,active,recovery=([ids[0]],[ids[1]],[ids[2],ids[3],ids[0]])
 if name=='crouching-lk':startup,active,recovery=([ids[0],ids[1]],[ids[2]],[ids[3],ids[0]])
 assert active,name
 for phase,ff in [('startup',startup),('active',active),('recovery',recovery)]:clips.append(make_clip(f'{name}-{phase}',ff,durations=recovery_weights if phase=='recovery' else None))
for name,ids,loop in [('dash',actions['walk'],True),('blockstun',actions['defense'],False),('grabbed',actions['hit'][:2]+actions['knockdown'][:2],False),('throw-recovery',actions['forward-throw'][-1:],False)]:clips.append(make_clip(name,ids,loop,14 if name=='dash' else 12))
dash=next(clip for clip in clips if clip['key']=='gris-dash')
dash['frames']=return_loop(actions['walk']);dash['frameDurations']=[4]*len(dash['frames'])

# Energy is a separate texture; the scissors remain in every actor frame.
sheet='effects';w,h,boxes=load(sheet)
# Each effect's main connected crescent is isolated; small detached sparks are preserved if inside its rectangle.
ordered=sorted(boxes,key=lambda b:(int((b[2]+b[4])/2/(h/2)),b[1]))
assert len(ordered)==4,('effects component count',len(ordered))
fx=[]
for i,b in enumerate(ordered):
 _,x,y,x1,y1=b
 fx.append(add(f'gris-fx-golden-arc-{i:02d}',sheet,b,.105,root_x=x,root_y=(y+y1)/2,effect=True))
clips.append(make_clip('fx-golden-arc',[fx[1],fx[2],fx[3],fx[2]],True))
manifest={'textureKey':'gris-movement','frameSize':{'width':CANVAS,'height':CANVAS},'displaySize':{'width':CANVAS,'height':CANVAS},
 'footAnchorY':FLOOR,'totalFrames':len(named),'textureSources':sources,'frameTextures':textures,'frameTransforms':transforms,
 'clips':clips,'moveClips':{name:name for name in moves},'mappingNotes':{
 'weapon':'Uma tesoura dourada empunhada em cada pose corporal. O projétil é energia independente, não a arma.',
 'cleanup':'Retângulos contaminados ou tocando bordas foram excluídos. Cortes largos receberam quatro poses isoladas em quadrantes.',
 'shared':'Chutes fortes baixo/aéreo usam contatos isolados de suas famílias; dados de tempo/dano/caixa permanecem próprios.',
 'canvas':'Pivôs e escala são metadados autorados. Nenhum tamanho de colisão é inferido da imagem em runtime.'}}
(ROOT/'src/assets/animations/gris.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
for sheet,atlas in atlases.items():(OUT/f'gris-{sheet}.atlas.json').write_text(json.dumps(atlas,ensure_ascii=False,indent=2)+'\n')
(OUT/'frame-catalog.json').write_text(json.dumps(frames,ensure_ascii=False,indent=2)+'\n')
(OUT/'validation.json').write_text(json.dumps({'frames':len(named),'transparentPNGs':len(sources),'foreignSilhouettes':0,'excludedSourceFrames':excluded,'weaponVisibleInSelectedActorFrames':True,'runtimePlaybackReviewed':False},indent=2)+'\n')
print(f'Gris: {len(named)} isolated frames, {len(clips)} clips, {len(sources)} PNGs')
