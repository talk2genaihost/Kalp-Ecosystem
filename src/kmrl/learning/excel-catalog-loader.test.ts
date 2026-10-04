import assert from "node:assert/strict";
import test from "node:test";
import { read, utils, write } from "xlsx";
import { loadStemLabCatalog } from "./excel-catalog-loader.js";

function workbookBytes(): Uint8Array {
  const workbook = utils.book_new();
  const add = (name: string, rows: Record<string, unknown>[]) =>
    utils.book_append_sheet(workbook, utils.json_to_sheet(rows), name);

  add("EXPERIMENT_CATALOG", [{
    Experiment_ID:"PHY-MEC-001",Domain:"PHYSICS",Experiment_Name:"Constant Force Motion",
    Category:"Mechanics",Model_Type:"constant_force",Model_ID:"constant_force",
    Guided_Flow:"OBSERVE → INTERACT → MEASURE → REFLECT",Level:"FOUNDATION",Status:"DEFINED",
    Input_Refs:"Parameters sheet",Measurement_Refs:"Measurements sheet",Safety_Ref:"PHY-MEC-001-SAFE"
  }]);
  add("MODEL_CONTRACTS", [{Model_ID:"constant_force",Domain:"PHYSICS",Required_Inputs:"mass, force, dt",State_Outputs:"position, velocity, acceleration",Rule_or_Equation:"F=m*a"}]);
  add("PARAMETERS", [{Experiment_ID:"PHY-MEC-001",Parameter_ID:"P01",Parameter_Name:"Force",Model_Input:"force",Default:10,Min:0,Max:100,Unit:"N",Learner_Editable:"YES"}]);
  add("PROCEDURE_STEPS", [{Experiment_ID:"PHY-MEC-001",Step_No:1,Step_Type:"OBSERVE",Instruction:"Observe motion",Runtime_Action:"Model/UI defined"}]);
  add("MEASUREMENTS", [{Measurement_ID:"M01",Experiment_ID:"PHY-MEC-001",Measurement_Name:"Velocity",Unit:"m/s",Source:"runtime state"}]);
  add("SAFETY", [{Safety_ID:"S01",Experiment_ID:"PHY-MEC-001",Level:"LOW",Hazards:"Simulation only",Restrictions:"No physical procedure"}]);
  add("MATERIALS", [{Material_ID:"MAT-H2O",Material_Name:"Water",Domain:"CHEMISTRY",Unit:"kg",State:"liquid",Key_Properties:"specific_heat,density"}]);
  add("OUTCOMES", [{Experiment_ID:"PHY-MEC-001",Outcome_ID:"O01",Type:"EXPECTED",Condition:"valid parameter range",Expected_Result:"Model-defined result"}]);
  add("CURRICULUM_MAP", [{Curriculum_ID:"PHYSICS-FOUNDATION",Domain:"PHYSICS",Level:"FOUNDATION",Topics:"Mechanics,Thermodynamics",Seed_Count:1}]);
  add("MEDIA_ASSETS", [{Media_ID:"MEDIA-01",Experiment_ID:"PHY-MEC-001",Asset_Type:"diagram",Asset_Key:"PHY-MEC-001_diagram",Required:"NO"}]);

  return write(workbook, { type:"buffer", bookType:"xlsx" });
}

test("Excel loader reads the STEM catalog into typed runtime records", () => {
  const catalog = loadStemLabCatalog(workbookBytes());
  assert.equal(catalog.experiments.length, 1);
  assert.deepEqual(catalog.experiments[0].guidedFlow, ["OBSERVE","INTERACT","MEASURE","REFLECT"]);
  assert.equal(catalog.parameters[0].defaultValue, 10);
  assert.equal(catalog.parameters[0].modelInput, "force");
  assert.equal(catalog.parameters[0].learnerEditable, true);
  assert.deepEqual(catalog.modelContracts[0].requiredInputs, ["mass","force","dt"]);
  assert.equal(catalog.procedureSteps[0].stepNo, 1);
  assert.deepEqual(catalog.materials[0].keyProperties, ["specific_heat","density"]);
});

test("Excel loader rejects a missing required sheet", () => {
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, utils.json_to_sheet([{Experiment_ID:"X",Domain:"PHYSICS",Experiment_Name:"X",Category:"Mechanics",Model_Type:"constant_force",Model_ID:"constant_force",Guided_Flow:"OBSERVE",Level:"FOUNDATION",Status:"DEFINED",Input_Refs:"",Measurement_Refs:"",Safety_Ref:"S"}]), "EXPERIMENT_CATALOG");
  assert.throws(() => loadStemLabCatalog(write(workbook, {type:"buffer",bookType:"xlsx"})), /Missing required sheet: MODEL_CONTRACTS/);
});

test("Excel loader rejects missing required columns", () => {
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, utils.json_to_sheet([{Experiment_ID:"X",Experiment_Name:"X",Category:"Mechanics",Model_Type:"constant_force",Model_ID:"constant_force",Guided_Flow:"OBSERVE",Level:"FOUNDATION",Status:"DEFINED",Input_Refs:"",Measurement_Refs:"",Safety_Ref:"S"}]), "EXPERIMENT_CATALOG");
  utils.book_append_sheet(workbook, utils.json_to_sheet([{Model_ID:"constant_force",Domain:"PHYSICS",Required_Inputs:"mass, force, dt",State_Outputs:"position, velocity, acceleration",Rule_or_Equation:"F=m*a"}]), "MODEL_CONTRACTS");
  assert.throws(
    () => loadStemLabCatalog(write(workbook, {type:"buffer",bookType:"xlsx"})),
    /Sheet EXPERIMENT_CATALOG is missing columns: Domain/
  );
});

test("Excel loader preserves executable mappings for the legacy catalog without Model_Input", () => {
  const workbook = read(workbookBytes(), { type: "buffer" });
  const rows = utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.PARAMETERS], { defval: "" });
  workbook.Sheets.PARAMETERS = utils.json_to_sheet(rows.map(({ Model_Input: _ignored, ...row }) => row));
  const catalog = loadStemLabCatalog(write(workbook, { type: "buffer", bookType: "xlsx" }));
  assert.equal(catalog.parameters[0].modelInput, "force");
});
