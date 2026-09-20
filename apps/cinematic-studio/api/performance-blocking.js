const fs=require("fs"),path=require("path");
function load(){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","csd-021-scene-performance-blocking.json"),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load();
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,performance_model:c.performance_model,blocking_schema:c.blocking_schema,performance_schema:c.performance_schema,interpersonal_geometry:c.interpersonal_geometry,performance_rules:c.performance_rules,reaction_model:c.reaction_model,blocking_pipeline:c.blocking_pipeline,validation:c.validation,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const performance=Array.isArray(b.performance)?b.performance:[], blocking=Array.isArray(b.blocking)?b.blocking:[];
  if(!performance.length||!blocking.length)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_PERFORMANCE_BLOCKING_PACKAGE"});
  const active=Array.isArray(b.active_character_ids)?b.active_character_ids:[];
  if(active.length>5)return out(res,422,{ok:false,status:"REJECTED",error:"ACTIVE_CHARACTER_COUNT_ABOVE_5"});
  for(const p of performance){
   for(const k of ["performance_id","character_id","beat_id","objective","emotional_state","internal_state","facial_expression","eye_behavior","posture","gesture","breath","voice_body_alignment","reaction_trigger"])
    if(p[k]===undefined||p[k]===null)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_PERFORMANCE_CONTRACT",performance_id:p.performance_id});
  }
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"PERFORMANCE_BLOCKING_RESOLVED",performance_contract:performance,blocking_map:blocking,interpersonal_geometry_map:b.interpersonal_geometry||[],eyeline_network:b.eyeline_network||[],reaction_map:b.reaction_map||[],frame_performance_package:{performance,blocking},production_handoff:"CMSE010_READY"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-021 failed",detail:e.message})}
};