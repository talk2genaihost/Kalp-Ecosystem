const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-012-scene-event-causal-state-transition.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,transition_model:c.transition_model,causal_chain:c.causal_chain,event_schema:c.event_schema,validation_pipeline:c.validation_pipeline,transaction_policy:c.transaction_policy,hard_failures:c.hard_failures,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const parent=b.parent_snapshot,event=b.event;
  if(!parent||!event)return out(res,400,{ok:false,error:"parent_snapshot and event are required."});
  if(!parent.scene_id||!parent.scene_version)return out(res,422,{ok:false,status:"BLOCKED",error:"PARENT_SNAPSHOT_INVALID"});
  if(parent.status&&parent.status!=="ACTIVE")return out(res,422,{ok:false,status:"BLOCKED",error:"PARENT_SNAPSHOT_NOT_ACTIVE"});
  const required=c.event_schema.required;
  const missing=required.filter(k=>event[k]===undefined||event[k]===null);
  if(missing.length)return out(res,422,{ok:false,status:"REJECTED",error:"INVALID_EVENT_SCHEMA",missing});
  const active=Array.isArray(parent.canonical_reality?.active_character_ids)?parent.canonical_reality.active_character_ids:[];
  if(active.length>5)return out(res,422,{ok:false,status:"REJECTED",error:"ACTIVE_CHARACTER_COUNT_ABOVE_5"});
  if(!active.includes(event.actor)&&!event.governed_entrant)return out(res,422,{ok:false,status:"REJECTED",error:"ACTOR_NOT_ACTIVE"});
  const seq=Number(event.sequence), prior=Array.isArray(parent.canonical_reality.event_ledger)?parent.canonical_reality.event_ledger:[];
  const last=prior.length?Number(prior[prior.length-1].sequence):0;
  if(!Number.isFinite(seq)||seq<=last)return out(res,422,{ok:false,status:"REJECTED",error:"EVENT_OUT_OF_ORDER",last_sequence:last});
  const deltas=Array.isArray(event.state_deltas)?event.state_deltas:[];
  const invalid=deltas.filter(d=>!d.delta_id||d.event_id!==event.event_id||!d.domain||!d.path||d.causal_basis!==event.event_id);
  if(invalid.length)return out(res,422,{ok:false,status:"REJECTED",error:"UNSUPPORTED_STATE_MUTATION",invalid_delta_count:invalid.length});
  const nextVersion=String((parseFloat(parent.scene_version)||0)+0.1).replace(/\.0$/,"");
  const newReality=JSON.parse(JSON.stringify(parent.canonical_reality||{}));
  newReality.event_ledger=[...(newReality.event_ledger||[]),event];
  const snapshot={scene_id:parent.scene_id,scene_version:nextVersion,parent_version:parent.scene_version,created_from_event:event.event_id,status:"ACTIVE",canonical_reality:newReality,state_deltas:deltas,transition_id:b.transition_id||("CSD12-"+event.event_id)};
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"TRANSITION_ACCEPTED",transition_id:snapshot.transition_id,accepted_event:event,state_deltas:deltas,new_snapshot:snapshot,continuity_validation:"PASS",downstream_handoff:{CSD006:"RECALCULATE",CSD007:"RECALCULATE",CSD008:"RECALCULATE_AFTER_STATE",CSD009:"REVALIDATE",CSD010:"REORCHESTRATE",CSD002:"REBIND_TO_NEW_SNAPSHOT"}});
 }catch(e){return out(res,500,{ok:false,error:"CSD-012 failed",detail:e.message})}
};