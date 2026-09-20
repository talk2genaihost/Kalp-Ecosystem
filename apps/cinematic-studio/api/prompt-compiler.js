const crypto=require("crypto");
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
function compile(ctx,profile){
 const positive=(ctx.positive_prompt_semantics||[]).filter(Boolean).join(". ");
 const negatives=[...(ctx.negative_constraints||[])];
 const supportedNeg=profile.negative_prompt_support?negatives:[];
 const constraints=profile.negative_prompt_support?[]:negatives;
 return {
  job_id:"CMSE013-"+ctx.context_id,
  provider:{provider_id:profile.provider_id,model_id:profile.model_id},
  frame_id:ctx.frame_id,scene_id:ctx.scene_id,
  prompt:{positive_prompt:positive,negative_prompt:supportedNeg},
  adapter_constraints:constraints,
  references:ctx.reference_manifest||[],
  output_contract:ctx.output_contract,
  semantic_priority:["IDENTITY","CANONICAL_REALITY","CONTINUITY","PERFORMANCE","KNOWLEDGE","PERCEPTION","ACTION","ENVIRONMENT","CAMERA","LIGHTING","ATMOSPHERE","VFX","STYLE"],
  source_lineage:{csd012_context_id:ctx.context_id,csd012_validation_fingerprint:ctx.validation_fingerprint,translation_engine:"CMSE-013"},
  validation:{meaning_delta:"NONE",unsupported_negative_handling:profile.negative_prompt_support?"NATIVE":"EXPLICIT_ADAPTER_CONSTRAINT"}
 };
}
module.exports=async function handler(req,res){
 try{
  const c=require("../data/cmse-013-production-prompt-compiler.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,contract:c.provider_capability_contract,rules:c.hard_rules,validation:c.validation,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  const b=req.body||{},vr=b.validation_result;
  if(!vr||!["PASS","PASS_WITH_ADVISORIES"].includes(vr.status))return out(res,409,{ok:false,status:"BLOCKED_CSD012_VALIDATION"});
  const contexts=b.production_context?.bundles||b.production_context?.contexts||[];
  if(contexts.length!==8)return out(res,422,{ok:false,error:"Exactly 8 CSD-012 production context bundles are required."});
  const p=b.provider_capability_profile;
  if(!p)return out(res,422,{ok:false,error:"provider_capability_profile is required; provider selection belongs to CMSE-014."});
  const jobs=contexts.map(x=>compile(x,p));
  const fingerprint=crypto.createHash("sha256").update(JSON.stringify(jobs)).digest("hex").slice(0,24);
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"PROVIDER_PROMPTS_COMPILED",frame_count:8,provider:{provider_id:p.provider_id,model_id:p.model_id},jobs,translation_fingerprint:fingerprint,next_stage:"CMSE-014-PROVIDER-ROUTING"});
 }catch(e){return out(res,500,{ok:false,error:"CMSE-013 failed",detail:e.message})}
};