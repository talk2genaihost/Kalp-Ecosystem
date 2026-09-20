const fs=require("fs"),path=require("path");
function load(){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","csd-028-scene-asset-versioning-master-continuity.json"),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load();
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,registry_model:c.registry_model,asset_identity:c.asset_identity,version_schema:c.version_schema,master_registry:c.master_registry,lineage_schema:c.lineage_schema,approval_model:c.approval_model,fingerprint_model:c.fingerprint_model,provider_registry:c.provider_registry,cross_scene_reuse:c.cross_scene_reuse,supersession_model:c.supersession_model,rollback_model:c.rollback_model,registry_rules:c.registry_rules,registry_pipeline:c.registry_pipeline,validation:c.validation,output_contract:c.output_contract,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const versions=Array.isArray(b.versions)?b.versions:[], active=Array.isArray(b.active_character_ids)?b.active_character_ids:[];
  if(active.length>5)return out(res,422,{ok:false,status:"REJECTED",error:"ACTIVE_CHARACTER_COUNT_ABOVE_5"});
  if(!versions.length)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_ASSET_VERSION_PACKAGE"});
  const reqd=["asset_id","asset_version","version_type","created_from","created_at","created_by","change_reason","content_fingerprint","continuity_fingerprint","dependency_fingerprint","status"];
  for(const v of versions)for(const k of reqd)if(v[k]===undefined||v[k]===null)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_ASSET_VERSION",asset_id:v.asset_id,asset_version:v.asset_version});
  const masterAssets=new Set();
  for(const v of versions)if(v.status==="MASTER"){if(masterAssets.has(v.asset_id))return out(res,422,{ok:false,status:"REJECTED",error:"DUPLICATE_ACTIVE_MASTER",asset_id:v.asset_id});masterAssets.add(v.asset_id)}
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"MASTER_REGISTRY_RESOLVED",asset_registry:b.asset_registry||{},version_registry:versions,master_registry:b.master_registry||{},lineage_graph:b.lineage_graph||[],provider_registry:b.provider_registry||[],reuse_registry:b.reuse_registry||[],supersession_registry:b.supersession_registry||[],rollback_registry:b.rollback_registry||[],production_handoff:"CMSE011_CMSE012_READY"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-028 failed",detail:e.message})}
};