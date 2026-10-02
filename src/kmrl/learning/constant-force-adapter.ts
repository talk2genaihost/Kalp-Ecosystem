import { quantity } from "../simulation/v1-a/quantity.js";
import { scienceTick } from "../simulation/v1-d/science/engine.js";
import type { ScienceState, ScienceTickResult } from "../simulation/v1-d/science/types.js";
import type { Quantity } from "../simulation/v1-a/quantity.js";

export interface ConstantForceExperimentOptions {
  readonly massKg: Quantity;
  readonly initialPositionM?: Quantity;
  readonly initialVelocityMps?: Quantity;
}

type ScienceTick = (state: ScienceState, input: { dtS: number; netForce: Quantity }) => ScienceTickResult;

export interface ExperimentMeasurement {
  readonly id: "position" | "velocity" | "acceleration";
  readonly label: string;
  readonly quantity: Quantity;
}

export class ConstantForceExperimentAdapter {
  private readonly initialState: ScienceState;
  private state: ScienceState;
  private netForce: Quantity = quantity(0, "N");
  private readonly tick: ScienceTick;

  constructor(options: ConstantForceExperimentOptions, tick: ScienceTick = scienceTick) {
    this.tick = tick;
    this.initialState = {
      timeS: quantity(0, "s"),
      temperature: quantity(20, "degC"),
      materials: [],
      physics: {
        positionM: options.initialPositionM ?? quantity(0, "m"),
        velocityMps: options.initialVelocityMps ?? quantity(0, "m/s"),
        accelerationMps2: quantity(0, "m/s2"),
        massKg: options.massKg,
      },
    };
    this.state = structuredClone(this.initialState);
  }

  applyConstantForce(force: Quantity): void {
    if (force.unit !== "N") throw new Error("netForce must be N");
    this.netForce = structuredClone(force);
  }

  step(dt: Quantity): ScienceTickResult {
    if (dt.unit !== "s") throw new Error("dt must be s");
    const result = this.tick(this.state, { dtS: dt.value, netForce: this.netForce });
    this.state = result.state;
    return result;
  }

  stateSnapshot(): ScienceState {
    return structuredClone(this.state);
  }

  measure(): ExperimentMeasurement[] {
    return [
      { id: "position", label: "Position", quantity: structuredClone(this.state.physics.positionM) },
      { id: "velocity", label: "Velocity", quantity: structuredClone(this.state.physics.velocityMps) },
      { id: "acceleration", label: "Acceleration", quantity: structuredClone(this.state.physics.accelerationMps2) },
    ];
  }

  reset(): void {
    this.state = structuredClone(this.initialState);
    this.netForce = quantity(0, "N");
  }
}
