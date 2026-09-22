/**
 * KALP Retro 64 — Mission Arc Planner
 *
 * A mission is no longer fixed to 8 frames or 3 reels.
 * The 8-frame reference remains the progression-DNA source.
 * A user chooses the number of reels; every reel owns exactly 12 shots.
 * The final reel is always the resolution/conclusion reel.
 */

export const RETRO_SHOTS_PER_REEL = 12;
export const RETRO_MIN_MISSION_REELS = 2;

export type RetroMissionReelRole =
  | "MISSION_SETUP"
  | "MISSION_ESCALATION"
  | "MISSION_CRISIS"
  | "MISSION_RESOLUTION";

export interface RetroMissionReelPlan {
  reel:number;
  shots:number;
  role:RetroMissionReelRole;
  title:string;
  objective:string;
  progression_focus:string;
  start_state:string;
  end_state:string;
  continuation_required:boolean;
  concludes_mission:boolean;
}

export interface RetroMissionArcPlan {
  version:"1.0";
  mission_intent:string;
  reel_count:number;
  shots_per_reel:number;
  total_shots:number;
  final_reel:number;
  completion_rule:string;
  reels:RetroMissionReelPlan[];
}

function normalizeReelCount(reelCount:number):number {
  if(!Number.isInteger(reelCount) || reelCount<RETRO_MIN_MISSION_REELS){
    throw new Error(`Mission reel count must be an integer >= ${RETRO_MIN_MISSION_REELS}.`);
  }
  return reelCount;
}

function objectiveFromIntent(intent:string):string {
  const text=intent.toLowerCase();
  if(/\brescue\b|\bextract\b|\bextraction\b/.test(text)) return "Rescue / extraction objective";
  if(/\bdestroy\b|\bdestroyed\b|\bdestroying\b/.test(text)) return "Destruction objective";
  if(/\besca(pe|ping)\b/.test(text)) return "Escape objective";
  if(/\bprotect\b|\bdefend\b|\bes?cort\b/.test(text)) return "Protection / escort objective";
  if(/\bcapture\b|\brecover\b|\bretrieve\b/.test(text)) return "Capture / recovery objective";
  return "Mission objective";
}

function roleForReel(reel:number,reelCount:number):RetroMissionReelRole {
  if(reel===reelCount) return "MISSION_RESOLUTION";
  if(reel===1) return "MISSION_SETUP";
  if(reel===reelCount-1) return "MISSION_CRISIS";
  return "MISSION_ESCALATION";
}

function titleForRole(role:RetroMissionReelRole):string {
  switch(role){
    case "MISSION_SETUP": return "Mission Setup & Entry";
    case "MISSION_ESCALATION": return "Escalation & Progress";
    case "MISSION_CRISIS": return "Crisis & Final Approach";
    case "MISSION_RESOLUTION": return "Final Confrontation & Mission Complete";
  }
}

/**
 * Build the complete mission plan before any reel is generated.
 * This makes the final outcome known from the beginning while preserving
 * continuity between independently generated reels.
 */
export function buildRetroMissionArcPlan(intent:string,reelCount:number):RetroMissionArcPlan {
  const normalizedIntent=intent.trim();
  if(!normalizedIntent) throw new Error("Mission intent is required.");
  const count=normalizeReelCount(reelCount);
  const objective=objectiveFromIntent(normalizedIntent);
  const reels:RetroMissionReelPlan[]=[];

  for(let reel=1;reel<=count;reel++){
    const role=roleForReel(reel,count);
    const isFinal=reel===count;
    let progression_focus:string;
    let start_state:string;
    let end_state:string;

    if(role==="MISSION_SETUP"){
      progression_focus="Establish the mission, world, protagonist capability and first opposition.";
      start_state="Mission accepted; protagonist is ready to enter the operation.";
      end_state="Initial objective is established and the protagonist is committed inside the mission space.";
    }else if(role==="MISSION_ESCALATION"){
      progression_focus="Increase opposition, introduce capability gains and move the protagonist toward the objective.";
      start_state="Continue from the previous reel's exact world, character and objective state.";
      end_state="Progress has been made, but the objective remains unresolved and opposition has intensified.";
    }else if(role==="MISSION_CRISIS"){
      progression_focus="Create the decisive obstacle, major escalation and final approach to the objective.";
      start_state="Continue from the accumulated mission state without resetting the world or characters.";
      end_state="The protagonist reaches the final objective threshold and the mission is ready for resolution.";
    }else{
      progression_focus="Execute the final confrontation, complete the objective, and establish a clear cinematic conclusion.";
      start_state="Resume from the previous reel's final objective threshold and crisis state.";
      end_state="Objective completed; mission marked COMPLETE with a stable closing state.";
    }

    reels.push({
      reel,
      shots:RETRO_SHOTS_PER_REEL,
      role,
      title:titleForRole(role),
      objective,
      progression_focus,
      start_state,
      end_state,
      continuation_required:reel>1,
      concludes_mission:isFinal
    });
  }

  return {
    version:"1.0",
    mission_intent:normalizedIntent,
    reel_count:count,
    shots_per_reel:RETRO_SHOTS_PER_REEL,
    total_shots:count*RETRO_SHOTS_PER_REEL,
    final_reel:count,
    completion_rule:"The mission may only transition to COMPLETE in the final reel.",
    reels
  };
}

export function buildRetroNextReelPlan(plan:RetroMissionArcPlan,currentReel:number):RetroMissionReelPlan|null {
  if(!Number.isInteger(currentReel)||currentReel<0||currentReel>plan.reel_count){
    throw new Error("Current reel is outside the mission plan.");
  }
  return currentReel===plan.reel_count ? null : plan.reels[currentReel];
}
