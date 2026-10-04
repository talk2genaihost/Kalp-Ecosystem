import * as XLSX from "xlsx";
import { readFileSync, writeFileSync } from "node:fs";

const path = "apps/kmrl-sandbox/KALP_STEM_LAB_MASTER_CATALOG_v1_0.xlsx";
const workbook = XLSX.read(readFileSync(path));

const rows = (sheetName) => XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
const by = (sheet, key, value) => rows(sheet).find((row) => String(row[key] ?? "").trim() === value);

const checks = [
  ["EXPERIMENT_CATALOG", "Experiment_ID", "PHY-MEC-007", {
    Model_ID: "collision_momentum", Status: "DEFINED", Domain: "PHYSICS"
  }],
  ["MODEL_CONTRACTS", "Model_ID", "collision_momentum", {
    Required_Inputs: "m1, m2, v1, v2, dt",
    Rule_or_Equation: "ONE-DIMENSIONAL PERFECTLY ELASTIC COLLISION; v1'=((m1-m2)*v1+2*m2*v2)/(m1+m2); v2'=(2*m1*v1+(m2-m1)*v2)/(m1+m2); conserve momentum and kinetic energy"
  }],
  ["PARAMETERS", "Parameter_ID", "PHY-MEC-007-P01", {Model_Input:"m1",Default:1,Min:0.001,Max:100,Unit:"kg"}],
  ["PARAMETERS", "Parameter_ID", "PHY-MEC-007-P02", {Model_Input:"m2",Default:1,Min:0.001,Max:100,Unit:"kg"}],
  ["PARAMETERS", "Parameter_ID", "PHY-MEC-007-P03", {Model_Input:"v1",Default:2,Min:-100,Max:100,Unit:"m/s"}],
  ["PARAMETERS", "Parameter_ID", "PHY-MEC-007-P04", {Model_Input:"v2",Default:-1,Min:-100,Max:100,Unit:"m/s"}],
  ["PARAMETERS", "Parameter_ID", "PHY-MEC-007-P05", {Model_Input:"dt",Default:0.1,Min:0.001,Max:10,Unit:"s"}]
];

const failures = [];
for (const [sheet, key, value, expected] of checks) {
  const row = by(sheet, key, value);
  if (!row) {
    failures.push(`${sheet}:${key}=${value} missing`);
    continue;
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (String(row[field] ?? "") !== String(expectedValue)) {
      failures.push(`${sheet}:${value}:${field} expected=${expectedValue} actual=${row[field] ?? ""}`);
    }
  }
}

const status = failures.length === 0 ? "PASS" : "FAIL";
const report = [
  `PHY-MEC-007 approved catalog verification: ${status}`,
  `catalog: ${path}`,
  `checks: ${checks.length}`,
  ...(failures.length ? ["failures:", ...failures] : ["all approved contract fields and Excel mappings match the governed values"])
].join("\n") + "\n";
writeFileSync("docs/kmrl/PHY_MEC_007_CATALOG_VERIFICATION.txt", report);
if (failures.length) {
  console.error(report);
  process.exit(1);
}
console.log(report);
