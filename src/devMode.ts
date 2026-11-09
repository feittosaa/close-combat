/**
 * Loaders of the developer mode (`src/dev`). The paths are opaque to the bundler, so builds never pull these modules,
 * their styles or the images they list into the output; only the development server, which serves the sources, loads
 * them. Callers still guard each use with `import.meta.env.MODE === 'development'`.
 */
const load = <T>(path: string): Promise<T> => import(/* @vite-ignore */ path) as Promise<T>;

export const loadDevTools = () => load<typeof import('./dev/devTools')>('./dev/devTools.ts');
export const loadDeveloperPanel = () => load<typeof import('./dev/DeveloperPanel')>('./dev/DeveloperPanel.ts');
