const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-037-production-readiness-autopilot-execution-governor.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,governor_states:c.governor_states,readiness_policy:c.readiness_policy,admission_gates:c.admission_gates,execution_controls:c.execution_controls,health_response:c.health_response,pause_resume:c.pause_resume,escalation:c.escalation,execution_ledger:c.execution_ledger,decision_states:c.decision_states,demo:c.demo,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const required=["governor_decision_id","health_snapshot_id","authorization_id","job_id","master_revision","master_fingerprint","health_state","readiness_state"],missing=required.filter(k=>b[k]===undefined||b[k]===null||b[k]===""),issues=[];
  if(missing.length)issues.push("MISSING_GOVERNOR_FIELDS:"+missing.join(","));
  if(b.master_fingerprint&&b.expected_master_fingerprint&&b.master_fingerprint!==b.expected_master_fingerprint)issues.push("MASTER_FINGERPRINT_MISMATCH");
  if(b.canonical_graph_corrupt===true)issues.push("CANONICAL_GRAPH_CORRUPTION");
  if(b.active_branch_explicit===false)issues.push("ACTIVE_BRANCH_AMBIGUITY");
  if(b.blocking_continuity_issue===true)issues.push("CONTINUITY_BLOCK");
  if(b.superseded_dependency===true)issues.push("SUPERSEDED_ACTIVE_DEPENDENCY");
  if(b.orphan_job===true)issues.push("ORPHAN_JOB");
  const critical=issues.some(x=>["MASTER_FINGERPRINT_MISMATCH","CANONICAL_GRAPH_CORRUPTION","ACTIVE_BRANCH_AMBIGUITY","CONTINUITY_BLOCK"].includes(x));
  const health=b.health_state;
  let decision="BLOCKED",state="BLOCKED",next="BLOCK_NEW_ADMISSIONS";
  if(!issues.length&&health==="HEALTHY"&&["READY_FOR_PRODUCTION","PRODUCTION_LOCKED"].includes(b.readiness_state)){decision="ADMITTED";state="ADMITTING";next="DISPATCH_TO_CMSE-015"}
  else if(!issues.length&&health==="DEGRADED"&&b.job_whitelisted===true){decision="CONDITIONALLY_ADMITTED";state="DEGRADED_EXECUTION";next="REDUCE_CONCURRENCY_AND_DISPATCH"}
  else if(critical){decision="PAUSED";state="PAUSED";next="RECONCILE_AND_REQUEST_FRESH_AUTHORIZATION"}
  else if(health==="RECOVERING"){decision="HELD";state="PAUSED";next="WAIT_FOR_CSD-035_RECOVERY"}
  return out(res,issues.length&&missing.length?422:200,{ok:decision!=="BLOCKED",engine_id:c.engine_id,governor_decision_id:b.governor_decision_id||null,decision_state:decision,governor_state:state,issues,admission_authorized:["ADMITTED","CONDITIONALLY_ADMITTED"].includes(decision),new_admissions:decision==="BLOCKED"||decision==="PAUSED"?"STOP":"ALLOW",next_action:next,execution_ledger:{append_only:true,health_snapshot_id:b.health_snapshot_id||null,authorization_id:b.authorization_id||null,job_id:b.job_id||null,master_revision:b.master_revision||null,master_fingerprint:b.master_fingerprint||null}});
 }catch(e){return out(res,500,{ok:false,error:"CSD-037 failed",detail:e.message})}
};