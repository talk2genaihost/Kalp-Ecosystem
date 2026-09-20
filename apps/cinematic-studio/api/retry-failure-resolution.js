const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-045-production-retry-failure-resolution.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,failure_domains:c.failure_domains,resolution_classes:c.resolution_classes,retry_pipeline:c.retry_pipeline,retry_eligibility:c.retry_eligibility,failure_resolution_map:c.failure_resolution_map,retry_controls:c.retry_controls,retry_budget:c.retry_budget,backoff_policy:c.backoff_policy,governance:c.governance,resolution_record:c.resolution_record,demo:c.demo,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const reqd=c.resolution_record.required,missing=reqd.filter(k=>b[k]===undefined||b[k]===null||b[k]===""),issues=[];
  if(missing.length)issues.push("MISSING_RESOLUTION_FIELDS:"+missing.join(","));
  ["provider_state_unknown","identity_conflict","master_conflict","policy_block","budget_hard_limit","continuity_block","blind_retry","infinite_retry","unapproved_provider","bypass_governor","reuse_attempt_id"].forEach(k=>{if(b[k]===true)issues.push(k.toUpperCase())});
  if(b.retry_budget_state==="EXCEEDED")issues.push("RETRY_BUDGET_EXCEEDED");
  const f=b.failure_class||"UNKNOWN";
  const map=c.failure_resolution_map[f]||"QUARANTINE";
  const eligible=b.retry_eligibility==="ELIGIBLE"&&issues.length===0;
  const resolution=eligible?(b.resolution_class||map):"QUARANTINE";
  const authorization=resolution==="RETRY_WITH_BACKOFF"||resolution==="RETRY_SAME_CONFIGURATION"||resolution==="REASSEMBLE_AND_RETRY"?"GOVERNOR_REVIEW":"OPERATOR_REVIEW";
  return out(res,issues.length?422:200,{ok:issues.length===0,engine_id:c.engine_id,resolution_id:b.resolution_id||null,failure_class:f,retry_eligible:eligible,resolution_class:resolution,authorization_class:authorization,issues,next_action:issues.length?"QUARANTINE_AND_ESCALATE":eligible?"REQUEST_CSD-037_AUTHORIZATION":"ROUTE_TO_CSD-035_OR_ESCALATE",new_attempt_id:eligible?(b.new_attempt_id||null):null,canonical_history_mutated:false,creative_gates_unchanged:true});
 }catch(e){return out(res,500,{ok:false,error:"CSD-045 failed",detail:e.message})}
};