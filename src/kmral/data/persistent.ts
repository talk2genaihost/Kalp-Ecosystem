import type { EntityId, KMRALRepository } from './index.js';

export type KeyValueStore = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
};

export class PersistentRepository<T extends { id: EntityId }> implements KMRALRepository<T> {
  constructor(private readonly store: KeyValueStore, private readonly namespace: string) {}

  private key(id: EntityId): string {
    return `${this.namespace}:${id}`;
  }

  async get(id: EntityId): Promise<T | null> {
    return this.store.get<T>(this.key(id));
  }

  async list(): Promise<T[]> {
    // A production adapter should provide namespace listing. This base contract
    // intentionally keeps storage-provider concerns outside KMRAL core.
    throw new Error('list() requires a storage adapter with namespace enumeration');
  }

  async save(entity: T): Promise<T> {
    await this.store.set(this.key(entity.id), entity);
    return structuredClone(entity);
  }

  async remove(id: EntityId): Promise<void> {
    await this.store.remove(this.key(id));
  }
}
