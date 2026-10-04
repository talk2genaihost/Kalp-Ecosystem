/**
 * KMRL Chemistry + Mathematics contract staging.
 *
 * IMPORTANT:
 * These records are PROPOSED/INFERRED staging metadata. The current STEM
 * workbook MODEL_CONTRACTS sheet does not provide executable equations for
 * these models. This module MUST NOT be wired into KMRLModelRegistry as
 * EXECUTABLE until the source contract is explicitly approved/canonicalized.
 */

export type ProposedContractStatus = "PROPOSED";

export interface ProposedModelContract {
  readonly modelId: string;
  readonly domain: "CHEMISTRY" | "MATHEMATICS";
  readonly experimentName: string;
  readonly status: ProposedContractStatus;
  readonly authority: "INFERRED";
  readonly proposedInputs: readonly string[];
  readonly proposedOutputs: readonly string[];
  readonly proposedRuleOrEquation: string;
  readonly sourceBasis: "EXPERIMENT_CATALOG + MODEL_CONTRACTS_PLACEHOLDER";
}

const p = (
  modelId: string,
  domain: "CHEMISTRY" | "MATHEMATICS",
  experimentName: string,
  proposedInputs: readonly string[],
  proposedOutputs: readonly string[],
  proposedRuleOrEquation: string,
): ProposedModelContract => ({
  modelId,
  domain,
  experimentName,
  status: "PROPOSED",
  authority: "INFERRED",
  proposedInputs,
  proposedOutputs,
  proposedRuleOrEquation,
  sourceBasis: "EXPERIMENT_CATALOG + MODEL_CONTRACTS_PLACEHOLDER",
});

export const PROPOSED_CHEMISTRY_MATH_CONTRACTS: readonly ProposedModelContract[] = [
  p("acid_base_neutralization","CHEMISTRY","Acid-Base Neutralization",
    ["acid_amount","base_amount"],["reaction_state","neutralization_status"],
    "Controlled neutralization model"),
  p("ph_dilution","CHEMISTRY","pH and Dilution",
    ["initial_concentration","initial_volume","added_volume"],["final_concentration","pH"],
    "Dilution calculation with controlled pH model"),
  p("stoichiometry","CHEMISTRY","Stoichiometry",
    ["reactant_amount","molar_ratio"],["product_amount","limiting_ratio"],
    "Stoichiometric ratio model"),
  p("limiting_reagent","CHEMISTRY","Limiting Reagent",
    ["reactant_a_amount","reactant_b_amount","ratio"],["limiting_reagent","product_amount"],
    "Limiting-reagent calculation"),
  p("electrolysis","CHEMISTRY","Simple Electrolysis",
    ["current","time","charge_per_mole"],["product_amount"],
    "Controlled electrolysis model"),
  p("galvanic_cell","CHEMISTRY","Galvanic Cell",
    ["electrode_potential_1","electrode_potential_2"],["cell_voltage"],
    "Potential-difference model"),
  p("reaction_heat","CHEMISTRY","Exothermic Reaction",
    ["mass","specific_heat","delta_temperature"],["heat_energy"],
    "Calorimetry-style heat model"),
  p("steelmaking","CHEMISTRY","Steel Making",
    ["iron_amount","carbon_amount"],["composition"],
    "Controlled alloy/composition model"),
  p("alloy_composition","CHEMISTRY","Alloy Composition",
    ["component_a_amount","component_b_amount"],["composition_percent"],
    "Mass-fraction composition model"),
  p("reaction_rate_temperature","CHEMISTRY","Reaction Rate vs Temperature",
    ["rate_constant","temperature"],["reaction_rate"],
    "Temperature-dependent rate model"),
  p("reaction_rate_concentration","CHEMISTRY","Concentration and Reaction Rate",
    ["rate_constant","concentration"],["reaction_rate"],
    "Concentration-dependent rate model"),
  p("esterification","CHEMISTRY","Esterification Model",
    ["reactant_a_amount","reactant_b_amount","conversion"],["product_amount"],
    "Controlled esterification model"),

  p("linear_equation","MATHEMATICS","Linear Equation Lab",
    ["a","b"],["x"],"ax+b=0"),
  p("quadratic_equation","MATHEMATICS","Quadratic Equation Lab",
    ["a","b","c"],["roots","discriminant"],"ax^2+bx+c=0"),
  p("linear_system","MATHEMATICS","Systems of Equations",
    ["a1","b1","c1","a2","b2","c2"],["x","y","determinant"],
    "Two-variable linear system"),
  p("triangle_geometry","MATHEMATICS","Triangle Geometry",
    ["side_a","side_b","side_c"],["area","perimeter","angles"],
    "Triangle geometry model"),
  p("circle_geometry","MATHEMATICS","Circle Geometry",
    ["radius"],["area","circumference"],"Circle geometry"),
  p("mensuration","MATHEMATICS","Area and Volume",
    ["dimensions","shape"],["area","volume"],"Controlled mensuration model"),
  p("trigonometry","MATHEMATICS","Sine and Cosine Lab",
    ["angle"],["sin","cos"],"Trigonometric functions"),
  p("right_triangle","MATHEMATICS","Right Triangle Explorer",
    ["side_a","side_b"],["hypotenuse","angles"],"Right-triangle relations"),
  p("derivative","MATHEMATICS","Derivative Explorer",
    ["function","x","delta_x"],["derivative"],"Numerical derivative"),
  p("integral","MATHEMATICS","Integral / Area Explorer",
    ["function","lower_bound","upper_bound"],["area"],"Numerical integration"),
  p("descriptive_statistics","MATHEMATICS","Mean Median Mode Lab",
    ["dataset"],["mean","median","mode"],"Descriptive statistics"),
  p("standard_deviation","MATHEMATICS","Standard Deviation Lab",
    ["dataset"],["standard_deviation"],"Standard-deviation calculation"),
  p("probability","MATHEMATICS","Probability Simulator",
    ["favorable","outcomes","trials"],["probability"],"Controlled probability model"),
  p("vector_addition","MATHEMATICS","Vector Addition",
    ["vector_a","vector_b"],["resultant","magnitude","direction"],"Vector addition"),
  p("sequence_series","MATHEMATICS","Sequences and Series",
    ["first_term","common_difference_or_ratio","n"],["nth_term","sum"],
    "Sequence/series model"),
];

export function getProposedModelContract(modelId: string): ProposedModelContract | undefined {
  return PROPOSED_CHEMISTRY_MATH_CONTRACTS.find((contract) => contract.modelId === modelId);
}

export function listProposedModelContracts(): readonly ProposedModelContract[] {
  return PROPOSED_CHEMISTRY_MATH_CONTRACTS.map((contract) => ({
    ...contract,
    proposedInputs: [...contract.proposedInputs],
    proposedOutputs: [...contract.proposedOutputs],
  }));
}
