import { quantity, type Quantity } from "../simulation/v1-a/quantity.js";

export interface PendulumExperimentOptions {
  readonly lengthM: Quantity;
  readonly gravityMps2?: number;
  readonly initialAngleDeg?: number;
}

export class PendulumExperimentAdapter {
  private readonly lengthM: Quantity;
  private readonly gravityMps2: number;
  private readonly initialAngleRad: number;
  private angleRad: number;
  private angularVelocity = 0;

  constructor(options: PendulumExperimentOptions) {
    if (options.lengthM.unit !== "m" || options.lengthM.value <= 0) throw new Error("length must be positive m");
    this.lengthM = structuredClone(options.lengthM);
    this.gravityMps2 = options.gravityMps2 ?? 9.81;
    this.initialAngleRad = (options.initialAngleDeg ?? 10) * Math.PI / 180;
    this.angleRad = this.initialAngleRad;
  }

  step(dt: Quantity): void {
    if (dt.unit !== "s" || dt.value <= 0) throw new Error("dt must be positive s");
    const acceleration = -(this.gravityMps2 / this.lengthM.value) * Math.sin(this.angleRad);
    this.angleRad += this.angularVelocity * dt.value + 0.5 * acceleration * dt.value * dt.value;
    const nextAcceleration = -(this.gravityMps2 / this.lengthM.value) * Math.sin(this.angleRad);
    this.angularVelocity += 0.5 * (acceleration + nextAcceleration) * dt.value;
  }

  measure() {
    const linearPosition = quantity(this.lengthM.value * Math.sin(this.angleRad), "m");
    const angularVelocity = quantity(this.angularVelocity, "rad/s");
    return [
      { id: "angle", label: "Angle", quantity: quantity(this.angleRad * 180 / Math.PI, "deg") },
      { id: "angular_velocity", label: "Angular Velocity", quantity: angularVelocity },
      { id: "position", label: "Horizontal Position", quantity: linearPosition },
    ];
  }

  reset(): void {
    this.angleRad = this.initialAngleRad;
    this.angularVelocity = 0;
  }
}
