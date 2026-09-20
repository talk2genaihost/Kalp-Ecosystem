const fs=require("fs"),path=require("path");
function load(){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","csd-026-scene-environmental-continuity-world-memory.json"),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load();
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,memory_model:c.memory_model,memory_scope:c.memory_scope,location_memory_schema:c.location_memory_schema,world_state_schema:c.world_state_schema,memory_entry_schema:c.memory_entry_schema,reentry_reconstruction:c.reentry_reconstruction,recovery_and_repair:c.recovery_and_repair,cross_scene_continuity:c.cross_scene_continuity,historical_integrity:c.historical_integrity,world_memory_hierarchy:c.world_memory_hierarchy,continuity_rules:c.continuity_rules,memory_pipeline:c.memory_pipeline,validation:c.validation,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const d=Array.isArray(b.deltas)?b.deltas:[], active=Array.isArray(b.active_character_ids)?b.active_character_ids:[];
  if(!d.length)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_WORLD_MEMORY_PACKAGE"});
  if(active.length>5)return out(res,422,{ok:false,status:"REJECTED",error:"ACTIVE_CHARACTER_COUNT_ABOVE_5"});
  const reqd=["delta_id","location_id","source_scene_id","source_event","narrative_time","domain","before_state","after_state","persistence","causal_chain","validation_status"];
  for(const x of d)for(const k of reqd)if(x[k]===undefined||x[k]===null)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_MEMORY_DELTA",delta_id:x.delta_id});
  if(d.some(x=>x.validation_status!=="VALIDATED"))return out(res,422,{ok:false,status:"REJECTED",error:"UNVALIDATED_DELTA_IN_MEMORY"});
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"WORLD_MEMORY_RESOLVED",location_memory:b.location_memory||{},world_state_snapshot:b.world_state_snapshot||{},historical_delta_chain:d,recovery_state:b.recovery_state||{},reentry_context:b.reentry_context||{},frame_environment_package:b.frame_environment||{},production_handoff:"CMSE011_CMSE010_READY"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-026 failed",detail:e.message})}
};