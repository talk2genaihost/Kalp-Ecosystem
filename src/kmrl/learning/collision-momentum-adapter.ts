import { quantity, type Quantity } from "../simulation/v1-a/quantity.js";

export interface CollisionMomentumInputs {
  mass1Kg: number;
  mass2Kg: number;
  velocity1Mps: number;
  velocity2Mps: number;
}

export class CollisionMomentumExperimentAdapter {
  private mass1Kg: number;
  private mass2Kg: number;
  private velocity1Mps: number;
  private velocity2Mps: number;

  constructor(inputs: CollisionMomentumInputs) {
    this.setInputs(inputs);
  }

  setInputs(inputs: CollisionMomentumInputs): void {
    if (![inputs.mass1Kg, inputs.mass2Kg].every((value) => Number.isFinite(value) && value > 0)) {
      throw new Error("Collision masses must be finite and positive");
    }
    if (![inputs.velocity1Mps, inputs.velocity2Mps].every((value) => Number.isFinite(value))) {
      throw new Error("Collision velocities must be finite");
    }
    this.mass1Kg = inputs.mass1Kg;
    this.mass2Kg = inputs.mass2Kg;
    this.velocity1Mps = inputs.velocity1Mps;
    this.velocity2Mps = inputs.velocity2Mps;
  }

  step(_dt: Quantity): void {}

  measure() {
    const denominator = this.mass1Kg + this.mass2Kg;
    const finalVelocity1 =
      ((this.mass1Kg - this.mass2Kg) * this.velocity1Mps +
        2 * this.mass2Kg * this.velocity2Mps) /
      denominator;
    const finalVelocity2 =
      (2 * this.mass1Kg * this.velocity1Mps +
        (this.mass2Kg - this.mass1Kg) * this.velocity2Mps) /
      denominator;

    const initialMomentum =
      this.mass1Kg * this.velocity1Mps + this.mass2Kg * this.velocity2Mps;
    const finalMomentum =
      this.mass1Kg * finalVelocity1 + this.mass2Kg * finalVelocity2;
    const initialKineticEnergy =
      0.5 * this.mass1Kg * this.velocity1Mps ** 2 +
      0.5 * this.mass2Kg * this.velocity2Mps ** 2;
    const finalKineticEnergy =
      0.5 * this.mass1Kg * finalVelocity1 ** 2 +
      0.5 * this.mass2Kg * finalVelocity2 ** 2;

    return [
      { id: "final_velocity_1", label: "Final Velocity 1", quantity: quantity(finalVelocity1, "m/s") },
      { id: "final_velocity_2", label: "Final Velocity 2", quantity: quantity(finalVelocity2, "m/s") },
      { id: "momentum", label: "Momentum", quantity: quantity(finalMomentum, "kg*m/s") },
      { id: "kinetic_energy", label: "Kinetic Energy", quantity: quantity(finalKineticEnergy, "J") },
    ];
  }

  reset(): void {}
}
