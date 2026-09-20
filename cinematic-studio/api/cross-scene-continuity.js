const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-033-production-qa-cross-scene-continuity.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,continuity_domains:c.continuity_domains,scene_window:c.scene_window,validation_pipeline:c.validation_pipeline,decision_states:c.decision_states,hard_gates:c.hard_gates,quality_dimensions:c.quality_dimensions,thresholds:c.thresholds,defect_classes:c.defect_classes,rework_routes:c.rework_routes,promotion_policy:c.promotion_policy,demo:c.demo,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const required=["asset_version_id","target_scene","target_scene_version","master_revision","master_fingerprint","asset_lineage","canonical_scene_window"];
  const missing=required.filter(k=>b[k]===undefined||b[k]===null||b[k]===""),issues=[];
  if(missing.length)issues.push("MISSING_CONTINUITY_FIELDS:"+missing.join(","));
  if(b.asset_state!=="PROMOTED")issues.push("ASSET_NOT_PROMOTED");
  if(b.superseded_scene===true)issues.push("SUPERSEDED_SCENE_REFERENCE");
  if(b.identity_break===true)issues.push("IDENTITY_CONTINUITY_BREAK");
  if(b.knowledge_time_leak===true)issues.push("KNOWLEDGE_TIME_LEAK");
  if(b.timeline_conflict===true)issues.push("TIMELINE_CONFLICT");
  if(b.spatial_state_conflict===true)issues.push("SPATIAL_STATE_CONFLICT");
  if(b.world_memory_conflict===true)issues.push("WORLD_MEMORY_CONFLICT");
  if(b.branch_leak===true)issues.push("BRANCH_LEAK");
  if(b.lineage_break===true)issues.push("LINEAGE_BREAK");
  if(b.causality_break===true)issues.push("CAUSALITY_BREAK");
  const score=Number.isFinite(Number(b.continuity_score))?Number(b.continuity_score):null;
  let decision="QUARANTINED";
  if(issues.some(x=>["IDENTITY_CONTINUITY_BREAK","KNOWLEDGE_TIME_LEAK","TIMELINE_CONFLICT","SPATIAL_STATE_CONFLICT","WORLD_MEMORY_CONFLICT","BRANCH_LEAK","LINEAGE_BREAK","CAUSALITY_BREAK"].some(y=>x.includes(y))))decision="CONTINUITY_BLOCKED";
  else if(issues.length)decision="REWORK_REQUIRED";
  else if(score!==null&&score>=90)decision="CONTINUITY_PASS";
  else if(score!==null&&score>=80)decision="PASS_WITH_WARNINGS";
  else if(score!==null)decision="REWORK_REQUIRED";
  return out(res,decision==="CONTINUITY_BLOCKED"?422:200,{ok:!["CONTINUITY_BLOCKED","REWORK_REQUIRED","QUARANTINED"].includes(decision),engine_id:c.engine_id,asset_version_id:b.asset_version_id||null,target_scene:b.target_scene||null,decision,continuity_score:score,issues,canonical_scene_masters_mutated:false,reuse_authorized:["CONTINUITY_PASS","PASS_WITH_WARNINGS"].includes(decision),next_action:decision==="CONTINUITY_PASS"?"AUTHORIZE_DEPENDENT_SCENE_REUSE":decision==="PASS_WITH_WARNINGS"?"ANNOTATE_AND_AUTHORIZE_WITH_WARNING":decision==="REWORK_REQUIRED"?"ROUTE_TO_REWORK":"RECONCILE_CANONICAL_STATE"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-033 failed",detail:e.message})}
};