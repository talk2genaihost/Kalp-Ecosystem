const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-035-continuity-reconciliation-autonomous-recovery.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,recovery_states:c.recovery_states,action_classes:c.action_classes,autonomy_policy:c.autonomy_policy,recovery_pipeline:c.recovery_pipeline,ordering_rules:c.ordering_rules,reconciliation_checks:c.reconciliation_checks,recovery_outcomes:c.recovery_outcomes,safety_invariants:c.safety_invariants,recovery_record:c.recovery_record,demo:c.demo,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const required=["recovery_id","source_change_id","affected_nodes","action_plan","canonical_source_fingerprint"];
  const missing=required.filter(k=>b[k]===undefined||b[k]===null||b[k]===""),issues=[];
  if(missing.length)issues.push("MISSING_RECOVERY_FIELDS:"+missing.join(","));
  if(b.canonical_mutation===true)issues.push("CANONICAL_MUTATION_FORBIDDEN");
  if(b.bypass_validation===true)issues.push("VALIDATION_BYPASS_FORBIDDEN");
  if(b.silent_branch_switch===true)issues.push("SILENT_BRANCH_SWITCH_FORBIDDEN");
  if(b.unresolved_canonical_conflict===true)issues.push("CANONICAL_CONFLICT_REQUIRES_AUTHORIZATION");
  const authRequired=Array.isArray(b.action_plan)&&b.action_plan.some(x=>["IDENTITY_CHANGE","CANONICAL_SCENE_CHANGE","BRANCH_PROMOTION","HISTORICAL_REVISION","MASTER_ASSET_REPLACEMENT"].includes(x.action_class));
  const authorization=authRequired?(b.authorization_state||"REQUIRED"):"AUTO_ALLOWED";
  const blocked=issues.length||authorization==="REQUIRED";
  return out(res,blocked?422:200,{ok:!blocked,engine_id:c.engine_id,recovery_id:b.recovery_id||null,source_change_id:b.source_change_id||null,state:blocked?"RECOVERY_BLOCKED":"PLAN_BUILT",authorization_state:authorization,action_plan:b.action_plan||[],ordering:"DEPENDENCY_SAFE_LEAF_FIRST",canonical_history_mutated:false,last_valid_versions_preserved:true,next_action:blocked?(authorization==="REQUIRED"?"REQUEST_AUTHORIZATION":"REPAIR_RECOVERY_INPUT"):"EXECUTE_RECOVERY_PLAN"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-035 failed",detail:e.message})}
};