"""Build Ayla's executable 2D adaptation from the credited, checked-in data snapshot.
No source art/site code is copied. Unknown geometry/timings are explicit adaptation values.
"""
import json,re,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source=json.loads((ROOT/'src/engine/data/reference/kazuya.json').read_text())
rows=source['rows']
raw={r['Command']:r for r in rows}
def slug(c): return 'ayla-'+hashlib.sha1(c.encode()).hexdigest()[:10]
def digits(s, default=0):
 m=re.search(r'-?\d+',s or '');return int(m.group()) if m else default
def vals(s):
 # Parenthetical damage is an alternate outcome, not an extra hit.
 if '[' in s: return [digits(s)]
 original=s
 if not re.search(r'\d', re.sub(r'\([^)]*\)','',s)): return [digits(original)] if re.search(r'\d',original) else []
 return [digits(v) for v in re.sub(r'\([^)]*\)','',s).replace('[','').replace(']','').replace(';',',').split(',') if re.search(r'\d',v)]
def clean(c):
 return re.sub(r'^(?:DVK\.|H\.|R\.)','',c)
def parent_for(c):
 candidates=[k for k in raw if k!=c and clean(c).startswith(clean(k)+',') and clean(k)!=clean(c)]
 return max(candidates,key=lambda k:len(clean(k)),default=None)
def range_tag(tags,prefix):
 m=re.search(r'\b'+prefix+r'(\d+)~(\d*)',tags)
 return {'from':int(m[1])-1,'to':int(m[2])-1 if m[2] else 999} if m else None
parents={c:parent_for(c) for c in raw}
# A slide is a startup cancel, not the ordinary 4 followed after its impact.
parents['4~3']='4'
parents['1,2,2~3']='1,2,2'
parents['df+3,2,1*']='df+3,2'
commands={}; moves=[]
for i,row in enumerate(rows):
 c=row['Command']; base=clean(c); parent=parents[c]; last=clean(c)[len(clean(parent))+1:] if parent else base
 specialmap={
 'Back throw':'b+1+3','Left throw':'f+1+3','Right throw':'f+2+4',
 'f,(even numbers frames).n':'f,n,b','f,(odd numbers frames).n':'b,n,f',
 '(back to wall).b,b,ub':'b,n,b,ub'}
 last=specialmap.get(c,last)
 stance=None
 for prefix,st in [('SS.','sway'),('BT.','backturned'),('hFC.','crouching'),('FC.','crouching'),('ws','rising')]:
  if last.startswith(prefix): stance=st;last=last[len(prefix):];break
 if c in ['4~3','1,2,2~3']:last='3'
 last=last.replace('*','').replace(':','+').lower()
 # f,n,d,df is read as directional edges. A final direction can be held for the button.
 directions=re.findall(r'(?<![a-z])(uf|ub|df|db|f|b|u|d|n)(?![a-z])',last)
 buttons=re.findall(r'[1-4]',last.split(',')[-1])
 if c=='f,(even numbers frames).n':directions=['f','n','b'];buttons=[]
 if c=='f,(odd numbers frames).n':directions=['b','n','f'];buttons=[]
 command={'notation':specialmap.get(c,c),'directions':[x.upper() for x in directions], 'buttons':buttons}
 if stance:command['stance']=stance
 if parent:
  command['parentId']=slug(parent)
  command['followupWindow']={'from':0,'to':22,'onHit': 'Only on hit' in row['Notes'] or 'Available only on 3rd hit' in row['Notes']}
 if c=='4~3':command['followupWindow']={'from':0,'to':3}
 if c=='1,2,2~3':command['followupWindow']={'from':15,'to':16}
 if '*' in c:command['holdFrames']=20
 if ':' in c:command['preciseFrames']=0
 if not parent and c.lower().startswith('f,n,d,df') and buttons:command['directionAliases']=[['F','N','DF'],['F','D','DF']]
 if c.startswith(('DVK.','H.')):command['requiresPower']=True
 if c.startswith('R.'):command['requiresRage']=True
 if 'OTG.' in c:command['targetGrounded']=True
 if c.startswith('(back to wall)'):command['atWall']=True
 commands[c]=command
 damage=vals(row['Damage']); parentcount=len(vals(raw[parent]['Damage'])) if parent else 0
 if c=='4~3':parentcount=0
 if c=='1,2,2~3':parentcount=2
 damage=damage[parentcount:]
 levels=[x.strip() for x in row['Hit level'].split(',')][parentcount:]
 startparts=row['Start up frame'].split(',')[parentcount:]
 if c=='4~3': startparts=re.findall(r'i\d+(?:~\d+)?',row['Start up frame'])
 tags=row['Tags']; strikes=[]; cursor=0; limb='body'
 for j,d in enumerate(damage):
  part=startparts[j] if j<len(startparts) else ''
  startup=digits(part, 12)
  # Explicitly adapted where the public table omits this hit's timing.
  startup=max(1,startup)
  cursor=(startup-1) if j==0 else cursor+startup
  widthmatch=re.search(r'(\d+)~(\d+)',part)
  duration=max(1,min(12,int(widthmatch[2])-int(widthmatch[1])+1)) if widthmatch else 1
  lev=levels[j] if j<len(levels) else (levels[-1] if levels else 'm')
  level='throw' if lev.startswith('th') or lev=='t' else 'low' if lev.lower().startswith('l') else 'high' if lev=='h' else 'mid'
  limb='knee' if 'kne' in tags else 'elbow' if 'elb' in tags else 'punch' if buttons and buttons[-1] in ['1','2'] else 'kick'
  reach=62 if limb in ['punch','elbow'] else 85
  y=-126 if level=='high' else -36 if level=='low' else -95
  box={'forward':13 if 'b+' in base else 18,'yOffset':y,'width':reach,'height':48 if level=='high' and limb=='kick' else 30 if level!='mid' else 56}
  strike={'from':cursor,'to':cursor+duration-1,'damage':d*4,'hitLevel':level,'hitbox':box,'hitstun':24,'blockstun':12,
          'screw':'trn' in tags,'wallSplat':'bbr' in tags or 'fbr' in tags,'requiresPriorHit':level=='throw','canHitGround':'OTG' in c or 'spk' in tags}
  # a = aerial reaction, d = grounded knockdown; numeric advantage alone is not launch.
  hit=row['Hit frame'];counter=row['Counter hit frame']
  if j==len(damage)-1 and re.search(r'\d+a\b',hit):strike['reaction']='launch'
  elif j==len(damage)-1 and re.search(r'\d+d\b',hit):strike['reaction']='knockdown'
  if j==len(damage)-1 and re.search(r'\d+a\b',counter):strike['counterReaction']='launch'
  elif j==len(damage)-1 and re.search(r'\d+d\b',counter):strike['counterReaction']='knockdown'
  if strike.get('reaction')=='launch':strike['wallSplat']=True
  if c=='f+1+2':strike['wallBounce']=True
  strikes.append(strike)
  cursor=strike['to']
 if 'Projectile' in row['Notes'] and strikes:
  shot=strikes[-1]
  shot['projectile']={'forward':48 if c!='DVK.db+3+4' else 80,'yOffset':0,'speed':8 if c!='DVK.db+3+4' else 0,'lifetimeFrames':50 if c!='DVK.db+3+4' else 12,
                      'hitbox':{'forward':0,'yOffset':-104 if c!='DVK.db+3+4' else -35,'width':80,'height':32},'animationId':'fx-crimson-wave','maxActive':1}
 if not strikes:cursor=0
 startup=strikes[0]['from'] if strikes else 0
 active=(strikes[-1]['to']-startup+1) if strikes else 1
 recovery=max(1,digits(row['Recovery'],24))
 # Missing recovery stays an authored 2D estimate, recorded below, not a verified source number.
 contact_recovery=17 if c=='1' else 18 if c=='f,n,d,df:2' else 21 if c=='f,n,d,df+2' else recovery # Jab: source distinguishes contact from whiff.
 block=digits(row['Block frame']);hit=digits(row['Hit frame'],8)
 for strike in strikes:
  strike['hitstun']=max(1,contact_recovery+hit)
  strike['blockstun']=max(1,contact_recovery+block+(active-1 if c in ['f,n,d,df:2','f,n,d,df+2'] else 0))
  if strike.get('reaction')=='launch':strike['hitstun']=max(26,strike['hitstun'])
 if parent:
  parentlast=next((m for m in moves if m['id']==slug(parent)),None)
  # Strings accept buffering before the continuation window; start only after preceding contact.
  if parentlast and c not in ['4~3','1,2,2~3']:
   command['followupWindow']['from']=parentlast['startup']+parentlast['activeFrames']
   command['followupWindow']['to']=command['followupWindow']['from']+max(22,command.get('holdFrames',0)+5)
 cats=['strings'] if parent else ['basics']
 if len(directions)>1 or c.startswith(('DVK.','H.','R.')):cats.append('specials')
 if stance in ['crouching','rising']:cats.append('crouching' if stance=='crouching' else 'rising')
 if 'OTG' in c or c.startswith('(back'):cats.append('wall')
 if any(x.get('reaction')=='launch' or x.get('counterReaction')=='launch' for x in strikes):cats.append('starters')
 if base.startswith(('d+','FC.','hFC.')) and 'crouching' not in cats:cats.append('crouching')
 if base.startswith('ws') and 'rising' not in cats:cats.append('rising')
 if stance in ['sway','backturned'] and 'stances' not in cats:cats.append('stances')
 if 'th(' in row['Hit level']:cats=['throws']+(['crouching'] if base.startswith('FC.') else [])
 if not strikes:cats=['strings'] if parent else ['stances']
 if c=='f+1+2':cats.append('defense')
 clip='standing-lp' if limb=='punch' and buttons==['1'] else 'standing-rp' if limb in ['punch','elbow'] else 'standing-lk' if buttons==['3'] else 'standing-rk'
 if stance=='crouching' or base.startswith(('d+','db+')):clip='crouching-'+('lp' if buttons==['1'] else 'rp' if buttons==['2'] else 'lk' if buttons==['3'] else 'rk')
 if 'f,n,d,df' in c.lower():clip='scarlet-rush' if buttons in [['2'],['1']] else 'crouching-rk'
 meta={'name':('Série' if parent else 'Agarrão' if 'throws' in cats else 'Postura' if not strikes else 'Golpe')+' · '+c,
       'nonLethal':'cannot' in row['Notes'].lower() and ('k.o' in row['Notes'].lower() or 'ko' in row['Notes'].lower()),'unblockable':'!' in row['Hit level'],'categories':cats,'command':command,'strikes':strikes,'limb':'weapon' if 'wpn' in tags else limb,
       'hurtboxes':[{'from':0,'to':startup-1,'box':{'offsetX':0,'offsetY':-138,'width':46,'height':138}},
                    {'from':startup,'to':startup+active-1,'box':{'offsetX':8,'offsetY':-132,'width':54,'height':132}},
                    {'from':startup+active,'to':startup+active+recovery-1,'box':{'offsetX':3,'offsetY':-138,'width':48,'height':138}}],
       'reference':{'command':c,'url':source['source'],'startup':row['Start up frame'],'block':row['Block frame'],'hit':row['Hit frame'],'counter':row['Counter hit frame'],'damage':row['Damage']},
       'adaptation':'Geometria 2D autorada; dano ×4 na escala atual. Recuperação/janelas ausentes são estimativas explícitas; variantes de profundidade usam posturas/comandos 2D. Extensores Tornado adaptados a Screw único; quebras de cenário ficam como splat, sem troca de arena.',
       'animation':{'clip':clip,'status':'provisional'}}
 for tag,key in [('cs','highCrush'),('js','lowCrush'),('pc','armor')]:
  v=range_tag(tags,tag)
  if v:meta[key]=v
 if c=='f+1+2':meta['parry']={'from':2,'to':9,'levels':['high','mid'],'limbs':['punch'],'successDamage':100,'successHitstun':71,'successReaction':'knockdown'}
 action={}
 if not strikes:
  if parent:action={'cancelRecovery':True}
  elif c in ['f,n,DF','f,n,d,DF']:action={'stance':'crouch-dash','duration':24,'move':22}
  elif 'even numbers' in c or 'odd numbers' in c:action={'stance':'sway','duration':24,'move':-12}
  else:action={'stance':'charging','duration':90}
 if c=='2+3':action['power']='activate'
 if c=='H.2+3':action['power']='consume'
 if c.startswith('DVK.'):
  cost=re.search(r'Consumes (\d+)F',row['Notes']);action['powerCostOnHit' if 'on throw hit' in row['Notes'] else 'powerCost']=int(cost[1]) if cost else 0
 if c.endswith(',F') and c.startswith('DVK.1,1,2'):action['sideSwitch']=True
 if 'he' in tags.split(): action['power']='activate-on-hit'
 estimates=[]
 if not row['Recovery'] and strikes:estimates.append('recuperação')
 if strikes and any(not re.search(r'\d',startparts[j] if j<len(startparts) else '') for j in range(len(damage))):estimates.append('tempo de contato de continuação')
 if estimates:meta['estimatedFields']=estimates
 if c=='1':meta['recoveryOnContact']=17
 if c in ['f,n,d,df:2','f,n,d,df+2']:
  meta['recoveryOnContact']=contact_recovery
  meta['adaptation']+=' Recuperação 2D no contato: '+str(contact_recovery)+'F; no vazio permanece '+str(recovery)+'F. Sem cancelamento livre.'
  meta['animation']['clip']='electric-uppercut' if c.endswith(':2') else 'wind-uppercut'
 if action:meta['action']=action
 m={'id':slug(c),'kind':'throw' if 'throws' in cats else 'special' if 'specials' in cats else 'normal',
    'input':{'buttons':buttons},'startup':startup,'activeFrames':active,'recovery':recovery,
    'damage':sum(x['damage'] for x in strikes),'hitstun':max(1,recovery+hit),'blockstun':max(1,recovery+block),
    'pushback':{'hit':28 if 'starters' in cats else 12,'block':7},'hitLevel':strikes[0]['hitLevel'] if strikes else 'mid',
    'hitbox':strikes[0]['hitbox'] if strikes else {'forward':0,'yOffset':0,'width':1,'height':1},'combat':meta}
 if 'th(' in row['Hit level']:
  note=row['Notes'].lower();br=['1','2'] if '1+2' in note else ['1'] if 'break: 1' in note else ['2'] if 'break: 2' in note else []
  if '1 or 2' in note:br=['1']
  m['throw']={'range':76,'breakButtons':br,'breakFrames':12 if br else 0,'breakRecovery':12,'launchDistance':{'forward':100,'backward':120}}
  if '1 or 2' in note:m['throw']['breakAlternatives']=[['1'],['2']]
 authored_advance={'1,1':10,'1,2':10,'1,1,2':14,'1,2,2':12,'3,1':14,'3,1,4':18,'b+2':3,'b+2,2':18,'b+2,2,1+2':24,'df+1':5,'df+1,df+2':12,'f,F+3':28,'f,n,d,df+1+2':20,'SS.4,1':18,'df+3+4':12,'df+3+4,1':10,'df+3+4,1,2':10,'f,F+2':22,'DVK.f,F+2':22,'f,F+4':20}
 if parent and c not in ['4~3','1,2,2~3'] and strikes:m['advance']=8 if limb in ['punch','elbow'] else 12
 if c in authored_advance:m['advance']=authored_advance[c]
 if stance=='crouching' or base.startswith('d+'):
  m['crouching']=True
  for authored in meta['hurtboxes']:authored['box']={'offsetX':0,'offsetY':-87,'width':48,'height':87}
 moves.append(m)
# Repair parent windows independent of source row ordering (charged and conditional variants).
for m in moves:
 if m['combat']['command']['notation'] in ['f,n,d,df:2','f,n,d,df+2']:
  m['advance']=12 if m['combat']['command']['notation'].endswith(':2') else 10
  m['combat']['adaptation']+=' Passo de aproximação próprio do ascendente: '+str(m['advance'])+' unidades.'
byid={m['id']:m for m in moves}
for m in moves:
 cmd=m['combat']['command']; parent=byid.get(cmd.get('parentId',''))
 if parent and cmd['notation'] not in ['4~3','1,2,2~3']:
  start=parent['startup']+parent['activeFrames'];cmd['followupWindow']['from']=start;cmd['followupWindow']['to']=start+max(22,cmd.get('holdFrames',0)+5)
# A button-less B follow-up cancels the attack-throw before it connects.
for m in moves:
 if m['combat']['reference']['command'].endswith(',B') and m['combat']['command'].get('parentId'):
  parent=byid[m['combat']['command']['parentId']]; strikes=parent['combat']['strikes']
  if len(strikes)>1:m['combat']['command']['followupWindow']={'from':strikes[-2]['to']+1,'to':strikes[-1]['from']-1}
# Own context adapters, not imported moves; all reference rows remain present.
Path(ROOT/'src/engine/data/combat/ayla-book.json').write_text(json.dumps(moves,ensure_ascii=False,indent=2)+'\n')
# Actionable production queue for every provisional move, with exact phase IDs.
lines=['# Ayla — animações faltantes do livro de combate','',
'As 135 entradas são executáveis com poses provisórias, não animações homologadas de Kazuya. Produzir arte própria, preservando os frames lógicos e caixas. Referência: TekkenDocs / RBNorway; snapshot em `src/engine/data/reference/kazuya.json`.','',
'| ID | Comando de referência | Clipe provisório | Produzir |','| --- | --- | --- | --- |']
for m in moves:
 production='postura/transição sem hitbox' if not m['combat']['strikes'] else 'antecipação, contato(s), recuperação; validar keyframes e pés'
 if any(strike.get('projectile') for strike in m['combat']['strikes']):production+='; efeito de projétil próprio (atual: fx-crimson-wave provisório)'
 lines.append(f"| `{m['id']}` | `{m['combat']['command']['notation']}` | `{m['combat']['animation']['clip']}` | {production} |")
lines += ['', '## Reações e posturas adicionais', '', '- Juggle: reação horizontal compatível com a hurtbox individual `juggled` (86 × 80); o sprite atual é provisório.', '- Wall splat, wall bounce, Screw e queda/levantada: produzir sequências próprias e conferir seus keyframes no treino.', '- Fulgor, carga, transições SS/BT em 2D e avanço confirmado: faltam poses e efeitos específicos.', '- Adaptações do livro e seus IDs adicionais: `src/engine/data/combat/aylaCombatBook.ts`. Nenhum clipe provisório equivale a animação homologada.']
lines += ['', '## Ascendentes e corrida', '', '- `electric-uppercut` e `wind-uppercut`: poses provisórias de preparação agachada e soco direito em pé; falta desenhar ascendente e efeito elétrico próprios. Não usar investida horizontal como animação final.', '- Reações de juggle de Gris/Tester/Dummy: produzir poses compatíveis com os volumes individuais; hoje reutilizam reação vertical.', '- `run`: loop provisório de avanço acelerado; produzir passada de corrida dedicada por personagem.', '', '## Extensão de movimento técnico\n\n- `ayla-forward-jab` (`f+1`): produzir passo de preparação e jab estendido com contato i12; fallback atual `standing-lp`.\n- Ayla `walk-backward`/`backdash`: conectados aos quadros dedicados 24–31 do atlas existente; conferir refinamento de apoio/continuidade na arte final.\n- Gris e Tester `walk-backward`/`backdash`: sequência provisória de guarda própria, mantendo facing; faltam quadros dedicados de pés e transferência de peso. Não usam caminhada espelhada.']
(ROOT/'docs/ayla-combate-animacoes-pendentes.md').write_text('\n'.join(lines)+'\n')
print(f'{len(moves)} reference entries generated')

unknown=['# Ayla — dados de referência incompletos', '', 'A tabela pública não fornece todos os intervalos/recuperações. Estes campos têm estimativas executáveis, não valores homologados. Geometria, escala de dano e dinâmica de juggle são adaptações 2D autoradas em todos os golpes. Conferir também o patch da referência antes do balanceamento final.', '', '| ID | Comando | Conferir |', '| --- | --- | --- |']
for m in moves:
 if m['combat'].get('estimatedFields'):unknown.append(f"| `{m['id']}` | `{m['combat']['reference']['command']}` | {', '.join(m['combat']['estimatedFields'])} |")
(ROOT/'docs/ayla-combate-dados-pendentes.md').write_text('\n'.join(unknown)+'\n')
