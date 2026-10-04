// Governed one-time synchronization helper for the approved PHY-MEC-007 contract.\nimport * as XLSX from "xlsx";
import { readFileSync, writeFileSync } from "node:fs";

const path = "apps/kmrl-sandbox/KALP_STEM_LAB_MASTER_CATALOG_v1_0.xlsx";
const workbook = XLSX.read(readFileSync(path));

const ensureSheet = (name, headers) => {
  if (!workbook.SheetNames.includes(name)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers]), name);
  }
  return workbook.Sheets[name];
};

const upsertRows = (sheetName, keyColumn, rows) => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const headers = data[0] ?? [];
  const keyIndex = headers.indexOf(keyColumn);
  if (keyIndex < 0) throw new Error(`Sheet ${sheetName} is missing key column ${keyColumn}`);
  const indexByKey = new Map();
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i]?.[keyIndex] ?? "").trim();
    if (key) indexByKey.set(key, i);
  }
  for (const row of rows) {
    const key = String(row[keyColumn] ?? "").trim();
    if (!key) throw new Error(`Missing ${keyColumn} in ${sheetName} synchronization row`);
    const values = headers.map((header) => row[header] ?? "");
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      data.push(values);
      indexByKey.set(key, data.length - 1);
    } else {
      data[existingIndex] = values;
    }
  }
  workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(data);
};

ensureSheet("EXPERIMENT_CATALOG", ["Experiment_ID","Domain","Experiment_Name","Category","Model_Type","Model_ID","Guided_Flow","Level","Status","Input_Refs","Measurement_Refs","Safety_Ref"]);
ensureSheet("MODEL_CONTRACTS", ["Model_ID","Domain","Required_Inputs","State_Outputs","Rule_or_Equation"]);
ensureSheet("PARAMETERS", ["Experiment_ID","Parameter_ID","Parameter_Name","Default","Min","Max","Unit","Learner_Editable","Model_Input"]);
ensureSheet("PROCEDURE_STEPS", ["Experiment_ID","Step_No","Step_Type","Instruction","Runtime_Action"]);
ensureSheet("MEASUREMENTS", ["Measurement_ID","Experiment_ID","Measurement_Name","Unit","Source"]);
ensureSheet("SAFETY", ["Safety_ID","Experiment_ID","Level","Hazards","Restrictions"]);
ensureSheet("MATERIALS", ["Material_ID","Material_Name","Domain","Unit","State","Key_Properties"]);
ensureSheet("OUTCOMES", ["Experiment_ID","Outcome_ID","Type","Condition","Expected_Result"]);
ensureSheet("CURRICULUM_MAP", ["Curriculum_ID","Domain","Level","Topics","Seed_Count"]);
ensureSheet("MEDIA_ASSETS", ["Media_ID","Experiment_ID","Asset_Type","Asset_Key","Required"]);

upsertRows("EXPERIMENT_CATALOG", "Experiment_ID", [{
  Experiment_ID:"PHY-MEC-007", Domain:"PHYSICS", Experiment_Name:"Conservation of Momentum",
  Category:"Mechanics", Model_Type:"collision_momentum", Model_ID:"collision_momentum",
  Guided_Flow:"OBSERVE → INTERACT → MEASURE → REFLECT", Level:"FOUNDATION", Status:"DEFINED",
  Input_Refs:"Parameters sheet", Measurement_Refs:"Measurements sheet", Safety_Ref:"PHY-MEC-007-SAFE"
}]);

upsertRows("MODEL_CONTRACTS", "Model_ID", [{
  Model_ID:"collision_momentum", Domain:"PHYSICS", Required_Inputs:"m1, m2, v1, v2, dt",
  State_Outputs:"final velocity v1', final velocity v2', momentum, kinetic energy",
  Rule_or_Equation:"ONE-DIMENSIONAL PERFECTLY ELASTIC COLLISION; v1'=((m1-m2)*v1+2*m2*v2)/(m1+m2); v2'=(2*m1*v1+(m2-m1)*v2)/(m1+m2); conserve momentum and kinetic energy"
}]);

upsertRows("PARAMETERS", "Parameter_ID", [
  {Experiment_ID:"PHY-MEC-007",Parameter_ID:"PHY-MEC-007-P01",Parameter_Name:"mass_1",Default:1,Min:0.001,Max:100,Unit:"kg",Learner_Editable:"YES",Model_Input:"m1"},
  {Experiment_ID:"PHY-MEC-007",Parameter_ID:"PHY-MEC-007-P02",Parameter_Name:"mass_2",Default:1,Min:0.001,Max:100,Unit:"kg",Learner_Editable:"YES",Model_Input:"m2"},
  {Experiment_ID:"PHY-MEC-007",Parameter_ID:"PHY-MEC-007-P03",Parameter_Name:"initial_velocity_1",Default:2,Min:-100,Max:100,Unit:"m/s",Learner_Editable:"YES",Model_Input:"v1"},
  {Experiment_ID:"PHY-MEC-007",Parameter_ID:"PHY-MEC-007-P04",Parameter_Name:"initial_velocity_2",Default:-1,Min:-100,Max:100,Unit:"m/s",Learner_Editable:"YES",Model_Input:"v2"},
  {Experiment_ID:"PHY-MEC-007",Parameter_ID:"PHY-MEC-007-P05",Parameter_Name:"time_step",Default:0.1,Min:0.001,Max:10,Unit:"s",Learner_Editable:"NO",Model_Input:"dt"}
]);

upsertRows("PROCEDURE_STEPS", "Experiment_ID", [{
  Experiment_ID:"PHY-MEC-007", Step_No:1, Step_Type:"INTERACT",
  Instruction:"Set initial masses and velocities", Runtime_Action:"MODEL_DEFINED"
}]);

upsertRows("MEASUREMENTS", "Measurement_ID", [
  {Measurement_ID:"PHY-MEC-007-M01",Experiment_ID:"PHY-MEC-007",Measurement_Name:"Final Velocity 1",Unit:"m/s",Source:"collision model"},
  {Measurement_ID:"PHY-MEC-007-M02",Experiment_ID:"PHY-MEC-007",Measurement_Name:"Final Velocity 2",Unit:"m/s",Source:"collision model"},
  {Measurement_ID:"PHY-MEC-007-M03",Experiment_ID:"PHY-MEC-007",Measurement_Name:"Momentum",Unit:"kg*m/s",Source:"collision model"},
  {Measurement_ID:"PHY-MEC-007-M04",Experiment_ID:"PHY-MEC-007",Measurement_Name:"Kinetic Energy",Unit:"J",Source:"collision model"}
]);

upsertRows("SAFETY", "Safety_ID", [{
  Safety_ID:"PHY-MEC-007-SAFE",Experiment_ID:"PHY-MEC-007",Level:"LOW",Hazards:"Physics simulation",Restrictions:"Simulation only"
}]);

upsertRows("MATERIALS", "Material_ID", [
  {Material_ID:"MAT-CART-1",Material_Name:"Collision Cart 1",Domain:"PHYSICS",Unit:"kg",State:"solid",Key_Properties:"mass"},
  {Material_ID:"MAT-CART-2",Material_Name:"Collision Cart 2",Domain:"PHYSICS",Unit:"kg",State:"solid",Key_Properties:"mass"}
]);

upsertRows("OUTCOMES", "Outcome_ID", [{
  Experiment_ID:"PHY-MEC-007",Outcome_ID:"PHY-MEC-007-O01",Type:"OBSERVATION",
  Condition:"measure",Expected_Result:"Momentum and kinetic energy are conserved"
}]);

upsertRows("CURRICULUM_MAP", "Curriculum_ID", [{
  Curriculum_ID:"PHY-MEC",Domain:"PHYSICS",Level:"FOUNDATION",Topics:"Momentum and collisions",Seed_Count:1
}]);

upsertRows("MEDIA_ASSETS", "Media_ID", [{
  Media_ID:"PHY-MEC-007-MEDIA-01",Experiment_ID:"PHY-MEC-007",Asset_Type:"IMAGE",
  Asset_Key:"collision-momentum",Required:"NO"
}]);

XLSX.writeFile(workbook, path, { bookType: "xlsx" });
console.log(`Synchronized approved PHY-MEC-007 catalog contract into ${path}`);
