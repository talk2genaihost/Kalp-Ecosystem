import { buildRetroInitialMissionState, buildRetroReelProduction, RETRO_SHOTS_PER_REEL, type RetroMissionArcPlan, type RetroMissionState, type RetroGeneratedReel } from "./retro-mission-arc";

export interface RetroMissionProductionValidation {
  status:"PASS"|"FAIL";
  errors:string[];
  warnings:string[];
  checks:Array<{name:string;status:"PASS"|"FAIL";detail:string}>;
}

export function buildRetroMissionProduction(
  plan:RetroMissionArcPlan,
  episodeId:string,
  worldState:string,
  characterIds:string[],
  storyboard:Array<{title:string;description:string;action:string}>
):{mission_state:RetroMissionState;reels:RetroGeneratedReel[];production_shot_count:number} {
  if(!episodeId.trim()) throw new Error("Mission production requires an episode ID.");
  if(!storyboard.length) throw new Error("Mission production requires progression storyboard frames.");

  const initial=buildRetroInitialMissionState(
    plan,
    worldState,
    characterIds.join(", "),
    "Baseline game capability",
    "Initial opposition forming"
  );
  initial.mission_id=episodeId;

  const reels:RetroGeneratedReel[]=[];
  let previous:RetroMissionState=initial;

  for(const reelPlan of plan.reels){
    const reel=buildRetroReelProduction(
      plan,
      reelPlan.reel,
      previous,
      characterIds,
      previous.world_state,
      previous.capability_state,
      storyboard
    );
    reel.starting_state.mission_id=episodeId;
    reel.ending_state.mission_id=episodeId;
    reels.push(reel);
    previous=reel.ending_state;
  }

  return {
    mission_state:previous,
    reels,
    production_shot_count:reels.reduce((total,reel)=>total+reel.shots.length,0)
  };
}

export function validateRetroMissionReels(episode:Record<string,any>):RetroMissionProductionValidation {
  const checks:Array<{name:string;status:"PASS"|"FAIL";detail:string}>=[];
  const errors:string[]=[];
  const warnings:string[]=[];
  const pass=(name:string,detail:string)=>checks.push({name,status:"PASS",detail});
  const fail=(name:string,detail:string)=>{checks.push({name,status:"FAIL",detail});errors.push(detail)};

  const plan=episode?.mission_arc_plan;
  const reels=episode?.reels;

  if(!plan||!Number.isInteger(plan.reel_count)||plan.reel_count<2){
    fail("mission_plan","Mission arc plan must contain at least two reels.");
  }else{
    pass("mission_plan","Mission arc plan is present and valid.");
  }

  if(Array.isArray(reels)&&reels.length===plan?.reel_count){
    pass("mission_reel_count","Generated reel count matches the mission plan.");
  }else{
    fail("mission_reel_count","Generated reel count does not match the mission plan.");
  }

  if(Array.isArray(reels)){
    reels.forEach((reel:any,index:number)=>{
      const number=index+1;
      if(Array.isArray(reel.shots)&&reel.shots.length===RETRO_SHOTS_PER_REEL){
        pass("reel_"+number+"_shot_count","Reel "+number+" contains exactly "+RETRO_SHOTS_PER_REEL+" production shots.");
      }else{
        fail("reel_"+number+"_shot_count","Reel "+number+" must contain exactly "+RETRO_SHOTS_PER_REEL+" production shots.");
      }

      if(reel.starting_state?.reel===index){
        pass("reel_"+number+"_start_state","Reel "+number+" starts from the expected previous mission state.");
      }else{
        fail("reel_"+number+"_start_state","Reel "+number+" does not carry the previous reel state.");
      }

      if(reel.ending_state?.mission_id===episode.episode_id){
        pass("reel_"+number+"_mission_id","Reel "+number+" preserves mission identity.");
      }else{
        fail("reel_"+number+"_mission_id","Reel "+number+" mission identity is not preserved.");
      }

      const completeShots=Array.isArray(reel.shots)&&reel.shots.length===RETRO_SHOTS_PER_REEL&&reel.shots.every((shot:any,i:number)=>
        shot.shot===i+1 &&
        shot.reel===number &&
        Array.isArray(shot.characters)&&shot.characters.length>0 &&
        Boolean(shot.world_state)&&Boolean(shot.character_state)&&
        Boolean(shot.capability_state)&&Boolean(shot.threat_state)&&
        Boolean(shot.objective_state)&&Boolean(shot.continuity_from)&&Boolean(shot.continuity_to)
      );
      completeShots
        ? pass("reel_"+number+"_shot_contract","Reel "+number+" contains complete production and continuity state.")
        : fail("reel_"+number+"_shot_contract","Reel "+number+" contains incomplete production or continuity state.");

      if(index>0){
        const previous=reels[index-1];
        reel.starting_state?.continuity_anchor===previous.ending_state?.continuity_anchor
          ? pass("reel_"+number+"_resume_continuity","Reel "+number+" resumes from Reel "+index+" continuity anchor.")
          : fail("reel_"+number+"_resume_continuity","Reel "+number+" does not resume from Reel "+index+" continuity anchor.");

        reel.starting_state?.world_state===previous.ending_state?.world_state
          ? pass("reel_"+number+"_world_continuity","Reel "+number+" preserves world state.")
          : fail("reel_"+number+"_world_continuity","Reel "+number+" resets world state.");

        reel.starting_state?.character_state===previous.ending_state?.character_state
          ? pass("reel_"+number+"_character_continuity","Reel "+number+" preserves character state.")
          : fail("reel_"+number+"_character_continuity","Reel "+number+" resets character state.");

        reel.starting_state?.objective===previous.ending_state?.objective
          ? pass("reel_"+number+"_objective_continuity","Reel "+number+" preserves the mission objective.")
          : fail("reel_"+number+"_objective_continuity","Reel "+number+" changes the mission objective.");

        reel.shots?.[0]?.continuity_from===previous.ending_state?.continuity_anchor
          ? pass("reel_"+number+"_first_shot_resume","First shot explicitly resumes from the previous reel anchor.")
          : fail("reel_"+number+"_first_shot_resume","First shot does not resume from the previous reel anchor.");
      }
    });

    const final=reels[reels.length-1];
    const finalComplete=final?.ending_state?.status==="COMPLETE" &&
      final?.shots?.[RETRO_SHOTS_PER_REEL-1]?.is_resolution_shot===true;
    finalComplete
      ? pass("mission_completion","Final reel closes the mission with a resolution shot and COMPLETE state.")
      : fail("mission_completion","Only the final reel may complete the mission.");

    const noEarlyCompletion=reels.slice(0,-1).every((reel:any)=>
      reel.ending_state?.status==="IN_PROGRESS" &&
      reel.shots?.every((shot:any)=>shot.is_resolution_shot===false)
    );
    noEarlyCompletion
      ? pass("no_early_completion","No non-final reel prematurely completes the mission.")
      : fail("no_early_completion","A non-final reel contains premature mission completion.");
  }

  const expected=(plan?.reel_count||0)*RETRO_SHOTS_PER_REEL;
  episode?.production_shot_count===expected
    ? pass("production_shot_count","Production episode contains "+expected+" reel shots.")
    : fail("production_shot_count","Production shot count must be "+expected+".");

  return {status:errors.length?"FAIL":"PASS",errors,warnings,checks};
}
