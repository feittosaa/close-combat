/** Rage is stored in up to three bars (900), each divided into two 150-point segments. */
export const RAGE_LEVEL = 300;
export const RAGE_MAX = RAGE_LEVEL * 3;
export const RAGE_SEGMENT = 150;
/** Rage Rush gasta uma barra completa; reforçar um especial ou agarrão gasta um segmento. Ambos somam +10% de dano. */
export const RAGE_BAR = RAGE_LEVEL;
export const RAGE_BUFF_COST = RAGE_SEGMENT;
export const RAGE_BUFF_DAMAGE = 1.1;
/** Pausa da ativação do Rush: congela os dois lutadores, os projéteis e o cronômetro, como a ativação da ultimate. */
export const RUSH_FREEZE_FRAMES = 48;
/** Pausas das ações de rage de defesa: combo breaker e recuperação no ar. */
export const BREAKER_FREEZE_FRAMES = 36;
export const AIR_RECOVERY_FREEZE_FRAMES = 24;
/** Um breaker certo empurra o atacante para longe, em pé, ao longo destes quadros. */
export const BREAKER_PUSH_DISTANCE = 90;
export const BREAKER_PUSH_FRAMES = 14;
/** Quem executa um breaker certo fica invulnerável até os dois se reposicionarem. */
export const BREAKER_INVULNERABLE_FRAMES = 44;
