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
