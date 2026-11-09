import { characters } from '../engine/data/characters';
import { installAssetOverrides } from './assetOverrides';
import { DevTuning, loadOverrides } from './devOverrides';

/**
 * Entry point of the developer mode. It is loaded only through `src/devMode.ts`, behind `import.meta.env.MODE === 'development'`, so builds and
 * tests leave this whole folder out and ignore any tuning stored in the browser.
 */
export const devTuning = new DevTuning(characters, loadOverrides());

export function installDevTools(): Promise<void> { return installAssetOverrides(); }
