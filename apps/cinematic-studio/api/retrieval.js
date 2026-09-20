const crypto=require("crypto");
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
function score(a,r){
 const c=r.constraints||{};let s=0;
 if(c.character_ids?.some(x=>(a.character_ids||[]).includes(x)))s+=30;
 if(c.require_canonical_reference&&a.canonical_reference)s+=20;
 if(c.narrative_timestamp&&a.retrieval_metadata?.temporal_state===c.narrative_timestamp)s+=15;
 if(c.scene_id&&a.scene_id===c.scene_id)s+=10;
 if(c.world_location&&a.retrieval_metadata?.world_location===c.world_location)s+=8;
 if(c.costume_id&&a.retrieval_metadata?.costume_id===c.costume_id)s+=5;
 if(c.prop_id&&a.retrieval_metadata?.prop_id===c.prop_id)s+=4;
 if(c.emotional_state&&a.retrieval_metadata?.emotional_state===c.emotional_state)s+=4;
 if(c.perspective&&a.retrieval_metadata?.perspective===c.perspective)s+=2;
 if(a.status==="VALIDATED")s+=2;return s;
}
module.exports=async function handler(req,res){
 try{
  const c=require("../data/cmse-012-intelligent-production-retrieval.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,retrieval_pipeline:c.retrieval_pipeline,retrieval_priority:c.retrieval_priority,hard_rules:c.hard_rules,scoring:c.scoring,context_contract:c.context_contract,validation:c.validation,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  const b=req.body||{},r=b.scene_request,assets=b.asset_registry||[];
  if(!r)return out(res,422,{ok:false,error:"scene_request is required."});
  if(!assets)return out(res,422,{ok:false,error:"asset_registry is required."});
  const ids=r.character_ids||[];if(ids.length<1||ids.length>5)return out(res,422,{ok:false,error:"Active character count must be 1-5."});
  if(!r.narrative_timestamp)return out(res,422,{ok:false,error:"narrative_timestamp is required."});
  const eligible=assets.filter(a=>a.status!=="REJECTED"&&a.status!=="FAILED"&&a.media?.url);
  const scored=eligible.map(a=>({asset:a,score:score(a,r)})).sort((x,y)=>y.score-x.score||String(x.asset.asset_id).localeCompare(String(y.asset.asset_id)));
  const selected=scored.slice(0,Math.min(b.limit||12,scored.length));
  const warnings=[];
  if(!selected.length)warnings.push("NO_COMPATIBLE_ASSET_FOUND");
  const manifest=selected.map(x=>({asset_id:x.asset.asset_id,version_id:x.asset.version_id,role:x.asset.canonical_reference?"IDENTITY":"CONTINUITY",score:x.score,lineage:x.asset.source_lineage}));
  const bundle={context_id:"CTX-"+crypto.createHash("sha256").update(JSON.stringify({r,manifest})).digest("hex").slice(0,20),scene_constraints:r,character_context:ids.map(id=>({character_id:id})),canonical_references:manifest.filter(x=>x.role==="IDENTITY"),continuity_assets:manifest.filter(x=>x.role==="CONTINUITY"),reference_manifest:manifest,retrieval_warnings:warnings,lineage:{engine:"CMSE-012",asset_count:manifest.length}};
  bundle.retrieval_fingerprint=crypto.createHash("sha256").update(JSON.stringify(bundle)).digest("hex").slice(0,24);
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"CONTEXT_READY",retrieved_assets:selected,context_bundle:bundle,next_stage:"CSD-011/CSD-012/CMSE-013"});
 }catch(e){return out(res,500,{ok:false,error:"CMSE-012 failed",detail:e.message})}
};