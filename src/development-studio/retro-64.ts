export type RetroGameId = "G001"|"G002"|"G003"|"G004"|"G005";
export interface RetroFrame { title:string; action:string }
export interface RetroGameReference { id:RetroGameId; name:string; worksheet:string; status:"ACTIVE"|"PLANNED"; durationSeconds?:number; format?:"9:16"|"16:9"; world?:string; terrain?:string; obstacles?:string; enemies?:string; moves?:string; weapons?:string; powerUps?:string; abilities?:string; props?:string; camera?:string; vfx?:string; sound?:string; realistic?:string; frames?:RetroFrame[] }
export interface RetroReferenceRegistry { schemaVersion:string; sourceArtifact:string; games:RetroGameReference[] }
export function resolveRetroGame(registry:RetroReferenceRegistry, gameName:string):RetroGameReference {
  const game=registry.games.find(g=>g.name.toLowerCase()===gameName.trim().toLowerCase());
  if(!game) throw new Error(`Retro game not registered: ${gameName}`);
  return structuredClone(game);
}
export function buildRetroEpisode(game:RetroGameReference, episodeId=`${game.name.toUpperCase().replace(/[^A-Z0-9]+/g,"_")}_EP_001`) {
  if(!game.frames || game.frames.length!==8) throw new Error(`Game worksheet must provide exactly 8 frames: ${game.worksheet}`);
  return {contract:"KALP-RETRO-64-EPISODE-1.0",episode_id:episodeId,game:game.name,reference_worksheet:game.worksheet,duration_seconds:game.durationSeconds??60,format:game.format??"9:16",world:game.world??"",terrain:game.terrain??"",obstacles:game.obstacles??"",enemies:game.enemies??"",moves:game.moves??"",weapons_ammunition:game.weapons??"",power_ups:game.powerUps??"",special_abilities:game.abilities??"",props:game.props??"",camera:game.camera??"",vfx:game.vfx??"",sound:game.sound??"",realistic_interpretation:game.realistic??"",storyboard:game.frames.map((f,i)=>({frame:i+1,title:f.title,action:f.action}))};
}

/** Parse a Retro 64 XLSX workbook into the canonical registry shape. */
export async function parseRetro64Workbook(input: ArrayBuffer | Uint8Array): Promise<RetroReferenceRegistry> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(input, { type: "array" });
  const games: RetroGameReference[] = [];
  for (const worksheet of workbook.SheetNames) {
    const sheet = workbook.Sheets[worksheet];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });
    if (!rows.length) continue;
    const meta: Record<string,string> = {};
    const frames: RetroFrame[] = [];
    for (const row of rows) {
      const key = String(row?.[0] ?? "").trim();
      const value = String(row?.[1] ?? "").trim();
      if (/^frame$/i.test(key) && String(row?.[1] ?? "").trim()) {
        frames.push({ title: String(row?.[2] ?? ("Frame " + (frames.length + 1))).trim(), action: String(row?.[3] ?? "").trim() });
      } else if (key) {
        const canonical = key.replace(/[\\s_-]+/g, "");
        meta[canonical] = value;
      }
    }
    const gameName = meta.name || worksheet.replace(/^G\\d+[_-]?/i, "").trim() || worksheet;
    const id = (worksheet.match(/^G\\d+/i)?.[0].toUpperCase() || ("G" + String(games.length + 1).padStart(3, "0"))) as RetroGameId;
    games.push({ id, name: gameName, worksheet, status: "ACTIVE", durationSeconds: Number(meta.durationSeconds || 60), format: meta.format === "16:9" ? "16:9" : "9:16", world: meta.world, terrain: meta.terrain, obstacles: meta.obstacles, enemies: meta.enemies, moves: meta.moves, weapons: meta.weapons, powerUps: meta.powerUps, abilities: meta.abilities, props: meta.props, camera: meta.camera, vfx: meta.vfx, sound: meta.sound, realistic: meta.realistic, frames });
  }
  return { schemaVersion: "1.0", sourceArtifact: "KALP_Retro_64_Master_Reference.xlsx", games };
}

export type RetroIntentMode = "REFERENCE" | "VARIATION" | "EXPANSION";

export type RetroProgressionStage =
  | "ENTRY"
  | "THREAT_INTRODUCTION"
  | "FIRST_ENGAGEMENT"
  | "CAPABILITY_ESCALATION"
  | "MAJOR_ESCALATION"
  | "BREAKTHROUGH"
  | "GATE_OR_OBJECTIVE"
  | "NEXT_THREAT";

export interface RetroProgressionStep {
  order:number;
  stage:RetroProgressionStage;
  referenceFrame:number;
  referenceTitle:string;
  referenceAction:string;
}

export interface RetroProgressionModel {
  modelVersion:"1.0";
  game:string;
  sourceWorksheet:string;
  sourceArtifact:string;
  progression:RetroProgressionStep[];
  lockedDna:string[];
  flexibleElements:string[];
}

export interface RetroIntentEpisodeRequest {
  game:RetroGameReference;
  mode:RetroIntentMode;
  intent:string;
  episodeId?:string;
  sourceArtifact?:string;
}

const STAGES:RetroProgressionStage[]=[
  "ENTRY","THREAT_INTRODUCTION","FIRST_ENGAGEMENT","CAPABILITY_ESCALATION",
  "MAJOR_ESCALATION","BREAKTHROUGH","GATE_OR_OBJECTIVE","NEXT_THREAT"
];

function stageForFrame(index:number):RetroProgressionStage {
  return STAGES[Math.min(index,STAGES.length-1)];
}

/** Derive the game's progression grammar from the ordered reference frames. */
export function buildRetroProgressionModel(
  game:RetroGameReference,
  sourceArtifact="KALP_Retro_64_Master_Reference.xlsx"
):RetroProgressionModel {
  if(!game.frames || game.frames.length!==8){
    throw new Error(`Progression model requires exactly 8 reference frames: ${game.worksheet}`);
  }
  return {
    modelVersion:"1.0",
    game:game.name,
    sourceWorksheet:game.worksheet,
    sourceArtifact,
    progression:game.frames.map((frame,index)=>({
      order:index+1,
      stage:stageForFrame(index),
      referenceFrame:index+1,
      referenceTitle:frame.title,
      referenceAction:frame.action
    })),
    lockedDna:[
      "Ordered escalation from entry to a new threat",
      "Eight-step encounter rhythm",
      "Increasing opposition and/or capability",
      "Action-driven progression rather than static scene repetition",
      "A gate, objective or threshold before the next threat"
    ],
    flexibleElements:[
      "Specific locations and weather",
      "Enemy combinations",
      "Obstacles and set pieces",
      "Weapon or ability combinations",
      "Exact actions and scene titles",
      "Camera execution and cinematic treatment"
    ]
  };
}

function intentTokens(intent:string):string[]{
  return intent.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * Generate a new episode from user intent while preserving the reference game's
 * progression grammar. This is deliberately separate from buildRetroEpisode(),
 * which remains the exact-reference path.
 */
export function buildIntentDrivenRetroEpisode(request:RetroIntentEpisodeRequest) {
  const game=structuredClone(request.game);
  const progression=buildRetroProgressionModel(game,request.sourceArtifact);
  const intent=request.intent.trim();
  if(!intent) throw new Error("Intent is required for VARIATION or EXPANSION mode.");
  if(request.mode==="REFERENCE") return buildRetroEpisode(game,request.episodeId);

  const tokens=intentTokens(intent);
  const has=(...words:string[])=>words.some(word=>tokens.includes(word));
  const setting=has("night","nighttime")?"night-time":has("desert")?"desert":has("snow","snowy")?"snow-covered":has("urban","city")?"urban":"cinematic";
  const weather=has("rain","rainy","storm","stormy")?"heavy rain":has("fog","foggy")?"dense fog":has("sandstorm")?"sandstorm":"environmental pressure";
  const pursuit=has("helicopter","chase","pursuit")?"high-speed pursuit":"advancing enemy pressure";
  const objective=has("rescue","extract","extraction")?"rescue/extraction objective":has("destroy","destroyed","destroying")?"destruction objective":has("escape","escape")?"escape objective":"forward mission objective";

  const generated=[
    {stage:"ENTRY",title:`Approach — ${setting} ${game.name} zone`,action:`The hero enters a ${setting} combat zone under ${weather}, moving toward the ${objective}.`},
    {stage:"THREAT_INTRODUCTION",title:"Threat Contact",action:`A first enemy unit appears and establishes the route's danger; ${pursuit} begins to close the distance.`},
    {stage:"FIRST_ENGAGEMENT",title:"First Engagement",action:"The hero reacts with rapid movement, using cover and the environment while the first exchange escalates."},
    {stage:"CAPABILITY_ESCALATION",title:"Capability Gain",action:`The hero acquires or activates a ${game.powerUps||"combat capability"}, changing the tactical options for the next encounter.`},
    {stage:"MAJOR_ESCALATION",title:"Enemy Escalation",action:`A stronger opposition force combines ${game.enemies||"enemy units"} with environmental pressure and forces continuous movement.`},
    {stage:"BREAKTHROUGH",title:"Breakthrough",action:`The hero combines ${game.moves||"movement"} with ${game.abilities||"special abilities"} to break through the escalating obstacle.`},
    {stage:"GATE_OR_OBJECTIVE",title:"Objective Threshold",action:`A major threshold appears: ${objective}. The hero crosses the immediate gate while the environment reaches peak intensity.`},
    {stage:"NEXT_THREAT",title:"Next Threat",action:`The route opens into a larger combat space; a new threat is revealed, creating the next ${game.name} encounter.`}
  ];

  return {
    contract:"KALP-RETRO-64-EPISODE-1.0",
    episode_id:request.episodeId||`${game.name.toUpperCase().replace(/[^A-Z0-9]+/g,"_")}_INTENT_EP_001`,
    game:game.name,
    intent_mode:request.mode,
    intent,
    progression_model:"1.0",
    progression_source:game.worksheet,
    reference_source:request.sourceArtifact||"KALP_Retro_64_Master_Reference.xlsx",
    reference_role:"GAME_PROGRESSION_REFERENCE",
    duration_seconds:game.durationSeconds??60,
    format:game.format??"9:16",
    world:game.world??"",
    terrain:game.terrain??"",
    obstacles:game.obstacles??"",
    enemies:game.enemies??"",
    moves:game.moves??"",
    weapons_ammunition:game.weapons??"",
    power_ups:game.powerUps??"",
    special_abilities:game.abilities??"",
    props:game.props??"",
    camera:game.camera??"",
    vfx:game.vfx??"",
    sound:game.sound??"",
    realistic_interpretation:game.realistic??"",
    progression:progression.progression,
    storyboard:generated.map((frame,index)=>({
      frame:index+1,
      stage:frame.stage,
      title:frame.title,
      action:frame.action
    }))
  };
}
