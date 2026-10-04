import assert from "node:assert/strict";
import test from "node:test";
import { utils, write } from "xlsx";
import { loadStemLabCatalog } from "./excel-catalog-loader.js";
import { validateStemLabCatalog } from "./excel-catalog-validator.js";
import { createKMRLModelRegistry } from "./model-registry.js";
import { createDynamicExperimentRuntime } from "./dynamic-experiment-runtime.js";

function canonicalChemMixWorkbook(): ArrayBuffer {
  const workbook = utils.book_new();
  const add = (name: string, rows: unknown[][]) => utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), name);

  add("EXPERIMENT_CATALOG", [
    ["Experiment_ID","Domain","Experiment_Name","Category","Model_Type","Model_ID","Guided_Flow","Level","Status","Input_Refs","Measurement_Refs","Safety_Ref"],
    ["CHE-MIX-002","CHEMISTRY","Mixing Materials: Observe a System Change","General Chemistry","registered_reaction","registered_reaction","OBSERVE → INTERACT → MEASURE → REFLECT","FOUNDATION","DEFINED","Parameters sheet","Measurements sheet","CHE-MIX-002-SAFE"],
  ]);
  add("MODEL_CONTRACTS", [
    ["Model_ID","Domain","Required_Inputs","State_Outputs","Rule_or_Equation"],
    ["registered_reaction","CHEMISTRY","material:MAT-HCL, material:MAT-NAOH, dt","material amounts, chemistry status, reaction events","HCl(aq) + NaOH(aq) → NaCl(aq) + H2O(l)"],
  ]);
  add("PARAMETERS", [
    ["Experiment_ID","Parameter_ID","Parameter_Name","Default","Min","Max","Unit","Learner_Editable","Model_Input"],
    ["CHE-MIX-002","CHE-MIX-002-P01","primary_parameter",1,0,100,"mol","YES","material:MAT-HCL"],
    ["CHE-MIX-002","CHE-MIX-002-P02","secondary_parameter",1,0,100,"mol","YES","material:MAT-NAOH"],
    ["CHE-MIX-002","CHE-MIX-002-P03","time_step",0.1,0.001,10,"s","NO","dt"],
  ]);
  add("PROCEDURE_STEPS", [
    ["Experiment_ID","Step_No","Step_Type","Instruction","Runtime_Action"],
    ["CHE-MIX-002",1,"INTERACT","Mix acid and base","MODEL_DEFINED"],
  ]);
  add("MEASUREMENTS", [
    ["Measurement_ID","Experiment_ID","Measurement_Name","Unit","Source"],
    ["CHE-MIX-002-M01","CHE-MIX-002","Material Amounts","mol","material amounts"],
  ]);
  add("SAFETY", [
    ["Safety_ID","Experiment_ID","Level","Hazards","Restrictions"],
    ["CHE-MIX-002-SAFE","CHE-MIX-002","LOW","Chemical simulation","Simulation only"],
  ]);
  add("MATERIALS", [
    ["Material_ID","Material_Name","Domain","Unit","State","Key_Properties"],
    ["MAT-HCL","Hydrochloric Acid","CHEMISTRY","mol","aqueous","concentration"],
    ["MAT-NAOH","Sodium Hydroxide","CHEMISTRY","mol","aqueous","concentration"],
    ["MAT-NACL","Sodium Chloride","CHEMISTRY","mol","aqueous","salt,electrolyte"],
    ["MAT-H2O","Water","CHEMISTRY","mol","liquid","specific_heat,density"],
  ]);
  add("REACTION_DEFINITIONS", [
    ["Reaction_ID","Experiment_ID","Reaction_Name","Reactants","Products","Conditions","Status"],
    ["RXN-CHE-MIX-002-001","CHE-MIX-002","Hydrochloric Acid + Sodium Hydroxide Neutralization","MAT-HCL:1,MAT-NAOH:1","MAT-NACL:1,MAT-H2O:1","","CANONICAL"],
  ]);
  add("OUTCOMES", [
    ["Experiment_ID","Outcome_ID","Type","Condition","Expected_Result"],
    ["CHE-MIX-002","CHE-MIX-002-O01","OBSERVATION","step","Neutralization produces salt and water"],
  ]);
  add("CURRICULUM_MAP", [
    ["Curriculum_ID","Domain","Level","Topics","Seed_Count"],
    ["CHE-FOUNDATION","CHEMISTRY","FOUNDATION","Neutralization",1],
  ]);
  add("MEDIA_ASSETS", [
    ["Media_ID","Experiment_ID","Asset_Type","Asset_Key","Required"],
    ["CHE-MIX-002-MEDIA-01","CHE-MIX-002","IMAGE","chem-mix-002","NO"],
  ]);

  return write(workbook, { type: "array", bookType: "xlsx" });
}

test("CHE-MIX-002 Excel-to-runtime end-to-end pipeline", () => {
  const catalog = loadStemLabCatalog(canonicalChemMixWorkbook());
  const validation = validateStemLabCatalog(catalog);

  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  assert.deepEqual(catalog.reactionDefinitions[0], {
    reactionId: "RXN-CHE-MIX-002-001",
    experimentId: "CHE-MIX-002",
    reactionName: "Hydrochloric Acid + Sodium Hydroxide Neutralization",
    reactants: ["MAT-HCL:1", "MAT-NAOH:1"],
    products: ["MAT-NACL:1", "MAT-H2O:1"],
    conditions: [],
    status: "CANONICAL",
  });

  const registry = createKMRLModelRegistry(catalog);
  assert.equal(registry.resolve("registered_reaction").status, "EXECUTABLE");

  const runtime = createDynamicExperimentRuntime(catalog, registry, validation, "CHE-MIX-002");
  runtime.dispatch({ type: "START" });
  const measuredBeforeStep = runtime.dispatch({ type: "MEASURE" });
  assert.equal(measuredBeforeStep.tick, 0);
  assert.ok(measuredBeforeStep.measurements.length >= 1);

  runtime.dispatch({ type: "STEP" });
  const measuredAfterStep = runtime.dispatch({ type: "MEASURE" });
  assert.equal(measuredAfterStep.tick, 1);
  assert.ok(measuredAfterStep.measurements.length >= 1);
});
