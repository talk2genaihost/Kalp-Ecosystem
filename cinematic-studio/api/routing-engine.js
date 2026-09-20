const crypto=require("crypto");
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
function eligible(job,p,rt,policy){
 const reasons=[];
 if(!(p.modalities||[]).includes(policy.required_modality))reasons.push("MODALITY");
 if(!(p.aspect_ratios||[]).includes(job.output_contract?.aspect_ratio||policy.aspect_ratio))reasons.push("ASPECT_RATIO");
 if(policy.reference_required&&!(p.reference_support))reasons.push("REFERENCE");
 if(policy.camera_control_required&&!p.camera_control)reasons.push("CAMERA_CONTROL");
 if(!p.image_generation&&policy.required_modality==="image")reasons.push("IMAGE_GENERATION");
 if(rt&&rt.available===false)reasons.push("UNAVAILABLE");
 if(rt&&typeof rt.active_jobs==="number"&&typeof p.max_concurrency==="number"&&rt.active_jobs>=p.max_concurrency)reasons.push("CONCURRENCY");
 if(rt&&typeof rt.queue_depth==="number"&&rt.queue_depth>policy.max_queue_depth)reasons.push("QUEUE_DEPTH");
 return reasons;
}
module.exports=async function handler(req,res){
 try{
  const c=require("../data/cmse-014-multi-provider-routing.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,decision_model:c.decision_model,hard_constraints:c.hard_constraints,optimization_dimensions:c.optimization_dimensions,validation:c.validation,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  const b=req.body||{},jobs=b.cmse_013_jobs||b.jobs||[],registry=b.provider_capability_registry||[],runtime=b.provider_runtime_state||{},policy={...c.routing_policy_defaults,...(b.routing_policy||{})};
  if(jobs.length!==8)return out(res,422,{ok:false,error:"Exactly 8 CMSE-013 jobs are required."});
  if(!registry.length)return out(res,422,{ok:false,error:"provider_capability_registry is required."});
  const routes=jobs.map(job=>{
    const candidates=registry.map(p=>({p,rt:runtime[p.provider_id+"/"+p.model_id]||runtime[p.provider_id+"::"+p.model_id]||{}}));
    const evaluated=candidates.map(x=>({provider_id:x.p.provider_id,model_id:x.p.model_id,failed:eligible(job,x.p,x.rt,policy),runtime:x.rt}));
    const good=evaluated.filter(x=>x.failed.length===0);
    if(!good.length)return {job_id:job.job_id,frame_id:job.frame_id,route_status:"BLOCKED",candidates:evaluated};
    good.sort((a,b)=>String(a.provider_id+a.model_id).localeCompare(String(b.provider_id+b.model_id)));
    const chosen=good[0];
    const route={job_id:job.job_id,frame_id:job.frame_id,provider_id:chosen.provider_id,model_id:chosen.model_id,route_status:"READY",capability_evidence:{passed:true},runtime_evidence:chosen.runtime,routing_policy:policy,source_translation_fingerprint:job.source_lineage?.cmse013_translation_fingerprint||job.source_lineage?.csd012_validation_fingerprint||"INHERITED",creative_payload:"READ_ONLY_FROM_CMSE-013"};
    route.route_fingerprint=crypto.createHash("sha256").update(JSON.stringify(route)).digest("hex").slice(0,24);
    return route;
  });
  const blocked=routes.filter(r=>r.route_status==="BLOCKED");
  return out(res,200,{ok:true,engine_id:c.engine_id,status:blocked.length?"ROUTING_PARTIAL":"ROUTES_READY",frame_count:8,blocked_frames:blocked.map(x=>x.frame_id),routes});
 }catch(e){return out(res,500,{ok:false,error:"CMSE-014 failed",detail:e.message})}
};