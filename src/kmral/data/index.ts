export type EntityId = string;

export type KMRALRepository<T extends { id: EntityId }> = {
  get(id: EntityId): Promise<T | null>;
  list(): Promise<T[]>;
  save(entity: T): Promise<T>;
  remove(id: EntityId): Promise<void>;
};

export class InMemoryRepository<T extends { id: EntityId }> implements KMRALRepository<T> {
  private readonly store = new Map<EntityId, T>();

  async get(id: EntityId): Promise<T | null> {
    return this.store.get(id) ?? null;
  }

  async list(): Promise<T[]> {
    return [...this.store.values()];
  }

  async save(entity: T): Promise<T> {
    this.store.set(entity.id, structuredClone(entity));
    return structuredClone(entity);
  }

  async remove(id: EntityId): Promise<void> {
    this.store.delete(id);
  }
}
