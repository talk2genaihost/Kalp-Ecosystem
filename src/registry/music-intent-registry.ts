import type {
  MusicIntentDefinition,
  MusicIntentType
} from "../contracts/music-intent.js";

export interface MusicIntentRegistry {
  register(definition: MusicIntentDefinition): void;
  get(intentType: MusicIntentType): MusicIntentDefinition | undefined;
  has(intentType: MusicIntentType): boolean;
  list(): readonly MusicIntentDefinition[];
}

/**
 * Canonical registry authority for Music Manthan intent definitions.
 * Routing, provider selection, resilience and execution remain outside this boundary.
 */
export class InMemoryMusicIntentRegistry implements MusicIntentRegistry {
  private readonly definitions = new Map<MusicIntentType, MusicIntentDefinition>();

  register(definition: MusicIntentDefinition): void {
    if (definition.contractVersion !== "MM-01.0") {
      throw new Error(`Unsupported Music Intent contract: ${definition.contractVersion}`);
    }
    if (this.definitions.has(definition.intentType)) {
      throw new Error(`Music intent already registered: ${definition.intentType}`);
    }
    this.definitions.set(definition.intentType, Object.freeze({
      ...definition,
      operations: Object.freeze([...definition.operations])
    }));
  }

  get(intentType: MusicIntentType): MusicIntentDefinition | undefined {
    return this.definitions.get(intentType);
  }

  has(intentType: MusicIntentType): boolean {
    return this.definitions.has(intentType);
  }

  list(): readonly MusicIntentDefinition[] {
    return Object.freeze([...this.definitions.values()]);
  }
}
