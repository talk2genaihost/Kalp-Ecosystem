import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";
import type { RetroKnowledgeBase, RetroKnowledgeWorld } from "./retro-knowledge-base";

export const UNIFIED_MASTER_WORKBOOK = "KALP_Master_Reference_UNIFIED_v3.xlsx";
type Row = Record<string, unknown>;

function rows(workbook: XLSX.WorkBook, sheet: string): Row[] {
  const ws = workbook.Sheets[sheet];
  return ws ? XLSX.utils.sheet_to_json<Row>(ws, { defval: "" }) : [];
}

function list(value: unknown): string[] {
  return String(value ?? "")
    .split(";")
    .map(x => x.trim())
    .filter(Boolean);
}

function workbookPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "data", UNIFIED_MASTER_WORKBOOK),
    fileURLToPath(new URL("../../data/" + UNIFIED_MASTER_WORKBOOK, import.meta.url))
  ];
  const found = candidates.find(fs.existsSync);
  if (!found) {
    throw new Error(
      `Canonical Retro-64 workbook not found. Expected data/${UNIFIED_MASTER_WORKBOOK}`
    );
  }
  return found;
}

export interface UnifiedEffectsRegistry {
  domains: Record<string, Row[]>;
}

export interface UnifiedVisualStyleRegistry {
  entries: Row[];
  classifications: Row[];
}

export interface UnifiedKnowledgeSource {
  workbookPath: string;
  retro: RetroKnowledgeBase;
  effects: UnifiedEffectsRegistry;
  visualStyles: UnifiedVisualStyleRegistry;
}

export function loadUnifiedKnowledgeSource(filePath = workbookPath()): UnifiedKnowledgeSource {
  const workbook = XLSX.read(fs.readFileSync(filePath), { type: "buffer" });

  const worldRows = rows(workbook, "WORLD_REGISTRY");
  const physicsRows = rows(workbook, "WORLD_PHYSICS");
  const propsRows = rows(workbook, "WORLD_PROPS");
  const movementRows = rows(workbook, "MOVEMENT_DYNAMICS");
  const vfxAudioRows = rows(workbook, "VFX_AUDIO");
  const vfxRows = rows(workbook, "WORLD_VFX");
  const audioRows = rows(workbook, "WORLD_AUDIO");
  const conflictRows = rows(workbook, "CONFLICT_RULES").length ? rows(workbook, "CONFLICT_RULES") : rows(workbook, "WORLD_CONFLICT_MATRIX");
  const progressionRows = rows(workbook, "PROGRESSION_DNA");
  const missionRows = rows(workbook, "MISSION_ARCHETYPES");
  const episodeRows = rows(workbook, "EPISODE_RULES");

  const worlds: RetroKnowledgeWorld[] = worldRows.map(r => {
    const id = String(r.world_id).toUpperCase() as RetroKnowledgeWorld["id"];
    const physics = physicsRows
      .filter(x => String(x.world_id).toUpperCase() === id)
      .map(x => String(x.physics_rule ?? x.rule ?? ""))
      .filter(Boolean);

    const props = propsRows.find(x => String(x.world_id).toUpperCase() === id);
    const movement: Record<string, string> = {};

    for (const x of movementRows.filter(x => String(x.world_id).toUpperCase() === id)) {
      movement[String(x.input_movement).toLowerCase()] = String(x.normalized_movement);
    }

    const va = vfxAudioRows.find(x => String(x.world_id).toUpperCase() === id);\n    const vfx = va ? list(va.vfx) : vfxRows.filter(x => String(x.world_id).toUpperCase() === id).flatMap(x => list(x.vfx ?? x.effect ?? x.value));\n    const audio = va ? list(va.audio) : audioRows.filter(x => String(x.world_id).toUpperCase() === id).flatMap(x => list(x.audio ?? x.sound ?? x.value));

    return {
      id,
      label: String(r.label),
      allowedProps: list(props?.allowed_props),
      suppressedProps: list(props?.suppressed_props),
      movement,
      physics,
      vfx: list(va?.vfx),
      audio: list(va?.audio)
    };
  });

  const conflictRules: [string, string, string][] = conflictRows.map(r => [
    String(r.world_id).toUpperCase(),
    String(r.combination),
    String(r.resolution)
  ]);

  const progressionStages = progressionRows
    .sort((a, b) => Number(a.stage_order) - Number(b.stage_order))
    .map(r => String(r.stage_id ?? r.stage ?? ""))\n    .filter(Boolean);

  const missionArchetypes: Record<string, string> = {};
  for (const r of missionRows) {
    missionArchetypes[String(r.archetype).toLowerCase()] = String(r.progression_focus ?? r.progression);
  }

  const episodeValue = (rule: string, fallback: string) =>
    String(episodeRows.find(r => String(r.rule_id) === rule)?.rule ?? fallback);

  const episodeNumber = (rule: string, fallback: number): number => {
    const value = episodeValue(rule, "");
    const match = value.match(/\b(\d+)\b/);
    return match ? Number(match[1]) : fallback;
  };

  const episodeBoolean = (rule: string, fallback: boolean): boolean => {
    const value = episodeValue(rule, "").toLowerCase();
    if (/\b(true|yes|locked)\b/.test(value)) return true;
    if (/\b(false|no)\b/.test(value)) return false;
    return fallback;
  };

  const retro: RetroKnowledgeBase = {
    schemaVersion: "3.0",
    sourceArtifact: UNIFIED_MASTER_WORKBOOK,
    worlds,
    conflictRules,
    progressionStages,
    missionArchetypes,
    productionRules: {
      minimumReels: episodeNumber("EP-005", 2),
      shotsPerReel: episodeNumber("EP-006", 12),
      finalReelConcludesMission: episodeBoolean("EP-007", true),
      resumeFromPreviousReel: episodeBoolean("EP-008", true)
    }
  };

  const effects: UnifiedEffectsRegistry = { domains: {} };
  for (const sheet of workbook.SheetNames.filter(name => /^(?:FX_\d{2}_|\d{2}_)/.test(name))) {
    effects.domains[sheet] = rows(workbook, sheet);
  }

  return {
    workbookPath: filePath,
    retro,
    effects,
    visualStyles: {
      entries: rows(workbook, "VISUAL_STYLE_REGISTRY"),
      classifications: rows(workbook, "VISUAL_STYLE_SUMMARY")
    }
  };
}
