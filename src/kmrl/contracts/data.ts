import type { ExperimentSnapshot } from "../runtime/types.js";
import type { DurableKeyValueStore } from "./offline.js";

export interface ExperimentRepositoryPort {
  load(experimentId: string): ExperimentSnapshot | undefined;
  save(snapshot: ExperimentSnapshot): void;
  remove(experimentId: string): void;
}

export class InMemoryExperimentRepository implements ExperimentRepositoryPort {
  private readonly records = new Map<string, ExperimentSnapshot>();
  load(experimentId: string): ExperimentSnapshot | undefined { const value = this.records.get(experimentId); return value ? structuredClone(value) : undefined; }
  save(snapshot: ExperimentSnapshot): void { this.records.set(snapshot.experimentId, structuredClone(snapshot)); }
  remove(experimentId: string): void { this.records.delete(experimentId); }
}

export class DurableExperimentRepository implements ExperimentRepositoryPort {
  constructor(private readonly store: DurableKeyValueStore, private readonly prefix = "kmrl:experiment:") {}
  private key(id: string): string { return `${this.prefix}${id}`; }
  load(experimentId: string): ExperimentSnapshot | undefined {
    const raw = this.store.get(this.key(experimentId)); if (!raw) return undefined;
    try { return structuredClone(JSON.parse(raw) as ExperimentSnapshot); } catch { return undefined; }
  }
  save(snapshot: ExperimentSnapshot): void { this.store.set(this.key(snapshot.experimentId), JSON.stringify(snapshot)); }
  remove(experimentId: string): void { this.store.remove(this.key(experimentId)); }
}
