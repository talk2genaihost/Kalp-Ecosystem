import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const root = process.cwd();
const input = path.join(root, "data", "KALP_Retro_64_World_Progression_Knowledge_Base.xlsx");
const output = path.join(root, "data", "retro-world-progression-kb.json");

if (!fs.existsSync(input)) {
  throw new Error("Retro knowledge workbook not found: " + input);
}

const workbook = XLSX.read(fs.readFileSync(input), {type:"buffer"});
const sheets = Object.fromEntries(
  workbook.SheetNames.map(name => [
    name,
    XLSX.utils.sheet_to_json(workbook.Sheets[name], {defval:""})
  ])
);

const kb = {
  schemaVersion: "2.0",
  sourceArtifact: "KALP_Retro_64_World_Progression_Knowledge_Base.xlsx",
  generatedFromSheets: workbook.SheetNames,
  sheets
};

fs.writeFileSync(output, JSON.stringify(kb, null, 2) + "\n");
console.log("Generated", output, "from", workbook.SheetNames.length, "sheets.");
