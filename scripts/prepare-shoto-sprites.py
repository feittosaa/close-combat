"""Prepare approved magenta strips; no generated redraw or combat-data inference.
Requires Pillow, NumPy and SciPy. Re-run from repository root. Sources stay untouched.
"""
from pathlib import Path
import json
import sys
import numpy as np
from scipy.ndimage import label
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'src/assets/sprites/characters/shoto'
CONFIG = json.loads((ROOT/'alignment.json').read_text())
CELL = tuple(CONFIG['cell'])
FOOT = CONFIG['footAnchorY']
SPECS = CONFIG['clips']


def seam(mask, center, foot_center=None):
    """Find a smooth vertical separator through background between adjacent drawings."""
    height, width = mask.shape
    foot_center = center if foot_center is None else foot_center
    expected = center + (foot_center-center)*np.clip((np.arange(height)-height*.65)/(height*.22),0,1)
    lo, hi = max(0, int(min(center,foot_center))-20), min(width, int(max(center,foot_center))+20)
    distance = abs(np.arange(lo,hi)[None,:]-expected[:,None])
    cost = mask[:, lo:hi].astype(float)*1000 + distance*5
    cost[distance>20] = np.inf
    history = np.zeros((height, hi-lo), dtype=np.int16)
    previous = cost[0].copy()
    shifts = range(-4, 5)
    for y in range(1, height):
        choices = np.stack([np.roll(previous, shift)+abs(shift)*.1 for shift in shifts])
        for i, shift in enumerate(shifts):
            if shift > 0: choices[i, :shift] = np.inf
            if shift < 0: choices[i, shift:] = np.inf
        choice = choices.argmin(axis=0)
        history[y] = np.array(list(shifts))[choice]
        previous = cost[y]+choices[choice, np.arange(hi-lo)]
    x = int(previous.argmin())
    result = np.zeros(height, dtype=int)
    for y in range(height-1, -1, -1):
        result[y] = x+lo
        x -= int(history[y, x])
    return result

report = json.loads((ROOT/'preparation.json').read_text()).get('clips',{}) if len(sys.argv)>1 and (ROOT/'preparation.json').exists() else {}
for name, spec in SPECS.items():
    if len(sys.argv)>1 and name not in sys.argv[1:]: continue
    frame_cell=tuple(spec.get('cell',CELL))
    anchors, offset, scale = spec['roots'], spec['offset'], spec['scale']
    rgb = np.array(Image.open(ROOT/'source'/spec.get('source',f'{name}-auburn.png')).convert('RGB')).astype(float)
    chroma = np.minimum(rgb[:, :, 0], rgb[:, :, 2])-rgb[:, :, 1]
    keyed = (chroma>12) & (np.minimum(rgb[:,:,0],rgb[:,:,2]) > rgb[:,:,1]*1.5)
    if spec.get('key')=='balanced': keyed &= np.abs(rgb[:,:,0]-rgb[:,:,2]) < np.maximum(rgb[:,:,0],rgb[:,:,2])*.35
    alpha = np.ones(chroma.shape)
    alpha[keyed] = np.clip((35-chroma[keyed])/23,0,1)
    rgba = np.dstack((rgb, np.round(alpha*255))).astype('uint8')
    mask = alpha>.5
    h,w = mask.shape
    components,count = label(mask)
    sizes = np.bincount(components.ravel()); sizes[0]=0
    # Only walking drawings touch. Other strips have one independent body per pose.
    bodies=[]
    if name!='walk':
        for component in np.where(sizes>30000)[0]:
            ys,xs=np.where(components==component)
            bodies.append((float(xs.mean()),component))
        bodies.sort()
        if len(bodies)!=len(anchors): raise ValueError((name,'unexpected body count',len(bodies)))
    else:
        foot_seams=[400,550,812,1115,1420,1590,1850]
        upper_seams=[335,558,819,1080,1380,1590,1860]
        seams=[np.zeros(h,dtype=int)]+[seam(mask,c,f) for c,f in zip(upper_seams,foot_seams)]+[np.full(h,w,dtype=int)]
    strip = Image.new('RGBA',(frame_cell[0]*len(anchors),frame_cell[1]))
    frames = {}
    metrics = []
    for i,anchor in enumerate(anchors):
        frame = rgba.copy()
        if name=='walk':
            selected=(np.arange(w)[None,:]>=seams[i][:,None]) & (np.arange(w)[None,:]<seams[i+1][:,None])
            frame[:,:,3][~selected]=0
            pieces,_=label(frame[:,:,3]>25)
            piece_sizes=np.bincount(pieces.ravel());piece_sizes[0]=0
            frame[:,:,3][pieces!=piece_sizes.argmax()]=0
        else:
            from scipy.ndimage import binary_dilation
            selected=binary_dilation(components==bodies[i][1],iterations=2)
            frame[:,:,3][~selected]=0
        ys,xs = np.where((frame[:,:,3]>128))
        left,right,top,bottom = int(xs.min()),int(xs.max())+1,int(ys.min()),int(ys.max())+1
        crop = Image.fromarray(frame).crop((left,top,right,bottom))
        crop = crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
        x = frame_cell[0]//2-round((anchor-left)*scale)
        root_y=spec.get('rootY',[bottom]*len(anchors))[i]
        y = FOOT-round((root_y-top)*scale)
        if x<0 or x+crop.width>frame_cell[0] or y<0:
            raise ValueError((name,i,'frame outside fixed cell',x,y,crop.size))
        strip.alpha_composite(crop,(i*frame_cell[0]+x,y))
        frames[str(offset+i)] = {'frame':{'x':i*frame_cell[0],'y':0,'w':frame_cell[0],'h':frame_cell[1]},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':frame_cell[0],'h':frame_cell[1]},'sourceSize':{'w':frame_cell[0],'h':frame_cell[1]}}
        metrics.append({'sourceBounds':[left,top,right,bottom],'sourceRootX':anchor,'sourceRootY':root_y,'scale':scale,'preparedRootX':frame_cell[0]//2,'preparedRootY':FOOT})
    for i in range(len(anchors)):
        cell = np.array(strip)[:,i*frame_cell[0]:(i+1)*frame_cell[0]]
        ys,xs = np.where(cell[:,:,3]>128)
        assert xs.min()>0 and xs.max()<frame_cell[0]-1 and ys.max()<frame_cell[1], (name,i,'clipping or foot drift')
    strip.save(ROOT/f'{name}.png')
    (ROOT/f'{name}.atlas.json').write_text(json.dumps({'frames':frames,'meta':{'image':f'{name}.png','size':{'w':strip.width,'h':strip.height},'scale':'1'}},indent=2)+'\n')
    report[name] = metrics
(ROOT/'preparation.json').write_text(json.dumps({'cell':CELL,'footAnchorY':FOOT,'clips':report},indent=2)+'\n')
print(f'Prepared {sum(len(frames) for frames in report.values())} RGBA frames; fixed per-clip cells, authored roots, no runtime pixel inference.')
