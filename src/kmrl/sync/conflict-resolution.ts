import type { ExperimentRepositoryPort } from "../contracts/data.js";
import type { OfflineQueuePort, SyncState } from "../contracts/offline.js";
import type { ExperimentSnapshot } from "../runtime/types.js";
import type { RemoteExperimentSyncAdapter } from "./remote-sync-contract.js";

export type ConflictResolution = "KEEP_LOCAL" | "KEEP_REMOTE";

export interface ConflictResolutionReport {
  readonly experimentId: string;
  readonly resolution: ConflictResolution;
  readonly state: SyncState;
  readonly snapshot: ExperimentSnapshot;
}

/** Explicit conflict resolution boundary. No implicit merge or silent overwrite is performed. */
export class ConflictResolutionEngine {
  constructor(
    private readonly repository: ExperimentRepositoryPort,
    private readonly offline: OfflineQueuePort,
    private readonly remote: RemoteExperimentSyncAdapter,
  ) {}

  async resolve(experimentId: string, resolution: ConflictResolution): Promise<ConflictResolutionReport> {
    const remote = await this.remote.getExperiment(experimentId);
    if (!remote?.snapshot) throw new Error("Remote experiment is unavailable");
    const local = this.repository.load(experimentId);
    if (!local) throw new Error("Local experiment is unavailable");

    if (resolution === "KEEP_REMOTE") {
      this.repository.save(remote.snapshot);
      this.offline.clear?.(experimentId);
      return { experimentId, resolution, state: "ONLINE", snapshot: structuredClone(remote.snapshot) };
    }

    const rebased: ExperimentSnapshot = { ...structuredClone(local), revision: remote.snapshot.revision + 1 };
    const saved = await this.remote.putExperiment(experimentId, rebased, remote.snapshot.revision);
    this.repository.save(saved.snapshot);
    this.offline.clear?.(experimentId);
    return { experimentId, resolution, state: "ONLINE", snapshot: structuredClone(saved.snapshot) };
  }
}
