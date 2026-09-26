export type KMRALModule = {
  id: string;
  name: string;
  version: string;
  description: string;
  dependencies: string[];
};

export const KMRAL_VERSION = '0.1.0';

export const KMRAL_CORE: KMRALModule = {
  id: 'KMRAL-CORE',
  name: 'KALP Mobile Reusable Architecture Library Core',
  version: KMRAL_VERSION,
  description: 'Reusable primitives for KALP mobile applications.',
  dependencies: [],
};

export function createAppManifest(
  appId: string,
  modules: KMRALModule[],
): { appId: string; libraryVersion: string; modules: string[] } {
  return {
    appId,
    libraryVersion: KMRAL_VERSION,
    modules: modules.map((module) => module.id),
  };
}
