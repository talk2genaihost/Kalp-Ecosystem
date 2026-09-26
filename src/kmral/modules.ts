import type { KMRALModule } from './index.js';

export const KMRAL_MODULES: KMRALModule[] = [
  {
    id: 'KMRAL-UI',
    name: 'Reusable UI Components',
    version: '0.1.0',
    description: 'Shared mobile UI primitives and application shell components.',
    dependencies: ['KMRAL-CORE'],
  },
  {
    id: 'KMRAL-DATA',
    name: 'Data Layer',
    version: '0.1.0',
    description: 'Models, repositories and persistence contracts.',
    dependencies: ['KMRAL-CORE'],
  },
  {
    id: 'KMRAL-MEDIA',
    name: 'Media Layer',
    version: '0.1.0',
    description: 'Camera, image, document and attachment contracts.',
    dependencies: ['KMRAL-CORE'],
  },
  {
    id: 'KMRAL-OFFLINE',
    name: 'Offline Engine',
    version: '0.1.0',
    description: 'Offline-first state, queue and synchronization contracts.',
    dependencies: ['KMRAL-CORE', 'KMRAL-DATA'],
  },
  {
    id: 'KMRAL-DOCUMENTS',
    name: 'Document Engine',
    version: '0.1.0',
    description: 'Report, PDF and export contracts.',
    dependencies: ['KMRAL-CORE'],
  },
];
