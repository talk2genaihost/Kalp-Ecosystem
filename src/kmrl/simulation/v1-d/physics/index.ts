import {quantity} from "../../v1-a/quantity.js";
import type {PhysicsState, PhysicsStepInput} from "./types.js";
export function stepPhysics(state:PhysicsState,input:PhysicsStepInput):PhysicsState {
  if(input.dtS<=0) throw new Error("dtS must be positive");
  if(input.netForce.unit!=="N") throw new Error("netForce must be N");
  if(state.massKg.unit!=="kg" || state.massKg.value<=0) throw new Error("Mass must be positive kg");
  const acceleration=input.netForce.value/state.massKg.value;
  const velocity=state.velocityMps.value+acceleration*input.dtS;
  const position=state.positionM.value+state.velocityMps.value*input.dtS+0.5*acceleration*input.dtS*input.dtS;
  return {...state,accelerationMps2:quantity(acceleration,"m/s2"),velocityMps:quantity(velocity,"m/s"),positionM:quantity(position,"m")};
}
