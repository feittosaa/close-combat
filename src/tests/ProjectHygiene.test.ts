import { describe, expect, it } from 'vitest';

const normalize = (path: string): string => {
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (part === '..') parts.pop();
    else if (part && part !== '.') parts.push(part);
  }
  return parts.join('/');
};
const projectPath = (key: string): string => normalize(`src/tests/${key}`);
const relativeTo = (file: string, ref: string): string =>
  normalize(`${file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : '.'}/${ref}`);
const markdown = import.meta.glob<string>(
  ['../../*.md', '../../docs/**/*.md', '../../assets/**/*.md', '../**/*.md'],
  { eager: true, query: '?raw', import: 'default' },
);

describe('Project asset and documentation hygiene', () => {
  it('keeps only consumed images and canonical references', () => {
    const images = import.meta.glob<string>(
      ['../../assets/**/*.{png,jpg,jpeg,webp,avif,gif,svg,bmp}', '../assets/**/*.{png,jpg,jpeg,webp,avif,gif,svg,bmp}', '../../docs/**/*.{png,jpg,jpeg,webp,avif,gif,svg,bmp}'],
      { eager: true, query: '?url', import: 'default' },
    );
    const used = new Set<string>();
    const code = import.meta.glob<string>('../**/*.ts', { eager: true, query: '?raw', import: 'default' });
    for (const [key, source] of Object.entries(code)) {
      if (key.includes('/tests/')) continue;
      for (const match of source.matchAll(/(?:from\s*|import\s*)['"]([^'"\n]+\.(?:png|jpg|jpeg|webp|avif|gif|svg|bmp))['"]/g)) {
        used.add(relativeTo(projectPath(key), match[1]));
      }
    }
    const stages = import.meta.glob<string>('../assets/scenes/*/stage.json', { eager: true, query: '?raw', import: 'default' });
    for (const [key, source] of Object.entries(stages)) {
      const stage = JSON.parse(source) as { source?: string; layers: { file: string; sourceStage?: string; highFile?: string; frames?: string[] }[] };
      if (stage.source) used.add(relativeTo(projectPath(key), stage.source));
      for (const layer of stage.layers) for (const file of [layer.file, ...(layer.highFile ? [layer.highFile] : []), ...(layer.frames ?? [])]) {
        used.add(layer.sourceStage ? `src/assets/scenes/${layer.sourceStage}/${file}` : relativeTo(projectPath(key), file));
      }
    }
    for (const stage of ['saloon', 'fazenda', 'sala-treino']) {
      for (const name of ['ready', 'fight', 'victory', 'lose', 'timeout', 'ultimate', 'round-win', 'round-lose', ...(stage === 'saloon' ? ['tumbleweed'] : [])]) {
        used.add(`src/assets/scenes/${stage}/presentation/${name}.png`);
      }
    }
    const cowboyAtlases = import.meta.glob('../assets/sprites/characters/cowboy/**/*.atlas.json', { eager: true, query: '?raw', import: 'default' });
    for (const key of Object.keys(cowboyAtlases)) used.add(projectPath(key.replace(/\.atlas\.json$/, '.png')));
    const shotoAtlases = import.meta.glob('../assets/sprites/characters/shoto/*.atlas.json', { eager: true, query: '?raw', import: 'default' });
    for (const key of Object.keys(shotoAtlases)) used.add(projectPath(key.replace(/\.atlas\.json$/, '.png')));
    const canonical = import.meta.glob('../../assets/art/characters/*/turnaround.png', { eager: true, query: '?url', import: 'default' });
    for (const key of Object.keys(canonical)) used.add(projectPath(key));
    const reviews = import.meta.glob<string>('../../assets/art/characters/*/revisao.json', { eager: true, query: '?raw', import: 'default' });
    for (const [key, source] of Object.entries(reviews)) {
      const manifest = projectPath(key);
      expect(markdown['../../pipeline.md']).toContain(manifest);
      for (const file of (JSON.parse(source) as { propostas: string[] }).propostas) used.add(relativeTo(manifest, file));
    }
    expect([...new Set(Object.keys(images).map(projectPath))].sort()).toEqual([...used].sort());
  });

  it('keeps individual character decisions in the pipeline', () => {
    for (const [key, text] of Object.entries(markdown)) {
      if (projectPath(key) === 'pipeline.md') continue;
      expect(text, projectPath(key)).not.toMatch(/\b(?:shoto|ayla|gris|tester|dummy)\b/i);
    }
  });

  it('resolves local Markdown document links', () => {
    const paths = new Set(Object.keys(markdown).map(projectPath));
    for (const [key, text] of Object.entries(markdown)) {
      for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const ref = match[1].split('#')[0];
        if (!ref.endsWith('.md') || /^(?:https?:|mailto:|\/)/.test(ref)) continue;
        expect(paths.has(relativeTo(projectPath(key), ref)), `${projectPath(key)} -> ${ref}`).toBe(true);
      }
    }
  });
});
