import type { Quantity, ScienceState, ScienceTickInput } from "../contracts/science.js";
export type ExperimentStatus = "CREATED" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED";
export interface MeasurementValue { readonly id:string; readonly label:string; readonly quantity:Quantity; }
export interface MeasurementSnapshot { readonly tick:number; readonly time:Quantity; readonly values:MeasurementValue[]; }
export interface Checkpoint { readonly checkpointId:string; readonly tick:number; readonly science:ScienceState; }
export interface ExperimentSnapshot { readonly experimentId:string; readonly status:ExperimentStatus; readonly tick:number; readonly revision:number; readonly science:ScienceState; readonly checkpoints:Checkpoint[]; readonly measurements:MeasurementSnapshot[]; }
export type ExperimentCommand =
 | {type:"START"}|{type:"PAUSE"}|{type:"RESUME"}|{type:"STEP";input:ScienceTickInput}
 | {type:"CHECKPOINT"}|{type:"RESTORE";checkpointId:string}|{type:"MEASURE";measurement:MeasurementValue}|{type:"RESET"}|{type:"STOP"};
