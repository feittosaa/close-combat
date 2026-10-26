"""Verify prepared pixels, independently of the runtime manifest (Pillow/NumPy/SciPy)."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label
ROOT=Path(__file__).resolve().parents[1]/'src/assets/sprites/characters/shoto'
config=json.loads((ROOT/'alignment.json').read_text())
width,height=config['cell']
foot=config['footAnchorY']
report={}
for name,spec in config['clips'].items():
    width,height=spec.get('cell',config['cell'])
    pixels=np.array(Image.open(ROOT/f'{name}.png').convert('RGBA'))
    assert pixels.shape==(height,width*len(spec['roots']),4)
    frames=[]
    for index in range(len(spec['roots'])):
        frame=pixels[:,index*width:(index+1)*width]
        opaque=frame[:,:,3]>128
        ys,xs=np.where(opaque)
        assert 0<xs.min()<=xs.max()<width-1 and 0<ys.min()<=ys.max()<height-1,(name,index,'clipping')
        magenta=(frame[:,:,0]>220)&(frame[:,:,1]<40)&(frame[:,:,2]>220)&opaque
        assert not magenta.any(),(name,index,'opaque magenta')
        if not spec.get('airborne', name=='jump'): assert foot-2<=ys.max()<=foot,(name,index,'foot drift')
        metrics={'opaqueBounds':[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]}
        if name=='crouch':
            sole=opaque[foot-20:foot].sum(axis=0)>3
            labels,count=label(sole)
            pieces=[np.where(labels==part)[0] for part in range(1,count+1) if (labels==part).sum()>8]
            metrics['plantedFootX']=float(pieces[0].mean())
        frames.append(metrics)
    report[name]=frames
roots=[frame['plantedFootX'] for frame in report['crouch']]
assert max(roots)-min(roots)<=3,('crouch horizontal drift',roots)
(ROOT/'verification.json').write_text(json.dumps({'crouchFootDriftPixels':max(roots)-min(roots),'frames':report},indent=2)+'\n')
print(f'{sum(len(spec["roots"]) for spec in config["clips"].values())} frames checked: transparent background, no clipping, grounded feet aligned; crouch X drift {max(roots)-min(roots):.1f}px.')
