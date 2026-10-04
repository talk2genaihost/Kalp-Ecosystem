/**
 * Heating Water contract finalization candidate.
 *
 * This is deliberately not wired into KMRLModelRegistry. The canonical
 * workbook MODEL_CONTRACTS row is still a placeholder, so this record is
 * implementation-aligned staging metadata until explicit contract approval.
 */
export interface ChemistryContractCandidate {
  readonly modelId: string;
  readonly experimentId: string;
  readonly domain: "CHEMISTRY";
  readonly status: "FINALIZATION_CANDIDATE";
  readonly authority: "IMPLEMENTATION_ALIGNED";
  readonly requiredInputs: readonly string[];
  readonly stateOutputs: readonly string[];
  readonly ruleOrEquation: string;
  readonly constants: Readonly<Record<string, number>>;
}

export const HEATING_WATER_CONTRACT_CANDIDATE: ChemistryContractCandidate = {
  modelId: "heating_water",
  experimentId: "CHE-MIX-001",
  domain: "CHEMISTRY",
  status: "FINALIZATION_CANDIDATE",
  authority: "IMPLEMENTATION_ALIGNED",
  requiredInputs: ["mass", "energy", "dt"],
  stateOutputs: ["temperature", "time"],
  ruleOrEquation: "Q=m*c*dT; dT=Q/(m*c); T_next=T_current+dT",
  constants: {
    specificHeatCapacityJPerKgK: 4186,
    initialTemperatureC: 20,
  },
};

export function getHeatingWaterContractCandidate(): ChemistryContractCandidate {
  return {
    ...HEATING_WATER_CONTRACT_CANDIDATE,
    requiredInputs: [...HEATING_WATER_CONTRACT_CANDIDATE.requiredInputs],
    stateOutputs: [...HEATING_WATER_CONTRACT_CANDIDATE.stateOutputs],
    constants: { ...HEATING_WATER_CONTRACT_CANDIDATE.constants },
  };
}
