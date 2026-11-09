/** Draws wallpaper indices in random order: every wallpaper once per round, never the same one twice in a row. */
export function createWallpaperShuffle(count: number, random: () => number = Math.random): () => number {
  let bag: number[] = [];
  let last = -1;
  return () => {
    if (!bag.length) {
      bag = Array.from({ length: count }, (_, index) => index);
      for (let i = count - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      if (count > 1 && bag[bag.length - 1] === last) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    last = bag.pop()!;
    return last;
  };
}
