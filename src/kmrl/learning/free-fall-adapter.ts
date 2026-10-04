import { quantity, type Quantity } from "../simulation/v1-a/quantity.js";

export interface FreeFallExperimentOptions {
  readonly initialHeightM?: Quantity;
  readonly initialVelocityMps?: Quantity;
}

export interface FreeFallMeasurement {
  readonly id: "height" | "velocity" | "acceleration";
  readonly label: string;
  readonly quantity: Quantity;
}

export class FreeFallExperimentAdapter {
  private readonly initialHeightM: Quantity;
  private readonly initialVelocityMps: Quantity;
  private heightM: Quantity;
  private velocityMps: Quantity;
  private accelerationMps2: Quantity = quantity(0, "m/s2");
  private gravityMps2: Quantity = quantity(9.81, "m/s2");

  constructor(options: FreeFallExperimentOptions = {}) {
    this.initialHeightM = options.initialHeightM ?? quantity(0, "m");
    this.initialVelocityMps = options.initialVelocityMps ?? quantity(0, "m/s");
    this.heightM = structuredClone(this.initialHeightM);
    this.velocityMps = structuredClone(this.initialVelocityMps);
  }

  setGravity(gravity: Quantity): void {
    if (gravity.unit !== "m/s2" || gravity.value <= 0) throw new Error("gravity must be positive m/s2");
    this.gravityMps2 = structuredClone(gravity);
    this.accelerationMps2 = quantity(-gravity.value, "m/s2");
  }

  step(dt: Quantity): void {
    if (dt.unit !== "s" || dt.value <= 0) throw new Error("dt must be positive s");
    const acceleration = -this.gravityMps2.value;
    const nextVelocity = this.velocityMps.value + acceleration * dt.value;
    const nextHeight = this.heightM.value + this.velocityMps.value * dt.value + 0.5 * acceleration * dt.value * dt.value;
    this.velocityMps = quantity(nextVelocity, "m/s");
    this.heightM = quantity(nextHeight, "m");
    this.accelerationMps2 = quantity(acceleration, "m/s2");
  }

  measure(): FreeFallMeasurement[] {
    return [
      { id: "height", label: "Height", quantity: structuredClone(this.heightM) },
      { id: "velocity", label: "Velocity", quantity: structuredClone(this.velocityMps) },
      { id: "acceleration", label: "Acceleration", quantity: structuredClone(this.accelerationMps2) },
    ];
  }

  reset(): void {
    this.heightM = structuredClone(this.initialHeightM);
    this.velocityMps = structuredClone(this.initialVelocityMps);
    this.accelerationMps2 = quantity(0, "m/s2");
  }
}
