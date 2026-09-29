import type { ExperimentRepositoryPort } from "../contracts/data.js";
import type { OfflineQueuePort } from "../contracts/offline.js";
import { ConflictResolutionEngine } from "../sync/conflict-resolution.js";
import { SupabaseRemoteExperimentSyncAdapter } from "../sync/supabase-remote-adapter.js";
import { SyncHardeningEngine } from "../sync/sync-hardening.js";
import type { MainSandboxSyncPort } from "../ui/main-sandbox-controller.js";

export interface KMRLBrowserRemoteConfig { readonly baseUrl:string; readonly publishableKey:string; }

declare global { var __KMRL_SUPABASE_CONFIG__: KMRLBrowserRemoteConfig | undefined; }

export function createMainSandboxSyncPort(repository:ExperimentRepositoryPort,offline:OfflineQueuePort):MainSandboxSyncPort|undefined {
  const config=globalThis.__KMRL_SUPABASE_CONFIG__;
  if(!config?.baseUrl||!config.publishableKey)return undefined;
  const remote=new SupabaseRemoteExperimentSyncAdapter(config);
  const hardening=new SyncHardeningEngine(repository,offline,remote);
  const resolution=new ConflictResolutionEngine(repository,offline,remote);
  return { sync:(experimentId)=>hardening.sync(experimentId), resolveConflict:(experimentId,choice)=>resolution.resolve(experimentId,choice) };
}
