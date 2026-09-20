const fs=require("fs"),path=require("path");
function load(){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","csd-022-scene-character-interaction-choreography.json"),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load();
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,interaction_model:c.interaction_model,interaction_schema:c.interaction_schema,choreography_schema:c.choreography_schema,relationship_dynamics:c.relationship_dynamics,contact_choreography:c.contact_choreography,multi_character_rules:c.multi_character_rules,combat_choreography:c.combat_choreography,interaction_pipeline:c.interaction_pipeline,validation:c.validation,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const interactions=Array.isArray(b.interactions)?b.interactions:[], choreography=Array.isArray(b.choreography)?b.choreography:[];
  if(!interactions.length||!choreography.length)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_INTERACTION_CHOREOGRAPHY_PACKAGE"});
  const active=Array.isArray(b.active_character_ids)?b.active_character_ids:[];
  if(active.length>5)return out(res,422,{ok:false,status:"REJECTED",error:"ACTIVE_CHARACTER_COUNT_ABOVE_5"});
  const required=["interaction_id","sequence","beat_id","initiator","receiver","interaction_type","initiator_intent","observable_action","receiver_perception","receiver_reaction","state_change","timing"];
  for(const i of interactions)for(const k of required)if(i[k]===undefined||i[k]===null)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_INTERACTION_CONTRACT",interaction_id:i.interaction_id});
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"INTERACTION_CHOREOGRAPHY_RESOLVED",interaction_contract:interactions,choreography_map:choreography,relationship_dynamics_map:b.relationship_dynamics||[],contact_choreography:b.contacts||[],combat_choreography:b.combat||[],reaction_map:b.reactions||[],frame_interaction_package:{interactions,choreography},production_handoff:"CMSE010_READY"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-022 failed",detail:e.message})}
};