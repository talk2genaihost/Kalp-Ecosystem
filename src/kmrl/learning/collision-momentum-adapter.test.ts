import assert from "node:assert/strict";
import test from "node:test";
import { quantity } from "../simulation/v1-a/quantity.js";
import { CollisionMomentumExperimentAdapter } from "./collision-momentum-adapter.js";

test("collision momentum adapter computes one-dimensional elastic final velocities", () => {
  const adapter = new CollisionMomentumExperimentAdapter({
    mass1Kg: 1,
    mass2Kg: 1,
    velocity1Mps: 2,
    velocity2Mps: -1,
  });

  const measurements = adapter.measure();

  assert.equal(measurements.find((item) => item.id === "final_velocity_1")?.quantity.value, -1);
  assert.equal(measurements.find((item) => item.id === "final_velocity_2")?.quantity.value, 2);
});

test("collision momentum adapter conserves momentum and kinetic energy", () => {
  const adapter = new CollisionMomentumExperimentAdapter({
    mass1Kg: 2,
    mass2Kg: 1,
    velocity1Mps: 3,
    velocity2Mps: -1,
  });

  const measurements = adapter.measure();
  const momentum = measurements.find((item) => item.id === "momentum")?.quantity.value;
  const kineticEnergy = measurements.find((item) => item.id === "kinetic_energy")?.quantity.value;

  assert.ok(Math.abs((momentum ?? 0) - 5) < 1e-12);
  assert.ok(Math.abs((kineticEnergy ?? 0) - 9.5) < 1e-12);
});

test("collision momentum adapter rejects non-positive masses and non-finite velocities", () => {
  assert.throws(() => new CollisionMomentumExperimentAdapter({
    mass1Kg: 0,
    mass2Kg: 1,
    velocity1Mps: 1,
    velocity2Mps: 0,
  }));

  assert.throws(() => new CollisionMomentumExperimentAdapter({
    mass1Kg: 1,
    mass2Kg: 1,
    velocity1Mps: Number.NaN,
    velocity2Mps: 0,
  }));
});

test("collision momentum adapter accepts runtime timestep quantity", () => {
  const adapter = new CollisionMomentumExperimentAdapter({
    mass1Kg: 1,
    mass2Kg: 1,
    velocity1Mps: 1,
    velocity2Mps: 0,
  });
  assert.doesNotThrow(() => adapter.step(quantity(0.1, "s")));
});
