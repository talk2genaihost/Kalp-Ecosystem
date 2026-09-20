const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-032-production-result-validation-asset-promotion.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,validation_stages:c.validation_stages,result_states:c.result_states,decision_policy:c.decision_policy,hard_gates:c.hard_gates,quality_dimensions:c.quality_dimensions,thresholds:c.thresholds,defect_classes:c.defect_classes,promotion_record:c.promotion_record,rework_routes:c.rework_routes,demo:c.demo,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const required=["logical_job_id","attempt_id","master_revision","master_fingerprint","provider_job_id","source_result_uri","result_fingerprint"];
  const missing=required.filter(k=>b[k]===undefined||b[k]===null||b[k]===""),issues=[];
  if(missing.length)issues.push("MISSING_RESULT_FIELDS:"+missing.join(","));
  if(b.master_fingerprint&&b.expected_master_fingerprint&&b.master_fingerprint!==b.expected_master_fingerprint)issues.push("MASTER_MISMATCH");
  if(b.provider_job_id&&b.expected_provider_job_id&&b.provider_job_id!==b.expected_provider_job_id)issues.push("PROVIDER_JOB_MISMATCH");
  if(b.identity_drift===true)issues.push("IDENTITY_DRIFT");
  if(b.lineage_complete===false)issues.push("LINEAGE_MISSING");
  if(b.media_integrity===false)issues.push("CORRUPT_MEDIA");
  if(b.canonical_state_conflict===true)issues.push("CANONICAL_STATE_CONFLICT");
  if(b.negative_constraint_breach===true)issues.push("NEGATIVE_CONSTRAINT_BREACH");
  if(b.future_state_leak===true)issues.push("UNAUTHORIZED_FUTURE_STATE");
  const score=Number.isFinite(Number(b.validation_score))?Number(b.validation_score):null;
  const hard=issues.length===0;
  let decision="QUARANTINE";
  if(!hard)decision="REJECT";
  else if(b.registry_approval===true && score!==null && score>=c.thresholds.PROMOTE)decision="PROMOTE";
  else if(score!==null && score>=c.thresholds.PROMOTION_PENDING)decision="PROMOTION_PENDING";
  else if(score!==null && score<c.thresholds.PROMOTION_PENDING)decision="REJECT";
  return out(res,hard?200:422,{ok:hard,engine_id:c.engine_id,result_state:hard?(decision==="PROMOTE"?"PROMOTED":decision):"VALIDATION_FAILED",decision,logical_job_id:b.logical_job_id||null,attempt_id:b.attempt_id||null,validation_score:score,hard_gates:hard?"PASS":"FAIL",issues,canonical_master_mutated:false,promotion_record:decision==="PROMOTE"?{asset_version_id:b.asset_version_id||"GENERATE-ASSET-VERSION-ID",registry_target:c.promotion_record.registry_target,immutable:true,lineage_complete:true}:null,next_action:decision==="PROMOTE"?"REGISTER_AND_LOCK_ASSET":decision==="PROMOTION_PENDING"?"AWAIT_REGISTRY_APPROVAL":decision==="QUARANTINE"?"RECONCILE_LINEAGE":"ROUTE_TO_REWORK"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-032 failed",detail:e.message})}
};