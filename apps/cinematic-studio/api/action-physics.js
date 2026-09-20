const fs=require("fs"),path=require("path");
function load(){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","csd-023-scene-action-combat-physical-dynamics.json"),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load();
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,dynamics_model:c.dynamics_model,action_schema:c.action_schema,combat_exchange_schema:c.combat_exchange_schema,force_model:c.force_model,weapon_dynamics:c.weapon_dynamics,power_dynamics:c.power_dynamics,impact_model:c.impact_model,recovery_model:c.recovery_model,environmental_response:c.environmental_response,action_readability:c.action_readability,physics_pipeline:c.physics_pipeline,validation:c.validation,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const actions=Array.isArray(b.actions)?b.actions:[], active=Array.isArray(b.active_character_ids)?b.active_character_ids:[];
  if(!actions.length)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_ACTION_PACKAGE"});
  if(active.length>5)return out(res,422,{ok:false,status:"REJECTED",error:"ACTIVE_CHARACTER_COUNT_ABOVE_5"});
  const reqd=["action_id","sequence","beat_id","actor","action_type","target","intent","start_state","trajectory","duration_seconds","impact_or_result","recovery_state","causal_source"];
  for(const a of actions)for(const k of reqd)if(a[k]===undefined||a[k]===null)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_ACTION_CONTRACT",action_id:a.action_id});
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"PHYSICAL_DYNAMICS_RESOLVED",action_contract:actions,combat_exchange_map:b.combat||[],force_map:b.force||[],impact_map:b.impacts||[],recovery_map:b.recovery||[],weapon_dynamics_map:b.weapons||[],power_dynamics_map:b.power||[],environmental_response_map:b.environment||[],action_readability_map:b.readability||[],frame_action_package:{actions,combat:b.combat||[],power:b.power||[]},production_handoff:"CMSE010_READY"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-023 failed",detail:e.message})}
};