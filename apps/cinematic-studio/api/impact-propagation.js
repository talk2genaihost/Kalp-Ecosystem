const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-034-cross-scene-continuity-impact-propagation.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,node_types:c.node_types,edge_types:c.edge_types,change_classes:c.change_classes,impact_levels:c.impact_levels,propagation_pipeline:c.propagation_pipeline,impact_actions:c.impact_actions,invalidation_policy:c.invalidation_policy,severity_rules:c.severity_rules,revalidation_frontier:c.revalidation_frontier,graph_integrity:c.graph_integrity,rework_routing:c.rework_routing,demo:c.demo,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const required=["change_id","source_node_id","change_class","source_fingerprint","canonical_version"];
  const missing=required.filter(k=>b[k]===undefined||b[k]===null||b[k]===""),issues=[];
  if(missing.length)issues.push("MISSING_CHANGE_FIELDS:"+missing.join(","));
  if(b.canonical_mutation===true)issues.push("CANONICAL_MUTATION_FORBIDDEN");
  if(b.cycle_detected===true)issues.push("CAUSAL_GRAPH_CYCLE");
  if(b.orphan_active_job===true)issues.push("ORPHAN_ACTIVE_PRODUCTION_JOB");
  if(b.superseded_dependency===true)issues.push("ACTIVE_DERIVATIVE_DEPENDS_ON_SUPERSEDED_NODE");
  const source=b.source_node_id||null;
  const severity=b.severity||(["IDENTITY_CHANGE","EVENT_CHANGE","BRANCH_CHANGE","SCENE_MASTER_CHANGE"].includes(b.change_class)?"CRITICAL":b.change_class==="WORLD_CHANGE"?"HIGH":b.change_class==="ASSET_CHANGE"?"HIGH":"MEDIUM");
  const action=b.action||"REVALIDATE";
  return out(res,issues.length?422:200,{ok:!issues.length,engine_id:c.engine_id,change_id:b.change_id||null,source_node_id:source,change_class:b.change_class||null,severity,decision:issues.length?"BLOCKED":"IMPACT_PLAN_READY",impact_action:issues.length?"BLOCK":action,source_fingerprint:b.source_fingerprint||null,canonical_history_mutated:false,revalidation_frontier:b.impact_frontier||[],dependency_order:"TOPOLOGICAL_CRITICAL_PATH_FIRST",inactive_branches:"PRESERVED_NOT_ACTIVATED",next_action:issues.length?"REPAIR_GRAPH":"EXECUTE_IMPACT_FRONTIER"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-034 failed",detail:e.message})}
};