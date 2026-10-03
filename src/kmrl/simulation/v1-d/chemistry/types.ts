import type {Quantity} from "../../v1-a/quantity.js";
export interface MaterialAmount {materialId:string; amount:Quantity;}
export interface ReactionParticipant {materialId:string; coefficient:number;}
export type ReactionCondition={type:"MIN_TEMPERATURE";temperature:Quantity}|{type:"MAX_TEMPERATURE";temperature:Quantity};
export interface ReactionDefinition {id:string;name:string;reactants:ReactionParticipant[];products:ReactionParticipant[];conditions?:ReactionCondition[];}
export interface ReactionContext {temperature:Quantity;}
