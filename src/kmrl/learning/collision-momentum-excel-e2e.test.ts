import assert from "node:assert/strict";
import test from "node:test";
import { utils, write } from "xlsx";
import { loadStemLabCatalog } from "./excel-catalog-loader.js";
import { validateStemLabCatalog } from "./excel-catalog-validator.js";
import { createKMRLModelRegistry } from "./model-registry.js";
import { createDynamicExperimentRuntime } from "./dynamic-experiment-runtime.js";

function approvedCollisionWorkbook(): ArrayBuffer {
  const workbook = utils.book_new();
  const add = (name: string, rows: unknown[][]) => utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), name);

  add("EXPERIMENT_CATALOG", [
    ["Experiment_ID","Domain","Experiment_Name","Category","Model_Type","Model_ID","Guided_Flow","Level","Status","Input_Refs","Measurement_Refs","Safety_Ref"],
    ["PHY-MEC-007","PHYSICS","Conservation of Momentum","Mechanics","collision_momentum","collision_momentum","OBSERVE → INTERACT → MEASURE → REFLECT","FOUNDATION","DEFINED","Parameters sheet","Measurements sheet","PHY-MEC-007-SAFE"],
  ]);
  add("MODEL_CONTRACTS", [
    ["Model_ID","Domain","Required_Inputs","State_Outputs","Rule_or_Equation"],
    ["collision_momentum","PHYSICS","m1, m2, v1, v2, dt","final velocity v1', final velocity v2', momentum, kinetic energy","ONE-DIMENSIONAL PERFECTLY ELASTIC COLLISION; v1'=((m1-m2)*v1+2*m2*v2)/(m1+m2); v2'=(2*m1*v1+(m2-m1)*v2)/(m1+m2); conserve momentum and kinetic energy"],
  ]);
  add("PARAMETERS", [
    ["Experiment_ID","Parameter_ID","Parameter_Name","Default","Min","Max","Unit","Learner_Editable","Model_Input"],
    ["PHY-MEC-007","PHY-MEC-007-P01","mass_1",1,0.001,100,"kg","YES","m1"],
    ["PHY-MEC-007","PHY-MEC-007-P02","mass_2",1,0.001,100,"kg","YES","m2"],
    ["PHY-MEC-007","PHY-MEC-007-P03","initial_velocity_1",2,-100,100,"m/s","YES","v1"],
    ["PHY-MEC-007","PHY-MEC-007-P04","initial_velocity_2",-1,-100,100,"m/s","YES","v2"],
    ["PHY-MEC-007","PHY-MEC-007-P05","time_step",0.1,0.001,10,"s","NO","dt"],
  ]);
  add("PROCEDURE_STEPS", [
    ["Experiment_ID","Step_No","Step_Type","Instruction","Runtime_Action"],
    ["PHY-MEC-007",1,"INTERACT","Set initial masses and velocities","MODEL_DEFINED"],
  ]);
  add("MEASUREMENTS", [
    ["Measurement_ID","Experiment_ID","Measurement_Name","Unit","Source"],
    ["PHY-MEC-007-M01","PHY-MEC-007","Final Velocity 1","m/s","collision model"],
    ["PHY-MEC-007-M02","PHY-MEC-007","Final Velocity 2","m/s","collision model"],
    ["PHY-MEC-007-M03","PHY-MEC-007","Momentum","kg*m/s","collision model"],
    ["PHY-MEC-007-M04","PHY-MEC-007","Kinetic Energy","J","collision model"],
  ]);
  add("SAFETY", [
    ["Safety_ID","Experiment_ID","Level","Hazards","Restrictions"],
    ["PHY-MEC-007-SAFE","PHY-MEC-007","LOW","Physics simulation","Simulation only"],
  ]);
  add("MATERIALS", [
    ["Material_ID","Material_Name","Domain","Unit","State","Key_Properties"],
    ["MAT-CART-1","Collision Cart 1","PHYSICS","kg","solid","mass"],
    ["MAT-CART-2","Collision Cart 2","PHYSICS","kg","solid","mass"],
  ]);
  add("OUTCOMES", [
    ["Experiment_ID","Outcome_ID","Type","Condition","Expected_Result"],
    ["PHY-MEC-007","PHY-MEC-007-O01","OBSERVATION","measure","Momentum and kinetic energy are conserved"],
  ]);
  add("CURRICULUM_MAP", [
    ["Curriculum_ID","Domain","Level","Topics","Seed_Count"],
    ["PHY-MEC","PHYSICS","FOUNDATION","Momentum and collisions",1],
  ]);
  add("MEDIA_ASSETS", [
    ["Media_ID","Experiment_ID","Asset_Type","Asset_Key","Required"],
    ["PHY-MEC-007-MEDIA-01","PHY-MEC-007","IMAGE","collision-momentum","NO"],
  ]);

  return write(workbook, { type: "array", bookType: "xlsx" });
}

test("PHY-MEC-007 approved Excel-to-runtime end-to-end pipeline", () => {
  const catalog = loadStemLabCatalog(approvedCollisionWorkbook());
  const validation = validateStemLabCatalog(catalog);

  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  assert.equal(validation.warnings.some((warning) => warning.code === "MODEL_INPUT_MAPPING_INCOMPLETE"), false);

  const registry = createKMRLModelRegistry(catalog);
  assert.equal(registry.resolve("collision_momentum").status, "EXECUTABLE");

  const runtime = createDynamicExperimentRuntime(catalog, registry, validation, "PHY-MEC-007");
  runtime.dispatch({ type: "START" });
  runtime.dispatch({ type: "STEP" });
  const snapshot = runtime.dispatch({ type: "MEASURE" });

  assert.equal(snapshot.tick, 1);
  assert.equal(snapshot.measurements.find((item) => item.id === "final_velocity_1")?.quantity.value, -1);
  assert.equal(snapshot.measurements.find((item) => item.id === "final_velocity_2")?.quantity.value, 2);
  assert.equal(snapshot.measurements.find((item) => item.id === "momentum")?.quantity.value, 1);
  assert.equal(snapshot.measurements.find((item) => item.id === "kinetic_energy")?.quantity.value, 2.5);
});
