import { quantity, type Quantity } from "../simulation/v1-a/quantity.js";

export interface ProjectileMotionExperimentOptions {
  readonly initialSpeedMps?: Quantity;
  readonly launchAngleDeg?: number;
  readonly gravityMps2?: number;
}

export interface ProjectileMeasurement {
  readonly id: "x" | "y" | "speed";
  readonly label: string;
  readonly quantity: Quantity;
}

export class ProjectileMotionExperimentAdapter {
  private readonly initialSpeedMps: Quantity;
  private readonly launchAngleDeg: number;
  private readonly gravityMps2: number;
  private timeS = 0;
  private xM = 0;
  private yM = 0;

  constructor(options: ProjectileMotionExperimentOptions = {}) {
    this.initialSpeedMps = options.initialSpeedMps ?? quantity(0, "m/s");
    this.launchAngleDeg = options.launchAngleDeg ?? 45;
    this.gravityMps2 = options.gravityMps2 ?? 9.81;
  }

  step(dt: Quantity): void {
    if (dt.unit !== "s" || dt.value <= 0) throw new Error("dt must be positive s");
    this.timeS += dt.value;
    const angle = this.launchAngleDeg * Math.PI / 180;
    this.xM = this.initialSpeedMps.value * Math.cos(angle) * this.timeS;
    this.yM = this.initialSpeedMps.value * Math.sin(angle) * this.timeS - 0.5 * this.gravityMps2 * this.timeS * this.timeS;
  }

  measure(): ProjectileMeasurement[] {
    const angle = this.launchAngleDeg * Math.PI / 180;
    const vx = this.initialSpeedMps.value * Math.cos(angle);
    const vy = this.initialSpeedMps.value * Math.sin(angle) - this.gravityMps2 * this.timeS;
    return [
      { id: "x", label: "Horizontal Position", quantity: quantity(this.xM, "m") },
      { id: "y", label: "Vertical Position", quantity: quantity(this.yM, "m") },
      { id: "speed", label: "Speed", quantity: quantity(Math.hypot(vx, vy), "m/s") },
    ];
  }

  reset(): void {
    this.timeS = 0;
    this.xM = 0;
    this.yM = 0;
  }
}
