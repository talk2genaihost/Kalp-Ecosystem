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
  modelVersion:"1.1";
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

export interface RetroProductionScene {
  frame:number;
  stage:RetroProgressionStage;
  title:string;
  description:string;
  visual:string;
  action:string;
  characters:string[];
  environment:string;
  enemy_presence:string;
  weapons:string;
  camera:string;
  vfx:string;
  sound:string;
  dialogue:string;
  continuity:string;
  progression_purpose:string;
  reference_frame:number;
  world_state?:string;
  threat_state?:string;
  capability_before?:string;
  capability_gain?:string;
  capability_after?:string;
  objective_state?:string;
  next_threat_state?:string;
  new_threat?:string;
}

const STAGES:RetroProgressionStage[]=[
  "ENTRY","THREAT_INTRODUCTION","FIRST_ENGAGEMENT","CAPABILITY_ESCALATION",
  "MAJOR_ESCALATION","BREAKTHROUGH","GATE_OR_OBJECTIVE","NEXT_THREAT"
];

function stageForFrame(index:number):RetroProgressionStage {
  return STAGES[Math.min(index,STAGES.length-1)];
}

export function buildRetroProgressionModel(
  game:RetroGameReference,
  sourceArtifact="KALP_Retro_64_Master_Reference.xlsx"
):RetroProgressionModel {
  if(!game.frames || game.frames.length!==8){
    throw new Error(`Progression model requires exactly 8 reference frames: ${game.worksheet}`);
  }
  return {
    modelVersion:"1.0", game:game.name, sourceWorksheet:game.worksheet, sourceArtifact,
    progression:game.frames.map((frame,index)=>({
      order:index+1, stage:stageForFrame(index), referenceFrame:index+1,
      referenceTitle:frame.title, referenceAction:frame.action
    })),
    lockedDna:[
      "Ordered escalation from entry to a new threat",
      "Eight-step encounter rhythm",
      "Increasing opposition and/or capability",
      "Action-driven progression rather than static scene repetition",
      "A gate, objective or threshold before the next threat"
    ],
    flexibleElements:[
      "Specific locations and weather","Enemy combinations","Obstacles and set pieces",
      "Weapon or ability combinations","Exact actions and scene titles",
      "Camera execution and cinematic treatment"
    ]
  };
}

function intentTokens(intent:string):string[]{return intent.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);}
function hasToken(tokens:string[],...words:string[]){return words.some(word=>tokens.includes(word));}

function buildProductionScenes(game:RetroGameReference, intent:string, mode:RetroIntentMode, progression:RetroProgressionModel):RetroProductionScene[] {
  const tokens=intentTokens(intent);
  const setting=hasToken(tokens,"night","nighttime")?"night-time":hasToken(tokens,"desert")?"desert":hasToken(tokens,"snow","snowy")?"snow-covered":hasToken(tokens,"urban","city")?"urban":"cinematic";
  const weather=hasToken(tokens,"rain","rainy","storm","stormy")?"heavy rain":hasToken(tokens,"fog","foggy")?"dense fog":hasToken(tokens,"sandstorm")?"sandstorm":"environmental pressure";
  const pursuit=hasToken(tokens,"helicopter","chase","pursuit")?"helicopter pursuit":"advancing enemy pressure";
  const objective=hasToken(tokens,"rescue","extract","extraction")?"rescue/extraction":hasToken(tokens,"destroy","destroyed","destroying")?"destruction":hasToken(tokens,"escape")?"escape":"forward mission";
  const environment=`${setting} tropical military-industrial zone; ${weather}; ${game.terrain||""}`.trim();
  const enemy=game.enemies||"enemy units";
  const weapons=game.weapons||"available combat weapons";
  const camera=game.camera||"cinematic action camera";
  const vfx=game.vfx||"cinematic environmental effects";
  const sound=game.sound||"cinematic action soundscape";
  const chars=["Hero"];
  const scenes:RetroProductionScene[]=[
    {frame:1,stage:"ENTRY",title:`Night Jungle Approach`,description:`The hero enters the ${setting} combat zone as ${weather} reduces visibility and a distant ${pursuit} establishes the mission's pressure.`,visual:`Photorealistic ${environment}, wet reflective surfaces, dense jungle, abandoned military vehicles, distant fortified compound, lone hero advancing through rain.`,action:`Hero runs forward, scans the route and moves toward the ${objective} while distant helicopter searchlights sweep across the jungle.`,characters:chars,environment,enemy_presence:"Distant patrol units and aerial surveillance",weapons, camera:"Low tracking shot followed by wide establishing shot",vfx:`Rain spray, wet-road reflections, mist and distant searchlight beams; ${vfx}`,sound:`Heavy percussion, rainfall, distant helicopter rotor and radio chatter; ${sound}`,dialogue:"",continuity:"Establish hero, environment, weather and mission direction.",progression_purpose:"Establish entry and immediately introduce environmental pressure.",reference_frame:1},
    {frame:2,stage:"THREAT_INTRODUCTION",title:"Helicopter Threat Contact",description:`Enemy presence becomes explicit as patrol units block the route and the helicopter begins a focused pursuit.`,visual:`Enemy patrol vehicle emerges through rain, soldiers deploy near barricades while a helicopter searchlight tracks the hero.`,action:`Hero changes direction, uses abandoned vehicles as cover and accelerates as the pursuit closes.`,characters:chars,environment,enemy_presence:`Patrol units plus helicopter support: ${enemy}`,weapons, camera:"Over-shoulder combat into handheld chase",vfx, sound,dialogue:"Radio chatter: Contact ahead.",continuity:"Threat must follow directly from Scene 1 and increase pressure.",progression_purpose:"Convert environmental danger into an identifiable enemy threat.",reference_frame:2},
    {frame:3,stage:"FIRST_ENGAGEMENT",title:"First Engagement",description:"The hero is forced into the first direct combat exchange while the helicopter keeps the route exposed.",visual:`Hero crouches behind a concrete barrier as muzzle flashes cut through heavy rain; helicopter light sweeps the battlefield.`,action:`Hero dodges incoming fire, returns controlled bursts and moves between cover positions.`,characters:chars,environment,enemy_presence:enemy,weapons,camera:"Over-shoulder combat with rapid low-angle tracking",vfx, sound,dialogue:"",continuity:"Hero retains the same identity, equipment and weather established earlier.",progression_purpose:"Begin action escalation through direct engagement.",reference_frame:3},
    {frame:4,stage:"CAPABILITY_ESCALATION",title:"Weapon Upgrade",description:`The hero reaches a supply cache and gains a stronger capability before the next escalation.`,visual:`Rain-soaked supply crate beside a damaged military vehicle; weapon upgrade glows subtly in the darkness.`,action:`Hero breaks from cover, reaches the crate, upgrades the weapon and immediately prepares for the next attack.`,characters:chars,environment,enemy_presence:"Enemy fire continues in the background",weapons:`${weapons}; ${game.powerUps||"weapon upgrade crate"}`,camera:"Fast tracking shot into close-up insert of the upgrade",vfx, sound,dialogue:"",continuity:"Upgrade changes capability without changing hero identity or world.",progression_purpose:"Introduce a capability gain that enables the next escalation.",reference_frame:4},
    {frame:5,stage:"MAJOR_ESCALATION",title:"Air and Ground Assault",description:`A stronger combined force turns the route into a moving battlefield.`,visual:`Armored enemy unit advances while helicopter circles overhead, rain and smoke filling the jungle road.`,action:`Hero sprints, fires while moving and avoids overlapping ground and aerial attacks.`,characters:chars,environment,enemy_presence:`Armored sentry, patrol units and helicopter support: ${enemy}`,weapons,camera:"Wide battlefield shot into aggressive handheld chase",vfx, sound,dialogue:"",continuity:"Escalation must visibly exceed Scene 3 and use the Scene 4 capability.",progression_purpose:"Reach major opposition escalation.",reference_frame:5},
    {frame:6,stage:"BREAKTHROUGH",title:"Breakthrough",description:`The hero turns the environment into an advantage and breaks through the strongest immediate obstacle.`,visual:`Hero uses barricades, fuel drums and damaged vehicles to create a controlled opening through the enemy line.`,action:`Hero dodges, uses the upgraded weapon and triggers an explosive strike to clear the route.`,characters:chars,environment,enemy_presence:"Concentrated enemy resistance at the obstacle",weapons,camera:"Dynamic low tracking with impact cutaways",vfx:`Controlled explosion, sparks, smoke, rain spray and debris; ${vfx}`,sound:`Impact hits, gunfire and explosion layered with rainfall; ${sound}`,dialogue:"",continuity:"Breakthrough must consume or transform the major obstacle introduced in Scene 5.",progression_purpose:"Convert escalation into forward progress.",reference_frame:6},
    {frame:7,stage:"GATE_OR_OBJECTIVE",title:"The Fortified Gate",description:`The hero reaches the immediate objective threshold: the fortified compound gate.`,visual:`Massive fortified gate emerges through rain and smoke, floodlights cutting through jungle mist while enemy forces regroup beyond it.`,action:`Hero reaches the gate, disables the immediate barrier and crosses the threshold toward the ${objective}.`,characters:chars,environment,enemy_presence:"Regrouping forces beyond the gate",weapons,camera:"Wide establishing shot followed by forward push-in",vfx, sound,dialogue:"",continuity:"Gate is the consequence of the route and breakthrough, not a disconnected location.",progression_purpose:"Create a clear objective threshold before the next threat.",reference_frame:7},
    {frame:8,stage:"NEXT_THREAT",title:"Beyond the Gate",description:`The immediate objective opens into a larger combat space and reveals a new threat.`,visual:`Gate opens onto a vast fortified compound; a larger enemy formation and new aerial threat emerge beyond the rain.`,action:`Hero runs through the gate toward the next battlefield as the camera reveals the scale of the new threat, then cuts to black.`,characters:chars,environment,enemy_presence:"Larger enemy force and new aerial threat",weapons,camera:"Rear tracking shot into wide reveal and cliffhanger push-in",vfx, sound,dialogue:"Radio voice: This is only the beginning.",continuity:"End state must clearly seed the next encounter.",progression_purpose:"Close the episode on a new threat rather than resolution.",reference_frame:8}
  ];
  return scenes.map((s,i)=>{
    const states=[
      {world_state:`Entry environment established: ${environment}`,threat_state:"Distant surveillance and environmental pressure",capability_before:"Standard combat capability",capability_gain:"None",capability_after:"Standard combat capability",objective_state:`Advance toward ${objective}`,next_threat_state:"Patrol threat emerging"},
      {world_state:`Same environment under escalating pursuit: ${environment}`,threat_state:"Patrol units + focused helicopter pursuit",capability_before:"Standard combat capability",capability_gain:"None",capability_after:"Standard combat capability",objective_state:"Reach the next cover position",next_threat_state:"Direct ground engagement"},
      {world_state:`Combat zone established: ${environment}`,threat_state:"Direct ground fire with aerial exposure",capability_before:"Standard combat capability",capability_gain:"None",capability_after:"Standard combat capability",objective_state:"Survive first engagement and advance",next_threat_state:"Supply opportunity"},
      {world_state:`Supply cache discovered inside the same combat zone`,threat_state:"Enemy fire continues while upgrade is acquired",capability_before:"Standard assault weapon",capability_gain:game.powerUps||"Weapon upgrade crate",capability_after:"Enhanced rapid-fire combat capability",objective_state:"Acquire capability before major escalation",next_threat_state:"Combined air-and-ground assault"},
      {world_state:`Route becomes a moving battlefield: ${environment}`,threat_state:"Armored ground force + helicopter pursuit",capability_before:"Enhanced rapid-fire combat capability",capability_gain:"Uses Scene 4 upgrade",capability_after:"Enhanced rapid-fire combat capability under pressure",objective_state:"Break the strongest immediate resistance",next_threat_state:"Obstacle breakthrough"},
      {world_state:`Obstacle zone transformed by combat: ${environment}`,threat_state:"Concentrated resistance at the breakthrough point",capability_before:"Enhanced rapid-fire combat capability",capability_gain:"Environmental explosive strike",capability_after:"Open route through immediate obstacle",objective_state:"Cross the cleared route",next_threat_state:"Fortified gate"},
      {world_state:`Fortified threshold reached: ${environment}`,threat_state:"Regrouping forces beyond the gate",capability_before:"Enhanced rapid-fire combat capability",capability_gain:"None",capability_after:"Current capability retained",objective_state:"Cross the fortified gate",next_threat_state:"Unknown larger force beyond threshold"},
      {world_state:`New combat space revealed beyond the gate`,threat_state:"Larger enemy formation + unknown aerial threat",capability_before:"Enhanced rapid-fire combat capability",capability_gain:"None",capability_after:"Current capability carried into next encounter",objective_state:"Enter the next battlefield",next_threat_state:"Next encounter begins",new_threat:"Unknown advanced aerial combat platform"}
    ][i];
    return {...s,reference_frame:progression.progression.find(p=>p.stage===s.stage)?.referenceFrame||s.frame,...states};
  });
}

export function buildIntentDrivenRetroEpisode(request:RetroIntentEpisodeRequest) {
  const game=structuredClone(request.game);
  const progression=buildRetroProgressionModel(game,request.sourceArtifact);
  const intent=request.intent.trim();
  if(request.mode==="REFERENCE") return buildRetroEpisode(game,request.episodeId);
  if(!intent) throw new Error("Intent is required for VARIATION or EXPANSION mode.");
  const normalizedIntent=intent.replace(/halicopter/gi,"helicopter").replace(/persuit/gi,"pursuit");
  const storyboard=buildProductionScenes(game,normalizedIntent,request.mode,progression);
  return {
    contract:"KALP-RETRO-64-PRODUCTION-EPISODE-1.0",
    episode_id:request.episodeId||`${game.name.toUpperCase().replace(/[^A-Z0-9]+/g,"_")}_INTENT_EP_001`,
    game:game.name,intent_mode:request.mode,intent:normalizedIntent,
    progression_model:"1.1",progression_source:game.worksheet,
    reference_source:request.sourceArtifact||"KALP_Retro_64_Master_Reference.xlsx",
    reference_role:"GAME_PROGRESSION_REFERENCE",
    duration_seconds:game.durationSeconds??60,format:game.format??"9:16",
    reference_elements_used:{world:game.world,terrain:game.terrain,obstacles:game.obstacles,enemies:game.enemies,moves:game.moves,weapons_ammunition:game.weapons,power_ups:game.powerUps,special_abilities:game.abilities,props:game.props,camera:game.camera,vfx:game.vfx,sound:game.sound,realistic_interpretation:game.realistic},
    progression:progression.progression,
    locked_dna:progression.lockedDna,
    flexible_elements:progression.flexibleElements,
    storyboard
  };
}
