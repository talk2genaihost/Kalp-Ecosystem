import { quantity, type Quantity } from "../simulation/v1-a/quantity.js";

export interface SpringMassExperimentOptions {
  readonly massKg: Quantity;
  readonly springConstantNpm: number;
  readonly initialDisplacementM?: Quantity;
}

export class SpringMassExperimentAdapter {
  private readonly initialDisplacementM: Quantity;
  private readonly massKg: Quantity;
  private readonly springConstantNpm: number;
  private displacementM: Quantity;
  private velocityMps: Quantity = quantity(0, "m/s");

  constructor(options: SpringMassExperimentOptions) {
    if (options.massKg.unit !== "kg" || options.massKg.value <= 0) throw new Error("mass must be positive kg");
    if (!Number.isFinite(options.springConstantNpm) || options.springConstantNpm <= 0) throw new Error("spring_constant must be positive N/m");
    this.massKg = structuredClone(options.massKg);
    this.springConstantNpm = options.springConstantNpm;
    this.initialDisplacementM = options.initialDisplacementM ?? quantity(1, "m");
    this.displacementM = structuredClone(this.initialDisplacementM);
  }

  step(dt: Quantity): void {
    if (dt.unit !== "s" || dt.value <= 0) throw new Error("dt must be positive s");
    const acceleration = -(this.springConstantNpm / this.massKg.value) * this.displacementM.value;
    this.displacementM = quantity(
      this.displacementM.value + this.velocityMps.value * dt.value + 0.5 * acceleration * dt.value * dt.value,
      "m",
    );
    const nextAcceleration = -(this.springConstantNpm / this.massKg.value) * this.displacementM.value;
    this.velocityMps = quantity(this.velocityMps.value + 0.5 * (acceleration + nextAcceleration) * dt.value, "m/s");
  }

  measure() {
    const acceleration = -(this.springConstantNpm / this.massKg.value) * this.displacementM.value;
    return [
      { id: "displacement", label: "Displacement", quantity: structuredClone(this.displacementM) },
      { id: "velocity", label: "Velocity", quantity: structuredClone(this.velocityMps) },
      { id: "acceleration", label: "Acceleration", quantity: quantity(acceleration, "m/s2") },
    ];
  }

  reset(): void {
    this.displacementM = structuredClone(this.initialDisplacementM);
    this.velocityMps = quantity(0, "m/s");
  }
}
