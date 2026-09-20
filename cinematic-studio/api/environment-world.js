const fs=require("fs"),path=require("path");
function load(){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","csd-025-scene-environment-world-reaction.json"),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load();
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,world_reaction_model:c.world_reaction_model,environment_domains:c.environment_domains,reaction_schema:c.reaction_schema,causal_authority:c.causal_authority,propagation_model:c.propagation_model,persistence_model:c.persistence_model,world_delta_schema:c.world_delta_schema,environment_continuity:c.environment_continuity,reaction_rules:c.reaction_rules,world_reaction_pipeline:c.world_reaction_pipeline,validation:c.validation,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const reactions=Array.isArray(b.reactions)?b.reactions:[], active=Array.isArray(b.active_character_ids)?b.active_character_ids:[];
  if(!reactions.length)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_WORLD_REACTION_PACKAGE"});
  if(active.length>5)return out(res,422,{ok:false,status:"REJECTED",error:"ACTIVE_CHARACTER_COUNT_ABOVE_5"});
  const reqd=["reaction_id","source_event","source_type","target_domain","target_id","pre_state","reaction_type","magnitude","start_time","peak_time","end_time","spatial_extent","observable_effect","persistence","recovery_state","continuity_state"];
  for(const r of reactions)for(const k of reqd)if(r[k]===undefined||r[k]===null)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_REACTION_CONTRACT",reaction_id:r.reaction_id});
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"WORLD_REACTION_RESOLVED",reaction_map:reactions,propagation_map:b.propagation||[],persistence_map:b.persistence||[],world_delta_map:b.world_deltas||[],frame_environment_package:b.frame_environment||{},production_handoff:"CMSE010_READY"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-025 failed",detail:e.message})}
};