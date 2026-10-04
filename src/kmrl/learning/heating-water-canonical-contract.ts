/**
 * Canonical contract projection for CHE-MIX-001 / heating_water.
 *
 * The corresponding Excel v1.1 artifact is the source contract. This module
 * provides a typed runtime-facing projection; it does not replace the Excel
 * source of truth.
 */
export interface HeatingWaterCanonicalContract {
  readonly modelId: "heating_water";
  readonly experimentId: "CHE-MIX-001";
  readonly domain: "CHEMISTRY";
  readonly authority: "CANONICAL";
  readonly requiredInputs: readonly ["mass", "energy", "dt"];
  readonly stateOutputs: readonly ["temperature", "time"];
  readonly ruleOrEquation: string;
  readonly specificHeatCapacityJPerKgK: 4186;
  readonly initialTemperatureC: 20;
}

export const HEATING_WATER_CANONICAL_CONTRACT: HeatingWaterCanonicalContract = {
  modelId: "heating_water",
  experimentId: "CHE-MIX-001",
  domain: "CHEMISTRY",
  authority: "CANONICAL",
  requiredInputs: ["mass", "energy", "dt"],
  stateOutputs: ["temperature", "time"],
  ruleOrEquation: "Q=m*c*dT; dT=Q/(m*c); T_next=T_current+dT; c=4186 J/(kg·K); T0=20 degC",
  specificHeatCapacityJPerKgK: 4186,
  initialTemperatureC: 20,
};
