import { quantity, type Quantity } from "../simulation/v1-a/quantity.js";
import { ConstantForceExperimentAdapter } from "./constant-force-adapter.js";
import { HeatingWaterExperimentAdapter } from "./heating-water-adapter.js";
import { MixMaterialsExperimentAdapter } from "./mix-materials-adapter.js";
import type { ModelRegistryEntry, KMRLModelRegistry } from "./model-registry.js";
import type { ExperimentCatalogRow, StemLabCatalog } from "./excel-catalog-loader.js";
import type { CatalogValidationResult } from "./excel-catalog-validator.js";
import type { MaterialAmount, ReactionDefinition } from "../simulation/v1-d/chemistry/types.js";

export type DynamicExperimentStatus = "CREATED" | "RUNNING" | "PAUSED" | "COMPLETED";

export type DynamicExperimentAction =
  | { type: "START" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "SET_PARAMETER"; parameterId: string; value: number | string }
  | { type: "STEP" }
  | { type: "MEASURE" }
  | { type: "RESET" }
  | { type: "STOP" };

export interface DynamicExperimentParameter {
  readonly parameterId: string;
  readonly parameterName: string;
  readonly modelInput: string;
  readonly value: number | string;
  readonly min: number | string;
  readonly max: number | string;
  readonly unit: string;
  readonly learnerEditable: boolean;
}

export interface DynamicExperimentDefinition {
  readonly experiment: ExperimentCatalogRow;
  readonly model: ModelRegistryEntry;
  readonly parameters: DynamicExperimentParameter[];
  readonly procedureSteps: StemLabCatalog["procedureSteps"];
  readonly measurements: StemLabCatalog["measurements"];
  readonly safety: StemLabCatalog["safety"];
  readonly materials: StemLabCatalog["materials"];
  readonly outcomes: StemLabCatalog["outcomes"];
}

export interface DynamicMeasurement {
  readonly id: string;
  readonly label: string;
  readonly quantity: Quantity;
}

export interface DynamicExperimentSnapshot {
  readonly experimentId: string;
  readonly modelId: string;
  readonly status: DynamicExperimentStatus;
  readonly tick: number;
  readonly parameters: DynamicExperimentParameter[];
  readonly measurements: DynamicMeasurement[];
}

export interface DynamicExperimentModelContext {
  readonly reaction?: ReactionDefinition;
  readonly initialMaterials?: readonly MaterialAmount[];
}

interface DynamicModelSession {
  setInput(name: string, value: number | string): void;
  step(dt: Quantity): void;
  measure(): DynamicMeasurement[];
  reset(): void;
}

function mappedParameter(
  parameters: readonly DynamicExperimentParameter[],
  modelInput: string,
): DynamicExperimentParameter {
  const parameter = parameters.find((item) => item.modelInput === modelInput);
  if (!parameter) throw new Error(`Required model input "${modelInput}" is not mapped`);
  return parameter;
}

function numericMappedParameter(
  parameters: readonly DynamicExperimentParameter[],
  modelInput: string,
): number {
  const parameter = mappedParameter(parameters, modelInput);
  const value = typeof parameter.value === "number" ? parameter.value : Number(parameter.value);
  if (!Number.isFinite(value)) throw new Error(`Model input "${modelInput}" must be numeric`);
  return value;
}

function createModelSession(
  definition: DynamicExperimentDefinition,
  context: DynamicExperimentModelContext,
): DynamicModelSession {
  const modelId = definition.model.modelId;

  if (modelId === "constant_force") {
    const mass = numericMappedParameter(definition.parameters, "mass");
    const adapter = new ConstantForceExperimentAdapter({ massKg: quantity(mass, "kg") });
    return {
      setInput(name, value) {
        if (name === "force") adapter.applyConstantForce(quantity(Number(value), "N"));
      },
      step(dt) {
        const force = mappedParameter(definition.parameters, "force");
        adapter.applyConstantForce(quantity(Number(force.value), "N"));
        adapter.step(dt);
      },
      measure() {
        return adapter.measure().map((item) => ({
          id: item.id,
          label: item.label,
          quantity: item.quantity,
        }));
      },
      reset() { adapter.reset(); },
    };
  }

  if (modelId === "heating_water") {
    const mass = numericParameter(definition.parameters, "mass", 0);
    const adapter = new HeatingWaterExperimentAdapter({ massKg: quantity(mass, "kg") });
    return {
      setInput(name, value) {
        if (name === "energy" || name === "heat" || name === "heat_energy") {
          adapter.applyHeatEnergy(quantity(Number(value), "J"));
        }
      },
      step(dt) {
        const heat = mappedParameter(definition.parameters, "energy");
        adapter.applyHeatEnergy(quantity(Number(heat.value), "J"));
        adapter.step(dt);
      },
      measure() {
        return adapter.measure().map((item) => ({
          id: item.id,
          label: item.label,
          quantity: item.quantity,
        }));
      },
      reset() { adapter.reset(); },
    };
  }

  if (modelId === "registered_reaction") {
    if (!context.reaction || !context.initialMaterials) {
      throw new Error("registered_reaction requires reaction and initialMaterials model context");
    }
    const adapter = new MixMaterialsExperimentAdapter({
      initialMaterials: context.initialMaterials,
      reaction: context.reaction,
    });
    return {
      setInput() {},
      step(dt) { adapter.step(dt); },
      measure() {
        return adapter.measure().map((item) => ({
          id: item.id + (item.materialId ? `:${item.materialId}` : ""),
          label: item.label,
          quantity: item.quantity,
        }));
      },
      reset() { adapter.reset(); },
    };
  }

  throw new Error(`No dynamic model executor is registered for model "${modelId}"`);
}

export function buildDynamicExperimentDefinition(
  catalog: StemLabCatalog,
  registry: KMRLModelRegistry,
  validation: CatalogValidationResult,
  experimentId: string,
): DynamicExperimentDefinition {
  if (!validation.valid) {
    throw new Error(`Cannot launch invalid catalog: ${validation.errors.map((error) => error.message).join("; ")}`);
  }

  const experiment = catalog.experiments.find((item) => item.experimentId === experimentId);
  if (!experiment) throw new Error(`Experiment is not defined in catalog: ${experimentId}`);

  const model = registry.resolve(experiment.modelId);
  if (model.status !== "EXECUTABLE") {
    throw new Error(`Experiment model "${model.modelId}" is not executable`);
  }

  const parameters = catalog.parameters
    .filter((item) => item.experimentId === experimentId)
    .map((item) => ({
      parameterId: item.parameterId,
      parameterName: item.parameterName,
      modelInput: item.modelInput,
      value: item.defaultValue,
      min: item.min,
      max: item.max,
      unit: item.unit,
      learnerEditable: item.learnerEditable,
    }));

  return {
    experiment,
    model,
    parameters,
    procedureSteps: catalog.procedureSteps.filter((item) => item.experimentId === experimentId),
    measurements: catalog.measurements.filter((item) => item.experimentId === experimentId),
    safety: catalog.safety.filter((item) => item.experimentId === experimentId),
    materials: catalog.materials,
    outcomes: catalog.outcomes.filter((item) => item.experimentId === experimentId),
  };
}

export class DynamicExperimentRuntime {
  private readonly definition: DynamicExperimentDefinition;
  private readonly model: DynamicModelSession;
  private parameters: DynamicExperimentParameter[];
  private status: DynamicExperimentStatus = "CREATED";
  private tick = 0;
  private measurements: DynamicMeasurement[] = [];

  constructor(definition: DynamicExperimentDefinition, context: DynamicExperimentModelContext = {}) {
    this.definition = definition;
    this.parameters = definition.parameters.map((parameter) => ({ ...parameter }));
    this.model = createModelSession(definition, context);
  }

  getDefinition(): DynamicExperimentDefinition {
    return {
      ...this.definition,
      parameters: this.parameters.map((parameter) => ({ ...parameter })),
      procedureSteps: this.definition.procedureSteps.map((step) => ({ ...step })),
      measurements: this.definition.measurements.map((measurement) => ({ ...measurement })),
      safety: this.definition.safety.map((item) => ({ ...item })),
      materials: this.definition.materials.map((item) => ({ ...item, keyProperties: [...item.keyProperties] })),
      outcomes: this.definition.outcomes.map((item) => ({ ...item })),
    };
  }

  getSnapshot(): DynamicExperimentSnapshot {
    return {
      experimentId: this.definition.experiment.experimentId,
      modelId: this.definition.model.modelId,
      status: this.status,
      tick: this.tick,
      parameters: this.parameters.map((parameter) => ({ ...parameter })),
      measurements: this.measurements.map((measurement) => ({
        ...measurement,
        quantity: { ...measurement.quantity },
      })),
    };
  }

  dispatch(action: DynamicExperimentAction): DynamicExperimentSnapshot {
    switch (action.type) {
      case "START":
        this.require(this.status === "CREATED", `Cannot START from ${this.status}`);
        this.status = "RUNNING";
        break;
      case "PAUSE":
        this.require(this.status === "RUNNING", "PAUSE requires RUNNING state");
        this.status = "PAUSED";
        break;
      case "RESUME":
        this.require(this.status === "PAUSED", "RESUME requires PAUSED state");
        this.status = "RUNNING";
        break;
      case "SET_PARAMETER": {
        const index = this.parameters.findIndex((parameter) => parameter.parameterId === action.parameterId);
        this.require(index >= 0, `Parameter not found: ${action.parameterId}`);
        const parameter = this.parameters[index];
        this.require(parameter.learnerEditable, `Parameter is not learner editable: ${action.parameterId}`);
        const numeric = typeof action.value === "number" ? action.value : Number(action.value);
        if (typeof parameter.min === "number" && typeof parameter.max === "number" && Number.isFinite(numeric)) {
          this.require(numeric >= parameter.min && numeric <= parameter.max, `Parameter ${action.parameterId} is outside its declared range`);
        }
        this.parameters[index] = { ...parameter, value: action.value };
        break;
      }
      case "STEP": {
        this.require(this.status === "RUNNING", "STEP requires RUNNING state");
        const timeStep = mappedParameter(this.parameters, "dt");
        const dt = Number(timeStep.value);
        this.require(Number.isFinite(dt) && dt > 0, "time_step must be positive");
        this.model.step(quantity(dt, "s"));
        this.tick += 1;
        break;
      }
      case "MEASURE":
        this.require(this.status === "RUNNING" || this.status === "PAUSED", "MEASURE requires RUNNING or PAUSED state");
        this.measurements = this.model.measure();
        break;
      case "RESET":
        this.model.reset();
        this.parameters = this.definition.parameters.map((parameter) => ({ ...parameter }));
        this.status = "CREATED";
        this.tick = 0;
        this.measurements = [];
        break;
      case "STOP":
        this.require(this.status === "RUNNING" || this.status === "PAUSED", "STOP requires RUNNING or PAUSED state");
        this.status = "COMPLETED";
        break;
    }
    return this.getSnapshot();
  }

  private require(condition: boolean, message: string): asserts condition {
    if (!condition) throw new Error(message);
  }
}

export function createDynamicExperimentRuntime(
  catalog: StemLabCatalog,
  registry: KMRLModelRegistry,
  validation: CatalogValidationResult,
  experimentId: string,
  context: DynamicExperimentModelContext = {},
): DynamicExperimentRuntime {
  return new DynamicExperimentRuntime(
    buildDynamicExperimentDefinition(catalog, registry, validation, experimentId),
    context,
  );
}