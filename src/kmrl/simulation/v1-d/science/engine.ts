import {quantity} from "../../v1-a/quantity.js";
import {stepPhysics} from "../physics/index.js";
import {runChemistry} from "../chemistry/index.js";
import type {ScienceEvent,ScienceState,ScienceTickInput,ScienceTickResult} from "./types.js";
export function createScienceState(input:ScienceState):ScienceState{return structuredClone(input);}
export function scienceTick(current:ScienceState,input:ScienceTickInput):ScienceTickResult {
  if(input.dtS<=0) throw new Error("dtS must be positive");
  const time=quantity(current.timeS.value+input.dtS,"s");
  const events:ScienceEvent[]=[{type:"TICK_STARTED",timeS:structuredClone(current.timeS)}];
  const physics=stepPhysics(current.physics,{netForce:input.netForce,dtS:input.dtS});
  events.push({type:"PHYSICS_UPDATED",timeS:structuredClone(time),data:{positionM:physics.positionM.value,velocityMps:physics.velocityMps.value}});
  let materials=structuredClone(current.materials); let chemistryStatus:ScienceTickResult["chemistry"]["status"]="NOT_REQUESTED";
  if(input.reaction){const chemistry=runChemistry(materials,input.reaction,{temperature:current.temperature});chemistryStatus=chemistry.status;if(chemistry.status==="COMPLETED"){materials=[...chemistry.remaining,...chemistry.products];events.push({type:"REACTION_COMPLETED",timeS:structuredClone(time),data:{reactionId:input.reaction.id,productCount:chemistry.products.length}});}else{events.push({type:"REACTION_SKIPPED",timeS:structuredClone(time),data:{status:chemistry.status,reactionId:input.reaction.id}});}}
  const state:ScienceState={...structuredClone(current),timeS:time,physics,materials}; events.push({type:"TICK_COMPLETED",timeS:structuredClone(time)}); return {state,events,chemistry:{status:chemistryStatus}};
}
