export type RetroGameId = "G001"|"G002"|"G003"|"G004"|"G005";
export interface RetroFrame { title:string; action:string }
export interface RetroGameReference { id:RetroGameId; name:string; worksheet:string; status:"ACTIVE"|"PLANNED"; durationSeconds?:number; format?:"9:16"|"16:9"; world?:string; terrain?:string; obstacles?:string; enemies?:string; moves?:string; weapons?:string; powerUps?:string; abilities?:string; props?:string; camera?:string; vfx?:string; sound?:string; realistic?:string; frames?:RetroFrame[] }
export interface RetroReferenceRegistry { schemaVersion:string; sourceArtifact:string; games:RetroGameReference[] }
export function resolveRetroGame(registry:RetroReferenceRegistry, gameName:string):RetroGameReference {
  const game=registry.games.find(g=>g.name.toLowerCase()===gameName.trim().toLowerCase());
  if(!game) throw new Error(`Retro game not registered: ${gameName}`);
  return structuredClone(game);
}
export function buildRetroEpisode(game:RetroGameReference, episodeId=`${game.name.toUpperCase().replace(/[^A-Z0-9]+/g,"_")}_EP_001`) {
  if(!game.frames || game.frames.length!==8) throw new Error(`Game worksheet must provide exactly 8 frames: ${game.worksheet}`);
  return {contract:"KALP-RETRO-64-EPISODE-1.0",episode_id:episodeId,game:game.name,reference_worksheet:game.worksheet,duration_seconds:game.durationSeconds??60,format:game.format??"9:16",world:game.world??"",terrain:game.terrain??"",obstacles:game.obstacles??"",enemies:game.enemies??"",moves:game.moves??"",weapons_ammunition:game.weapons??"",power_ups:game.powerUps??"",special_abilities:game.abilities??"",props:game.props??"",camera:game.camera??"",vfx:game.vfx??"",sound:game.sound??"",realistic_interpretation:game.realistic??"",storyboard:game.frames.map((f,i)=>({frame:i+1,title:f.title,action:f.action}))};
}

/** Parse a Retro 64 XLSX workbook into the canonical registry shape. */
export async function parseRetro64Workbook(input: ArrayBuffer | Uint8Array): Promise<RetroReferenceRegistry> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(input, { type: "array" });
  const games: RetroGameReference[] = [];
  for (const worksheet of workbook.SheetNames) {
    const sheet = workbook.Sheets[worksheet];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });
    if (!rows.length) continue;
    const meta: Record<string,string> = {};
    const frames: RetroFrame[] = [];
    for (const row of rows) {
      const key = String(row?.[0] ?? "").trim();
      const value = String(row?.[1] ?? "").trim();
      if (/^frame$/i.test(key) && String(row?.[1] ?? "").trim()) {
        frames.push({ title: String(row?.[2] ?? ("Frame " + (frames.length + 1))).trim(), action: String(row?.[3] ?? "").trim() });
      } else if (key) {
        const canonical = key.replace(/[\\s_-]+/g, "");
        meta[canonical] = value;
      }
    }
    const gameName = meta.name || worksheet.replace(/^G\\d+[_-]?/i, "").trim() || worksheet;
    const id = (worksheet.match(/^G\\d+/i)?.[0].toUpperCase() || ("G" + String(games.length + 1).padStart(3, "0"))) as RetroGameId;
    games.push({ id, name: gameName, worksheet, status: "ACTIVE", durationSeconds: Number(meta.durationSeconds || 60), format: meta.format === "16:9" ? "16:9" : "9:16", world: meta.world, terrain: meta.terrain, obstacles: meta.obstacles, enemies: meta.enemies, moves: meta.moves, weapons: meta.weapons, powerUps: meta.powerUps, abilities: meta.abilities, props: meta.props, camera: meta.camera, vfx: meta.vfx, sound: meta.sound, realistic: meta.realistic, frames });
  }
  return { schemaVersion: "1.0", sourceArtifact: "KALP_Retro_64_Master_Reference.xlsx", games };
}
