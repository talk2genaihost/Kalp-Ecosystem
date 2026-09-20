const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-017-scene-shot-composition-camera-grammar.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,shot_model:c.shot_model,shot_schema:c.shot_schema,camera_grammar:c.camera_grammar,shot_selection_rules:c.shot_selection_rules,camera_continuity:c.camera_continuity,camera_pipeline:c.camera_pipeline,validation:c.validation,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const shots=Array.isArray(b.shots)?b.shots:[], beats=b.beats||{}, spatial=b.canonical_spatial_state||{};
  if(!shots.length)return out(res,422,{ok:false,status:"REJECTED",error:"FRAME_WITHOUT_CAMERA_CONTRACT"});
  const required=["shot_id","frame_id","beat_id","shot_type","subject","purpose","camera_position","lens","composition","blocking","eyeline","movement","duration_seconds","transition"];
  const missing=shots.flatMap(s=>required.filter(k=>s[k]===undefined||s[k]===null).map(k=>s.shot_id+":"+k));
  if(missing.length)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_SHOT_CONTRACT",missing});
  for(const s of shots){
   if(beats[s.beat_id]&&typeof beats[s.beat_id].duration_seconds==="number"&&s.duration_seconds>beats[s.beat_id].duration_seconds)return out(res,422,{ok:false,status:"REJECTED",error:"SHOT_DURATION_OUTSIDE_BEAT",shot_id:s.shot_id});
  }
  const active=Array.isArray(spatial.active_character_ids)?spatial.active_character_ids:[];
  if(active.length>5)return out(res,422,{ok:false,status:"REJECTED",error:"ACTIVE_CHARACTER_COUNT_ABOVE_5"});
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"SHOT_CAMERA_RESOLVED",shot_map:shots,camera_continuity_state:b.camera_continuity_state||{},composition_contracts:shots.map(s=>({shot_id:s.shot_id,composition:s.composition,subject:s.subject,purpose:s.purpose})),frame_camera_package:shots,visual_generation_handoff:"CSD003_READY"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-017 failed",detail:e.message})}
};