const crypto=require("crypto");
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
function assemble(spec,scene,validation){
  const positives=[
    spec.canonical_reality,
    ...(spec.characters||[]).map(c=>c.character_id||c.id),
    spec.performance,
    spec.perception,
    spec.action,
    spec.environment,
    spec.camera?.intent,
    spec.camera?.composition,
    spec.lighting,
    spec.atmosphere,
    ...(spec.vfx||[])
  ].filter(Boolean);
  const negatives=[...(spec.negative_constraints||[])];
  return {
    context_id:"CSD12-"+(scene.scene_id||"SCENE")+"-"+spec.frame_id,
    scene_id:scene.scene_id,frame_id:spec.frame_id,frame_purpose:spec.frame_purpose,
    source_lineage:spec.source_lineage,
    scene_context:scene,
    character_identity:spec.characters||[],
    performance:spec.performance||{},
    knowledge_and_belief:spec.perception?.information_revealed||[],
    perspective_and_perception:spec.perception||{},
    action_and_blocking:spec.action,
    world_and_environment:spec.environment,
    camera_and_composition:spec.camera,
    lighting_and_atmosphere:{lighting:spec.lighting,atmosphere:spec.atmosphere},
    vfx_and_sfx_intent:spec.vfx||[],
    reference_manifest:scene.reference_assets||[],
    continuity_locks:spec.continuity_locks||[],
    positive_prompt_semantics:positives,
    negative_constraints:[...new Set(negatives)],
    output_contract:{...spec.output,provider_syntax:"DEFERRED_TO_CMSE-013",provider_selection:"DEFERRED_TO_CMSE-014"},
    validation_fingerprint:validation.validation_fingerprint||"INHERITED_FROM_CSD-009"
  };
}
module.exports=async function handler(req,res){
 try{
  const c=require("../data/csd-012-production-context-prompt-assembly.json");
  if(req.method==="GET")return json(res,200,{ok:true,engine_id:c.engine_id,status:c.status,contract:c.prompt_assembly_contract,rules:c.assembly_rules,pipeline:c.resolution_pipeline,validation:c.validation,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"})}
  const b=req.body||{}; const vr=b.validation_result;
  if(!vr||!["PASS","PASS_WITH_ADVISORIES"].includes(vr.status))return json(res,409,{ok:false,status:"BLOCKED_UPSTREAM_VALIDATION"});
  const specs=b.csd_011_visual_specs?.jobs||b.csd_011_visual_specs?.visual_specs||[];
  if(specs.length!==8)return json(res,422,{ok:false,error:"Exactly 8 CSD-011 visual specifications are required."});
  const scene=b.scene_context;
  if(!scene)return json(res,422,{ok:false,error:"scene_context is required."});
  const bundles=specs.map(s=>assemble(s,scene,vr));
  for(const x of bundles){
    const p=new Set(x.positive_prompt_semantics.map(String).map(v=>v.toLowerCase()));
    if(x.negative_constraints.some(n=>p.has(String(n).toLowerCase())))return json(res,422,{ok:false,error:"Positive/negative semantic contradiction",frame_id:x.frame_id});
  }
  const fingerprint=crypto.createHash("sha256").update(JSON.stringify(bundles)).digest("hex").slice(0,24);
  return json(res,200,{ok:true,engine_id:c.engine_id,status:"PRODUCTION_CONTEXT_ASSEMBLED",frame_count:8,bundles,assembly_fingerprint:fingerprint,next_stage:"CMSE-013-PROMPT-COMPILATION"});
 }catch(e){return json(res,500,{ok:false,error:"CSD-012 failed",detail:e.message})}
};