"""Prepare approved magenta strips; no generated redraw or combat-data inference.
Requires Pillow, NumPy and SciPy. Re-run from repository root. Sources stay untouched.
"""
from pathlib import Path
import json
import numpy as np
from scipy.ndimage import label
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'src/assets/sprites/characters/shoto'
CELL = (512, 768)
FOOT = 720
SPECS = {
    'idle': ([167, 437, 707, 960, 1226, 1490, 1753, 2019], 0, 1.0),
    'walk': ([207, 460, 720, 983, 1244, 1499, 1755, 2011], 8, 1.025),
    'crouch': ([178, 553, 918, 1280, 1642, 2004], 16, 1.0),
}


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

report = {}
for name, (anchors, offset, scale) in SPECS.items():
    rgb = np.array(Image.open(ROOT/'source'/f'{name}-magenta.png').convert('RGB')).astype(float)
    # Key distance separates even antialiased pink edges from the warm character palette.
    chroma = np.minimum(rgb[:, :, 0], rgb[:, :, 2])-rgb[:, :, 1]
    keyed = (chroma>12) & (np.minimum(rgb[:,:,0],rgb[:,:,2]) > rgb[:,:,1]*1.5)
    alpha = np.ones(chroma.shape)
    alpha[keyed] = np.clip((35-chroma[keyed])/23,0,1)
    rgba = np.dstack((rgb, np.round(alpha*255))).astype('uint8')
    mask = alpha>.5
    h,w = mask.shape
    foot_seams = [400,550,812,1115,1420,1590,1850] if name=='walk' else [None]*(len(anchors)-1)
    upper_seams = [335,558,819,1080,1380,1590,1860] if name=='walk' else [(a+b)/2 for a,b in zip(anchors,anchors[1:])]
    seams = [np.zeros(h,dtype=int)] + [seam(mask,c,f) for c,f in zip(upper_seams,foot_seams)] + [np.full(h,w,dtype=int)]
    strip = Image.new('RGBA',(CELL[0]*len(anchors),CELL[1]))
    frames = {}
    metrics = []
    for i,anchor in enumerate(anchors):
        selected = (np.arange(w)[None,:]>=seams[i][:,None]) & (np.arange(w)[None,:]<seams[i+1][:,None])
        frame = rgba.copy(); frame[:,:,3][~selected]=0
        components,count = label(frame[:,:,3]>25)
        sizes = np.bincount(components.ravel()); sizes[0]=0
        frame[:,:,3][components!=sizes.argmax()] = 0
        ys,xs = np.where((frame[:,:,3]>128))
        left,right,top,bottom = int(xs.min()),int(xs.max())+1,int(ys.min()),int(ys.max())+1
        crop = Image.fromarray(frame).crop((left,top,right,bottom))
        crop = crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
        x = CELL[0]//2-round((anchor-left)*scale)
        y = FOOT-crop.height
        if x<0 or x+crop.width>CELL[0] or y<0:
            raise ValueError((name,i,'frame outside fixed cell',x,y,crop.size))
        strip.alpha_composite(crop,(i*CELL[0]+x,y))
        frames[str(offset+i)] = {'frame':{'x':i*CELL[0],'y':0,'w':CELL[0],'h':CELL[1]},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':CELL[0],'h':CELL[1]},'sourceSize':{'w':CELL[0],'h':CELL[1]}}
        metrics.append({'sourceBounds':[left,top,right,bottom],'sourceRootX':anchor,'scale':scale})
    for i in range(len(anchors)):
        cell = np.array(strip)[:,i*CELL[0]:(i+1)*CELL[0]]
        ys,xs = np.where(cell[:,:,3]>128)
        assert xs.min()>0 and xs.max()<CELL[0]-1 and ys.max()==FOOT-1, (name,i,'clipping or foot drift')
    strip.save(ROOT/f'{name}.png')
    (ROOT/f'{name}.atlas.json').write_text(json.dumps({'frames':frames,'meta':{'image':f'{name}.png','size':{'w':strip.width,'h':strip.height},'scale':'1'}},indent=2)+'\n')
    report[name] = metrics
(ROOT/'preparation.json').write_text(json.dumps({'cell':CELL,'footAnchorY':FOOT,'clips':report},indent=2)+'\n')
print('Prepared 8 idle, 8 walk and 6 crouch RGBA frames in fixed 512x768 cells.')
