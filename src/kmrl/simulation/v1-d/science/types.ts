import type {Quantity} from "../../v1-a/quantity.js";
import type {PhysicsState} from "../physics/types.js";
import type {MaterialAmount,ReactionDefinition} from "../chemistry/types.js";
export interface ScienceState {timeS:Quantity;physics:PhysicsState;materials:MaterialAmount[];temperature:Quantity;}
export type ScienceEventType="TICK_STARTED"|"PHYSICS_UPDATED"|"REACTION_COMPLETED"|"REACTION_SKIPPED"|"TICK_COMPLETED";
export interface ScienceEvent {type:ScienceEventType;timeS:Quantity;data?:Record<string,unknown>;}
export interface ScienceTickInput {dtS:number;netForce:Quantity;reaction?:ReactionDefinition;}
export interface ScienceTickResult {state:ScienceState;events:ScienceEvent[];chemistry:{status:"COMPLETED"|"NO_MATCH"|"CONDITION_NOT_MET"|"NOT_REQUESTED"};}
