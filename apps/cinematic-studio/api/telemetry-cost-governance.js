const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-038-production-telemetry-cost-governance.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,telemetry_domains:c.telemetry_domains,provider_cost_model:c.provider_cost_model,metrics:c.metrics,budget_scopes:c.budget_scopes,budget_states:c.budget_states,cost_controls:c.cost_controls,efficiency_analysis:c.efficiency_analysis,governance_pipeline:c.governance_pipeline,control_decisions:c.control_decisions,audit_record:c.audit_record,safety_invariants:c.safety_invariants,demo:c.demo,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const required=["telemetry_id","job_id","provider_id","model_id","pricing_version","usage","currency"],missing=required.filter(k=>b[k]===undefined||b[k]===null||b[k]===""),issues=[];
  if(missing.length)issues.push("MISSING_TELEMETRY_FIELDS:"+missing.join(","));
  if(!b.unit_rates)issues.push("PRICING_RATES_REQUIRED");
  if(b.currency_conversion_without_snapshot===true)issues.push("UNAUTHORIZED_CURRENCY_CONVERSION");
  if(b.unapproved_provider===true)issues.push("UNAPPROVED_PROVIDER");
  const usage=b.usage||{},rates=b.unit_rates||{};let total=0,calculable=true;
  for(const [unit,value] of Object.entries(usage)){if(rates[unit]===undefined){calculable=false;break}total+=Number(value)*Number(rates[unit])}
  if(!calculable&&missing.length===0)issues.push("INCOMPLETE_PRICING_SNAPSHOT");
  const budgetState=b.budget_state||"UNKNOWN";
  let decision="COST_UNKNOWN";
  if(issues.length)decision="COST_UNKNOWN";
  else if(budgetState==="EXCEEDED"||budgetState==="HARD_LIMIT")decision="COST_BLOCK";
  else if(budgetState==="SOFT_LIMIT")decision="COST_HOLD";
  else if(budgetState==="WARNING")decision="COST_WARNING";
  else if(b.failure_rate_spike===true||b.retry_storm===true)decision="COST_THROTTLE";
  else decision="COST_CLEAR";
  return out(res,issues.length?422:200,{ok:issues.length===0,engine_id:c.engine_id,telemetry_id:b.telemetry_id||null,job_id:b.job_id||null,provider_id:b.provider_id||null,model_id:b.model_id||null,pricing_version:b.pricing_version||null,total_cost:calculable?total:null,currency:b.currency||null,budget_state:budgetState,control_decision:decision,creative_gates_unchanged:true,canonical_master_mutated:false,audit_record:{append_only:true,telemetry_id:b.telemetry_id||null,timestamp:b.timestamp||"GENERATE-TIMESTAMP"},next_action:decision==="COST_CLEAR"?"PUBLISH_TO_CSD-037":decision==="COST_WARNING"?"WARN_AND_CONTINUE":decision==="COST_THROTTLE"?"REDUCE_ADMISSION_RATE":decision==="COST_HOLD"?"HOLD_NEW_DISCRETIONARY_WORK":decision==="COST_BLOCK"?"BLOCK_NEW_DISCRETIONARY_WORK":"REQUIRE_VALID_PRICING_EVIDENCE"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-038 failed",detail:e.message})}
};