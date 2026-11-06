/** Duração do título de resultado (K.O., vitória, derrota) após o fim do round, em quadros. */
export const RESULT_TITLE_END_FRAME = 160;
/** No tempo esgotado o título «TIME» vem primeiro; vitória e derrota aparecem depois dele. */
export const TIMEOUT_TITLE_FRAMES = 75;

/** Relógio da pose de vitória/derrota: começa junto com o título de resultado (K.O. ou vitória/derrota). */
export function resultElapsed(roundAge: number, endReason: 'knockout' | 'time' | 'draw' | undefined): number | undefined {
  const elapsed = roundAge - (endReason === 'time' ? TIMEOUT_TITLE_FRAMES : 0);
  return elapsed < 0 ? undefined : elapsed;
}
