import test from "node:test";
import assert from "node:assert/strict";
import { quantity } from "../simulation/v1-a/quantity.js";
import { scienceTick } from "../simulation/v1-d/science/engine.js";
import { HeatingWaterExperimentAdapter } from "./heating-water-adapter.js";

test("heating-water adapter applies controlled heat through the science runtime", () => {
  const adapter = new HeatingWaterExperimentAdapter({
    massKg: quantity(1, "kg"),
    initialTemperatureC: quantity(20, "degC"),
  }, scienceTick);

  adapter.applyHeatEnergy(quantity(4186, "J"));
  adapter.step(quantity(1, "s"));

  assert.equal(adapter.stateSnapshot().temperature.value, 21);
  assert.equal(adapter.stateSnapshot().temperature.unit, "degC");
});

test("heating-water adapter is deterministic across repeated identical runs", () => {
  const run = () => {
    const adapter = new HeatingWaterExperimentAdapter({
      massKg: quantity(2, "kg"),
      initialTemperatureC: quantity(20, "degC"),
    }, scienceTick);
    adapter.applyHeatEnergy(quantity(8372, "J"));
    adapter.step(quantity(1, "s"));
    return adapter.stateSnapshot();
  };

  assert.deepEqual(run(), run());
});

test("heating-water adapter exposes temperature and heat measurements", () => {
  const adapter = new HeatingWaterExperimentAdapter({
    massKg: quantity(1, "kg"),
    initialTemperatureC: quantity(20, "degC"),
  }, scienceTick);
  adapter.applyHeatEnergy(quantity(4186, "J"));
  adapter.step(quantity(1, "s"));

  const measurements = adapter.measure();

  assert.deepEqual(measurements.map((item) => item.id), ["temperature", "heat-energy"]);
  assert.deepEqual(measurements[0].quantity, quantity(21, "degC"));
  assert.deepEqual(measurements[1].quantity, quantity(4186, "J"));
});

test("heating-water adapter rejects invalid heat, mass, and timestep inputs", () => {
  const adapter = new HeatingWaterExperimentAdapter({
    massKg: quantity(1, "kg"),
    initialTemperatureC: quantity(20, "degC"),
  }, scienceTick);

  assert.throws(() => adapter.applyHeatEnergy(quantity(1, "kg")), /heatEnergy must be J/);
  assert.throws(() => adapter.applyHeatEnergy(quantity(0, "J")), /heatEnergy must be positive/);
  assert.throws(() => new HeatingWaterExperimentAdapter({ massKg: quantity(0, "kg") }, scienceTick), /massKg must be positive/);

  adapter.applyHeatEnergy(quantity(1, "J"));
  assert.throws(() => adapter.step(quantity(0, "s")), /dtS must be positive/);
});

test("heating-water adapter resets temperature and clears pending heat", () => {
  const adapter = new HeatingWaterExperimentAdapter({
    massKg: quantity(2, "kg"),
    initialTemperatureC: quantity(25, "degC"),
  }, scienceTick);

  adapter.applyHeatEnergy(quantity(8372, "J"));
  adapter.step(quantity(1, "s"));
  adapter.reset();

  assert.deepEqual(adapter.stateSnapshot().temperature, quantity(25, "degC"));
  assert.equal(adapter.stateSnapshot().timeS.value, 0);
  assert.deepEqual(adapter.measure()[1].quantity, quantity(0, "J"));
});
