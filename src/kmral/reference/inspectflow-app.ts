import { INSPECTFLOW_BLUEPRINT } from './inspectflow.js';

export type InspectFlowAppConfig = {
  environment: 'development' | 'staging' | 'production';
  apiBaseUrl: string;
};

export function createInspectFlowApp(config: InspectFlowAppConfig) {
  if (!config.apiBaseUrl.trim()) throw new Error('apiBaseUrl is required');

  return {
    blueprint: INSPECTFLOW_BLUEPRINT,
    config: { ...config },
    status: 'blueprint-ready' as const,
  };
}
