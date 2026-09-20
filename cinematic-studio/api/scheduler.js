const crypto=require("crypto");
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
function topo(ids,deps){
 const indeg=Object.fromEntries(ids.map(x=>[x,0])),next=Object.fromEntries(ids.map(x=>[x,[]]));
 for(const id of ids)for(const d of (deps[id]||[])){if(!indeg[d])return {error:"INVALID_DEPENDENCY",node:id,dependency:d};indeg[id]++;next[d].push(id)}
 const q=ids.filter(x=>indeg[x]===0),order=[];while(q.length){const n=q.shift();order.push(n);for(const x of next[n])if(--indeg[x]===0)q.push(x)}
 return order.length===ids.length?{order}:{error:"DEPENDENCY_CYCLE"};
}
module.exports=async function handler(req,res){
 try{
  const c=require("../data/cmse-015-autonomous-scheduler.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,state_machine:c.job_state_machine,scheduling_rules:c.scheduling_rules,dependency_rules:c.dependency_rules,validation:c.validation,execution_handoff:c.execution_handoff,demo_test:c.demo_test});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  const b=req.body||{},routes=b.cmse_014_routes||b.routes||[];
  if(routes.length!==8)return out(res,422,{ok:false,error:"Exactly 8 CMSE-014 routes are required."});
  const adapter=b.execution_adapter_registry||[],runtime=b.provider_runtime_state||{},policy={...c.default_policy,...(b.scheduler_policy||{})};
  const adapterSet=new Set(adapter.map(x=>x.provider_id+"/"+x.model_id));
  for(const r of routes)if(!adapterSet.has(r.provider_id+"/"+r.model_id))return out(res,422,{ok:false,error:"Execution adapter missing",provider_id:r.provider_id,model_id:r.model_id});
  const ids=routes.map(r=>r.frame_id), demoDeps=c.dependency_graph_demo, deps=b.dependency_graph||Object.fromEntries(ids.map((id,i)=>[id,demoDeps[id]||[]]));
  const t=topo(ids,deps);if(t.error)return out(res,422,{ok:false,error:t.error,node:t.node,dependency:t.dependency});
  const keys=new Set(),jobs=routes.map(r=>{
    const key=crypto.createHash("sha256").update([r.job_id,r.provider_id,r.model_id,r.route_fingerprint].join("|")).digest("hex").slice(0,32);
    if(keys.has(key))throw new Error("DUPLICATE_IDEMPOTENCY_KEY");keys.add(key);
    const rt=runtime[r.provider_id+"/"+r.model_id]||{};
    const state=(deps[r.frame_id]||[]).length?"WAITING_DEPENDENCY":"DISPATCH_READY";
    return {execution_job_id:"EXEC-"+r.job_id,frame_id:r.frame_id,provider_id:r.provider_id,model_id:r.model_id,state,attempt:0,max_attempts:policy.max_attempts,dependencies:deps[r.frame_id]||[],idempotency_key:key,reservation:{provider_id:r.provider_id,model_id:r.model_id,capacity_required:1,available_capacity:Math.max(0,(r.max_concurrency||rt.max_concurrency||1)-(rt.active_jobs||0))},retry_policy:{max_attempts:policy.max_attempts,backoff_seconds:policy.backoff_seconds,jitter_seconds:policy.jitter_seconds},route_fingerprint:r.route_fingerprint,creative_payload:"READ_ONLY_FROM_CMSE-014",handoff:"CMSE-010"};
  });
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"EXECUTION_PLAN_READY",frame_count:8,dependency_order:t.order,jobs,queue:jobs.filter(j=>j.state==="DISPATCH_READY").map(j=>j.execution_job_id)});
 }catch(e){return out(res,500,{ok:false,error:"CMSE-015 failed",detail:e.message})}
};