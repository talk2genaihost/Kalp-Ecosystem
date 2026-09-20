const fs=require("fs"),path=require("path");
function load(){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","csd-024-scene-visual-effects-energy-dynamics.json"),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load();
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,vfx_model:c.vfx_model,effect_schema:c.effect_schema,energy_state:c.energy_state,aura_schema:c.aura_schema,particle_schema:c.particle_schema,shockwave_schema:c.shockwave_schema,power_collision_schema:c.power_collision_schema,light_interaction:c.light_interaction,dissipation_model:c.dissipation_model,vfx_continuity:c.vfx_continuity,vfx_rules:c.vfx_rules,vfx_pipeline:c.vfx_pipeline,validation:c.validation,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const effects=Array.isArray(b.effects)?b.effects:[], active=Array.isArray(b.active_character_ids)?b.active_character_ids:[];
  if(!effects.length)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_VFX_PACKAGE"});
  if(active.length>5)return out(res,422,{ok:false,status:"REJECTED",error:"ACTIVE_CHARACTER_COUNT_ABOVE_5"});
  const reqd=["effect_id","source","source_event","effect_type","state","start_time","peak_time","end_time","position","scale","intensity","trajectory","environment_interaction","light_interaction","continuity_state"];
  for(const e of effects)for(const k of reqd)if(e[k]===undefined||e[k]===null)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_VFX_CONTRACT",effect_id:e.effect_id});
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"VFX_ENERGY_RESOLVED",vfx_contract:b.vfx_contract||{},energy_state_map:b.energy||[],aura_map:b.aura||[],particle_map:b.particles||[],shockwave_map:b.shockwaves||[],power_collision_map:b.collisions||[],light_interaction_map:b.light_interaction||[],dissipation_map:b.dissipation||[],frame_vfx_package:{effects},production_handoff:"CMSE010_READY"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-024 failed",detail:e.message})}
};