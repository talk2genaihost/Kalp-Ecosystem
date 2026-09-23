import {
  getRetroKnowledgeBase,
  resolveRetroKnowledgeWorld,
  type RetroKnowledgeWorldId
} from "./retro-knowledge-base";

export type RetroWorldId = RetroKnowledgeWorldId;

export interface RetroWorldPropProfile {
  id: RetroWorldId;
  label: string;
  environmentTokens: string[];
  allowedProps: string[];
  suppressedProps: string[];
  visualRules: string[];
  movementNormalization: Record<string,string>;
}

const visualRules: Record<RetroWorldId,string[]> = {
  SURFACE:["Use sky, clouds, horizon, atmospheric weather and land-based set dressing when the scene is surface-based."],
  UNDERWATER:["No open sky or sky-only props inside the submerged camera volume.","Surface vehicles and aircraft are suppressed unless explicitly framed above the water surface.","Use underwater particulate matter, caustic light, bubbles, aquatic plants, currents and submerged structures instead."],
  DESERT:["Use desert sky and dust only; do not mix aquatic or snow set dressing.","Keep loose-sand traction and heat/dust dynamics consistent."],
  SNOW:["Use cold atmospheric effects and frozen terrain consistently.","Respect icy traction and snow/ice interaction."],
  URBAN:["Use architectural and street-level props consistent with a city environment."],
  SPACE:["Do not use Earth surface sky or ground props unless explicitly inside a spacecraft or planetary surface scene.","Respect zero-g or microgravity movement."]
};

function profileFromKnowledge(id: RetroWorldId): RetroWorldPropProfile {
  const kb = getRetroKnowledgeBase();
  const world = kb.worlds.find(x => x.id === id);
  if (!world) throw new Error(`World ${id} is missing from the Retro knowledge base.`);
  const environmentTokens =
    id === "UNDERWATER" ? ["underwater","submerged","aquatic","ocean","sea","undersea","dive","diving"] :
    id === "SPACE" ? ["space","orbit","zero-g","zero gravity","spaceship"] :
    id === "DESERT" ? ["desert","sand","dune","sandstorm"] :
    id === "SNOW" ? ["snow","snowy","ice","frozen","arctic"] :
    id === "URBAN" ? ["urban","city","street","building","metro"] :
    ["surface","land","jungle","forest","road","city","urban","desert","snow","ground"];

  return {
    id,
    label: world.label,
    environmentTokens,
    allowedProps: [...world.allowedProps],
    suppressedProps: [...world.suppressedProps],
    visualRules: [...visualRules[id]],
    movementNormalization: {...world.movement}
  };
}

export const RETRO_WORLD_PROP_LIBRARY: Record<RetroWorldId, RetroWorldPropProfile> = {
  SURFACE: profileFromKnowledge("SURFACE"),
  UNDERWATER: profileFromKnowledge("UNDERWATER"),
  DESERT: profileFromKnowledge("DESERT"),
  SNOW: profileFromKnowledge("SNOW"),
  URBAN: profileFromKnowledge("URBAN"),
  SPACE: profileFromKnowledge("SPACE")
};

export function resolveRetroWorldPropProfile(intent:string): RetroWorldPropProfile {
  const world = resolveRetroKnowledgeWorld(intent);
  return RETRO_WORLD_PROP_LIBRARY[world.id];
}
