const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-041-adaptive-production-strategy-resource-planner.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,planning_domains:c.planning_domains,plan_objects:c.plan_objects,planning_pipeline:c.planning_pipeline,priority_factors:c.priority_factors,resource_types:c.resource_types,allocation_policy:c.allocation_policy,execution_waves:c.execution_waves,dynamic_replanning_triggers:c.dynamic_replanning_triggers,replanning_policy:c.replanning_policy,governance:c.governance,plan_record:c.plan_record,demo:c.demo,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const reqd=c.plan_record.required,missing=reqd.filter(k=>b[k]===undefined||b[k]===null||b[k]===""),issues=[];
  if(missing.length)issues.push("MISSING_PLAN_FIELDS:"+missing.join(","));
  if(b.provider_capability_exceeded===true)issues.push("PROVIDER_CAPABILITY_EXCEEDED");
  if(b.bypass_admission===true)issues.push("CSD-037_ADMISSION_BYPASS");
  if(b.bypass_quality===true)issues.push("QUALITY_GATE_BYPASS");
  if(b.unapproved_provider===true)issues.push("UNAPPROVED_PROVIDER");
  if(b.silent_branch_change===true)issues.push("SILENT_BRANCH_CHANGE");
  const actions=b.actions||[];
  const operator=actions.some(x=>x.authorization_class==="OPERATOR_REVIEW");
  const governor=actions.some(x=>x.authorization_class==="GOVERNOR_REVIEW");
  const authorization=operator?"OPERATOR_REVIEW":governor?"GOVERNOR_REVIEW":"AUTO_EXECUTABLE";
  return out(res,issues.length?422:200,{ok:issues.length===0,engine_id:c.engine_id,plan_id:b.plan_id||null,plan_version:b.plan_version||null,critical_path:b.critical_path||[],resource_allocations:b.resource_allocations||[],execution_waves:b.execution_waves||[],authorization_class:authorization,issues,canonical_history_mutated:false,creative_gates_unchanged:true,next_action:issues.length?"REPAIR_PLAN_INPUT":operator?"REQUEST_OPERATOR_REVIEW":governor?"SEND_TO_CSD-037_FOR_REVIEW":"PUBLISH_TO_CSD-037"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-041 failed",detail:e.message})}
};