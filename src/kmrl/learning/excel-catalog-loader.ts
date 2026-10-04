import { read, utils, type WorkBook, type WorkSheet } from "xlsx";

export interface ExperimentCatalogRow {
  experimentId: string;
  domain: string;
  experimentName: string;
  category: string;
  modelType: string;
  modelId: string;
  guidedFlow: string[];
  level: string;
  status: string;
  inputRefs: string;
  measurementRefs: string;
  safetyRef: string;
}

export interface ModelContractRow {
  modelId: string;
  domain: string;
  requiredInputs: string[];
  stateOutputs: string[];
  ruleOrEquation: string;
}

export interface ParameterRow {
  experimentId: string;
  parameterId: string;
  parameterName: string;
  modelInput: string;
  defaultValue: string | number;
  min: string | number;
  max: string | number;
  unit: string;
  learnerEditable: boolean;
}

export interface ProcedureStepRow {
  experimentId: string;
  stepNo: number;
  stepType: string;
  instruction: string;
  runtimeAction: string;
}

export interface MeasurementRow {
  measurementId: string;
  experimentId: string;
  measurementName: string;
  unit: string;
  source: string;
}

export interface SafetyRow {
  safetyId: string;
  experimentId: string;
  level: string;
  hazards: string;
  restrictions: string;
}

export interface MaterialRow {
  materialId: string;
  materialName: string;
  domain: string;
  unit: string;
  state: string;
  keyProperties: string[];
}

export interface OutcomeRow {
  experimentId: string;
  outcomeId: string;
  type: string;
  condition: string;
  expectedResult: string;
}

export interface CurriculumMapRow {
  curriculumId: string;
  domain: string;
  level: string;
  topics: string[];
  seedCount: number;
}

export interface MediaAssetRow {
  mediaId: string;
  experimentId: string;
  assetType: string;
  assetKey: string;
  required: boolean;
}

export interface StemLabCatalog {
  experiments: ExperimentCatalogRow[];
  modelContracts: ModelContractRow[];
  parameters: ParameterRow[];
  procedureSteps: ProcedureStepRow[];
  measurements: MeasurementRow[];
  safety: SafetyRow[];
  materials: MaterialRow[];
  outcomes: OutcomeRow[];
  curriculumMap: CurriculumMapRow[];
  mediaAssets: MediaAssetRow[];
}

const LEGACY_MODEL_INPUTS: Readonly<Record<string, readonly string[]>> = {
  constant_force: ["mass", "force", "dt"],
  heating_water: ["mass", "energy", "dt"],
  free_fall: ["gravity", "dt"],
};

const SHEETS = {
  experiments: "EXPERIMENT_CATALOG",
  modelContracts: "MODEL_CONTRACTS",
  parameters: "PARAMETERS",
  procedureSteps: "PROCEDURE_STEPS",
  measurements: "MEASUREMENTS",
  safety: "SAFETY",
  materials: "MATERIALS",
  outcomes: "OUTCOMES",
  curriculumMap: "CURRICULUM_MAP",
  mediaAssets: "MEDIA_ASSETS",
} as const;

type Cell = string | number | boolean | Date | null | undefined;

function text(value: Cell): string {
  return value == null ? "" : String(value).trim();
}

function number(value: Cell, field: string): number {
  const parsed = typeof value === "number" ? value : Number(text(value));
  if (!Number.isFinite(parsed)) throw new Error(`Invalid number in ${field}: ${text(value)}`);
  return parsed;
}

function list(value: Cell): string[] {
  return text(value).split(/[,→]/).map((item) => item.trim()).filter(Boolean);
}

function boolean(value: Cell): boolean {
  return ["YES", "TRUE", "1"].includes(text(value).toUpperCase());
}

function rows(workbook: WorkBook, sheetName: string): Record<string, Cell>[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Missing required sheet: ${sheetName}`);
  return utils.sheet_to_json<Record<string, Cell>>(sheet, { defval: "" });
}

function requireColumns(sheetName: string, sheet: WorkSheet | undefined, required: string[]): void {
  if (!sheet) throw new Error(`Missing required sheet: ${sheetName}`);
  const headerRows = utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown as Cell[][];
  const headers = new Set((headerRows[0] ?? []).map((value) => text(value)));
  const missing = required.filter((column) => !headers.has(column));
  if (missing.length) throw new Error(`Sheet ${sheetName} is missing columns: ${missing.join(", ")}`);
}

export function loadStemLabCatalog(source: ArrayBuffer | Uint8Array): StemLabCatalog {
  const workbook = read(source, { type: source instanceof ArrayBuffer ? "array" : "buffer" });

  requireColumns(SHEETS.experiments, workbook.Sheets[SHEETS.experiments], [
    "Experiment_ID","Domain","Experiment_Name","Category","Model_Type","Model_ID",
    "Guided_Flow","Level","Status","Input_Refs","Measurement_Refs","Safety_Ref"
  ]);
  requireColumns(SHEETS.modelContracts, workbook.Sheets[SHEETS.modelContracts], [
    "Model_ID","Domain","Required_Inputs","State_Outputs","Rule_or_Equation"
  ]);
  requireColumns(SHEETS.parameters, workbook.Sheets[SHEETS.parameters], [
    "Experiment_ID","Parameter_ID","Parameter_Name","Default","Min","Max","Unit","Learner_Editable"
  ]);
  requireColumns(SHEETS.procedureSteps, workbook.Sheets[SHEETS.procedureSteps], [
    "Experiment_ID","Step_No","Step_Type","Instruction","Runtime_Action"
  ]);
  requireColumns(SHEETS.measurements, workbook.Sheets[SHEETS.measurements], [
    "Measurement_ID","Experiment_ID","Measurement_Name","Unit","Source"
  ]);
  requireColumns(SHEETS.safety, workbook.Sheets[SHEETS.safety], [
    "Safety_ID","Experiment_ID","Level","Hazards","Restrictions"
  ]);
  requireColumns(SHEETS.materials, workbook.Sheets[SHEETS.materials], [
    "Material_ID","Material_Name","Domain","Unit","State","Key_Properties"
  ]);
  requireColumns(SHEETS.outcomes, workbook.Sheets[SHEETS.outcomes], [
    "Experiment_ID","Outcome_ID","Type","Condition","Expected_Result"
  ]);
  requireColumns(SHEETS.curriculumMap, workbook.Sheets[SHEETS.curriculumMap], [
    "Curriculum_ID","Domain","Level","Topics","Seed_Count"
  ]);
  requireColumns(SHEETS.mediaAssets, workbook.Sheets[SHEETS.mediaAssets], [
    "Media_ID","Experiment_ID","Asset_Type","Asset_Key","Required"
  ]);

  return {
    experiments: rows(workbook, SHEETS.experiments).map((r) => ({
      experimentId: text(r.Experiment_ID),
      domain: text(r.Domain),
      experimentName: text(r.Experiment_Name),
      category: text(r.Category),
      modelType: text(r.Model_Type),
      modelId: text(r.Model_ID),
      guidedFlow: list(r.Guided_Flow),
      level: text(r.Level),
      status: text(r.Status),
      inputRefs: text(r.Input_Refs),
      measurementRefs: text(r.Measurement_Refs),
      safetyRef: text(r.Safety_Ref),
    })),
    modelContracts: rows(workbook, SHEETS.modelContracts).map((r) => ({
      modelId: text(r.Model_ID),
      domain: text(r.Domain),
      requiredInputs: list(r.Required_Inputs),
      stateOutputs: list(r.State_Outputs),
      ruleOrEquation: text(r.Rule_or_Equation),
    })),
    parameters: rows(workbook, SHEETS.parameters).map((r) => {
      const experiment = rows(workbook, SHEETS.experiments).find((item) => text(item.Experiment_ID) === text(r.Experiment_ID));
      const explicitModelInput = text(r.Model_Input);
      const legacyInputs = experiment ? LEGACY_MODEL_INPUTS[text(experiment.Model_ID)] : undefined;
      const parameterIndex = rows(workbook, SHEETS.parameters).filter((item) => text(item.Experiment_ID) === text(r.Experiment_ID)).findIndex((item) => text(item.Parameter_ID) === text(r.Parameter_ID));
      return {
      experimentId: text(r.Experiment_ID),
      parameterId: text(r.Parameter_ID),
      parameterName: text(r.Parameter_Name),
      modelInput: explicitModelInput || legacyInputs?.[parameterIndex] || "",
      defaultValue: r.Default as string | number,
      min: r.Min as string | number,
      max: r.Max as string | number,
      unit: text(r.Unit),
      learnerEditable: boolean(r.Learner_Editable),
      };
    }),
    procedureSteps: rows(workbook, SHEETS.procedureSteps).map((r) => ({
      experimentId: text(r.Experiment_ID),
      stepNo: number(r.Step_No, "Step_No"),
      stepType: text(r.Step_Type),
      instruction: text(r.Instruction),
      runtimeAction: text(r.Runtime_Action),
    })),
    measurements: rows(workbook, SHEETS.measurements).map((r) => ({
      measurementId: text(r.Measurement_ID),
      experimentId: text(r.Experiment_ID),
      measurementName: text(r.Measurement_Name),
      unit: text(r.Unit),
      source: text(r.Source),
    })),
    safety: rows(workbook, SHEETS.safety).map((r) => ({
      safetyId: text(r.Safety_ID),
      experimentId: text(r.Experiment_ID),
      level: text(r.Level),
      hazards: text(r.Hazards),
      restrictions: text(r.Restrictions),
    })),
    materials: rows(workbook, SHEETS.materials).map((r) => ({
      materialId: text(r.Material_ID),
      materialName: text(r.Material_Name),
      domain: text(r.Domain),
      unit: text(r.Unit),
      state: text(r.State),
      keyProperties: list(r.Key_Properties),
    })),
    outcomes: rows(workbook, SHEETS.outcomes).map((r) => ({
      experimentId: text(r.Experiment_ID),
      outcomeId: text(r.Outcome_ID),
      type: text(r.Type),
      condition: text(r.Condition),
      expectedResult: text(r.Expected_Result),
    })),
    curriculumMap: rows(workbook, SHEETS.curriculumMap).map((r) => ({
      curriculumId: text(r.Curriculum_ID),
      domain: text(r.Domain),
      level: text(r.Level),
      topics: list(r.Topics),
      seedCount: number(r.Seed_Count, "Seed_Count"),
    })),
    mediaAssets: rows(workbook, SHEETS.mediaAssets).map((r) => ({
      mediaId: text(r.Media_ID),
      experimentId: text(r.Experiment_ID),
      assetType: text(r.Asset_Type),
      assetKey: text(r.Asset_Key),
      required: boolean(r.Required),
    })),
  };
}
