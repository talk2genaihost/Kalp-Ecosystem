const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-036-continuity-health-production-readiness.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,health_states:c.health_states,readiness_states:c.readiness_states,health_domains:c.health_domains,health_graph:c.health_graph,readiness_gates:c.readiness_gates,health_scoring:c.health_scoring,readiness_policy:c.readiness_policy,health_transitions:c.health_transitions,alert_classes:c.alert_classes,health_record:c.health_record,production_readiness_actions:c.production_readiness_actions,demo:c.demo,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const required=c.health_record.required,missing=required.filter(k=>b[k]===undefined||b[k]===null||b[k]===""),critical=Array.isArray(b.blocking_issues)&&b.blocking_issues.length>0;
  const score=Number.isFinite(Number(b.health_score))?Number(b.health_score):null;
  const gateFailures=Array.isArray(b.failed_gates)?b.failed_gates:[];
  const state=missing.length?"UNKNOWN":critical||gateFailures.length?"BLOCKED":score!==null&&score>=90?"HEALTHY":score!==null&&score>=75?"DEGRADED":"UNKNOWN";
  const readiness=state==="HEALTHY"&&score>=90&&gateFailures.length===0?"READY_FOR_PRODUCTION":state==="DEGRADED"&&gateFailures.length===0?"CONDITIONAL_READY":"NOT_READY";
  return out(res,missing.length?422:200,{ok:!missing.length,engine_id:c.engine_id,health_snapshot_id:b.health_snapshot_id||null,health_state:state,readiness_state:readiness,health_score:score,blocking_issues:b.blocking_issues||[],failed_gates:gateFailures,warnings:b.warnings||[],production_authorization:readiness==="READY_FOR_PRODUCTION"?"ELIGIBLE":readiness==="CONDITIONAL_READY"?"LIMITED":"BLOCKED",immutable_snapshot:true,next_action:readiness==="READY_FOR_PRODUCTION"?"AUTHORIZE_ELIGIBLE_JOBS":readiness==="CONDITIONAL_READY"?"PRESERVE_WARNINGS_AND_LIMIT_SCOPE":"BLOCK_DEPENDENT_PRODUCTION"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-036 failed",detail:e.message})}
};