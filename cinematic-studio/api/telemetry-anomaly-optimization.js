const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-039-production-telemetry-anomaly-optimization.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,analysis_domains:c.analysis_domains,anomaly_types:c.anomaly_types,severity:c.severity,evidence_policy:c.evidence_policy,detection_pipeline:c.detection_pipeline,optimization_actions:c.optimization_actions,optimization_constraints:c.optimization_constraints,recommendation_policy:c.recommendation_policy,optimization_score:c.optimization_score,recommendation_record:c.recommendation_record,demo:c.demo,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const required=c.recommendation_record.required,missing=required.filter(k=>b[k]===undefined||b[k]===null||b[k]===""),issues=[];
  if(missing.length)issues.push("MISSING_ANALYSIS_FIELDS:"+missing.join(","));
  if(!b.evidence||!b.baseline)issues.push("INSUFFICIENT_EVIDENCE_BASELINE");
  if(b.unapproved_provider===true)issues.push("UNAPPROVED_PROVIDER");
  if(b.terminal_retry_without_authorization===true)issues.push("UNAUTHORIZED_TERMINAL_RETRY");
  if(b.quality_gate_bypass===true)issues.push("QUALITY_GATE_BYPASS");
  const auto=["REDUCE_CONCURRENCY","INCREASE_CONCURRENCY_WITHIN_LIMIT","DELAY_LOW_PRIORITY","COALESCE_DUPLICATES","CANCEL_INVALIDATED_WORK","ADJUST_RETRY_POLICY"].includes(b.recommendation);
  const governed=["ROUTE_TO_APPROVED_ALTERNATIVE","ESCALATE_PROVIDER_HEALTH"].includes(b.recommendation);
  const auth=auto?"AUTO_EXECUTABLE":governed?"GOVERNOR_REVIEW":"OPERATOR_REVIEW";
  return out(res,issues.length?422:200,{ok:issues.length===0,engine_id:c.engine_id,analysis_id:b.analysis_id||null,anomaly_type:b.anomaly_type||null,severity:b.severity||"INFO",confidence:b.confidence??null,authorization_class:auth,recommendation:b.recommendation||"NO_CHANGE",issues,creative_gates_unchanged:true,canonical_master_mutated:false,next_action:issues.length?"REPAIR_ANALYSIS_INPUT":auto?"PUBLISH_TO_CSD-037":governed?"SEND_TO_GOVERNOR_REVIEW":"REQUEST_OPERATOR_REVIEW"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-039 failed",detail:e.message})}
};