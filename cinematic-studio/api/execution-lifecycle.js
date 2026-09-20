const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-031-execution-observability-job-lifecycle.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,lifecycle:c.lifecycle,terminal_states:c.terminal_states,failure_taxonomy:c.failure_taxonomy,observability:c.observability,transition_rules:c.transition_rules,job_contract:c.job_contract,reconciliation:c.reconciliation,demo:c.demo,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const required=c.job_contract.required,missing=required.filter(k=>b[k]===undefined||b[k]===null||b[k]==="");
  const errors=[];
  if(missing.length)errors.push("MISSING_JOB_FIELDS:"+missing.join(","));
  if(b.attempt_id!==undefined && (!Number.isInteger(b.attempt_id)||b.attempt_id<1))errors.push("INVALID_ATTEMPT_ID");
  if(b.master_fingerprint && b.input_fingerprint && b.master_fingerprint!==b.expected_master_fingerprint && b.expected_master_fingerprint)errors.push("MASTER_FINGERPRINT_MISMATCH");
  if(b.event_type==="PROVIDER_CALLBACK"&&!b.provider_job_id)errors.push("MISSING_PROVIDER_JOB_ID");
  const current=b.current_state||"CREATED", event=b.event_type||"JOB_CREATED";
  const retryable=c.failure_taxonomy.RETRYABLE.includes(b.failure_code);
  const reconcile=c.failure_taxonomy.RECONCILIATION_REQUIRED.includes(b.failure_code);
  const terminal=c.failure_taxonomy.TERMINAL.includes(b.failure_code);
  let next=current;
  if(errors.length)next="RECONCILIATION_REQUIRED";
  else if(event==="JOB_CREATED")next="VALIDATED";
  else if(event==="QUEUED")next="QUEUED";
  else if(event==="DISPATCHED")next="DISPATCHED";
  else if(event==="PROVIDER_ACCEPTED")next="PROVIDER_ACCEPTED";
  else if(event==="RUNNING")next="RUNNING";
  else if(event==="PROVIDER_COMPLETED")next="RESULT_INGESTED";
  else if(event==="QA_PASSED")next="COMPLETED";
  else if(event==="FAILURE")next=retryable?"RETRY_PENDING":reconcile?"RECONCILIATION_REQUIRED":terminal?"FAILED_TERMINAL":"RECONCILIATION_REQUIRED";
  else if(event==="RETRY_REQUESTED")next="RETRY_PENDING";
  else if(event==="CANCEL_REQUESTED")next="CANCEL_REQUESTED";
  else if(event==="CANCELLED")next="CANCELLED";
  else if(event==="RECONCILED")next="RECONCILED";
  return out(res,errors.length?422:200,{ok:!errors.length,engine_id:c.engine_id,job_id:b.job_id||null,attempt_id:b.attempt_id||null,from_state:current,to_state:next,event_type:event,failure_class:retryable?"RETRYABLE":reconcile?"RECONCILIATION_REQUIRED":terminal?"TERMINAL":null,canonical_master_mutated:false,asset_promotion:next==="COMPLETED"?"DEFERRED_TO_CSD-032":"BLOCKED",audit_event:{event_id:"GENERATE-EVENT-ID",correlation_id:b.correlation_id||b.job_id||null},next_action:next==="RETRY_PENDING"?"CREATE_NEXT_ATTEMPT":next==="RECONCILIATION_REQUIRED"?"RECONCILE_PROVIDER_STATE":next==="COMPLETED"?"HANDOFF_TO_CSD-032":"CONTINUE_LIFECYCLE"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-031 failed",detail:e.message})}
};