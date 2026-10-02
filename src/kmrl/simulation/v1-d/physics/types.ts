import type {Quantity} from "../../v1-a/quantity.js";
export interface PhysicsState { positionM:Quantity; velocityMps:Quantity; accelerationMps2:Quantity; massKg:Quantity; }
export interface PhysicsStepInput { netForce:Quantity; dtS:number; }
