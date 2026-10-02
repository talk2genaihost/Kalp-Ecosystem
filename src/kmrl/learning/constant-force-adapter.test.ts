import test from "node:test";
import assert from "node:assert/strict";
import { quantity } from "../simulation/v1-a/quantity.js";
import { scienceTick } from "../simulation/v1-d/science/engine.js";
import { ConstantForceExperimentAdapter } from "./constant-force-adapter.js";

test("constant-force adapter applies a constant force through the science kernel", () => {
  const adapter = new ConstantForceExperimentAdapter({ massKg: quantity(2, "kg") }, scienceTick);

  adapter.applyConstantForce(quantity(10, "N"));
  const result = adapter.step(quantity(1, "s"));

  assert.equal(result.state.physics.accelerationMps2.value, 5);
  assert.equal(result.state.physics.velocityMps.value, 5);
  assert.equal(result.state.physics.positionM.value, 2.5);
});

test("constant-force adapter preserves deterministic state across repeated identical runs", () => {
  const run = () => {
    const adapter = new ConstantForceExperimentAdapter({ massKg: quantity(1, "kg") }, scienceTick);
    adapter.applyConstantForce(quantity(4, "N"));
    adapter.step(quantity(0.5, "s"));
    return adapter.step(quantity(0.5, "s"));
  };

  assert.deepEqual(run(), run());
});

test("constant-force adapter exposes measurements from the science state", () => {
  const adapter = new ConstantForceExperimentAdapter({ massKg: quantity(1, "kg") }, scienceTick);
  adapter.applyConstantForce(quantity(3, "N"));
  adapter.step(quantity(2, "s"));

  const measurements = adapter.measure();

  assert.deepEqual(measurements.map((item) => item.id), ["position", "velocity", "acceleration"]);
  assert.equal(measurements[0].quantity.unit, "m");
  assert.equal(measurements[1].quantity.unit, "m/s");
  assert.equal(measurements[2].quantity.unit, "m/s2");
});

test("constant-force adapter rejects invalid force and timestep inputs", () => {
  const adapter = new ConstantForceExperimentAdapter({ massKg: quantity(1, "kg") }, scienceTick);

  assert.throws(() => adapter.applyConstantForce(quantity(1, "kg")), /netForce must be N/);
  adapter.applyConstantForce(quantity(1, "N"));
  assert.throws(() => adapter.step(quantity(0, "s")), /dtS must be positive/);
});

test("constant-force adapter resets to its initial state and clears the applied force", () => {
  const adapter = new ConstantForceExperimentAdapter({
    massKg: quantity(2, "kg"),
    initialPositionM: quantity(3, "m"),
    initialVelocityMps: quantity(1, "m/s"),
  }, scienceTick);

  adapter.applyConstantForce(quantity(8, "N"));
  adapter.step(quantity(1, "s"));
  adapter.reset();

  assert.deepEqual(adapter.stateSnapshot().physics.positionM, quantity(3, "m"));
  assert.deepEqual(adapter.stateSnapshot().physics.velocityMps, quantity(1, "m/s"));
  assert.deepEqual(adapter.stateSnapshot().physics.accelerationMps2, quantity(0, "m/s2"));
  assert.equal(adapter.stateSnapshot().timeS.value, 0);
});
