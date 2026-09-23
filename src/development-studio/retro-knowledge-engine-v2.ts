import {
  getRetroKnowledgeBase,
  resolveRetroKnowledgeWorld,
  normalizeRetroMovement,
  resolveRetroConflict,
  validateRetroWorldElements,
  type RetroKnowledgeBase,
  type RetroKnowledgeWorld,
} from "./retro-knowledge-base";

export type RetroKnowledgeSource = "EXCEL" | "NORMALIZED_JSON";

export interface RetroWorldResolution {
  source: RetroKnowledgeSource;
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
 * Runtime authority is the normalized knowledge model. The Excel workbook is
 * the authoring/source artifact; its sheets are normalized into the same model
 * before episode generation. The normalized JSON remains the deterministic
 * runtime fallback when a workbook is unavailable.
 */
export function resolveRetroKnowledge(intent: string, requestedElements: string[] = []): RetroKnowledgeResolution {
  const kb = getRetroKnowledgeBase();
  const world = resolveRetroKnowledgeWorld(intent);

  const movementTokens = intent
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter(Boolean)
    .filter(token => ["run", "running", "sprint", "sprinting", "walk", "walking", "jump", "jumping", "swim", "dive", "diving"].includes(token));

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

  return {
    schemaVersion: kb.schemaVersion,
    sourceArtifact: kb.sourceArtifact,
    world: {
      source: kb.sourceArtifact.endsWith(".xlsx") ? "EXCEL" : "NORMALIZED_JSON",
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
      knowledgeBase: kb.sourceArtifact,
      worldId: world.id,
      rulesApplied
    }
  };
}

/**
 * World-aware prop resolver. It returns only props that are legal for the
 * selected world and explicitly reports reference props that must be removed.
 */
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

/**
 * The progression engine consumes progression DNA independently of the
 * reference world's visual details. This is the key separation that prevents
 * a jungle reference from leaking into a desert episode.
 */
export function resolveRetroProgressionDNA(): RetroProgressionDNA {
  const kb = getRetroKnowledgeBase();
  return {
    stages: [...kb.progressionStages],
    missionArchetypes: structuredClone(kb.missionArchetypes),
    productionRules: structuredClone(kb.productionRules)
  };
}
