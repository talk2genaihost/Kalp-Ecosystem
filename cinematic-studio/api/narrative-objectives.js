const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-015-narrative-state-scene-objective-resolution.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,objective_model:c.objective_model,objective_domains:c.objective_domains,objective_resolution_pipeline:c.objective_resolution_pipeline,objective_rules:c.objective_rules,frame_objective_map:c.frame_objective_map,hard_failures:c.hard_failures,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const s=b.scene||{},chars=Array.isArray(s.active_characters)?s.active_characters:[], snapshot=b.canonical_snapshot;
  if(!snapshot)return out(res,400,{ok:false,error:"canonical_snapshot is required."});
  if(chars.length<1||chars.length>5)return out(res,422,{ok:false,status:"REJECTED",error:"ACTIVE_CHARACTER_COUNT_ABOVE_5"});
  if(!s.primary_objective)return out(res,422,{ok:false,status:"REJECTED",error:"MISSING_PRIMARY_OBJECTIVE"});
  const ids=chars.map(x=>x.character_id);const noFn=chars.filter(x=>!x.scene_role||!x.objective);
  if(noFn.length)return out(res,422,{ok:false,status:"REJECTED",error:"ACTIVE_CHARACTER_WITHOUT_FUNCTION",characters:noFn.map(x=>x.character_id)});
  if(!s.turning_point?.event_id)return out(res,422,{ok:false,status:"REJECTED",error:"TURNING_POINT_WITHOUT_EVENT"});
  if(!s.required_end_state)return out(res,422,{ok:false,status:"REJECTED",error:"END_STATE_NOT_REPRESENTABLE"});
  if(!s.next_scene_hook||!s.next_scene_hook_source)return out(res,422,{ok:false,status:"REJECTED",error:"NEXT_HOOK_WITHOUT_CAUSAL_SOURCE"});
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"NARRATIVE_OBJECTIVES_RESOLVED",scene_objective_contract:s,character_objectives:chars,conflict_map:s.conflict_map||[],emotional_trajectory:s.emotional_trajectory||null,audience_objective:s.audience_objective||null,turning_point:s.turning_point,required_end_state:s.required_end_state,next_scene_hook:s.next_scene_hook,frame_objective_map:c.frame_objective_map,canonical_snapshot_ref:{scene_id:snapshot.scene_id,scene_version:snapshot.scene_version},orchestration_handoff:"READY",frame_handoff:"CSD002_READY"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-015 failed",detail:e.message})}
};