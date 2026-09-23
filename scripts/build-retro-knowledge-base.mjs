import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const root = process.cwd();
const input = path.join(root, "data", "KALP_Retro_64_World_Progression_Knowledge_Base.xlsx");
const output = path.join(root, "data", "retro-world-progression-kb.json");
if (!fs.existsSync(input)) throw new Error("Retro knowledge workbook not found: " + input);

const workbook = XLSX.read(fs.readFileSync(input), {type:"buffer"});
const rows = name => XLSX.utils.sheet_to_json(workbook.Sheets[name], {defval:""});
const worldRows = rows("WORLD_REGISTRY");
const propRows = rows("WORLD_PROPS");
const physicsRows = rows("WORLD_PHYSICS");
const movementRows = rows("MOVEMENT_DYNAMICS");
const vfxRows = rows("VFX_AUDIO");

const worlds = worldRows.map(r => {
  const id = String(r.world_id);
  const props = propRows.find(x => String(x.world_id) === id) || {};
  const movement = Object.fromEntries(
    movementRows.filter(x => String(x.world_id) === id)
      .map(x => [String(x.input_movement), String(x.normalized_movement)])
  );
  const physics = physicsRows.filter(x => String(x.world_id) === id).map(x => String(x.physics_rule));
  const media = vfxRows.find(x => String(x.world_id) === id) || {};
  return {
    id,
    label: String(r.label),
    allowedProps: String(props.allowed_props || "").split(";").map(x => x.trim()).filter(Boolean),
    suppressedProps: String(props.suppressed_props || "").split(";").map(x => x.trim()).filter(Boolean),
    movement,
    physics,
    vfx: String(media.vfx || "").split(";").map(x => x.trim()).filter(Boolean),
    audio: String(media.audio || "").split(";").map(x => x.trim()).filter(Boolean)
  };
});

const conflictRules = rows("CONFLICT_RULES").map(r => [
  String(r.world_id), String(r.combination), String(r.resolution)
]);

const progressionStages = rows("PROGRESSION_DNA")
  .sort((a,b) => Number(a.stage_order) - Number(b.stage_order))
  .map(r => String(r.stage_id));

const archetypes = Object.fromEntries(
  rows("MISSION_ARCHETYPES").map(r => [
    String(r.archetype).toLowerCase(),
    String(r.progression_focus)
  ])
);

const kb = {
  schemaVersion: "2.0",
  sourceArtifact: "KALP_Retro_64_World_Progression_Knowledge_Base.xlsx",
  worlds,
  conflictRules,
  progressionStages,
  missionArchetypes: archetypes,
  productionRules: {
    minimumReels: 2,
    shotsPerReel: 12,
    finalReelConcludesMission: true,
    resumeFromPreviousReel: true
  }
};

fs.writeFileSync(output, JSON.stringify(kb, null, 2) + "\n");
console.log("Generated", output, "from", workbook.SheetNames.length, "knowledge sheets.");
