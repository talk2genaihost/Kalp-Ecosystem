const fs=require("fs"),path=require("path");
function load(){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","csd-027-scene-asset-continuity-dependency.json"),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load();
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,dependency_model:c.dependency_model,asset_domains:c.asset_domains,dependency_schema:c.dependency_schema,asset_record:c.asset_record,continuity_fingerprint:c.continuity_fingerprint,invalidation_model:c.invalidation_model,reuse_resolution:c.reuse_resolution,dependency_graph:c.dependency_graph,production_manifest:c.production_manifest,pipeline:c.pipeline,validation:c.validation,output_contract:c.output_contract,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const deps=Array.isArray(b.dependencies)?b.dependencies:[], assets=Array.isArray(b.assets)?b.assets:[], active=Array.isArray(b.active_character_ids)?b.active_character_ids:[];
  if(active.length>5)return out(res,422,{ok:false,status:"REJECTED",error:"ACTIVE_CHARACTER_COUNT_ABOVE_5"});
  if(!deps.length)return out(res,422,{ok:false,status:"REJECTED",error:"MISSING_HARD_DEPENDENCY"});
  const reqd=["dependency_id","source_type","source_id","target_type","target_id","dependency_type","strength","version","validation_status","invalidation_policy"];
  for(const d of deps)for(const k of reqd)if(d[k]===undefined||d[k]===null)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_DEPENDENCY",dependency_id:d.dependency_id});
  if(deps.some(d=>d.validation_status!=="VALIDATED"))return out(res,422,{ok:false,status:"REJECTED",error:"UNVALIDATED_DEPENDENCY"});
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"DEPENDENCIES_RESOLVED",dependency_graph:deps,asset_resolution:b.asset_resolution||assets,invalidation_map:b.invalidation_map||{},regeneration_queue:b.regeneration_queue||[],production_manifest:b.production_manifest||{},continuity_fingerprint:b.continuity_fingerprint||null,production_handoff:"CMSE010_READY"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-027 failed",detail:e.message})}
};