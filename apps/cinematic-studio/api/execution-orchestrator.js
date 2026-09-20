const crypto=require("crypto");
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
function lineage(j){return {execution_job_id:j.execution_job_id,route_fingerprint:j.route_fingerprint,idempotency_key:j.idempotency_key,provider_id:j.provider_id,model_id:j.model_id,source:"CMSE-010"}}
module.exports=async function handler(req,res){
 try{
  const c=require("../data/cmse-010-production-execution.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,pipeline:c.execution_pipeline,rules:c.execution_rules,asset_validation:c.asset_validation,adapter_contract:c.adapter_contract,job_states:c.job_states,failure_policy:c.failure_policy,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  const b=req.body||{},jobs=b.cmse_015_jobs||b.jobs||[];
  if(!jobs.length)return out(res,422,{ok:false,error:"CMSE-015 execution jobs are required."});
  const adapters=b.execution_adapter_registry||[];
  const adapterSet=new Set(adapters.map(a=>a.provider_id+"/"+a.model_id));
  const records=[];
  for(const j of jobs){
    const key=j.idempotency_key, found=b.existing_results?.[key];
    if(found){records.push({...found,replayed:true});continue}
    if(!["DISPATCH_READY","RESERVED"].includes(j.state)) {records.push({execution_job_id:j.execution_job_id,state:"DEFERRED",reason:"JOB_NOT_DISPATCH_READY"});continue}
    const ak=j.provider_id+"/"+j.model_id;
    if(!adapterSet.has(ak)){records.push({execution_job_id:j.execution_job_id,state:"FAILED_FINAL",reason:"EXECUTION_ADAPTER_MISSING",lineage:lineage(j)});continue}
    const dispatch_id="DISPATCH-"+crypto.randomUUID();
    records.push({execution_job_id:j.execution_job_id,dispatch_id,provider_id:j.provider_id,model_id:j.model_id,state:"DISPATCHED",idempotency_key:key,attempt:(j.attempt||0)+1,payload_reference:"READ_ONLY_CMSE-015",provider_execution:"DELEGATED_TO_ADAPTER",lineage:lineage(j)});
  }
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"DISPATCH_RECORDS_CREATED",dispatch_count:records.length,records,next_state:"PROVIDER_RUNTIME / CMSE-015"});
 }catch(e){return out(res,500,{ok:false,error:"CMSE-010 failed",detail:e.message})}
};