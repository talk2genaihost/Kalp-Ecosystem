import { getRetroAudioDNA, buildRetroSceneAudio, type RetroAudioDNA, type RetroSceneAudio } from "./retro-audio";
import { resolveRetroWorldPropProfile, type RetroWorldPropProfile } from "./retro-world-prop-library";
import { buildRetroMissionArcPlan, type RetroMissionArcPlan } from "./retro-mission-arc";
import { buildRetroMissionProduction, validateRetroMissionReels } from "./retro-mission-production";
export type RetroGameId = "G001"|"G002"|"G003"|"G004"|"G005";
export interface RetroFrame { title:string; action:string }
export interface RetroCharacterDNA { character_id:string; identity:string; protagonist_name:string; silhouette:string; head:string; costume:string; palette:string; equipment:string; movement:string; performance:string; continuity_lock:string; }\nexport interface RetroGameReference { id:RetroGameId; name:string; worksheet:string; status:"ACTIVE"|"PLANNED"; character_dna?:RetroCharacterDNA; durationSeconds?:number; format?:"9:16"|"16:9"; world?:string; terrain?:string; obstacles?:string; enemies?:string; moves?:string; weapons?:string; powerUps?:string; abilities?:string; props?:string; camera?:string; vfx?:string; sound?:string; realistic?:string; frames?:RetroFrame[] }
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
  missionReelCount?:number;
}

export { buildRetroMissionProduction, validateRetroMissionReels } from "./retro-mission-production";

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
  audio_dna:RetroSceneAudio;
  semantic_world_id?:string;
  semantic_world_label?:string;
  suppressed_reference_elements?:string[];
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

export interface RetroSemanticResolution {
  world_id:string;
  world_label:string;
  normalized_intent:string;
  normalized_actions:string[];
  suppressed_reference_elements:string[];
  applied_rules:string[];
  status:"PASS"|"CONFLICT_REQUIRES_RESOLUTION";
}

export function resolveRetroSemanticWorld(intent:string):RetroSemanticResolution {
  const profile:RetroWorldPropProfile=resolveRetroWorldPropProfile(intent);
  const tokens=intentTokens(intent);
  const normalizedActions:string[]=[];
  const suppressed:string[]=[];
  const rules=[...profile.visualRules];
  let normalizedIntent=intent;

  if(profile.id==="UNDERWATER"){
    if(hasToken(tokens,"run","running","sprint","sprinting","walk","walking","jump","jumping")){
      normalizedActions.push("Surface locomotion normalized to underwater propulsion/swimming.");
      normalizedIntent=normalizedIntent
        .replace(/\brun(?:ning)?\b/gi,"swim")
        .replace(/\bsprint(?:ing)?\b/gi,"underwater sprint")
        .replace(/\bwalk(?:ing)?\b/gi,"underwater propulsion")
        .replace(/\bjump(?:ing)?\b/gi,"vertical underwater kick");
      rules.push("Underwater movement uses aquatic locomotion; surface locomotion words are normalized, not rendered literally.");
    }
    if(hasToken(tokens,"helicopter","helicopters","aircraft","airplane","plane")){
      suppressed.push("helicopter/aircraft");
      normalizedIntent=normalizedIntent.replace(/\bhelicopters?\b/gi,"").replace(/\baircraft\b/gi,"").replace(/\bairplanes?\b/gi,"");
      rules.push("Helicopter/aircraft suppressed inside submerged camera volume; it is not a valid underwater prop.");
    }
    if(hasToken(tokens,"sky","cloud","clouds")){
      suppressed.push("sky/clouds");
      rules.push("Sky props suppressed inside submerged camera volume.");
    }
  }

  return {
    world_id:profile.id,
    world_label:profile.label,
    normalized_intent:normalizedIntent.replace(/\\s{2,}/g," ").trim(),
    normalized_actions:normalizedActions,
    suppressed_reference_elements:suppressed,
    applied_rules:rules,
    status:"PASS"
  };
}

function buildProductionScenes(game:RetroGameReference, intent:string, mode:RetroIntentMode, progression:RetroProgressionModel):RetroProductionScene[] {
  const sceneAudio=buildRetroSceneAudio(game.name);
  const tokens=intentTokens(intent);
  const semantic=resolveRetroSemanticWorld(intent);
  const worldProfile=resolveRetroWorldPropProfile(intent);
  if(worldProfile.id==="DESERT"){
    sceneAudio.forEach(x=>{x.ambience="Dry wind, sand movement, distant engines and radio";x.sfx=["Gunfire","Explosions","Shell casings","Dust impacts","Radio chatter"];});
  }else if(worldProfile.id==="SNOW"){
    sceneAudio.forEach(x=>{x.ambience="Cold wind, ice movement, distant engines and radio";x.sfx=["Gunfire","Explosions","Shell casings","Ice impacts","Radio chatter"];});
  }else if(worldProfile.id==="UNDERWATER"){
    sceneAudio.forEach(x=>{x.ambience="Muffled underwater pressure, bubbles and aquatic movement";x.sfx=["Muffled impacts","Bubbles","Underwater propulsion","Aquatic threat movement"];});
  }
  const setting=hasToken(tokens,"night","nighttime")?"night-time":hasToken(tokens,"desert")?"desert":hasToken(tokens,"snow","snowy")?"snow-covered":hasToken(tokens,"urban","city")?"urban":"daytime";
  const weather=hasToken(tokens,"rain","rainy","storm","stormy")?"heavy rain":hasToken(tokens,"fog","foggy")?"dense fog":hasToken(tokens,"sandstorm")?"sandstorm":"environmental pressure";
  const pursuit=hasToken(tokens,"helicopter","chase","pursuit")
    ? (worldProfile.id==="UNDERWATER" ? "underwater pursuit pressure" : "aerial pursuit")
    : "advancing enemy pressure";
  const objective=hasToken(tokens,"rescue","extract","extraction")?"rescue/extraction":hasToken(tokens,"destroy","destroyed","destroying")?"destruction":hasToken(tokens,"escape")?"escape":"forward mission";
  const world=game.world||"the game world";
  const terrain=game.terrain||"the reference terrain";
  const obstacles=game.obstacles||"reference obstacles";
  const enemies=game.enemies||"reference enemies";
  const moves=game.moves||"reference movement";
  const underwater=hasToken(tokens,"underwater","submerged","aquatic","ocean","sea","undersea","dive","diving");
  const fight=hasToken(tokens,"fight","fighting","battle","combat","attack","attacks");
  const snake=hasToken(tokens,"snake","snakes","serpent","serpents");
  const shark=hasToken(tokens,"shark","sharks");
  const worldBase=world;
  const terrainBase=terrain;
  const obstaclesBase=obstacles;
  const enemiesBase=enemies;
  const movesBase=moves;
  const profileLockedWorld=worldProfile.id!=="SURFACE";
  const semanticWorld=profileLockedWorld
    ? worldProfile.label+" environment"
    : worldBase;
  const semanticTerrain=worldProfile.id==="UNDERWATER"
    ? "submerged passages, aquatic currents and underwater traversal"
    : profileLockedWorld
      ? worldProfile.allowedProps.join(", ")
      : terrainBase;
  const semanticObstacles=worldProfile.id==="UNDERWATER"
    ? "submerged rocks, coral passages, underwater barriers and current channels"
    : profileLockedWorld
      ? worldProfile.allowedProps.join(", ")
      : obstaclesBase;
  const filteredEnemies=worldProfile.suppressedProps.reduce((value,term)=>value.replace(new RegExp(term.replace(/[.*+?^$()|[\\]\\\\]/g,"\\\\$&"),"gi"),""),enemiesBase).replace(/\\s{2,}/g," ").trim();
  const semanticEnemies=underwater?`${filteredEnemies}${snake?", aquatic snakes/serpents":""}${shark?", sharks":""}`:filteredEnemies;
  const semanticMoves=underwater?`${movesBase}; swim, dive, underwater dodge and three-dimensional aquatic movement`:movesBase;
  const aquaticThreat=underwater?`Aquatic threats: ${[snake?"snakes/serpents":"",shark?"sharks":""].filter(Boolean).join(" and ")||"aquatic enemies"}.`:"";
  const weapons=game.weapons||"available game attacks";
  const powerUps=game.powerUps||"available power-up";
  const props=worldProfile.id!=="SURFACE" ? worldProfile.allowedProps.join(", ") : (game.props||"reference props");
  const camera=game.camera||"cinematic game camera";
  const vfx=worldProfile.id==="DESERT"
    ? "dust plumes, heat shimmer, sand impacts and controlled explosions"
    : worldProfile.id==="SNOW"
      ? "snow spray, ice fragments, frost and controlled explosions"
      : worldProfile.id==="UNDERWATER"
        ? "bubbles, caustic light, particulate matter and controlled underwater impacts"
        : game.vfx||"cinematic effects";
  const sound=worldProfile.id==="DESERT"
    ? "dry wind, sand movement, distant engines, gunfire and impact hits"
    : worldProfile.id==="SNOW"
      ? "cold wind, ice movement, engines, gunfire and impact hits"
      : worldProfile.id==="UNDERWATER"
        ? "muffled impacts, bubbles, underwater propulsion and pressure ambience"
        : game.sound||"game soundscape";
  const cd=game.character_dna;
  const chars=[cd?.character_id||`${game.name.toUpperCase()}_PROTAGONIST_001`];
  const environment=`${underwater?"underwater":setting} ${semanticWorld}; ${underwater?"submerged visual volume":weather}; terrain: ${semanticTerrain}; props: ${props}`.trim();
  const common={character_identity:cd?.identity||"Game protagonist",character_visual:cd?.silhouette||"",character_costume:cd?.costume||"",character_equipment:cd?.equipment||"",character_continuity:cd?.continuity_lock||"Maintain protagonist identity consistently across all scenes."};
  const dialogue=["Move forward.","Enemy contact.","Engage and advance.","Capability acquired.","Major threat ahead.","Break through!","Objective threshold reached.","A new threat awaits."];
  const scenes:RetroProductionScene[]=[
    {frame:1,stage:"ENTRY",title:`${underwater?"Underwater":setting} approach`,description:`The hero enters ${semanticWorld} under ${weather}, following the established game route toward the ${objective}${underwater?" in a submerged mission":""}.`,visual:`Cinematic ${environment}. Preserve the ${game.name} visual identity, ${props}, readable traversal space and the protagonist silhouette.`,action:`Hero advances using ${semanticMoves} while ${pursuit} introduces environmental pressure${aquaticThreat?" "+aquaticThreat:""}.`,characters:chars,...common,environment,enemy_presence:underwater?aquaticThreat+" "+semanticEnemies:"Environmental pressure and distant reference threats",weapons,camera,vfx,sound,dialogue:"",continuity:"Establish hero, world, weather and mission direction.",progression_purpose:"Establish the game world and entry pressure.",reference_frame:1},
    {frame:2,stage:"THREAT_INTRODUCTION",title:"Threat Contact",description:"Reference enemies appear and the route becomes more demanding without changing the game's core identity.",visual:`Cinematic encounter using ${semanticEnemies}, ${semanticObstacles} and ${semanticTerrain}; ${weather} changes visibility but does not replace the reference world.`,action:`Hero uses ${moves} to evade the first threat and continue forward.`,characters:chars,...common,environment,enemy_presence:semanticEnemies,weapons,camera,vfx,sound,dialogue:"",continuity:"Threat follows directly from Scene 1 and increases pressure.",progression_purpose:"Convert environmental pressure into an identifiable game-native threat.",reference_frame:2},
    {frame:3,stage:"FIRST_ENGAGEMENT",title:"First Engagement",description:underwater?`The hero enters direct underwater engagement with ${aquaticThreat.toLowerCase()} while ${pursuit} keeps the submerged route exposed.`:`The hero enters direct engagement with the reference enemy set while the ${pursuit} keeps the route exposed.`,visual:`Hero confronts ${semanticEnemies} inside ${semanticWorld}; show ${obstacles} and game-native traversal cues rather than unrelated set dressing.`,action:`Hero uses ${semanticMoves} and the reference attack language to ${underwater&&fight?"fight and evade the aquatic threats":"overcome the first engagement"}.`,characters:chars,...common,environment,enemy_presence:semanticEnemies,weapons,camera,vfx,sound,dialogue:"",continuity:"Hero retains the same identity, equipment and world.",progression_purpose:"Begin action escalation through game-native engagement.",reference_frame:3},
    {frame:4,stage:"CAPABILITY_ESCALATION",title:"Power-Up",description:"The hero reaches a progression pickup and gains the next capability before escalation.",visual:`A game-native power-up appears within ${world}: ${powerUps}. Keep ${props} and the reference terrain visible.`,action:"Hero acquires the power-up and demonstrates the resulting capability before moving on.",characters:chars,...common,environment,enemy_presence:semanticEnemies,weapons:`${weapons}; ${powerUps}`,camera,vfx,sound,dialogue:"",continuity:"Capability changes without changing hero identity or world.",progression_purpose:"Introduce the reference game's capability progression.",reference_frame:4},
    {frame:5,stage:"MAJOR_ESCALATION",title:"Major Escalation",description:"A stronger combination of reference enemies and hazards turns the route into a major encounter.",visual:`Escalated ${game.name} encounter using ${enemies}, ${obstacles} and ${weather}; avoid importing unrelated environments.`,action:`Hero combines the upgraded capability with ${moves} to survive overlapping threats.`,characters:chars,...common,environment,enemy_presence:semanticEnemies,weapons,camera,vfx,sound,dialogue:"",continuity:"Escalation visibly exceeds Scene 3 and uses the Scene 4 capability.",progression_purpose:"Reach major opposition escalation using game-native elements.",reference_frame:5},
    {frame:6,stage:"BREAKTHROUGH",title:"Breakthrough",description:"The hero converts the environment and upgraded capability into forward progress through the strongest immediate obstacle.",visual:`Use ${semanticObstacles}, ${props} and ${semanticTerrain} as the breakthrough set piece while preserving ${game.name} identity.`,action:`Hero uses the acquired capability and ${moves} to clear the route and advance.`,characters:chars,...common,environment,enemy_presence:semanticEnemies,weapons,camera,vfx,sound,dialogue:"",continuity:"Breakthrough transforms the obstacle introduced by the major escalation.",progression_purpose:"Convert escalation into forward progress.",reference_frame:6},
    {frame:7,stage:"GATE_OR_OBJECTIVE",title:"Objective Threshold",description:"The hero reaches the immediate objective threshold within the established world.",visual:`Reveal the next gate, threshold or objective from the progression while keeping ${world}, ${terrain} and ${props} consistent.`,action:`Hero reaches the threshold and prepares to cross toward the ${objective}.`,characters:chars,...common,environment,enemy_presence:semanticEnemies,weapons,camera,vfx,sound,dialogue:"",continuity:"The threshold is the consequence of the route and breakthrough.",progression_purpose:"Create the objective threshold before the next threat.",reference_frame:7},
    {frame:8,stage:"NEXT_THREAT",title:"Beyond the Threshold",description:"The objective opens into a larger challenge and reveals the next threat while preserving the same game identity.",visual:`Expand the established ${game.name} world into a larger encounter using ${enemies}, ${terrain} and the reference visual language.`,action:"Hero crosses the threshold as the camera reveals the scale of the next encounter, then cuts to black.",characters:chars,...common,environment,enemy_presence:semanticEnemies,weapons,camera,vfx,sound,dialogue:"The next challenge begins.",continuity:"End state clearly seeds the next encounter.",progression_purpose:"End on a new threat rather than changing the game identity.",reference_frame:8}
  ];
  return scenes.map((s,i)=>{
    const states=[
      {world_state:`Entry environment established: ${environment}`,threat_state:"Environmental pressure and first reference threat",capability_before:"Baseline game capability",capability_gain:"None",capability_after:"Baseline game capability",objective_state:`Advance toward ${objective}`,next_threat_state:"Reference threat emerging"},
      {world_state:`Same game world under escalating pressure: ${environment}`,threat_state:"Reference enemies become explicit",capability_before:"Baseline game capability",capability_gain:"None",capability_after:"Baseline game capability",objective_state:"Reach the next traversal position",next_threat_state:"Direct engagement"},
      {world_state:`Encounter zone established: ${environment}`,threat_state:"Direct reference enemy engagement",capability_before:"Baseline game capability",capability_gain:"None",capability_after:"Baseline game capability",objective_state:"Survive first engagement and advance",next_threat_state:"Power-up opportunity"},
      {world_state:"Power-up zone inside the same reference world",threat_state:"Reference enemies remain active while capability is acquired",capability_before:"Baseline capability",capability_gain:powerUps,capability_after:"Enhanced game-native capability",objective_state:"Acquire capability before major escalation",next_threat_state:"Major reference encounter"},
      {world_state:`Major encounter zone: ${environment}`,threat_state:"Stronger reference enemy combination",capability_before:"Enhanced game-native capability",capability_gain:"Uses Scene 4 upgrade",capability_after:"Enhanced capability under pressure",objective_state:"Break strongest immediate resistance",next_threat_state:"Breakthrough obstacle"},
      {world_state:"Breakthrough zone using reference terrain and props",threat_state:"Concentrated reference resistance",capability_before:"Enhanced game-native capability",capability_gain:"Environmental/game-native attack",capability_after:"Open route through immediate obstacle",objective_state:"Cross the cleared route",next_threat_state:"Gate/objective threshold"},
      {world_state:`Objective threshold reached inside ${world}`,threat_state:"Forces/hazards regroup beyond the threshold",capability_before:"Enhanced game-native capability",capability_gain:"None",capability_after:"Current capability retained",objective_state:"Cross the threshold",next_threat_state:"Unknown larger reference challenge"},
      {world_state:"New encounter space revealed beyond the threshold",threat_state:"Larger reference enemy formation or hazard",capability_before:"Enhanced game-native capability",capability_gain:"None",capability_after:"Current capability carried forward",objective_state:"Enter the next encounter",next_threat_state:"Next encounter begins",new_threat:"A larger game-native threat"}
    ][i];
    return {...s,...states,dialogue:s.dialogue||dialogue[i],audio_dna:sceneAudio[i],reference_frame:progression.progression.find(p=>p.stage===s.stage)?.referenceFrame||s.frame,semantic_world_id:semantic.world_id,semantic_world_label:semantic.world_label,suppressed_reference_elements:semantic.suppressed_reference_elements};
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
    reference_elements_used:{character_dna:game.character_dna,world:game.world,terrain:game.terrain,obstacles:game.obstacles,enemies:game.enemies,moves:game.moves,weapons_ammunition:game.weapons,power_ups:game.powerUps,special_abilities:game.abilities,props:game.props,camera:game.camera,vfx:game.vfx,sound:game.sound,audio_dna:getRetroAudioDNA(game.name),realistic_interpretation:game.realistic},
    progression:progression.progression,
    locked_dna:progression.lockedDna,
    flexible_elements:progression.flexibleElements,
    storyboard,
    semantic_resolution:{...resolveRetroSemanticWorld(normalizedIntent),original_intent:intent},
    mission_arc_plan:buildRetroMissionArcPlan(normalizedIntent,request.missionReelCount??3)
  };
  const missionProduction=buildRetroMissionProduction(
    episode.mission_arc_plan,
    episode.episode_id,
    episode.semantic_resolution.world_label+" environment",
    [game.character_dna?.character_id||game.name.toUpperCase()+"_PROTAGONIST_001"],
    storyboard.map(scene=>({title:scene.title,description:scene.description,action:scene.action}))
  );
  Object.assign(episode,missionProduction);\n  const contractValidation=validateRetroProductionJson(episode);
  const characterContinuity=validateRetroCharacterContinuity(episode);\n  const rendererReadiness=validateRetroRendererReadiness(episode);
  const validation={
    validator_version:"1.0",
    status:contractValidation.status==="PASS"&&characterContinuity.status==="PASS"&&rendererReadiness.status==="PASS"&&missionReelsValidation.status==="PASS"?"PASS":"FAIL",
    errors:[...contractValidation.errors,...characterContinuity.errors,...rendererReadiness.errors,...missionReelsValidation.errors],
    warnings:[...contractValidation.warnings,...characterContinuity.warnings,...rendererReadiness.warnings,...missionReelsValidation.warnings],
    checks:[...contractValidation.checks,...characterContinuity.checks,...rendererReadiness.checks,...missionReelsValidation.checks]
  };
  return {...episode,validation,renderer_readiness:rendererReadiness};}
\nexport interface RetroCharacterContinuityResult { validator_version:"1.0"; status:"PASS"|"FAIL"; errors:string[]; warnings:string[]; checks:RetroSceneValidationCheck[]; }\nexport function validateRetroCharacterContinuity(episode:Record<string,any>):RetroCharacterContinuityResult {\n const checks:RetroSceneValidationCheck[]=[],errors:string[]=[],warnings:string[]=[]; const pass=(name:string,detail:string)=>checks.push({name,status:"PASS",detail}); const fail=(name:string,detail:string)=>{checks.push({name,status:"FAIL",detail});errors.push(detail)};\n const dna=episode?.reference_elements_used?.character_dna; const s=episode?.storyboard;\n dna&&typeof dna.character_id==="string"&&dna.identity&&dna.costume&&dna.equipment&&dna.continuity_lock?pass("character_dna_present","Canonical protagonist Character DNA is present."):fail("character_dna_present","Canonical protagonist Character DNA is missing or incomplete.");\n Array.isArray(s)&&s.length===8?pass("character_scene_count","All 8 scenes are available for character continuity validation."):fail("character_scene_count","Character continuity requires exactly 8 scenes.");\n if(Array.isArray(s)&&s.length===8){ const fields=["character_identity","character_visual","character_costume","character_equipment","character_continuity"]; const missing=s.flatMap((x,i)=>fields.filter(k=>typeof x[k]!=="string"||!x[k].trim()).map(k=>"Scene "+(i+1)+": "+k)); missing.length?fail("character_scene_fields","Character continuity fields missing: "+missing.join(", ")):pass("character_scene_fields","All scenes contain direct character identity, visual, costume, equipment and continuity fields."); const ids=s.every(x=>Array.isArray(x.characters)&&x.characters.length===1&&x.characters[0]===dna?.character_id); ids?pass("character_identity_lock","All scenes use the same canonical protagonist character ID."):fail("character_identity_lock","Protagonist character ID changes between scenes."); const costumes=s.every(x=>x.character_costume===s[0].character_costume); costumes?pass("costume_continuity","Protagonist costume remains continuous across all scenes."):fail("costume_continuity","Protagonist costume continuity is broken."); const visuals=s.every(x=>x.character_visual===s[0].character_visual); visuals?pass("visual_continuity","Protagonist visual silhouette remains continuous across all scenes."):fail("visual_continuity","Protagonist visual continuity is broken."); const equipment=s.every(x=>x.character_equipment===s[0].character_equipment)||s.slice(0,3).every(x=>x.character_equipment===s[0].character_equipment); equipment?pass("equipment_continuity","Baseline protagonist equipment remains continuous; progression upgrades may be represented separately."):warnings.push("Equipment continuity should be checked against explicit capability upgrades."); }\n return {validator_version:"1.0",status:errors.length?"FAIL":"PASS",errors,warnings,checks};\n}\n