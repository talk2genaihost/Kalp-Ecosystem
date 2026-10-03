import type { ExperimentRepositoryPort } from "../contracts/data.js";
import type { ConflictEnvelope, OfflineMutation, OfflineQueuePort, SyncState } from "../contracts/offline.js";
import type { ExperimentSnapshot } from "../runtime/types.js";

export type SyncPushResult =
  | { status: "ACCEPTED"; remoteRevision: number }
  | { status: "CONFLICT"; conflict: ConflictEnvelope }
  | { status: "DUPLICATE"; remoteRevision: number };

export interface RemoteExperimentSyncAdapter { push(mutation: OfflineMutation): Promise<SyncPushResult>; }
export interface ConflictResolution { action: "KEEP_LOCAL" | "ACCEPT_REMOTE" | "DEFER"; snapshot?: ExperimentSnapshot; }
export interface ConflictResolver { resolve(conflict: ConflictEnvelope): ConflictResolution; }
export class ManualConflictResolver implements ConflictResolver { resolve(): ConflictResolution { return { action: "DEFER" }; } }
export interface SyncReport { state: SyncState; applied: number; duplicates: number; conflicts: ConflictEnvelope[]; }
const clone = <T>(value:T):T => structuredClone(value);

export class ExperimentSyncEngine {
  private state: SyncState = "OFFLINE";
  private readonly conflicts = new Map<string, ConflictEnvelope>();
  constructor(private readonly queue: OfflineQueuePort, private readonly repository: ExperimentRepositoryPort, private readonly remote: RemoteExperimentSyncAdapter, private readonly resolver: ConflictResolver = new ManualConflictResolver()) {}
  getState(): SyncState { return this.state; }
  getConflicts(experimentId: string): ConflictEnvelope[] { return [...this.conflicts.values()].filter((item) => item.experimentId === experimentId).map((item) => clone(item)); }
  async sync(experimentId: string): Promise<SyncReport> {
    this.state = "SYNCING";
    const pending = this.queue.pending(experimentId);
    let applied = 0; let duplicates = 0; const conflicts: ConflictEnvelope[] = [];
    for (const mutation of pending) {
      const result = await this.remote.push(mutation);
      if (result.status === "ACCEPTED") { applied += 1; continue; }
      if (result.status === "DUPLICATE") { duplicates += 1; continue; }
      conflicts.push(result.conflict); this.conflicts.set(result.conflict.conflictId, clone(result.conflict));
      const resolution = this.resolver.resolve(result.conflict);
      if (resolution.action === "DEFER") continue;
      if (resolution.action === "ACCEPT_REMOTE" && resolution.snapshot) this.repository.save(resolution.snapshot);
    }
    if (conflicts.length) { this.state = "CONFLICT"; return { state: this.state, applied, duplicates, conflicts }; }
    this.queue.drain(experimentId); this.state = "ONLINE";
    return { state: this.state, applied, duplicates, conflicts: [] };
  }
}

export class InMemoryRemoteExperimentSyncAdapter implements RemoteExperimentSyncAdapter {
  private readonly revisions = new Map<string, number>();
  private readonly mutationIds = new Set<string>();
  constructor(private readonly remoteRevision = (experimentId: string) => this.revisions.get(experimentId) ?? 0) {}
  async push(mutation: OfflineMutation): Promise<SyncPushResult> {
    if (this.mutationIds.has(mutation.mutationId)) return { status: "DUPLICATE", remoteRevision: this.remoteRevision(mutation.experimentId) };
    const revision = this.remoteRevision(mutation.experimentId);
    if (mutation.baseRevision < revision) return { status: "CONFLICT", conflict: { conflictId: `${mutation.mutationId}:conflict`, experimentId: mutation.experimentId, local: clone(mutation), remoteRevision: revision, reason: "REMOTE_REVISION_AHEAD" } };
    this.mutationIds.add(mutation.mutationId); this.revisions.set(mutation.experimentId, revision + 1);
    return { status: "ACCEPTED", remoteRevision: revision + 1 };
  }
}
