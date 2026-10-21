import data from './ayla-book.json';
import type { MoveDefinition } from '../moves';
import type { ComboRecipe, CombatRules } from './CombatBook';

export const aylaReferenceMoves = data as unknown as readonly MoveDefinition[];
const byCommand = new Map(aylaReferenceMoves.map(move => [move.combat!.reference!.command, move]));
export function aylaMove(command: string): MoveDefinition {
  const move = byCommand.get(command);
  if (!move) throw new Error(`Comando ausente no livro de Ayla: ${command}`);
  return move;
}
const adapter = (id: string, direction: 'B' | 'F', stance: 'sway' | 'backturned'): MoveDefinition => ({
  id, input: { buttons: ['1', '2', '3', '4'] }, startup: 0, activeFrames: 1, recovery: 8,
  damage: 0, hitstun: 0, blockstun: 0, pushback: { hit: 0, block: 0 }, hitLevel: 'mid',
  hitbox: { forward: 0, yOffset: 0, width: 1, height: 1 },
  combat: { name: stance === 'sway' ? 'Esquiva no plano' : 'Virar de costas', categories: ['stances'],
    command: { notation: `${direction}+1+2+3+4`, directions: [direction], buttons: ['1', '2', '3', '4'] },
    strikes: [], hurtboxes: [], limb: 'body', action: { stance, duration: stance === 'sway' ? 24 : 90 },
    adaptation: 'Entrada autoral de postura para acessar variantes SS/BT no plano 2D, sem eixo de profundidade.',
    animation: { clip: 'standing-lp', status: 'provisional' } },
});
const powerDashes: readonly MoveDefinition[] = aylaReferenceMoves.filter(move => move.combat?.action?.power === 'activate-on-hit').map(move => ({
  ...move, id: `${move.id}-dash`, kind: 'special', startup: 0, activeFrames: 1, recovery: 8,
  damage: 0, hitstun: 0, blockstun: 0, advance: 0,
  combat: { ...move.combat!, name: `Avanço Fulgor · ${move.combat!.command.notation}`, categories: ['stances', 'specials'],
    reference: undefined, command: { notation: `${move.combat!.command.notation}~F`, parentId: move.id,
      directions: ['F'], buttons: [], requiresPower: true,
      followupWindow: { from: move.startup + move.activeFrames, to: move.startup + move.activeFrames + 12, onHit: true } },
    strikes: [], hurtboxes: [], action: { power: 'consume', move: 42 },
    adaptation: 'Avanço 2D após confirmação de acerto, consumindo Fulgor; sem mudança de eixo.' },
}));
const jab = aylaMove('1');
export const aylaForwardJab: MoveDefinition = {
  ...jab, id: 'ayla-forward-jab', startup: 12, recovery: 20, advance: 8, damage: 24,
  hitbox: { ...jab.hitbox, width: jab.hitbox.width + 10 },
  combat: { ...jab.combat!, name: 'Jab de avanço', reference: undefined, recoveryOnContact: 18,
    command: { notation: 'f+1', directions: ['F'], buttons: ['1'] },
    strikes: jab.combat!.strikes.map(strike => ({ ...strike, from: strike.from + 2, to: strike.to + 2,
      damage: 24, hitbox: { ...strike.hitbox, width: strike.hitbox.width + 10 } })),
    adaptation: 'Variante autoral 2D de avanço: i12, alcance +10, avanço 8; permite seguir com 1 ou 2. Não é um frame dado de Kazuya.',
    animation: { clip: 'standing-lp', status: 'provisional' } },
};
const sourceWithForwardFollowups = aylaReferenceMoves.map(move =>
  move.combat?.command.parentId === jab.id ? { ...move, combat: { ...move.combat,
    command: { ...move.combat.command, alternateParentIds: [aylaForwardJab.id] } } } : move);
export const aylaCombatMoves: readonly MoveDefinition[] = [
  ...sourceWithForwardFollowups, aylaForwardJab, adapter('ayla-sway-2d', 'F', 'sway'), adapter('ayla-turn-2d', 'B', 'backturned'), ...powerDashes,
];
export const aylaCombatRules: CombatRules = {
  commandBufferFrames: 8, lowParryFrames: 6, lowParryStunFrames: 18, stanceFrames: 24,
  comboScaling: [1, .7, .6, .5, .4, .3, .25, .2], juggleGravity: .025, juggleBaseGravity: .3,
  knockdownFrames: 32, wallStunFrames: 26, powerFrames: 600,
};

function chain(command: string): string[] {
  const move = aylaMove(command);
  const parent = aylaReferenceMoves.find(other => other.id === move.combat!.command.parentId);
  return [...(parent ? chain(parent.combat!.reference!.command) : []), move.id];
}
const recipes: ComboRecipe[] = [];
function recipe(category: ComboRecipe['category'], name: string, commands: readonly string[], condition?: string): void {
  recipes.push({ id: `ayla-combo-${recipes.length + 1}`, name, category,
    notation: commands.join(' > '), moveIds: commands.flatMap(chain), starter: commands[0], condition,
    source: 'https://tekkendocs.com/t8/kazuya/meta' });
}
const E = 'f,n,d,df:2';
// Routes transcribed as command data, not a claim that every mathematical combination is a published combo.
recipe('beginner', 'Elétrico · rota inicial', [E, '3,1,4', 'df+1,df+2', '3,1', 'f,n,d,df+3']);
for (const starter of ['f,F+3', 'ws2', 'df+2']) recipe('beginner', `Launcher · ${starter}`, [starter, 'f,n,d,df+1+2', '1,2,4,3', 'b+2,2,1+2'], starter === 'df+2' ? 'Counter hit no starter' : undefined);
recipe('beginner', 'Carry inicial', ['f,F+4', 'df+3,2,1', 'SS.4,1', 'b+2,2,1+2']);
recipe('beginner', 'Counter baixo', ['d+1+2', 'ws1+2', 'b+2,2', 'df+1,df+2', '3,1', 'f,n,d,df+3'], 'Counter hit no starter');
recipe('advanced', 'Três elétricos · dano', [E, E, E, '3,1', 'f,n,d,df+1+2', 'SS.4,1', 'b+2,2,1+2']);
recipe('advanced', 'Três elétricos · posição', [E, E, E, '3,1', 'f,n,d,df+1+2', 'SS.4,1', E]);
recipe('advanced', 'Médio de avanço', ['f,F+3', 'ws1+2', 'b+2,2', 'df+1,df+2', 'SS.4,1', 'b+2,2,1+2']);
recipe('advanced', 'Punição ao levantar', ['ws2', 'ws1+2', 'b+2,2', 'df+1,df+2', 'SS.4,1', 'df+1,df+2']);
recipe('advanced', 'Counter médio', ['df+2', '1,2,4,3', 'df+1,df+2', 'SS.4,1', 'b+2,2,1+2'], 'Counter hit no starter; 1,2 devem errar conforme a rota de referência');
recipe('advanced', 'Counter de alcance', ['f,F+4', E, 'b+2,2', 'df+1,df+2', 'SS.4,1', E], 'Counter hit no starter');
recipe('advanced', 'Counter agachado', ['d+1+2', 'ws1+2', 'b+2,2', 'df+1,df+2', 'SS.4,1', 'b+2,2,1+2'], 'Counter hit no starter');
recipe('advanced', 'Counter · elétrico preciso', ['df+2', E, E, '3,1', 'f,n,d,df+1+2', 'SS.4,1', 'b+2,2,1+2'], 'Counter hit; just frame no primeiro elétrico');
for (const command of ['f,F+2', 'SS.4,1', 'df+1,4', 'db+2', 'f+4', '4~3', 'df+1,df+2']) recipe('ender', `Finalizador · ${command}`, [command], 'Reação a quebras da referência adaptada a parede fixa 2D');
recipe('wall', 'Parede · sequência longa', ['df+3+4,1,2']);
recipe('wall', 'Parede · dois médios', ['b+2,4', 'df+2']);
recipe('wall', 'Parede · extensor', ['df+1,df+2', 'df+3+4,1,2']);
recipe('wall', 'Parede · aproximação', ['f,n,d,df+1+2', 'b+2,4', 'df+2']);
for (const ender of ['f,F+4', '4~3', 'OTG.d+3+4']) recipe('small', `Seguimento curto · ${ender}`, ['df+1,4', ender]);
for (const starter of ['FC.df+3+4', '4', 'db+2', '3,1,4']) recipe('small', `Seguimento · ${starter}`, [starter, 'f,F+4'], starter === 'FC.df+3+4' ? undefined : 'Counter hit no starter');
recipe('small', 'Ao levantar · seguimento', ['ws1+2', 'f,F+4'], 'Counter hit; respeitar distância');
recipe('small', 'Ao levantar · rasteira', ['ws1+2', 'f,n,d,DF+4'], 'Counter hit; distância curta');
recipe('small', 'Fulgor · próximo à parede', ['db+1,2', 'uf+4,4,4,4'], 'Modo Fulgor e avanço após contato');
recipe('small', 'Confirmação do último hit', ['df+3,1', 'db+1,2'], 'Counter hit no segundo hit');
export const aylaCombos: readonly ComboRecipe[] = recipes;
