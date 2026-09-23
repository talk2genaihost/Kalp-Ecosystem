import { getRetroKnowledgeBase, resolveRetroKnowledgeWorld, normalizeRetroMovement, validateRetroWorldElements, type RetroKnowledgeWorld } from "./retro-knowledge-base";
import { getRetroEffectsRegistry, getRetroVisualStyleRegistry } from "./retro-knowledge-base";

type Row = Record<string, unknown>;
export interface CinematicSceneRequest {
  intent: string;
  mission?: string;
  progressionStage?: string;
  movement?: string;
  elements?: string[];
  visualStyle?: string;
}
export interface CinematicResolution {
  source: "KALP_Master_Reference_UNIFIED_v3.xlsx";
  world: RetroKnowledgeWorld;
  physics: string[];
  movement?: string;
  progression: { stage: string; mission?: string; focus?: string };
  effects: Record<string, Row | undefined>;
  visualStyle: Row | undefined;
  validation: ReturnType<typeof validateRetroWorldElements>;
}

const EFFECT_DOMAINS = [
  "01_Camera_Movement", "02_Camera_Angle_Perspective", "03_Lens_Optical",
  "07_Lighting_Light_Effects", "08_VFX_Particles_Atmospherics", "12_Sound_Music_VO_SFX"
];
const STYLE_HINTS: Record<string,string[]> = {
  mythic: ["mythic","epic","legend","ancient","divine"],
  noir: ["noir","thriller","dark","mystery"],
  realism: ["realistic","realism","grounded","contemporary"],
  graphic: ["manga","comic","graphic","stylized"]
};
function tokens(text: string): string[] { return text.toLowerCase().split(/[^a-z0-9-]+/).filter(x => x.length > 2); }
function score(row: Row, terms: string[]): number {
  const text = Object.values(row).map(v => String(v)).join(" ").toLowerCase();
  return terms.reduce((n, t) => n + (text.includes(t) ? 1 : 0), 0);
}
function best(rows: Row[], terms: string[]): Row | undefined {
  return rows.map((row, index) => ({ row, index, score: score(row, terms) }))
    .sort((a,b) => b.score - a.score || a.index - b.index)[0]?.row;
}
function resolveStage(request: CinematicSceneRequest): string {
  if (request.progressionStage) return request.progressionStage.toUpperCase();
  const text = (request.intent + " " + (request.mission ?? "")).toLowerCase();
  if (/breakthrough|escape|final|extract/.test(text)) return "BREAKTHROUGH";
  if (/fight|attack|engage|combat|battle/.test(text)) return "FIRST_ENGAGEMENT";
  if (/threat|enemy|opposition|danger/.test(text)) return "THREAT_INTRODUCTION";
  return "ENTRY";
}
function resolveStyle(request: CinematicSceneRequest, rows: Row[]): Row | undefined {
  if (request.visualStyle) {
    const wanted = request.visualStyle.toLowerCase();
    return rows.find(r => String(r["Style Name"] ?? "").toLowerCase().includes(wanted)) ?? best(rows, tokens(wanted));
  }
  const text = (request.intent + " " + (request.mission ?? "")).toLowerCase();
  const hint = Object.entries(STYLE_HINTS).find(([, words]) => words.some(w => text.includes(w)))?.[0];
  return best(rows, hint ? STYLE_HINTS[hint] : tokens(text));
}

export function resolveCinematicScene(request: CinematicSceneRequest): CinematicResolution {
  const kb = getRetroKnowledgeBase();
  const world = resolveRetroKnowledgeWorld(request.intent);
  const mission = request.mission?.toLowerCase();
  const focus = mission ? kb.missionArchetypes[mission] : undefined;
  const stage = resolveStage(request);
  const validation = validateRetroWorldElements(world, request.elements ?? []);
  const effectsRegistry = getRetroEffectsRegistry().domains;
  const terms = tokens(request.intent + " " + (request.mission ?? "") + " " + stage);
  const effects: Record<string, Row | undefined> = {};
  for (const domain of EFFECT_DOMAINS) effects[domain] = best(effectsRegistry[domain] ?? [], terms);
  const style = resolveStyle(request, getRetroVisualStyleRegistry().entries);
  return {
    source: "KALP_Master_Reference_UNIFIED_v3.xlsx",
    world,
    physics: world.physics,
    movement: request.movement ? normalizeRetroMovement(world, request.movement) : undefined,
    progression: { stage, mission, focus },
    effects,
    visualStyle: style,
    validation
  };
}
