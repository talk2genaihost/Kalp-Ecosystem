import { quantity } from "../simulation/v1-a/quantity.js";
import { scienceTick } from "../simulation/v1-d/science/engine.js";
import type { ScienceState, ScienceTickResult } from "../simulation/v1-d/science/types.js";
import type { Quantity } from "../simulation/v1-a/quantity.js";

export interface HeatingWaterExperimentOptions {
  readonly massKg: Quantity;
  readonly initialTemperatureC?: Quantity;
  /** Model-specific water heat capacity in J/(kg·K). */
  readonly specificHeatCapacityJPerKgK?: number;
}

type ScienceTick = (state: ScienceState, input: { dtS: number; netForce: Quantity }) => ScienceTickResult;

export interface HeatingWaterMeasurement {
  readonly id: "temperature" | "heat-energy";
  readonly label: string;
  readonly quantity: Quantity;
}

export class HeatingWaterExperimentAdapter {
  private readonly initialState: ScienceState;
  private state: ScienceState;
  private pendingHeatEnergyJ = 0;
  private lastHeatEnergy: Quantity = quantity(0, "J");
  private readonly specificHeatCapacityJPerKgK: number;
  private readonly tick: ScienceTick;

  constructor(options: HeatingWaterExperimentOptions, tick: ScienceTick = scienceTick) {
    if (options.massKg.unit !== "kg") throw new Error("massKg must be kg");
    if (options.massKg.value <= 0) throw new Error("massKg must be positive");
    const initialTemperature = options.initialTemperatureC ?? quantity(20, "degC");
    if (initialTemperature.unit !== "degC") throw new Error("initialTemperatureC must be degC");

    this.specificHeatCapacityJPerKgK = options.specificHeatCapacityJPerKgK ?? 4186;
    if (!Number.isFinite(this.specificHeatCapacityJPerKgK) || this.specificHeatCapacityJPerKgK <= 0) {
      throw new Error("specificHeatCapacityJPerKgK must be positive");
    }

    this.tick = tick;
    this.initialState = {
      timeS: quantity(0, "s"),
      temperature: initialTemperature,
      materials: [],
      physics: {
        positionM: quantity(0, "m"),
        velocityMps: quantity(0, "m/s"),
        accelerationMps2: quantity(0, "m/s2"),
        massKg: options.massKg,
      },
    };
    this.state = structuredClone(this.initialState);
  }

  applyHeatEnergy(heatEnergy: Quantity): void {
    if (heatEnergy.unit !== "J") throw new Error("heatEnergy must be J");
    if (heatEnergy.value <= 0) throw new Error("heatEnergy must be positive");
    this.pendingHeatEnergyJ += heatEnergy.value;
    this.lastHeatEnergy = structuredClone(heatEnergy);
  }

  step(dt: Quantity): ScienceTickResult {
    if (dt.unit !== "s") throw new Error("dt must be s");

    const heatedState = structuredClone(this.state);
    const deltaTemperatureC = this.pendingHeatEnergyJ / (
      heatedState.physics.massKg.value * this.specificHeatCapacityJPerKgK
    );
    heatedState.temperature = quantity(
      heatedState.temperature.value + deltaTemperatureC,
      "degC",
    );

    const result = this.tick(heatedState, { dtS: dt.value, netForce: quantity(0, "N") });
    this.state = result.state;
    this.pendingHeatEnergyJ = 0;
    return result;
  }

  stateSnapshot(): ScienceState {
    return structuredClone(this.state);
  }

  measure(): HeatingWaterMeasurement[] {
    return [
      { id: "temperature", label: "Temperature", quantity: structuredClone(this.state.temperature) },
      { id: "heat-energy", label: "Last heat input", quantity: structuredClone(this.lastHeatEnergy) },
    ];
  }

  reset(): void {
    this.state = structuredClone(this.initialState);
    this.pendingHeatEnergyJ = 0;
    this.lastHeatEnergy = quantity(0, "J");
  }
}
