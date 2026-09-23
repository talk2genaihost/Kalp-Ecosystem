import {
  getRetroKnowledgeBase,
  getRetroKnowledgeSource,
  getRetroEffectsRegistry,
  getRetroVisualStyleRegistry,
  resolveRetroKnowledgeWorld,
  normalizeRetroMovement,
  resolveRetroConflict,
  validateRetroWorldElements,
  type RetroKnowledgeBase,
  type RetroKnowledgeWorld,
} from "./retro-knowledge-base";

export interface RetroEffectRegistry {
  domains: Record<string, Record<string, unknown>[]>;
}

export interface RetroVisualStyleRegistry {
  entries: Record<string, unknown>[];
  classifications: Record<string, unknown>[];
}

export interface RetroWorldResolution {
  source: string;
  world: RetroKnowledgeWorld;
  normalizedMovements: string[];
  allowedProps: string[];
  suppressedProps: string[];
  physics: string[];
  vfx: string[];
  audio: string[];
  conflicts: string[];
  appliedRules: string[];
}

export interface RetroProgressionDNA {
  stages: string[];
  missionArchetypes: Record<string, string>;
  productionRules: RetroKnowledgeBase["productionRules"];
}

export interface RetroKnowledgeResolution {
  schemaVersion: string;
  sourceArtifact: string;
  world: RetroWorldResolution;
  progression: RetroProgressionDNA;
  provenance: {
    knowledgeBase: string;
    worldId: string;
    rulesApplied: string[];
  };
}

/**
 * RETRO-64 KNOWLEDGE ENGINE v2.0
 *
 * The canonical unified XLSX is loaded by retro-knowledge-base at startup.
 * Normalized JSON remains the deterministic fallback when the workbook is
 * unavailable.
 */
export function resolveRetroKnowledge(
  intent: string,
  requestedElements: string[] = []
): RetroKnowledgeResolution {
  const kb = getRetroKnowledgeBase();
  const world = resolveRetroKnowledgeWorld(intent);

  const movementTokens = intent
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter(Boolean)
    .filter(token =>
      ["run", "running", "sprint", "sprinting", "walk", "walking", "jump", "jumping", "swim", "dive", "diving"].includes(token)
    );

  const normalizedMovements = movementTokens.map(token => {
    const base = token.replace(/ing$/, "");
    return `${token} → ${normalizeRetroMovement(world, base)}`;
  });

  const elements = [...requestedElements, ...movementTokens];
  const elementValidation = validateRetroWorldElements(world, elements);
  const conflicts = [
    ...elementValidation.conflicts,
    ...movementTokens
      .map(token => resolveRetroConflict(world.id, token))
      .filter((value): value is string => Boolean(value))
      .map(rule => `${world.id}: ${rule}`)
  ];

  const rulesApplied = [
    `WORLD=${world.id}`,
    ...world.physics.map(rule => `PHYSICS: ${rule}`),
    ...normalizedMovements.map(rule => `MOVEMENT: ${rule}`),
    ...conflicts.map(rule => `CONFLICT: ${rule}`)
  ];

  const source = getRetroKnowledgeSource();
  return {
    schemaVersion: kb.schemaVersion,
    sourceArtifact: kb.sourceArtifact,
    world: {
      source,
      world: structuredClone(world),
      normalizedMovements,
      allowedProps: [...world.allowedProps],
      suppressedProps: [...world.suppressedProps],
      physics: [...world.physics],
      vfx: [...world.vfx],
      audio: [...world.audio],
      conflicts,
      appliedRules: rulesApplied
    },
    progression: {
      stages: [...kb.progressionStages],
      missionArchetypes: structuredClone(kb.missionArchetypes),
      productionRules: structuredClone(kb.productionRules)
    },
    provenance: {
      knowledgeBase: source,
      worldId: world.id,
      rulesApplied
    }
  };
}

export function getRetroEffects(): RetroEffectRegistry {
  return getRetroEffectsRegistry() as RetroEffectRegistry;
}

export function getRetroVisualStyles(): RetroVisualStyleRegistry {
  return getRetroVisualStyleRegistry() as RetroVisualStyleRegistry;
}

export function resolveRetroEffectDomain(domain: string): Record<string, unknown>[] {
  const effects = getRetroEffects().domains;
  const key = Object.keys(effects).find(x => x.toLowerCase() === domain.toLowerCase());
  return key ? structuredClone(effects[key]) : [];
}

export function findRetroVisualStyles(query = ""): Record<string, unknown>[] {
  const entries = getRetroVisualStyles().entries;
  const needle = query.trim().toLowerCase();
  if (!needle) return structuredClone(entries);
  return structuredClone(entries.filter(row =>
    Object.values(row).some(value => String(value).toLowerCase().includes(needle))
  ));
}

export function resolveRetroProps(
  intent: string,
  candidateProps: string[]
): { allowed: string[]; suppressed: string[]; conflicts: string[] } {
  const world = resolveRetroKnowledgeWorld(intent);
  const allowed = candidateProps.filter(prop =>
    world.allowedProps.some(rule => prop.toLowerCase().includes(rule.toLowerCase()))
  );
  const suppressed = candidateProps.filter(prop =>
    world.suppressedProps.some(rule => prop.toLowerCase().includes(rule.toLowerCase()))
  );
  return {
    allowed,
    suppressed,
    conflicts: suppressed.map(prop => `${world.id}: ${prop} → suppressed by world knowledge`)
  };
}

export function resolveRetroProgressionDNA(): RetroProgressionDNA {
  const kb = getRetroKnowledgeBase();
  return {
    stages: [...kb.progressionStages],
    missionArchetypes: structuredClone(kb.missionArchetypes),
    productionRules: structuredClone(kb.productionRules)
  };
}
