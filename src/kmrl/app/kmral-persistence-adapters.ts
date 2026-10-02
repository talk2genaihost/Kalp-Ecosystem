import type { KMRALStateStore } from "../../kmral/data.js";
import type { KMRALMutation, KMRALMutationQueue } from "../../kmral/offline.js";
import type { ExperimentSnapshot } from "../runtime/types.js";
import type { ExperimentRepositoryPort } from "../contracts/data.js";
import type { OfflineQueuePort, OfflineMutation } from "../contracts/offline.js";

export class KMRALExperimentRepositoryAdapter implements ExperimentRepositoryPort {
  constructor(
    private readonly store: KMRALStateStore<ExperimentSnapshot, string>,
  ) {}

  load(experimentId: string): ExperimentSnapshot | undefined {
    return this.store.load(experimentId);
  }

  save(snapshot: ExperimentSnapshot): void {
    this.store.save(snapshot);
  }

  remove(experimentId: string): void {
    this.store.remove(experimentId);
  }
}

export class KMRALExperimentOfflineQueueAdapter implements OfflineQueuePort {
  constructor(
    private readonly queue: KMRALMutationQueue<OfflineMutation>,
  ) {}

  enqueue(mutation: OfflineMutation): void {
    this.queue.enqueue({
      id: mutation.mutationId,
      payload: mutation,
    });
  }

  pending(experimentId: string): OfflineMutation[] {
    return this.queue
      .pending()
      .filter((mutation) => mutation.payload.experimentId === experimentId)
      .map((mutation) => structuredClone(mutation.payload));
  }

  drain(experimentId: string): OfflineMutation[] {
    return this.queue
      .drainWhere((mutation) => mutation.payload.experimentId === experimentId)
      .map((mutation: KMRALMutation<OfflineMutation>) => structuredClone(mutation.payload));
  }

  clear(experimentId: string): void {
    this.queue.drainWhere((mutation) => mutation.payload.experimentId === experimentId);
  }
}
