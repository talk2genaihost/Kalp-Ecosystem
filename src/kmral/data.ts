export interface KMRALRepository<Entity, Id> {
  get(id: Id): Promise<Entity | undefined>;
  list(): Promise<Entity[]>;
  save(entity: Entity): Promise<void>;
  remove(id: Id): Promise<void>;
}

export interface KMRALKeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export class InMemoryKMRALKeyValueStore implements KMRALKeyValueStore {
  private readonly values = new Map<string, string>();

  get(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.values.set(key, value);
  }

  remove(key: string): void {
    this.values.delete(key);
  }
}

export class LocalStorageKMRALKeyValueStore implements KMRALKeyValueStore {
  constructor(private readonly storage: Storage = window.localStorage) {}

  get(key: string): string | null {
    return this.storage.getItem(key);
  }

  set(key: string, value: string): void {
    this.storage.setItem(key, value);
  }

  remove(key: string): void {
    this.storage.removeItem(key);
  }
}

export class InMemoryKMRALRepository<Entity extends { id: Id }, Id>
  implements KMRALRepository<Entity, Id>
{
  private readonly records = new Map<Id, Entity>();

  async get(id: Id): Promise<Entity | undefined> {
    const value = this.records.get(id);
    return value ? structuredClone(value) : undefined;
  }

  async list(): Promise<Entity[]> {
    return [...this.records.values()].map((entity) => structuredClone(entity));
  }

  async save(entity: Entity): Promise<void> {
    this.records.set(entity.id, structuredClone(entity));
  }

  async remove(id: Id): Promise<void> {
    this.records.delete(id);
  }
}

export class LocalStorageKMRALRepository<
  Entity extends { id: Id },
  Id extends string,
> implements KMRALRepository<Entity, Id>
{
  constructor(
    private readonly store: KMRALKeyValueStore,
    private readonly prefix = "kmral:data:",
  ) {}

  private key(id: Id): string {
    return `${this.prefix}${id}`;
  }

  async get(id: Id): Promise<Entity | undefined> {
    const raw = this.store.get(this.key(id));
    if (!raw) return undefined;

    try {
      return structuredClone(JSON.parse(raw) as Entity);
    } catch {
      return undefined;
    }
  }

  async list(): Promise<Entity[]> {
    return [];
  }

  async save(entity: Entity): Promise<void> {
    this.store.set(this.key(entity.id), JSON.stringify(entity));
  }

  async remove(id: Id): Promise<void> {
    this.store.remove(this.key(id));
  }
}
