import { getRetroAudioDNA, buildRetroSceneAudio, type RetroAudioDNA, type RetroSceneAudio } from "./retro-audio";
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
    modelVersion:"1.1", game:game.name, sourceWorksheet:game.worksheet, sourceArtifact,
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
  const sceneAudio=buildRetroSceneAudio(game.name);
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
    return {...s,reference_frame:progression.progression.find(p=>p.stage===s.stage)?.referenceFrame||s.frame,...states,audio_dna:sceneAudio[i]};
  });
}

export interface RetroSceneValidationCheck {
  name:string;
  status:"PASS"|"FAIL";
  detail:string;
}
export interface RetroSceneValidationResult {
  validator_version:"1.0";
  status:"PASS"|"FAIL";
  errors:string[];
  warnings:string[];
  checks:RetroSceneValidationCheck[];
}

export function validateRetroSceneState(
  episode:{contract?:string;intent_mode?:RetroIntentMode;intent?:string;progression_model?:string;progression?:RetroProgressionStep[];storyboard?:RetroProductionScene[]}
):RetroSceneValidationResult {
  const checks:RetroSceneValidationCheck[]=[];
  const errors:string[]=[];
  const warnings:string[]=[];
  const pass=(name:string,detail:string)=>checks.push({name,status:"PASS",detail});
  const fail=(name:string,detail:string)=>{checks.push({name,status:"FAIL",detail});errors.push(detail);};
  const scenes=episode.storyboard||[];
  if(scenes.length===8) pass("exactly_8_scenes","Storyboard contains exactly 8 scenes.");
  else fail("exactly_8_scenes",`Expected exactly 8 scenes; received ${scenes.length}.`);
  if(episode.progression_model==="1.1") pass("progression_model","Progression model is v1.1.");
  else fail("progression_model",`Expected progression_model 1.1; received ${episode.progression_model||"missing"}.`);
  if(episode.intent_mode==="REFERENCE" || episode.intent_mode==="VARIATION" || episode.intent_mode==="EXPANSION") pass("intent_mode","Intent mode is valid.");
  else fail("intent_mode","Intent mode is missing or invalid.");
  if(episode.intent_mode==="VARIATION" || episode.intent_mode==="EXPANSION"){
    if((episode.intent||"").trim()) pass("intent_required","Variation/expansion has non-empty intent.");
    else fail("intent_required","Variation/expansion requires non-empty intent.");
    if(/halicopter|persuit/i.test(episode.intent||"")) fail("intent_normalization","Intent contains known spelling variants; normalization was not applied.");
    else pass("intent_normalization","Intent spelling normalization check passed.");
    if(episode.contract==="KALP-RETRO-64-PRODUCTION-EPISODE-1.0") pass("production_contract","Variation/expansion uses the production episode contract.");
    else fail("production_contract","Variation/expansion must use KALP-RETRO-64-PRODUCTION-EPISODE-1.0.");
  }
  const stages=STAGES;
  if(scenes.length===8){
    const stageOk=scenes.every((s,i)=>s.frame===i+1 && s.stage===stages[i]);
    if(stageOk) pass("stage_order","Eight scenes follow the canonical progression stage order.");
    else fail("stage_order","Scene frame/stage order does not match the canonical 8-stage progression.");
    const refs=scenes.every((s,i)=>s.reference_frame===i+1);
    if(refs) pass("reference_frame_alignment","Each production scene maps to the corresponding reference frame.");
    else fail("reference_frame_alignment","Reference-frame mapping is misaligned.");
    const required=["world_state","threat_state","capability_before","capability_gain","capability_after","objective_state","next_threat_state"];
    const missing=scenes.flatMap((s,i)=>required.filter(k=>!(s as any)[k]).map(k=>`Scene ${i+1}: ${k}`));
    if(!missing.length) pass("required_state_fields","All 8 scenes contain required state-continuity fields.");
    else fail("required_state_fields",`Missing state fields: ${missing.join(", ")}.`);
    const s4=scenes[3],s5=scenes[4],s6=scenes[5],s7=scenes[6],s8=scenes[7];
    if(s4.capability_gain && s4.capability_after && s4.capability_before!==s4.capability_after) pass("scene4_capability_gain","Scene 4 introduces a capability change.");
    else fail("scene4_capability_gain","Scene 4 does not explicitly introduce a capability change.");
    if(s5.capability_before===s4.capability_after) pass("scene5_uses_scene4_capability","Scene 5 starts with Scene 4's resulting capability.");
    else fail("scene5_uses_scene4_capability",`Scene 5 capability_before does not equal Scene 4 capability_after.`);
    if(/armored|major|combined|helicopter/i.test(s5.threat_state||"")) pass("scene5_major_escalation","Scene 5 explicitly represents major escalation.");
    else fail("scene5_major_escalation","Scene 5 threat state does not explicitly show major escalation.");
    if(s6.capability_gain && /open route|breakthrough|cleared/i.test(s6.capability_after||"")) pass("scene6_resolves_obstacle","Scene 6 records a capability/action that resolves the immediate obstacle.");
    else fail("scene6_resolves_obstacle","Scene 6 does not clearly resolve the Scene 5 obstacle.");
    if(/gate/i.test(s6.next_threat_state||"") && /gate/i.test(s7.objective_state||"")) pass("scene6_to_scene7_continuity","Scene 6 points to the fortified gate objective in Scene 7.");
    else fail("scene6_to_scene7_continuity","Scene 6 next threat and Scene 7 objective are not explicitly linked.");
    if(/gate|objective|threshold/i.test(s7.objective_state||"")) pass("scene7_objective","Scene 7 explicitly defines a gate/objective threshold.");
    else fail("scene7_objective","Scene 7 lacks an explicit gate/objective threshold.");
    if(s8.new_threat && /new|larger|unknown|aerial/i.test(s8.threat_state||"")) pass("scene8_new_threat","Scene 8 explicitly introduces a new threat.");
    else fail("scene8_new_threat","Scene 8 must explicitly define a new threat and reflect it in threat_state.");
  }
  if(episode.intent_mode==="REFERENCE") warnings.push("REFERENCE mode is validated as a reference reconstruction; production-state checks apply only to generated variation/expansion episodes.");
  return {validator_version:"1.0",status:errors.length?"FAIL":"PASS",errors,warnings,checks};
}

export interface RetroProductionJsonValidationResult { validator_version:"1.0"; status:"PASS"|"FAIL"; errors:string[]; warnings:string[]; checks:RetroSceneValidationCheck[]; }
export function validateRetroProductionJson(episode:Record<string,any>):RetroProductionJsonValidationResult {
  const checks:RetroSceneValidationCheck[]=[];const errors:string[]=[];const warnings:string[]=[];
  const pass=(name:string,detail:string)=>checks.push({name,status:"PASS",detail});
  const fail=(name:string,detail:string)=>{checks.push({name,status:"FAIL",detail});errors.push(detail);};
  const requiredTop=["contract","episode_id","game","intent_mode","intent","progression_model","progression_source","reference_source","reference_role","duration_seconds","format","reference_elements_used","progression","locked_dna","flexible_elements","storyboard"];
  const missingTop=requiredTop.filter(k=>episode[k]===undefined||episode[k]===null);
  !missingTop.length?pass("required_top_level_fields","All required production contract fields are present."):fail("required_top_level_fields",`Missing top-level fields: ${missingTop.join(", ")}.`);
  episode.contract==="KALP-RETRO-64-PRODUCTION-EPISODE-1.0"?pass("contract_version","Production contract version is correct."):fail("contract_version",`Expected production contract; received ${episode.contract||"missing"}.`);
  typeof episode.episode_id==="string"&&episode.episode_id.trim()?pass("episode_id","Episode ID is valid."):fail("episode_id","Episode ID must be a non-empty string.");
  typeof episode.game==="string"&&episode.game.trim()?pass("game","Game is valid."):fail("game","Game must be a non-empty string.");
  ["REFERENCE","VARIATION","EXPANSION"].includes(episode.intent_mode)?pass("intent_mode","Intent mode is valid."):fail("intent_mode","Intent mode is invalid or missing.");
  typeof episode.duration_seconds==="number"&&episode.duration_seconds>0?pass("duration","Duration is positive."):fail("duration","Duration must be a positive number.");
  episode.format==="9:16"||episode.format==="16:9"?pass("format","Format is supported."):fail("format","Format must be 9:16 or 16:9.");
  episode.progression_model==="1.1"?pass("progression_model","Progression model is 1.1."):fail("progression_model","Production JSON must use progression model 1.1.");
  episode.reference_role==="GAME_PROGRESSION_REFERENCE"?pass("reference_role","Reference role is explicit."):fail("reference_role","Reference role must be GAME_PROGRESSION_REFERENCE.");
  Array.isArray(episode.progression)&&episode.progression.length===8?pass("progression_contract","Progression contains exactly 8 steps."):fail("progression_contract","Progression must contain exactly 8 steps.");
  Array.isArray(episode.locked_dna)&&episode.locked_dna.length>0?pass("locked_dna","Locked progression DNA is present."):fail("locked_dna","Locked progression DNA is missing or empty.");
  Array.isArray(episode.flexible_elements)?pass("flexible_elements","Flexible elements array is present."):fail("flexible_elements","Flexible elements must be an array.");
  episode.reference_elements_used&&typeof episode.reference_elements_used==="object"?pass("reference_elements","Reference elements payload is present."):fail("reference_elements","Reference elements payload is missing.");
  const scenes=episode.storyboard;
  Array.isArray(scenes)&&scenes.length===8?pass("storyboard_count","Production JSON contains exactly 8 scenes."):fail("storyboard_count",`Storyboard must contain exactly 8 scenes; received ${Array.isArray(scenes)?scenes.length:"non-array"}.`);
  if(Array.isArray(scenes)&&scenes.length===8){
    const requiredScene=["frame","stage","title","description","visual","action","characters","environment","enemy_presence","weapons","camera","vfx","sound","dialogue","continuity","progression_purpose","reference_frame","world_state","threat_state","capability_before","capability_gain","capability_after","objective_state","next_threat_state","audio_dna"];
    const missing=scenes.flatMap((s:any,i:number)=>requiredScene.filter(k=>s[k]===undefined||s[k]===null||s[k]==="").map(k=>`Scene ${i+1}: ${k}`));
    !missing.length?pass("scene_required_fields","All production scenes contain required renderer-facing fields."):fail("scene_required_fields",`Missing scene fields: ${missing.join(", ")}.`);
    const typesOk=scenes.every((s:any)=>Number.isInteger(s.frame)&&typeof s.stage==="string"&&typeof s.title==="string"&&typeof s.description==="string"&&typeof s.visual==="string"&&typeof s.action==="string"&&Array.isArray(s.characters)&&typeof s.camera==="string"&&typeof s.vfx==="string"&&typeof s.sound==="string"&&Number.isInteger(s.reference_frame));
    typesOk?pass("scene_field_types","Renderer-facing scene fields have valid JSON types."):fail("scene_field_types","One or more scene fields have invalid JSON types.");
    new Set(scenes.map((s:any)=>s.frame)).size===8?pass("unique_scene_frames","Scene frame IDs are unique."):fail("unique_scene_frames","Scene frame IDs must be unique.");
    try{JSON.stringify(episode);pass("json_serializable","Production contract is JSON-serializable.");}catch{fail("json_serializable","Production contract is not JSON-serializable.");}
  }
  if(episode.intent_mode==="VARIATION"||episode.intent_mode==="EXPANSION") (typeof episode.intent==="string"&&episode.intent.trim())?pass("generated_intent","Generated episode retains the user intent."):fail("generated_intent","Generated episode must retain a non-empty intent.");
  if(Array.isArray(scenes)&&scenes.length===8&&scenes.every((s:any)=>s.audio_dna&&typeof s.audio_dna.music==="string"&&typeof s.audio_dna.rhythm==="string"&&typeof s.audio_dna.ambience==="string"&&Array.isArray(s.audio_dna.sfx)&&typeof s.audio_dna.intensity==="string"&&typeof s.audio_dna.transition==="string"&&typeof s.audio_dna.mix==="string")) pass("audio_dna_contract","All 8 scenes contain embedded Audio DNA."); else fail("audio_dna_contract","All 8 scenes must contain embedded Audio DNA.");
  return {validator_version:"1.0",status:errors.length?"FAIL":"PASS",errors,warnings,checks};
}


export interface RetroRendererReadinessResult {
  validator_version:"1.0";
  status:"PASS"|"FAIL";
  errors:string[];
  warnings:string[];
  checks:RetroSceneValidationCheck[];
}

/**
 * Renderer Readiness Gate v1.0.
 * Validates that the production contract can be consumed scene-by-scene
 * by a renderer using the declared scene contract, with no mapping,
 * cleanup, or inferred fields required.
 */
export function validateRetroRendererReadiness(
  episode:Record<string,any>
):RetroRendererReadinessResult {
  const checks:RetroSceneValidationCheck[]=[];
  const errors:string[]=[];
  const warnings:string[]=[];
  const pass=(name:string,detail:string)=>checks.push({name,status:"PASS",detail});
  const fail=(name:string,detail:string)=>{checks.push({name,status:"FAIL",detail});errors.push(detail);};

  const scenes=episode?.storyboard;
  Array.isArray(scenes)&&scenes.length===8
    ? pass("renderer_scene_count","Exactly 8 scene packets are available to the renderer.")
    : fail("renderer_scene_count","Renderer requires exactly 8 scene packets.");

  episode?.contract==="KALP-RETRO-64-PRODUCTION-EPISODE-1.0"
    ? pass("renderer_contract","Renderer receives the canonical production episode contract.")
    : fail("renderer_contract","Renderer input is not the canonical production episode contract.");

  episode?.progression_model==="1.1"
    ? pass("renderer_progression_model","Renderer input preserves progression model 1.1.")
    : fail("renderer_progression_model","Renderer input must preserve progression model 1.1.");

  if(Array.isArray(scenes)&&scenes.length===8){
    const required=[
      "frame","stage","title","description","visual","action","characters",
      "environment","enemy_presence","weapons","camera","vfx","sound",
      "dialogue","continuity","progression_purpose","reference_frame",
      "world_state","threat_state","capability_before","capability_gain",
      "capability_after","objective_state","next_threat_state"
    ];
    const missing=scenes.flatMap((s:any,i:number)=>
      required.filter(k=>typeof s[k]!=="string" && !Array.isArray(s[k]))
        .map(k=>`Scene ${i+1}: ${k}`)
    );
    missing.length
      ? fail("renderer_required_fields",`Renderer-required fields are missing or have invalid container types: ${missing.join(", ")}.`)
      : pass("renderer_required_fields","Every scene contains the complete renderer-facing field contract.");

    const empty=scenes.flatMap((s:any,i:number)=>
      required.filter(k=>k!=="characters" && typeof s[k]==="string" && !s[k].trim())
        .map(k=>`Scene ${i+1}: ${k}`)
    );
    empty.length
      ? fail("renderer_non_empty_fields",`Renderer-facing string fields cannot be empty: ${empty.join(", ")}.`)
      : pass("renderer_non_empty_fields","All renderer-facing string fields contain usable content.");

    const charactersOk=scenes.every((s:any)=>Array.isArray(s.characters)&&s.characters.length>0&&s.characters.every((x:any)=>typeof x==="string"&&x.trim()));
    charactersOk
      ? pass("renderer_characters","Every scene provides at least one renderer character identifier.")
      : fail("renderer_characters","Every scene must provide a non-empty characters array of strings.");

    const frameOk=scenes.every((s:any,i:number)=>Number.isInteger(s.frame)&&s.frame===i+1&&Number.isInteger(s.reference_frame)&&s.reference_frame===i+1);
    frameOk
      ? pass("renderer_frame_identity","Scene frame and reference-frame identity are deterministic and aligned.")
      : fail("renderer_frame_identity","Scene frame/reference-frame identity is not deterministic or aligned.");

    const stageOk=scenes.every((s:any)=>typeof s.stage==="string");
    stageOk
      ? pass("renderer_stage_identity","Every scene has an explicit progression stage.")
      : fail("renderer_stage_identity","Every renderer scene requires an explicit progression stage.");

    const unresolved=scenes.flatMap((s:any,i:number)=>{
      const values=required.filter(k=>k!=="characters").map(k=>String(s[k]??""));
      return values.some(v=>/\$\{[^}]+\}|\[TODO\]|<TODO>|undefined|null/i.test(v))
        ? [`Scene ${i+1}: unresolved template/token content`] : [];
    });
    unresolved.length
      ? fail("renderer_no_unresolved_tokens",`Renderer input contains unresolved template content: ${unresolved.join(", ")}.`)
      : pass("renderer_no_unresolved_tokens","No unresolved template tokens or undefined/null placeholders are present.");

    const standaloneOk=scenes.every((s:any)=>{try{JSON.stringify(s);return true;}catch{return false;}});
    standaloneOk
      ? pass("renderer_standalone_json","Every scene can be serialized independently as a renderer packet.")
      : fail("renderer_standalone_json","At least one scene cannot be serialized independently.");

    const directFieldsOk=scenes.every((s:any)=>required.every(k=>Object.prototype.hasOwnProperty.call(s,k)));
    directFieldsOk
      ? pass("renderer_direct_field_access","Renderer can access required fields directly without field mapping.")
      : fail("renderer_direct_field_access","Renderer would require field mapping before consuming one or more scenes.");

    const stateContinuityOk=scenes.every((s:any)=>s.world_state&&s.threat_state&&s.capability_before&&s.capability_gain&&s.capability_after&&s.objective_state&&s.next_threat_state);
    stateContinuityOk
      ? pass("renderer_state_continuity","Scene-state continuity fields are directly available to the renderer.")
      : fail("renderer_state_continuity","One or more scenes are missing direct state-continuity data.");
  }

  return {validator_version:"1.0",status:errors.length?"FAIL":"PASS",errors,warnings,checks};
}

export function buildIntentDrivenRetroEpisode(request:RetroIntentEpisodeRequest) {
  const game=structuredClone(request.game);
  const progression=buildRetroProgressionModel(game,request.sourceArtifact);
  const intent=request.intent.trim();
  if(request.mode==="REFERENCE") return buildRetroEpisode(game,request.episodeId);
  if(!intent) throw new Error("Intent is required for VARIATION or EXPANSION mode.");
  const normalizedIntent=intent.replace(/halicopter/gi,"helicopter").replace(/persuit/gi,"pursuit");
  const storyboard=buildProductionScenes(game,normalizedIntent,request.mode,progression);
  const episode = {
    contract:"KALP-RETRO-64-PRODUCTION-EPISODE-1.0",
    episode_id:request.episodeId||`${game.name.toUpperCase().replace(/[^A-Z0-9]+/g,"_")}_INTENT_EP_001`,
    game:game.name,intent_mode:request.mode,intent:normalizedIntent,
    progression_model:"1.1",progression_source:game.worksheet,
    reference_source:request.sourceArtifact||"KALP_Retro_64_Master_Reference.xlsx",
    reference_role:"GAME_PROGRESSION_REFERENCE",
    duration_seconds:game.durationSeconds??60,format:game.format??"9:16",
    reference_elements_used:{world:game.world,terrain:game.terrain,obstacles:game.obstacles,enemies:game.enemies,moves:game.moves,weapons_ammunition:game.weapons,power_ups:game.powerUps,special_abilities:game.abilities,props:game.props,camera:game.camera,vfx:game.vfx,sound:game.sound,audio_dna:getRetroAudioDNA(game.name),realistic_interpretation:game.realistic},
    progression:progression.progression,
    locked_dna:progression.lockedDna,
    flexible_elements:progression.flexibleElements,
    storyboard
  };\n  const contractValidation=validateRetroProductionJson(episode);
  const rendererReadiness=validateRetroRendererReadiness(episode);
  const validation={
    validator_version:"1.0",
    status:contractValidation.status==="PASS"&&rendererReadiness.status==="PASS"?"PASS":"FAIL",
    errors:[...contractValidation.errors,...rendererReadiness.errors],
    warnings:[...contractValidation.warnings,...rendererReadiness.warnings],
    checks:[...contractValidation.checks,...rendererReadiness.checks]
  };
  return {...episode,validation,renderer_readiness:rendererReadiness};}
