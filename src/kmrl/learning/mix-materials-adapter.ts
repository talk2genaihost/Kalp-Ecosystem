import { quantity } from "../simulation/v1-a/quantity.js";
import { scienceTick } from "../simulation/v1-d/science/engine.js";
import type { MaterialAmount, ReactionDefinition } from "../simulation/v1-d/chemistry/types.js";
import type { ScienceState, ScienceTickResult } from "../simulation/v1-d/science/types.js";
import type { Quantity } from "../simulation/v1-a/quantity.js";

type ScienceTick = (state: ScienceState, input: { dtS: number; netForce: Quantity; reaction?: ReactionDefinition }) => ScienceTickResult;

export interface MixMaterialsExperimentOptions {
  readonly initialMaterials: readonly MaterialAmount[];
  readonly reaction: ReactionDefinition;
  readonly initialTemperatureC?: Quantity;
  /** Inert simulation-container mass required by the shared ScienceState physics contract. */
  readonly containerMassKg?: Quantity;
}

export interface MixMaterialsMeasurement {
  readonly id: "material" | "temperature";
  readonly label: string;
  readonly materialId?: string;
  readonly quantity: Quantity;
}

export class MixMaterialsExperimentAdapter {
  private readonly initialState: ScienceState;
  private state: ScienceState;
  private readonly reaction: ReactionDefinition;
  private readonly tick: ScienceTick;
  private lastChemistryStatus: ScienceTickResult["chemistry"]["status"] = "NOT_REQUESTED";

  constructor(options: MixMaterialsExperimentOptions, tick: ScienceTick = scienceTick) {
    if (options.initialMaterials.length === 0) throw new Error("initialMaterials must not be empty");
    for (const material of options.initialMaterials) {
      if (!material.materialId.trim()) throw new Error("materialId must not be empty");
      if (material.amount.unit !== "mol") throw new Error("material amounts must be mol");
      if (material.amount.value < 0) throw new Error("material amount cannot be negative");
    }
    if (options.reaction.reactants.length === 0) throw new Error("reaction must have reactants");
    if (options.reaction.products.length === 0) throw new Error("reaction must have products");

    const initialTemperature = options.initialTemperatureC ?? quantity(20, "degC");
    if (initialTemperature.unit !== "degC") throw new Error("initialTemperatureC must be degC");

    const containerMassKg = options.containerMassKg ?? quantity(1, "kg");
    if (containerMassKg.unit !== "kg") throw new Error("containerMassKg must be kg");
    if (containerMassKg.value <= 0) throw new Error("containerMassKg must be positive");

    this.reaction = structuredClone(options.reaction);
    this.tick = tick;
    this.initialState = {
      timeS: quantity(0, "s"),
      temperature: initialTemperature,
      materials: options.initialMaterials.map((material) => structuredClone(material)),
      physics: {
        positionM: quantity(0, "m"),
        velocityMps: quantity(0, "m/s"),
        accelerationMps2: quantity(0, "m/s2"),
        massKg: containerMassKg,
      },
    };
    this.state = structuredClone(this.initialState);
  }

  step(dt: Quantity): ScienceTickResult {
    if (dt.unit !== "s") throw new Error("dt must be s");

    const result = this.tick(this.state, {
      dtS: dt.value,
      netForce: quantity(0, "N"),
      reaction: structuredClone(this.reaction),
    });
    this.state = result.state;
    this.lastChemistryStatus = result.chemistry.status;
    return result;
  }

  stateSnapshot(): ScienceState {
    return structuredClone(this.state);
  }

  materialSnapshot(): MaterialAmount[] {
    return this.state.materials.map((material) => structuredClone(material));
  }

  measure(): MixMaterialsMeasurement[] {
    return [
      ...this.state.materials.map((material) => ({
        id: "material" as const,
        label: `Material: ${material.materialId}`,
        materialId: material.materialId,
        quantity: structuredClone(material.amount),
      })),
      {
        id: "temperature" as const,
        label: "Temperature",
        quantity: structuredClone(this.state.temperature),
      },
    ];
  }

  chemistryStatus(): ScienceTickResult["chemistry"]["status"] {
    return this.lastChemistryStatus;
  }

  reset(): void {
    this.state = structuredClone(this.initialState);
    this.lastChemistryStatus = "NOT_REQUESTED";
  }
}
