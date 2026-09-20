const fs=require("fs"),path=require("path");
function load(){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","csd-019-scene-sound-dialogue-audio-atmosphere.json"),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load();
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,audio_model:c.audio_model,audio_layers:c.audio_layers,dialogue_schema:c.dialogue_schema,voice_performance:c.voice_performance,ambience_schema:c.ambience_schema,sfx_schema:c.sfx_schema,music_schema:c.music_schema,silence_schema:c.silence_schema,spatial_audio:c.spatial_audio,audio_continuity:c.audio_continuity,audio_pipeline:c.audio_pipeline,validation:c.validation,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const beats=Array.isArray(b.beats)?b.beats:[];
  if(!beats.length)return out(res,422,{ok:false,status:"REJECTED",error:"FRAME_OR_BEAT_WITHOUT_AUDIO_BINDING"});
  const active=Array.isArray(b.active_character_ids)?b.active_character_ids:[];
  if(active.length>5)return out(res,422,{ok:false,status:"REJECTED",error:"ACTIVE_CHARACTER_COUNT_ABOVE_5"});
  for(const d of (Array.isArray(b.dialogue)?b.dialogue:[])){
   if(!d.line_id||!d.speaker||d.text===undefined||d.start_offset_seconds===undefined||d.duration_seconds===undefined)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_DIALOGUE_CONTRACT",line_id:d.line_id});
  }
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"AUDIO_LANGUAGE_RESOLVED",audio_language_contract:b.audio_language_contract||{},dialogue_map:b.dialogue||[],ambience_map:b.ambience||[],sfx_map:b.sfx||[],music_map:b.music||[],silence_map:b.silence||[],spatial_audio_map:b.spatial_audio||{},frame_audio_package:{beats,dialogue:b.dialogue||[],ambience:b.ambience||[],sfx:b.sfx||[],music:b.music||[],silence:b.silence||[],spatial_audio:b.spatial_audio||{}},generation_handoff:"CMSE010_READY"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-019 failed",detail:e.message})}
};