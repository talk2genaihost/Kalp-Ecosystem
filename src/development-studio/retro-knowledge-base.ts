import kb from "../../data/retro-world-progression-kb.json";

export type RetroKnowledgeWorldId =
  | "SURFACE" | "UNDERWATER" | "DESERT" | "SNOW" | "URBAN" | "SPACE";

export interface RetroKnowledgeWorld {
  id: RetroKnowledgeWorldId;
  label: string;
  allowedProps: string[];
  suppressedProps: string[];
  movement: Record<string,string>;
  physics: string[];
  vfx: string[];
  audio: string[];
}

export interface RetroKnowledgeBase {
  schemaVersion: string;
  sourceArtifact: string;
  worlds: RetroKnowledgeWorld[];
  conflictRules: [string,string,string][];
  progressionStages: string[];
  missionArchetypes: Record<string,string>;
  productionRules: {
    minimumReels: number;
    shotsPerReel: number;
    finalReelConcludesMission: boolean;
    resumeFromPreviousReel: boolean;
  };
}

let ACTIVE_KNOWLEDGE_BASE = structuredClone(kb as RetroKnowledgeBase);

/** Workbook-loaded knowledge overrides the normalized JSON fallback. */
export function setRetroKnowledgeBase(source: RetroKnowledgeBase): void {
  ACTIVE_KNOWLEDGE_BASE = structuredClone(source);
}

export function resetRetroKnowledgeBase(): void {
  ACTIVE_KNOWLEDGE_BASE = structuredClone(kb as RetroKnowledgeBase);
}

export function getRetroKnowledgeBase(): RetroKnowledgeBase {
  return structuredClone(ACTIVE_KNOWLEDGE_BASE);
}

export function getRetroKnowledgeWorld(worldId: string): RetroKnowledgeWorld {
  const world = ACTIVE_KNOWLEDGE_BASE.worlds.find(x => x.id === worldId.toUpperCase());
  if (!world) throw new Error(`Retro world is not registered in the knowledge base: ${worldId}`);
  return structuredClone(world);
}

export function resolveRetroKnowledgeWorld(intent: string): RetroKnowledgeWorld {
  const text = intent.toLowerCase();
  const order: Array<[RetroKnowledgeWorldId,string[]]> = [
    ["UNDERWATER",["underwater","submerged","aquatic","undersea","ocean","sea","dive","diving"]],
    ["DESERT",["desert","sand","dunes","arid"]],
    ["SNOW",["snow","snowy","ice","arctic","frozen"]],
    ["URBAN",["urban","city","street","rooftop","building"]],
    ["SPACE",["space","zero-g","zero gravity","station","airlock","orbit"]],
  ];
  for (const [id,tokens] of order) if (tokens.some(token => text.includes(token))) return getRetroKnowledgeWorld(id);
  return getRetroKnowledgeWorld("SURFACE");
}

export function normalizeRetroMovement(world: RetroKnowledgeWorld, movement: string): string {
  const key = movement.toLowerCase().trim();
  return world.movement[key] ?? movement;
}

export function resolveRetroConflict(worldId: string, element: string): string | null {
  const hit = ACTIVE_KNOWLEDGE_BASE.conflictRules.find(
    ([id, term]) => id === worldId && element.toLowerCase().includes(term.toLowerCase())
  );
  return hit?.[2] ?? null;
}

export function validateRetroWorldElements(world: RetroKnowledgeWorld, elements: string[]): {
  status: "PASS" | "FAIL";
  allowed: string[];
  suppressed: string[];
  conflicts: string[];
} {
  const suppressed: string[] = [];
  const conflicts: string[] = [];
  for (const element of elements) {
    const value = element.toLowerCase();
    const blocked = world.suppressedProps.find(x => value.includes(x.toLowerCase()));
    if (blocked) {
      suppressed.push(element);
      conflicts.push(`${world.id}: ${element} → suppressed by world knowledge`);
    }
  }
  return {
    status: conflicts.length ? "FAIL" : "PASS",
    allowed: world.allowedProps.filter(x => elements.some(e => e.toLowerCase().includes(x.toLowerCase()))),
    suppressed,
    conflicts
  };
}
