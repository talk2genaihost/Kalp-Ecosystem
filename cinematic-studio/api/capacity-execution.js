const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-043-production-capacity-execution-adapter.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,execution_domains:c.execution_domains,adapter_contract:c.adapter_contract,execution_pipeline:c.execution_pipeline,dispatch_envelope:c.dispatch_envelope,admission_gates:c.admission_gates,provider_response_states:c.provider_response_states,handoff_mapping:c.handoff_mapping,failure_policy:c.failure_policy,capacity_policy:c.capacity_policy,governance:c.governance,execution_record:c.execution_record,demo:c.demo,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const reqd=c.dispatch_envelope.required,missing=reqd.filter(k=>b[k]===undefined||b[k]===null||b[k]===""),issues=[];
  if(missing.length)issues.push("MISSING_DISPATCH_FIELDS:"+missing.join(","));
  ["lease_expired","plan_mismatch","capability_mismatch","master_mismatch","provider_not_approved","governor_bypass","continuity_blocker","branch_inactive"].forEach(k=>{if(b[k]===true)issues.push(k.toUpperCase())});
  if(b.provider_concurrency_exceeded===true)issues.push("PROVIDER_CONCURRENCY_EXCEEDED");
  if(b.capacity_state!=="RESERVED"&&b.capacity_state!=="ACTIVE"&&b.capacity_state!=="ALLOCATED")issues.push("CAPACITY_NOT_DISPATCHABLE");
  const state=b.provider_state||"UNKNOWN";
  const handoff=state==="ACCEPTED"?"CSD-031_PROVIDER_ACCEPTED":state==="QUEUED"?"CSD-031_QUEUED":state==="RUNNING"?"CSD-031_RUNNING":(state==="TIMEOUT"||state==="UNKNOWN")?"CSD-031_RECONCILIATION_REQUIRED":"CSD-031_FAILED_RETRYABLE";
  return out(res,issues.length?422:200,{ok:issues.length===0,engine_id:c.engine_id,dispatch_id:b.dispatch_id||null,job_id:b.job_id||null,provider_job_id:b.provider_job_id||null,admission_state:issues.length?"BLOCKED":"ADMITTED",provider_state:state,handoff,capacity_state:issues.length?"HOLD":(state==="ACCEPTED"||state==="QUEUED"||state==="RUNNING")?"IN_USE":"RELEASE_PENDING",issues,next_action:issues.length?"DO_NOT_DISPATCH":state==="TIMEOUT"||state==="UNKNOWN"?"RECONCILE_WITH_CSD-031":"HANDOFF_TO_CSD-031",canonical_history_mutated:false,creative_gates_unchanged:true});
 }catch(e){return out(res,500,{ok:false,error:"CSD-043 failed",detail:e.message})}
};