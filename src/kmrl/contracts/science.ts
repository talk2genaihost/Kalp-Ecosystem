import type {Quantity} from "../simulation/v1-a/quantity.js";
import type {ScienceState,ScienceTickInput} from "../simulation/v1-d/science/types.js";
export type {Quantity,ScienceState,ScienceTickInput};
export interface ScienceKernelPort { step(state:ScienceState,input:ScienceTickInput):ScienceState; }
export class UnifiedScienceKernel implements ScienceKernelPort {
  constructor(private readonly tick:(state:ScienceState,input:ScienceTickInput)=>{state:ScienceState}){}
  step(state:ScienceState,input:ScienceTickInput):ScienceState { return this.tick(state,input).state; }
}
