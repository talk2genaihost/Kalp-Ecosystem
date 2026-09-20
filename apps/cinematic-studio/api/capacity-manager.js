const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-042-production-resource-negotiation-capacity-manager.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,resource_domains:c.resource_domains,capacity_states:c.capacity_states,provider_capability_record:c.provider_capability_record,negotiation_pipeline:c.negotiation_pipeline,negotiation_policy:c.negotiation_policy,allocation_lease:c.allocation_lease,reconciliation_rules:c.reconciliation_rules,dynamic_triggers:c.dynamic_triggers,governance:c.governance,failure_modes:c.failure_modes,manager_record:c.manager_record,demo:c.demo,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const reqd=c.manager_record.required,missing=reqd.filter(k=>b[k]===undefined||b[k]===null||b[k]===""),issues=[];
  if(missing.length)issues.push("MISSING_CAPACITY_FIELDS:"+missing.join(","));
  if(b.provider_capability_exceeded===true)issues.push("PROVIDER_CAPABILITY_EXCEEDED");
  if(b.unapproved_provider===true)issues.push("UNAPPROVED_PROVIDER");
  if(b.silent_provider_switch===true)issues.push("SILENT_PROVIDER_SWITCH");
  if(b.plan_version_mismatch===true)issues.push("PLAN_VERSION_MISMATCH");
  if(b.bypass_governor===true)issues.push("CSD-037_GOVERNOR_BYPASS");
  const state=b.capacity_state||"UNKNOWN";
  if(state==="UNKNOWN"||state==="REJECTED"||state==="EXPIRED")issues.push("CAPACITY_NOT_ADMISSIBLE:"+state);
  const actions=b.actions||[];
  const operator=actions.some(x=>x.authorization_class==="OPERATOR_REVIEW");
  const governor=actions.some(x=>x.authorization_class==="GOVERNOR_REVIEW");
  const authorization=operator?"OPERATOR_REVIEW":governor?"GOVERNOR_REVIEW":"AUTO_EXECUTABLE";
  return out(res,issues.length?422:200,{ok:issues.length===0,engine_id:c.engine_id,capacity_transaction_id:b.capacity_transaction_id||null,capacity_state:state,verified_quantity:b.verified_quantity||0,authorization_class:authorization,issues,next_action:issues.length?"RECONCILE_OR_REPLAN":operator?"REQUEST_OPERATOR_REVIEW":governor?"SEND_TO_CSD-037_FOR_REVIEW":"BIND_LEASE_AND_HANDOFF",canonical_history_mutated:false,creative_gates_unchanged:true});
 }catch(e){return out(res,500,{ok:false,error:"CSD-042 failed",detail:e.message})}
};