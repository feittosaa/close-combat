import { expect, it } from 'vitest';
import { silhouetteContains } from '../ui/selectionHitTest';

it('considera a silhueta, as áreas transparentes e o alinhamento da imagem', () => {
  const rect = {left:100,top:50,width:200,height:200};
  const mask = {width:2,height:2,alpha:new Uint8Array([0,255,255,0])};
  // The 1:2 image fills the height and is centered horizontally, leaving transparent side margins.
  expect(silhouetteContains(rect,100,200,mask,110,100)).toBe(false);
  expect(silhouetteContains(rect,100,200,mask,170,75)).toBe(false);
  expect(silhouetteContains(rect,100,200,mask,230,75)).toBe(true);
  expect(silhouetteContains(rect,100,200,mask,170,200)).toBe(true);
  expect(silhouetteContains(rect,100,200,mask,230,200)).toBe(false);
  expect(silhouetteContains(rect,100,200,mask,230,250)).toBe(false);
});
