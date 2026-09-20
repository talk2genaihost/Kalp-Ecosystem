const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-040-production-learning-predictive-orchestration.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,learning_domains:c.learning_domains,knowledge_records:c.knowledge_records,learning_pipeline:c.learning_pipeline,feature_context:c.feature_context,prediction_outputs:c.prediction_outputs,confidence_bands:c.confidence_bands,strategy_actions:c.strategy_actions,strategy_policy:c.strategy_policy,prediction_safety:c.prediction_safety,calibration:c.calibration,orchestration_record:c.orchestration_record,demo:c.demo,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const required=c.orchestration_record.required,missing=required.filter(k=>b[k]===undefined||b[k]===null||b[k]===""),issues=[];
  if(missing.length)issues.push("MISSING_ORCHESTRATION_FIELDS:"+missing.join(","));
  if(!b.knowledge_version)issues.push("MISSING_KNOWLEDGE_VERSION");
  if(b.insufficient_evidence===true)issues.push("INSUFFICIENT_EVIDENCE");
  if(b.unapproved_provider===true)issues.push("UNAPPROVED_PROVIDER");
  if(b.admission_gate_bypass===true)issues.push("CSD-037_ADMISSION_BYPASS");
  const strategy=b.strategy||[];
  const operator=strategy.some(x=>x.authorization_class==="OPERATOR_REVIEW");
  const governor=strategy.some(x=>x.authorization_class==="GOVERNOR_REVIEW");
  const authorization=operator?"OPERATOR_REVIEW":governor?"GOVERNOR_REVIEW":"AUTO_EXECUTABLE";
  return out(res,issues.length?422:200,{ok:issues.length===0,engine_id:c.engine_id,orchestration_id:b.orchestration_id||null,knowledge_version:b.knowledge_version||null,predictions:b.predictions||{},prediction_confidence:b.confidence||"LOW",strategy,authorization_class:authorization,issues,creative_gates_unchanged:true,canonical_master_mutated:false,next_action:issues.length?"REPAIR_PREDICTION_INPUT":operator?"REQUEST_OPERATOR_REVIEW":governor?"SEND_TO_CSD-037_FOR_REVIEW":"PUBLISH_TO_CSD-037"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-040 failed",detail:e.message})}
};