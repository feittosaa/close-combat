"""Build explicit atlas METADATA from selected unmodified PNGs. Never changes image pixels.
Requires Pillow, numpy and scipy for read-only isolation checks.
"""
from pathlib import Path
import json, shutil
from PIL import Image
import numpy as np
from scipy.ndimage import label, find_objects

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src/assets/sprites/characters/ayla/v01'
OUT = ROOT / 'src/assets/sprites/characters/ayla/runtime'
OUT.mkdir(parents=True, exist_ok=True)
SELECTED = SOURCE.parent / 'sources'
new_sources = {
 'cleanup': 'ayla-cleanup.png',
 'sweep-contact': 'ayla-sweep-contact.png',
 'rush-contact': 'ayla-rush-contact.png',
}
catalog = json.loads((SOURCE / 'catalog.json').read_text())
images = {}; atlases = {}; texture_sources = []; transforms = {}; textures = {}; named = {}; frame_info = {}
CANVAS, CENTER, FLOOR = 2048, 1024, 1888

for sheet in catalog['sheets']:
 if sheet['id'] == 'sweep-inverted': continue
 name = f'ayla-{sheet["id"]}.png'; shutil.copy2(SOURCE / sheet['image'], OUT / name)
 images[sheet['id']] = OUT / name
for sheet, filename in new_sources.items():
 target = OUT / f'ayla-{sheet}.png'
 shutil.copy2(SELECTED / filename, target)
 images[sheet] = target

components = {}
for sheet, path in images.items():
 im = Image.open(path)
 assert im.mode == 'RGBA' and im.getextrema()[3][0] == 0, path
 alpha = np.array(im)[:, :, 3] > 16
 labels, _ = label(alpha, structure=np.ones((3, 3)))
 counts = np.bincount(labels.ravel())
 boxes = []
 for i, sl in enumerate(find_objects(labels)):
  if counts[i+1] > 800:
   y, x = sl; boxes.append([x.start, y.start, x.stop, y.stop])
 components[sheet] = (labels, counts, sorted(boxes, key=lambda b: ((b[1]+b[3])//2, b[0])))
 key = f'ayla-{sheet}'
 texture_sources.append({'key': key, 'image': f'ayla/runtime/{path.name}', 'atlas': f'ayla/runtime/ayla-{sheet}.atlas.json'})
 atlases[sheet] = {'frames': {}, 'meta': {'image': path.name, 'size': {'w': im.width, 'h': im.height}, 'format': 'RGBA8888', 'scale': '1'}}

def add(name, sheet, rect, root_x, foot_y, scale):
 if name in named: return named[name]
 idx = len(named); named[name] = idx
 x,y,w,h = (rect[k] for k in ['x','y','w','h'])
 # Reject crops containing another substantial body. Isolation is authoring validation only.
 labels, counts, _ = components[sheet]
 hist = np.bincount(labels[y:y+h, x:x+w].ravel(), minlength=len(counts))
 bodies = np.where((hist > 16) & (counts > 800))[0]; bodies = bodies[bodies != 0]
 assert len(bodies) == 1, (name, 'foreign silhouette in rectangle', hist[bodies])
 ox, oy = round(CENTER + x - root_x), round(FLOOR + y - foot_y)
 assert 0 <= ox and ox+w <= CANVAS and 0 <= oy and oy+h <= CANVAS, name
 atlases[sheet]['frames'][str(idx)] = {'frame': rect, 'rotated': False, 'trimmed': True,
  'spriteSourceSize': {'x':ox,'y':oy,'w':w,'h':h}, 'sourceSize': {'w':CANVAS,'h':CANVAS}}
 transforms[str(idx)] = {'scale': round(scale, 5)}
 textures[str(idx)] = f'ayla-{sheet}'
 frame_info[str(idx)] = {'name':name, 'sheet':sheet, 'sourceRect':rect, 'rootX':root_x, 'footY':foot_y, 'scale':scale}
 return idx

def clip(name, frames, loop=False, phases=False):
 data = {'key':f'ayla-{name}', 'start':min(frames), 'end':max(frames), 'frames':frames,
  'frameRate':10 if loop else 12, 'repeat':-1 if loop else 0, 'sourceFacesLeft':False}
 return data

clips = []; actions = {}
for action in catalog['clips']:
 slug = action['id'].removeprefix('ayla-')
 if slug in ['crouching-rk','inverted-rising-kick','victory']: continue
 selected = list(range(action['frameCount']))
 if slug == 'scarlet-rush': selected = [0,1,2,6,7]
 if slug == 'getup': selected = [2,3,4,5,6,7]
 ids=[]
 for i in selected:
  f=action['frames'][i];r=f['sourceRect'];off=f['canvasOffset']
  scale=action['renderScale'] * .97
  root_x = r['x'] - (off['x']-256)
  foot = r['y'] - (off['y']-472)
  if slug=='jump' or slug.startswith('air-'): foot=r['y']+r['h']
  if slug.startswith('fx-'):
   root_x = r['x'] if slug=='fx-crimson-wave' else r['x']+r['w']/2
   scale = .16 if slug=='fx-crimson-wave' else .44
  ids.append(add(f['name'],action['sheet'],r,root_x,foot,scale))
 actions[slug]=ids
 clips.append(clip(slug,ids,action['repeat']==-1))

# All eight clean bodies are separate; the first two crouch poses and four victory poses are retained.
boxes=components['cleanup'][2]
assert len(boxes)==8
upper=sorted([b for b in boxes if b[1]<600],key=lambda b:b[0]);lower=sorted([b for b in boxes if b[1]>=600],key=lambda b:b[0])
assert len(upper)==4 and len(lower)==4
prep=[]
for i in [0,1]:
 x0,y0,x1,y1=upper[i]
 prep.append(add(f'ayla-clean-sweep-prep-{i}','cleanup',{'x':x0,'y':y0,'w':x1-x0,'h':y1-y0}, [175,460][i],594,.27))
for sheet, scale, root_x, slug in [('sweep-contact',.215,555,'crouching-rk'),('rush-contact',.23,550,'scarlet-rush')]:
 boxes=components[sheet][2]; assert len(boxes)==1
 x0,y0,x1,y1=boxes[0]
 active=add(f'ayla-clean-{sheet}',sheet,{'x':x0,'y':y0,'w':x1-x0,'h':y1-y0},root_x,y1,scale)
 if slug=='crouching-rk': frames=prep+[active]+list(reversed(prep))
 else: frames=actions[slug][:3]+[active]+actions[slug][3:]
 actions[slug]=frames
 clips=[c for c in clips if c['key']!=f'ayla-{slug}'];clips.append(clip(slug,frames))
 # Explicit phase split for replacement art with a single isolated contact drawing.
 for phase,ff in [('startup',frames[:2] if slug=='crouching-rk' else frames[:3]),('active',[active]),('recovery',list(reversed(prep)) if slug=='crouching-rk' else frames[4:])]:
  clips.append(clip(f'{slug}-{phase}',ff))

victory=[]
for i,(x0,y0,x1,y1) in enumerate(lower):
 victory.append(add(f'ayla-clean-victory-{i}','cleanup',{'x':x0,'y':y0,'w':x1-x0,'h':y1-y0},[180,480,805,1120][i],1207,.27))
actions['victory']=victory;clips.append(clip('victory',victory))

# State clips use grounded postures; jump draws follow the physical trajectory.
state_aliases={'crouch':actions['crouch-transition'][3:6]+[actions['crouch-transition'][4]],
 'defense':actions['standing-block'], 'blockstun':actions['standing-block'],
 'hit':actions['hit-high'][1:5], 'throw-recovery':actions['forward-throw'][5:]}
for name,frames in state_aliases.items():clips.append(clip(name,frames,name in ['crouch','defense']))
for c in clips:
 if c['key']=='ayla-jump':
  f=actions['jump'];c['frames']=[f[2],f[3],f[4],f[5]];c['start']=min(c['frames']);c['end']=max(c['frames']);c['airbornePoses']={'rising':f[2],'apex':f[3],'falling':f[5],'apexSpeed':2}
 if c['key']=='ayla-fx-crimson-wave':c['frames']=[actions['fx-crimson-wave'][i] for i in [2,3,4,3]]
 # The damaging pillar must be fully visible from its first active frame.
 if c['key']=='ayla-fx-ruby-eruption':c['frames']=[actions['fx-ruby-eruption'][i] for i in [3,4,3,4]]

move_clips={k:k for k in ['standing-lp','standing-rp','standing-lk','standing-rk','crouching-lp','crouching-rp','crouching-lk','crouching-rk','crimson-wave','scarlet-rush','rising-kick','leaping-kick','forward-throw']}
move_clips.update({'air-lp':'air-punch','air-rp':'air-punch','air-lk':'air-kick','air-rk':'air-kick','ruby-eruption':'crimson-wave'})
for name in set(move_clips.values()):
 if name in ['crouching-rk','scarlet-rush']:continue
 frames=actions[name]
 phases=[('startup',frames[:3]),('active',frames[3:5]),('recovery',frames[5:])]
 if name=='crimson-wave': phases=[('startup',frames[:3]),('active',[frames[3]]),('recovery',frames[4:])]
 if name=='leaping-kick': phases=[('startup',frames[:3]),('active',[frames[3]]),('recovery',frames[4:])]
 for phase,ff in phases:clips.append(clip(f'{name}-{phase}',ff))
manifest={'textureKey':'ayla-movement','frameSize':{'width':CANVAS,'height':CANVAS},
 'displaySize':{'width':CANVAS,'height':CANVAS},'footAnchorY':FLOOR,'totalFrames':len(named),
 'frameTransforms':transforms,'frameTextures':textures,'textureSources':texture_sources,
 'moveClips':move_clips,'clips':clips,
 'mappingNotes':{'cleanup':'Contatos de rasteira e investida e quatro poses de vitória redesenhados. Recortes contaminados excluídos. PNGs intactos; pivô/escala autorados por metadados.',
 'states':'Agachamento sustenta apenas poses baixas; salto acompanha velocidade física.',
 'shared':'Socos aéreos compartilham desenhos entre intensidades. Erupção reutiliza conjuração da onda. Tempos e caixas pertencem ao livro da Ayla.'}}
(ROOT/'src/assets/animations/ayla.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
for sheet,atlas in atlases.items():
 (OUT/f'ayla-{sheet}.atlas.json').write_text(json.dumps(atlas,ensure_ascii=False,indent=2)+'\n')
(OUT/'frame-catalog.json').write_text(json.dumps(frame_info,ensure_ascii=False,indent=2)+'\n')
(OUT/'validation.json').write_text(json.dumps({'transparentPNGs':len(images),'frames':len(named),'isolatedFrames':len(named),'canvas':CANVAS,'footAnchorY':FLOOR,'foreignSilhouettes':0,'runtimePlaybackReviewed':False},indent=2)+'\n')
print(f'{len(images)} PNGs, {len(named)} clean frame rectangles, {len(clips)} clips')
