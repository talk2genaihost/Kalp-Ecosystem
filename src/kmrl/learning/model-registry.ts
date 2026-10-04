import type { ModelContractRow, StemLabCatalog } from "./excel-catalog-loader.js";

export type ModelExecutionStatus = "EXECUTABLE" | "NOT_EXECUTABLE";

export interface ModelRegistration {
  readonly modelId: string;
  readonly domain: string;
  readonly status: ModelExecutionStatus;
  readonly implementation?: string;
  readonly contract: ModelContractRow;
}

export interface ModelRegistryEntry {
  readonly modelId: string;
  readonly status: ModelExecutionStatus;
  readonly implementation?: string;
  readonly contract: ModelContractRow;
}

const BUILTIN_IMPLEMENTATIONS: Readonly<Record<string, string>> = {
  constant_force: "ConstantForceExperimentAdapter",
  heating_water: "HeatingWaterExperimentAdapter",
  registered_reaction: "MixMaterialsExperimentAdapter",
};

export class KMRLModelRegistry {
  private readonly entries = new Map<string, ModelRegistryEntry>();

  constructor(catalog: StemLabCatalog) {
    for (const contract of catalog.modelContracts) {
      const implementation = BUILTIN_IMPLEMENTATIONS[contract.modelId];
      this.entries.set(contract.modelId, {
        modelId: contract.modelId,
        status: implementation ? "EXECUTABLE" : "NOT_EXECUTABLE",
        ...(implementation ? { implementation } : {}),
        contract,
      });
    }
  }

  get(modelId: string): ModelRegistryEntry | undefined {
    const entry = this.entries.get(modelId);
    return entry ? { ...entry, contract: { ...entry.contract, requiredInputs: [...entry.contract.requiredInputs], stateOutputs: [...entry.contract.stateOutputs] } } : undefined;
  }

  list(): ModelRegistryEntry[] {
    return [...this.entries.values()].map((entry) => ({
      ...entry,
      contract: { ...entry.contract, requiredInputs: [...entry.contract.requiredInputs], stateOutputs: [...entry.contract.stateOutputs] },
    }));
  }

  resolve(modelId: string): ModelRegistration {
    const entry = this.entries.get(modelId);
    if (!entry) throw new Error(`Model is not registered: ${modelId}`);
    return {
      modelId: entry.modelId,
      domain: entry.contract.domain,
      status: entry.status,
      ...(entry.implementation ? { implementation: entry.implementation } : {}),
      contract: entry.contract,
    };
  }
}

export function createKMRLModelRegistry(catalog: StemLabCatalog): KMRLModelRegistry {
  return new KMRLModelRegistry(catalog);
}
