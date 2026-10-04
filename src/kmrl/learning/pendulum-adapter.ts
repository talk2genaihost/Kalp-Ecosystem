import { quantity, type Quantity } from "../simulation/v1-a/quantity.js";

export interface PendulumExperimentOptions {
  readonly lengthM: Quantity;
  readonly gravityMps2: number;
}

export class PendulumExperimentAdapter {
  private readonly lengthM: Quantity;
  private gravityMps2: number;

  constructor(options: PendulumExperimentOptions) {
    if (options.lengthM.unit !== "m" || options.lengthM.value <= 0) throw new Error("length must be positive m");
    if (!Number.isFinite(options.gravityMps2) || options.gravityMps2 <= 0) throw new Error("gravity must be positive m/s2");
    this.lengthM = structuredClone(options.lengthM);
    this.gravityMps2 = options.gravityMps2;
  }

  setGravity(gravity: Quantity): void {
    if (gravity.unit !== "m/s2" || gravity.value <= 0) throw new Error("gravity must be positive m/s2");
    this.gravityMps2 = gravity.value;
  }

  step(_dt: Quantity): void {
    // Pendulum is defined by the Excel catalog as a closed-form period calculation.
  }

  measure() {
    const period = 2 * Math.PI * Math.sqrt(this.lengthM.value / this.gravityMps2);
    return [{ id: "period", label: "Period", quantity: quantity(period, "s") }];
  }

  reset(): void {}
}
