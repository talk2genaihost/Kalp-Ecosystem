export interface KMRALRepository<Entity, Id> {
  get(id: Id): Promise<Entity | undefined>;
  list(): Promise<Entity[]>;
  save(entity: Entity): Promise<void>;
  remove(id: Id): Promise<void>;
}

export class InMemoryKMRALRepository<Entity extends { id: Id }, Id> implements KMRALRepository<Entity, Id> {
  private readonly records = new Map<Id, Entity>();

  async get(id: Id): Promise<Entity | undefined> {
    return this.records.get(id);
  }

  async list(): Promise<Entity[]> {
    return [...this.records.values()];
  }

  async save(entity: Entity): Promise<void> {
    this.records.set(entity.id, entity);
  }

  async remove(id: Id): Promise<void> {
    this.records.delete(id);
  }
}
