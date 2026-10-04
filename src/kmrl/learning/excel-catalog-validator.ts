import type { StemLabCatalog } from "./excel-catalog-loader.js";

export interface CatalogValidationError {
  code: string;
  sheet: string;
  row?: number;
  field?: string;
  message: string;
}

export interface CatalogValidationResult {
  valid: boolean;
  errors: CatalogValidationError[];
  warnings: CatalogValidationError[];
}

const DOMAINS = new Set(["PHYSICS", "CHEMISTRY", "MATHEMATICS"]);
const LEVELS = new Set(["FOUNDATION", "INTERMEDIATE", "ADVANCED"]);
const STATUSES = new Set(["DEFINED", "ACTIVE", "DRAFT", "DEPRECATED"]);
const STEP_TYPES = new Set(["OBSERVE", "INTERACT", "MEASURE", "REFLECT"]);
const RUNTIME_ACTIONS = new Set(["MODEL/UI defined", "MODEL_DEFINED", "UI_DEFINED"]);

function issue(
  errors: CatalogValidationError[],
  code: string,
  sheet: string,
  message: string,
  row?: number,
  field?: string,
): void {
  errors.push({ code, sheet, message, ...(row === undefined ? {} : { row }), ...(field ? { field } : {}) });
}

function nonEmpty(
  value: string,
  errors: CatalogValidationError[],
  code: string,
  sheet: string,
  row: number,
  field: string,
): void {
  if (!value.trim()) issue(errors, code, sheet, `Required value is empty`, row, field);
}

function uniqueIds(
  rows: Array<{ id: string }>,
  errors: CatalogValidationError[],
  sheet: string,
  code: string,
): void {
  const seen = new Map<string, number>();
  rows.forEach((item, index) => {
    const id = item.id.trim();
    if (!id) return;
    const previous = seen.get(id);
    if (previous !== undefined) {
      issue(errors, code, sheet, `Duplicate ID "${id}" (already used at row ${previous})`, index + 2, "ID");
    } else {
      seen.set(id, index + 2);
    }
  });
}

export function validateStemLabCatalog(catalog: StemLabCatalog): CatalogValidationResult {
  const errors: CatalogValidationError[] = [];
  const warnings: CatalogValidationError[] = [];

  catalog.experiments.forEach((e, i) => {
    const row = i + 2;
    nonEmpty(e.experimentId, errors, "EXPERIMENT_ID_REQUIRED", "EXPERIMENT_CATALOG", row, "Experiment_ID");
    nonEmpty(e.experimentName, errors, "EXPERIMENT_NAME_REQUIRED", "EXPERIMENT_CATALOG", row, "Experiment_Name");
    nonEmpty(e.modelId, errors, "MODEL_ID_REQUIRED", "EXPERIMENT_CATALOG", row, "Model_ID");
    nonEmpty(e.category, errors, "CATEGORY_REQUIRED", "EXPERIMENT_CATALOG", row, "Category");
    if (e.domain && !DOMAINS.has(e.domain.toUpperCase())) {
      issue(errors, "INVALID_DOMAIN", "EXPERIMENT_CATALOG", `Unsupported domain "${e.domain}"`, row, "Domain");
    }
    if (e.level && !LEVELS.has(e.level.toUpperCase())) {
      issue(errors, "INVALID_LEVEL", "EXPERIMENT_CATALOG", `Unsupported level "${e.level}"`, row, "Level");
    }
    if (e.status && !STATUSES.has(e.status.toUpperCase())) {
      issue(errors, "INVALID_STATUS", "EXPERIMENT_CATALOG", `Unsupported status "${e.status}"`, row, "Status");
    }
    if (e.guidedFlow.some((step) => !STEP_TYPES.has(step.toUpperCase()))) {
      issue(errors, "INVALID_GUIDED_FLOW", "EXPERIMENT_CATALOG", `Guided_Flow contains an unknown action`, row, "Guided_Flow");
    }
  });
  uniqueIds(catalog.experiments.map((e) => ({ id: e.experimentId })), errors, "EXPERIMENT_CATALOG", "DUPLICATE_EXPERIMENT_ID");

  const experimentIds = new Set(catalog.experiments.map((e) => e.experimentId));
  const modelIds = new Set(catalog.modelContracts.map((m) => m.modelId));

  catalog.modelContracts.forEach((m, i) => {
    const row = i + 2;
    nonEmpty(m.modelId, errors, "MODEL_ID_REQUIRED", "MODEL_CONTRACTS", row, "Model_ID");
    nonEmpty(m.domain, errors, "MODEL_DOMAIN_REQUIRED", "MODEL_CONTRACTS", row, "Domain");
    nonEmpty(m.ruleOrEquation, errors, "MODEL_RULE_REQUIRED", "MODEL_CONTRACTS", row, "Rule_or_Equation");
    if (m.domain && !DOMAINS.has(m.domain.toUpperCase())) issue(errors, "INVALID_DOMAIN", "MODEL_CONTRACTS", `Unsupported domain "${m.domain}"`, row, "Domain");
    if (!m.requiredInputs.length) issue(warnings, "MODEL_INPUTS_EMPTY", "MODEL_CONTRACTS", "Model has no declared required inputs", row, "Required_Inputs");
    if (!m.stateOutputs.length) issue(warnings, "MODEL_OUTPUTS_EMPTY", "MODEL_CONTRACTS", "Model has no declared state outputs", row, "State_Outputs");
  });
  uniqueIds(catalog.modelContracts.map((m) => ({ id: m.modelId })), errors, "MODEL_CONTRACTS", "DUPLICATE_MODEL_ID");

  catalog.experiments.forEach((e, i) => {
    const row = i + 2;
    if (e.modelId && !modelIds.has(e.modelId)) {
      issue(errors, "MODEL_REFERENCE_MISSING", "EXPERIMENT_CATALOG", `Model_ID "${e.modelId}" is not registered in MODEL_CONTRACTS`, row, "Model_ID");
    } else if (e.modelId) {
      const model = catalog.modelContracts.find((m) => m.modelId === e.modelId);
      if (model && e.domain && model.domain && e.domain.toUpperCase() !== model.domain.toUpperCase()) {
        issue(errors, "MODEL_DOMAIN_MISMATCH", "EXPERIMENT_CATALOG", `Experiment domain "${e.domain}" does not match model domain "${model.domain}"`, row, "Domain");
      }
    }
  });

  const modelInputMappings = new Map<string, Set<string>>();
  const parameterKeys = new Set<string>();
  catalog.parameters.forEach((p, i) => {
    const row = i + 2;
    nonEmpty(p.experimentId, errors, "EXPERIMENT_REFERENCE_REQUIRED", "PARAMETERS", row, "Experiment_ID");
    nonEmpty(p.parameterId, errors, "PARAMETER_ID_REQUIRED", "PARAMETERS", row, "Parameter_ID");
    nonEmpty(p.parameterName, errors, "PARAMETER_NAME_REQUIRED", "PARAMETERS", row, "Parameter_Name");
    if (!p.modelInput.trim()) {
      warnings.push({ code: "MODEL_INPUT_UNMAPPED", sheet: "PARAMETERS", row, field: "Model_Input", message: "Parameter has no semantic model-input mapping yet; this is allowed for catalog seed experiments that are not executable." });
    }
    nonEmpty(p.unit, errors, "UNIT_REQUIRED", "PARAMETERS", row, "Unit");
    if (p.experimentId && !experimentIds.has(p.experimentId)) issue(errors, "EXPERIMENT_REFERENCE_MISSING", "PARAMETERS", `Unknown experiment "${p.experimentId}"`, row, "Experiment_ID");
    const key = `${p.experimentId}::${p.parameterId}`;
    if (p.experimentId && p.modelInput) {
      const mapped = modelInputMappings.get(p.experimentId) ?? new Set<string>();
      if (mapped.has(p.modelInput)) issue(errors, "DUPLICATE_MODEL_INPUT_MAPPING", "PARAMETERS", `Model input "${p.modelInput}" is mapped more than once for experiment "${p.experimentId}"`, row, "Model_Input");
      mapped.add(p.modelInput);
      modelInputMappings.set(p.experimentId, mapped);
    }
    if (parameterKeys.has(key)) issue(errors, "DUPLICATE_PARAMETER_ID", "PARAMETERS", `Duplicate parameter "${p.parameterId}" for experiment "${p.experimentId}"`, row, "Parameter_ID");
    parameterKeys.add(key);
    const numeric = [p.defaultValue, p.min, p.max].every((v) => typeof v === "number");
    if (numeric) {
      const values = [p.defaultValue as number, p.min as number, p.max as number];
      if (!values.every(Number.isFinite)) issue(errors, "PARAMETER_NOT_FINITE", "PARAMETERS", "Numeric parameter values must be finite", row);
      if (values[1] > values[2]) issue(errors, "PARAMETER_RANGE_INVALID", "PARAMETERS", "Min must not exceed Max", row);
      if (values[0] < values[1] || values[0] > values[2]) issue(errors, "PARAMETER_DEFAULT_OUT_OF_RANGE", "PARAMETERS", "Default must be within Min/Max", row);
    } else {
      warnings.push({ code: "PARAMETER_NON_NUMERIC", sheet: "PARAMETERS", row, message: "Parameter bounds are non-numeric; runtime semantics must be supplied by the model contract." });
    }
  });

  catalog.experiments.forEach((e, i) => {
    const model = catalog.modelContracts.find((candidate) => candidate.modelId === e.modelId);
    if (!model) return;
    const mapped = modelInputMappings.get(e.experimentId) ?? new Set<string>();
    if (mapped.size === 0) {
      warnings.push({
        code: "EXPERIMENT_MODEL_INPUTS_UNMAPPED",
        sheet: "PARAMETERS",
        row: i + 2,
        field: "Model_Input",
        message: `Experiment "${e.experimentId}" has no semantic model-input mappings yet; it remains catalog-defined but not runtime-executable.`,
      });
      return;
    }
    const declaredInputs = model.requiredInputs.filter((input) => input.trim() && input.toLowerCase() !== "model inputs");
    const missingInputs = declaredInputs.filter((input) => !mapped.has(input));
    if (missingInputs.length > 0) {
      warnings.push({
        code: "MODEL_INPUT_MAPPING_INCOMPLETE",
        sheet: "PARAMETERS",
        row: i + 2,
        field: "Model_Input",
        message: "Experiment \"" + e.experimentId + "\" is not runtime-executable yet; missing model inputs: " + missingInputs.join(", "),
      });
    }
    if (declaredInputs.length > 0) {
      mapped.forEach((input) => {
        if (!model.requiredInputs.some((declared) => declared.toLowerCase() === input.toLowerCase())) issue(errors, "MODEL_INPUT_MAPPING_UNKNOWN", "PARAMETERS", `Parameter maps to "${input}", which is not declared by model "${model.modelId}"`, i + 2, "Model_Input");
      });
    }
  });

  const stepKeys = new Set<string>();
  const lastStep = new Map<string, number>();
  catalog.procedureSteps.forEach((s, i) => {
    const row = i + 2;
    if (!experimentIds.has(s.experimentId)) issue(errors, "EXPERIMENT_REFERENCE_MISSING", "PROCEDURE_STEPS", `Unknown experiment "${s.experimentId}"`, row, "Experiment_ID");
    if (!Number.isInteger(s.stepNo) || s.stepNo <= 0) issue(errors, "INVALID_STEP_NUMBER", "PROCEDURE_STEPS", "Step_No must be a positive integer", row, "Step_No");
    if (!s.stepType || !STEP_TYPES.has(s.stepType.toUpperCase())) issue(errors, "INVALID_STEP_TYPE", "PROCEDURE_STEPS", `Unknown Step_Type "${s.stepType}"`, row, "Step_Type");
    nonEmpty(s.instruction, errors, "INSTRUCTION_REQUIRED", "PROCEDURE_STEPS", row, "Instruction");
    nonEmpty(s.runtimeAction, errors, "RUNTIME_ACTION_REQUIRED", "PROCEDURE_STEPS", row, "Runtime_Action");
    if (s.runtimeAction && !RUNTIME_ACTIONS.has(s.runtimeAction) && !s.runtimeAction.startsWith("MODEL/")) {
      warnings.push({ code: "UNKNOWN_RUNTIME_ACTION", sheet: "PROCEDURE_STEPS", row, field: "Runtime_Action", message: `Runtime action "${s.runtimeAction}" is not a registered generic action.` });
    }
    const key = `${s.experimentId}::${s.stepNo}`;
    if (stepKeys.has(key)) issue(errors, "DUPLICATE_STEP_NUMBER", "PROCEDURE_STEPS", `Duplicate step ${s.stepNo} for experiment "${s.experimentId}"`, row, "Step_No");
    const previous = lastStep.get(s.experimentId);
    if (previous !== undefined && s.stepNo <= previous) issue(errors, "STEP_ORDER_INVALID", "PROCEDURE_STEPS", "Step numbers must increase within each experiment", row, "Step_No");
    stepKeys.add(key);
    lastStep.set(s.experimentId, s.stepNo);
  });

  const validateExperimentRefRows = <T extends { experimentId: string }>(rows: T[], sheet: string) => {
    rows.forEach((item, i) => {
      if (!experimentIds.has(item.experimentId)) issue(errors, "EXPERIMENT_REFERENCE_MISSING", sheet, `Unknown experiment "${item.experimentId}"`, i + 2, "Experiment_ID");
    });
  };
  uniqueIds(catalog.reactionDefinitions.map((r) => ({ id: r.reactionId })), errors, "REACTION_DEFINITIONS", "DUPLICATE_REACTION_ID");
  catalog.reactionDefinitions.forEach((reaction, i) => {
    const row = i + 2;
    nonEmpty(reaction.reactionId, errors, "REACTION_ID_REQUIRED", "REACTION_DEFINITIONS", row, "Reaction_ID");
    nonEmpty(reaction.experimentId, errors, "REACTION_EXPERIMENT_REQUIRED", "REACTION_DEFINITIONS", row, "Experiment_ID");
    nonEmpty(reaction.reactionName, errors, "REACTION_NAME_REQUIRED", "REACTION_DEFINITIONS", row, "Reaction_Name");
    nonEmpty(reaction.status, errors, "REACTION_STATUS_REQUIRED", "REACTION_DEFINITIONS", row, "Status");
    if (reaction.experimentId && !experimentIds.has(reaction.experimentId)) {
      issue(errors, "EXPERIMENT_REFERENCE_MISSING", "REACTION_DEFINITIONS", `Unknown experiment "${reaction.experimentId}"`, row, "Experiment_ID");
    }
    if (!reaction.reactants.length) issue(errors, "REACTION_REACTANTS_REQUIRED", "REACTION_DEFINITIONS", "Reaction must declare at least one reactant", row, "Reactants");
    if (!reaction.products.length) issue(errors, "REACTION_PRODUCTS_REQUIRED", "REACTION_DEFINITIONS", "Reaction must declare at least one product", row, "Products");
    const materialIds = new Set(catalog.materials.map((material) => material.materialId));
    [...reaction.reactants, ...reaction.products].forEach((participant) => {
      const materialId = participant.split(":")[0]?.trim();
      if (materialId && !materialIds.has(materialId)) issue(errors, "REACTION_MATERIAL_REFERENCE_MISSING", "REACTION_DEFINITIONS", `Reaction references unknown material "${materialId}"`, row, "Reactants/Products");
    });
    if (!["PROPOSED", "CANONICAL"].includes(reaction.status.toUpperCase())) {
      issue(errors, "INVALID_REACTION_STATUS", "REACTION_DEFINITIONS", `Unsupported reaction status "${reaction.status}"`, row, "Status");
    }
  });

  validateExperimentRefRows(catalog.measurements, "MEASUREMENTS");
  validateExperimentRefRows(catalog.safety, "SAFETY");
  validateExperimentRefRows(catalog.outcomes, "OUTCOMES");
  validateExperimentRefRows(catalog.mediaAssets, "MEDIA_ASSETS");

  uniqueIds(catalog.measurements.map((m) => ({ id: m.measurementId })), errors, "MEASUREMENTS", "DUPLICATE_MEASUREMENT_ID");
  catalog.measurements.forEach((m, i) => {
    nonEmpty(m.measurementId, errors, "MEASUREMENT_ID_REQUIRED", "MEASUREMENTS", i + 2, "Measurement_ID");
    nonEmpty(m.measurementName, errors, "MEASUREMENT_NAME_REQUIRED", "MEASUREMENTS", i + 2, "Measurement_Name");
    nonEmpty(m.unit, errors, "UNIT_REQUIRED", "MEASUREMENTS", i + 2, "Unit");
    nonEmpty(m.source, errors, "MEASUREMENT_SOURCE_REQUIRED", "MEASUREMENTS", i + 2, "Source");
  });

  uniqueIds(catalog.safety.map((s) => ({ id: s.safetyId })), errors, "SAFETY", "DUPLICATE_SAFETY_ID");
  catalog.safety.forEach((s, i) => {
    nonEmpty(s.safetyId, errors, "SAFETY_ID_REQUIRED", "SAFETY", i + 2, "Safety_ID");
    nonEmpty(s.level, errors, "SAFETY_LEVEL_REQUIRED", "SAFETY", i + 2, "Level");
    nonEmpty(s.hazards, errors, "SAFETY_HAZARDS_REQUIRED", "SAFETY", i + 2, "Hazards");
    nonEmpty(s.restrictions, errors, "SAFETY_RESTRICTIONS_REQUIRED", "SAFETY", i + 2, "Restrictions");
  });

  uniqueIds(catalog.materials.map((m) => ({ id: m.materialId })), errors, "MATERIALS", "DUPLICATE_MATERIAL_ID");
  catalog.materials.forEach((m, i) => {
    nonEmpty(m.materialId, errors, "MATERIAL_ID_REQUIRED", "MATERIALS", i + 2, "Material_ID");
    nonEmpty(m.materialName, errors, "MATERIAL_NAME_REQUIRED", "MATERIALS", i + 2, "Material_Name");
    nonEmpty(m.domain, errors, "MATERIAL_DOMAIN_REQUIRED", "MATERIALS", i + 2, "Domain");
    nonEmpty(m.unit, errors, "MATERIAL_UNIT_REQUIRED", "MATERIALS", i + 2, "Unit");
    nonEmpty(m.state, errors, "MATERIAL_STATE_REQUIRED", "MATERIALS", i + 2, "State");
  });

  uniqueIds(catalog.outcomes.map((o) => ({ id: o.outcomeId })), errors, "OUTCOMES", "DUPLICATE_OUTCOME_ID");
  catalog.outcomes.forEach((o, i) => {
    nonEmpty(o.outcomeId, errors, "OUTCOME_ID_REQUIRED", "OUTCOMES", i + 2, "Outcome_ID");
    nonEmpty(o.type, errors, "OUTCOME_TYPE_REQUIRED", "OUTCOMES", i + 2, "Type");
    nonEmpty(o.condition, errors, "OUTCOME_CONDITION_REQUIRED", "OUTCOMES", i + 2, "Condition");
    nonEmpty(o.expectedResult, errors, "OUTCOME_RESULT_REQUIRED", "OUTCOMES", i + 2, "Expected_Result");
  });

  uniqueIds(catalog.curriculumMap.map((c) => ({ id: c.curriculumId })), errors, "CURRICULUM_MAP", "DUPLICATE_CURRICULUM_ID");
  catalog.curriculumMap.forEach((c, i) => {
    nonEmpty(c.curriculumId, errors, "CURRICULUM_ID_REQUIRED", "CURRICULUM_MAP", i + 2, "Curriculum_ID");
    nonEmpty(c.domain, errors, "CURRICULUM_DOMAIN_REQUIRED", "CURRICULUM_MAP", i + 2, "Domain");
    if (c.domain && !DOMAINS.has(c.domain.toUpperCase())) issue(errors, "INVALID_DOMAIN", "CURRICULUM_MAP", `Unsupported domain "${c.domain}"`, i + 2, "Domain");
    if (!Number.isFinite(c.seedCount) || c.seedCount < 0) issue(errors, "INVALID_SEED_COUNT", "CURRICULUM_MAP", "Seed_Count must be finite and non-negative", i + 2, "Seed_Count");
  });

  uniqueIds(catalog.mediaAssets.map((m) => ({ id: m.mediaId })), errors, "MEDIA_ASSETS", "DUPLICATE_MEDIA_ID");
  catalog.mediaAssets.forEach((m, i) => {
    nonEmpty(m.mediaId, errors, "MEDIA_ID_REQUIRED", "MEDIA_ASSETS", i + 2, "Media_ID");
    nonEmpty(m.assetType, errors, "ASSET_TYPE_REQUIRED", "MEDIA_ASSETS", i + 2, "Asset_Type");
    nonEmpty(m.assetKey, errors, "ASSET_KEY_REQUIRED", "MEDIA_ASSETS", i + 2, "Asset_Key");
  });

  return { valid: errors.length === 0, errors, warnings };
}
