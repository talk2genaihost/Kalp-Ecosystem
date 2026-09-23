import {
  findRetroVisualStyles,
  getRetroEffects,
  resolveRetroKnowledge,
  resolveRetroProgressionDNA,
  resolveRetroProps,
  type RetroKnowledgeResolution,
} from "./retro-knowledge-engine-v2";

export interface RetroSceneRequest {
  world: string;
  mission: string;
  progression?: string;
  protagonist: string;
  threat: string;
  objective?: string;
  visualStyleQuery?: string;
  reels?: number;
}

export interface RetroShotDNA {
  shot: number;
  reel: number;
  stage: string;
  title: string;
  objective: string;
  worldState: string;
  characters: string[];
  action: string;
  movement: string;
  camera: string;
  lighting: string;
  vfx: string;
  audio: string;
  continuityIn: string;
  continuityOut: string;
}

export interface RetroProductionPackage {
  contract: "KALP-RETRO64-PRODUCTION-PACKAGE-1.0";
  engine: "RETRO-64-SCENE-GENERATION-ENGINE";
  engineVersion: "1.0";
  request: RetroSceneRequest;
  knowledge: {
    sourceArtifact: string;
    world: RetroKnowledgeResolution["world"];
    progression: RetroKnowledgeResolution["progression"];
  };
  style: Record<string, unknown> | null;
  effects: {
    camera: Record<string, unknown>[];
    lighting: Record<string, unknown>[];
    vfx: Record<string, unknown>[];
    sound: Record<string, unknown>[];
  };
  shots: RetroShotDNA[];
  continuity: {
    resumeFromPreviousReel: boolean;
    finalReelConcludesMission: boolean;
    reelCount: number;
    shotsPerReel: number;
  };
  validation: {
    status: "PASS" | "FAIL";
    errors: string[];
    warnings: string[];
  };
}

const STAGE_TITLES: Record<string, string> = {
  ENTRY: "Arrival",
  THREAT_INTRODUCTION: "Threat Introduction",
  FIRST_ENGAGEMENT: "First Engagement",
  CAPABILITY_ESCALATION: "Capability Escalation",
  MAJOR_ESCALATION: "Major Escalation",
  BREAKTHROUGH: "Breakthrough",
  GATE_OR_OBJECTIVE: "Objective Gate",
  NEXT_THREAT: "Next Threat",
};

const ACTIONS = [
  "Establish the environment and mission state.",
  "Reveal the immediate threat without resolving the encounter.",
  "Create the first direct interaction between protagonist and threat.",
  "Force the protagonist to adapt to the world physics.",
  "Escalate the threat and introduce a harder obstacle.",
  "Show the protagonist gaining a tactical advantage.",
  "Drive the action toward the mission objective.",
  "Block the direct route and require a breakthrough.",
  "Execute the breakthrough while preserving continuity.",
  "Reach the objective gate and secure the target.",
  "Resolve the immediate threat and create a clean transition.",
  "Close the reel on the mission state required by progression.",
];

function pick(rows: Record<string, unknown>[], index: number): Record<string, unknown> | null {
  return rows.length ? rows[index % rows.length] : null;
}

function text(row: Record<string, unknown> | null, keys: string[], fallback: string): string {
  if (!row) return fallback;
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && String(value).trim()) return String(value).trim();
  }
  const first = Object.values(row).find(v => String(v).trim());
  return first === undefined ? fallback : String(first).trim();
}

function domainRows(domains: Record<string, Record<string, unknown>[]>, tokens: string[]): Record<string, unknown>[] {
  const key = Object.keys(domains).find(name =>
    tokens.some(token => name.toLowerCase().includes(token))
  );
  return key ? domains[key] : [];
}

function stageForShot(index: number, total: number, stages: string[]): string {
  const usable = stages.length ? stages : Object.keys(STAGE_TITLES);
  const normalized = [
    usable[0] ?? "ENTRY",
    usable[1] ?? "THREAT_INTRODUCTION",
    usable[2] ?? "FIRST_ENGAGEMENT",
    usable[3] ?? "CAPABILITY_ESCALATION",
    usable[4] ?? "MAJOR_ESCALATION",
    usable[5] ?? "BREAKTHROUGH",
    usable[6] ?? "GATE_OR_OBJECTIVE",
    usable[7] ?? "NEXT_THREAT",
  ];
  const ratio = index / Math.max(1, total - 1);
  return normalized[Math.min(normalized.length - 1, Math.floor(ratio * normalized.length))];
}

export function generateRetroScene(request: RetroSceneRequest): RetroProductionPackage {
  const reels = Math.max(2, request.reels ?? 2);
  const base = resolveRetroKnowledge(
    `${request.world} ${request.mission} ${request.progression ?? ""} ${request.objective ?? ""}`,
    [request.protagonist, request.threat]
  );
  const progression = resolveRetroProgressionDNA();
  const totalShots = reels * progression.productionRules.shotsPerReel;
  const mission = progression.missionArchetypes[request.mission.toLowerCase()] ?? request.mission;
  const props = resolveRetroProps(
    `${request.world} ${request.mission}`,
    base.world.allowedProps
  );
  const effects = getRetroEffects().domains;
  const cameraRows = domainRows(effects, ["camera_movement", "camera-angle", "camera_angle", "lens"]);
  const lightingRows = domainRows(effects, ["lighting"]);
  const vfxRows = domainRows(effects, ["vfx"]);
  const soundRows = domainRows(effects, ["sound"]);

  const styles = findRetroVisualStyles(request.visualStyleQuery ?? request.world);
  const style = styles[0] ?? null;

  const shots: RetroShotDNA[] = [];
  for (let i = 0; i < totalShots; i++) {
    const reel = Math.floor(i / progression.productionRules.shotsPerReel) + 1;
    const localShot = (i % progression.productionRules.shotsPerReel) + 1;
    const stage = stageForShot(i, totalShots, progression.stages);
    const previous = i === 0 ? "episode entry state" : `shot ${i}`;
    const objective = request.objective ?? `Complete mission sequence: ${mission}`;

    const camera = text(pick(cameraRows, i), ["effect", "capability", "intent", "name"], "cinematic coverage");
    const lighting = text(pick(lightingRows, i), ["effect", "capability", "intent", "name"], base.world.physics[0] ?? "world-consistent lighting");
    const vfx = text(pick(vfxRows, i), ["effect", "capability", "intent", "name"], base.world.vfx[i % Math.max(1, base.world.vfx.length)] ?? "controlled environmental VFX");
    const audio = text(pick(soundRows, i), ["effect", "capability", "intent", "name"], base.world.audio[i % Math.max(1, base.world.audio.length)] ?? "cinematic action sound");

    shots.push({
      shot: i + 1,
      reel,
      stage,
      title: `${STAGE_TITLES[stage] ?? stage} — Shot ${localShot}`,
      objective,
      worldState: `${base.world.world.label}; physics: ${base.world.physics.join(", ")}`,
      characters: [request.protagonist, request.threat],
      action: ACTIONS[i % ACTIONS.length],
      movement: base.world.normalizedMovements[0] ?? "world-normalized movement",
      camera,
      lighting,
      vfx,
      audio,
      continuityIn: previous,
      continuityOut: `reel ${reel}, shot ${localShot}`,
    });
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  if (!props.allowed.length && base.world.allowedProps.length) {
    warnings.push("No explicit candidate prop matched; world registry remains authoritative.");
  }
  if (base.world.conflicts.length) warnings.push(...base.world.conflicts);
  if (shots.length !== totalShots) errors.push("Shot count does not match production rules.");
  if (reels < progression.productionRules.minimumReels) errors.push("Requested reel count is below the knowledge-base minimum.");

  return {
    contract: "KALP-RETRO64-PRODUCTION-PACKAGE-1.0",
    engine: "RETRO-64-SCENE-GENERATION-ENGINE",
    engineVersion: "1.0",
    request: { ...request, reels },
    knowledge: {
      sourceArtifact: base.sourceArtifact,
      world: base.world,
      progression,
    },
    style,
    effects: { camera: cameraRows, lighting: lightingRows, vfx: vfxRows, sound: soundRows },
    shots,
    continuity: {
      resumeFromPreviousReel: progression.productionRules.resumeFromPreviousReel,
      finalReelConcludesMission: progression.productionRules.finalReelConcludesMission,
      reelCount: reels,
      shotsPerReel: progression.productionRules.shotsPerReel,
    },
    validation: {
      status: errors.length ? "FAIL" : "PASS",
      errors,
      warnings,
    },
  };
}
