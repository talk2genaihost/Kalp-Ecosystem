const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-044-production-execution-reconciliation-resilience.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,resilience_domains:c.resilience_domains,reconciliation_states:c.reconciliation_states,evidence_sources:c.evidence_sources,identity_keys:c.identity_keys,reconciliation_pipeline:c.reconciliation_pipeline,outcome_classes:c.outcome_classes,retry_policy:c.retry_policy,capacity_reconciliation:c.capacity_reconciliation,callback_policy:c.callback_policy,resilience_actions:c.resilience_actions,governance:c.governance,resilience_sla:c.resilience_sla,reconciliation_record:c.reconciliation_record,demo:c.demo,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const reqd=c.reconciliation_record.required,missing=reqd.filter(k=>b[k]===undefined||b[k]===null||b[k]===""),issues=[];
  if(missing.length)issues.push("MISSING_RECONCILIATION_FIELDS:"+missing.join(","));
  if(b.blind_retry===true)issues.push("BLIND_RETRY");
  if(b.duplicate_dispatch===true)issues.push("DUPLICATE_DISPATCH");
  if(b.release_unknown_capacity===true)issues.push("RELEASE_UNKNOWN_CAPACITY");
  if(b.master_conflict===true)issues.push("MASTER_CONFLICT");
  if(b.identity_conflict===true)issues.push("IDENTITY_CONFLICT");
  const outcome=b.outcome_class||"PROVIDER_STATE_UNKNOWN";
  const action=outcome==="CONFIRMED_SUCCESS"?"RELEASE_CAPACITY":outcome==="DUPLICATE_EVENT"?"NO_ACTION":outcome==="PROVIDER_STATE_UNKNOWN"?"HOLD_CAPACITY":outcome==="PARTIAL_RESULT"?"QUARANTINE_RESULT":outcome==="CONFIRMED_FAILURE_RETRYABLE"?"REQUEST_AUTHORIZED_RETRY":"ESCALATE_RECONCILIATION";
  const retry=outcome==="CONFIRMED_FAILURE_RETRYABLE"?"GOVERNOR_REVIEW":outcome==="CONFIRMED_FAILURE_TERMINAL"?"NO_RETRY_UNLESS_AUTHORIZED":"NO_RETRY";
  return out(res,issues.length?422:200,{ok:issues.length===0,engine_id:c.engine_id,reconciliation_id:b.reconciliation_id||null,outcome_class:outcome,capacity_action:issues.length?"HOLD":action,retry_decision:issues.length?"BLOCKED":retry,issues,next_action:issues.length?"QUARANTINE_AND_ESCALATE":outcome==="CONFIRMED_SUCCESS"?"FORWARD_TO_CSD-032":outcome==="PROVIDER_STATE_UNKNOWN"?"QUERY_PROVIDER_AND_HOLD":"APPLY_RECONCILIATION",canonical_history_mutated:false,creative_gates_unchanged:true});
 }catch(e){return out(res,500,{ok:false,error:"CSD-044 failed",detail:e.message})}
};