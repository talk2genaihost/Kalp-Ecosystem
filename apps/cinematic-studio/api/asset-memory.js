const crypto=require("crypto");
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
function id(prefix,value){return prefix+"-"+crypto.createHash("sha256").update(String(value)).digest("hex").slice(0,20)}
module.exports=async function handler(req,res){
 try{
  const c=require("../data/cmse-011-asset-memory.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,asset_classes:c.asset_classes,versioning_rules:c.versioning_rules,continuity_model:c.continuity_model,retrieval_contract:c.retrieval_contract,master_promotion:c.master_promotion,validation:c.validation,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  const b=req.body||{},e=b.cmse_010_result||b.execution_result;
  if(!e)return out(res,422,{ok:false,error:"CMSE-010 execution result is required."});
  if(!["SUCCEEDED","REGISTERED"].includes(e.state))return out(res,409,{ok:false,status:"EXECUTION_NOT_TERMINALLY_SUCCESSFUL"});
  if(!e.asset_url&&!(e.asset&&e.asset.url))return out(res,422,{ok:false,error:"asset location is required."});
  const frame_id=e.frame_id||"UNKNOWN",scene_id=e.scene_id||"UNKNOWN",asset_id=id("ASSET",e.execution_job_id+"|"+frame_id),version_id=id("VER",asset_id+"|"+(e.provider_job_id||e.dispatch_id||"RESULT"));
  const asset={
    asset_id,version_id,asset_class:b.asset_class||"PROVIDER_VARIANT",status:b.validation_status==="PASS"?"VALIDATED":"CANDIDATE",
    scene_id,frame_id,character_ids:b.character_ids||[],story_arc_id:b.story_arc_id||null,
    media:{url:e.asset_url||(e.asset||{}).url,mime_type:e.mime_type||e.asset?.mime_type||"unknown"},
    source_lineage:{execution_job_id:e.execution_job_id,provider_id:e.provider_id,model_id:e.model_id,route_fingerprint:e.route_fingerprint||null,translation_fingerprint:e.translation_fingerprint||null,assembly_fingerprint:e.assembly_fingerprint||null,validation_fingerprint:e.validation_fingerprint||null},
    continuity_links:b.continuity_links||[],
    canonical_reference:b.canonical_reference||false,
    master_promotion:{state:b.master_promotion_state||"CANDIDATE",requirements:c.master_promotion.requirements},
    retrieval_metadata:{asset_class:b.asset_class||"PROVIDER_VARIANT",character_ids:b.character_ids||[],scene_id,frame_id,story_arc_id:b.story_arc_id||null}
  };
  const record_fingerprint=crypto.createHash("sha256").update(JSON.stringify(asset)).digest("hex").slice(0,24);
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"ASSET_REGISTERED",asset,record_fingerprint,next_stage:"CMSE-012-INTELLIGENT-PRODUCTION-RETRIEVAL"});
 }catch(e){return out(res,500,{ok:false,error:"CMSE-011 failed",detail:e.message})}
};