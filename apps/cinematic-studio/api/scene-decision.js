const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-014-scene-branching-decision-narrative-consequence.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,decision_model:c.decision_model,decision_pipeline:c.decision_pipeline,agency_rules:c.agency_rules,consequence_rules:c.consequence_rules,hard_failures:c.hard_failures,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const d=b.decision, snapshot=b.canonical_snapshot, graph=b.event_graph;
  if(!d||!snapshot||!graph)return out(res,400,{ok:false,error:"decision, canonical_snapshot and event_graph are required."});
  const active=Array.isArray(snapshot.canonical_reality?.active_character_ids)?snapshot.canonical_reality.active_character_ids:[];
  if(!active.includes(d.actor))return out(res,422,{ok:false,status:"REJECTED",error:"DECISION_ACTOR_NOT_ACTIVE"});
  const branches=Array.isArray(d.available_branches)?d.available_branches:[];
  if(!branches.length)return out(res,422,{ok:false,status:"REJECTED",error:"INVALID_BRANCH_CONDITION"});
  const selected=d.selected_branch;
  if(!selected)return out(res,200,{ok:true,engine_id:c.engine_id,status:"AWAITING_DECISION",decision_id:d.decision_id,available_branches:branches,latent_mutation:false});
  const chosen=branches.find(x=>x.branch_id===selected);
  if(!chosen)return out(res,422,{ok:false,status:"REJECTED",error:"INVALID_BRANCH_CONDITION",selected_branch:selected});
  const ids=new Set((graph.nodes||[]).map(x=>x.event_id));
  const missing=(chosen.event_path||[]).filter(x=>!ids.has(x));
  if(missing.length)return out(res,422,{ok:false,status:"REJECTED",error:"CSD013_GRAPH_MISMATCH",missing_events:missing});
  const consequences=Array.isArray(d.consequence_chain)?d.consequence_chain:[];
  if(consequences.some(x=>!x.source||!(chosen.event_path||[]).includes(x.source)))return out(res,422,{ok:false,status:"REJECTED",error:"CONSEQUENCE_WITHOUT_CAUSAL_SOURCE"});
  const latent=branches.filter(x=>x.branch_id!==selected).map(x=>({...x,state:"LATENT",canonical_mutation:false}));
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"DECISION_COMMITTED",decision_record:d,selected_branch:chosen,latent_branches:latent,consequence_chain:consequences,transition_plan:{CSD012:"READY_FOR_SELECTED_BRANCH_EVENTS"},canonical_branch_state:"ACTIVE",continuity_validation:"REQUIRES_CSD011",orchestration_handoff:"READY",frame_handoff:"BIND_CSD002_TO_SELECTED_CANONICAL_PATH"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-014 failed",detail:e.message})}
};