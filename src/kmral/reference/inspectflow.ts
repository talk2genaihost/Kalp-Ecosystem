import { createAppManifest } from '../index.js';
import { KMRAL_MODULES } from '../modules.js';
import { createAppShellSpec } from '../ui/index.js';

const selected = KMRAL_MODULES.filter((module) =>
  ['KMRAL-UI', 'KMRAL-DATA', 'KMRAL-MEDIA', 'KMRAL-OFFLINE', 'KMRAL-DOCUMENTS'].includes(module.id),
);

export const INSPECTFLOW_BLUEPRINT = {
  appId: 'inspectflow',
  name: 'KALP InspectFlow',
  manifest: createAppManifest('inspectflow', selected),
  shell: createAppShellSpec({
    appId: 'inspectflow',
    title: 'InspectFlow',
    navigation: ['Dashboard', 'Inspections', 'Reports', 'Settings'],
  }),
  domain: 'INSPECTION',
};
