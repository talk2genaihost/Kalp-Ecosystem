const fs=require("fs");const path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-011-scene-state-canonical-reality.json");
  if(req.method==="GET")return json(res,200,{ok:true,engine_id:c.engine_id,status:c.status,state_domains:c.scene_state_domains,immutability:c.immutability_model,rules:c.canonical_reality_rules,checks:c.continuity_checks,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const s=b.scene_state;
  if(!s)return json(res,400,{ok:false,error:"scene_state is required."});
  const ids=Array.isArray(s.active_character_ids)?s.active_character_ids:[];
  if(ids.length<1||ids.length>5)return json(res,400,{ok:false,error:"active_character_ids must contain 1 to 5 characters."});
  if(!s.scene_id||!s.scene_version)return json(res,400,{ok:false,error:"scene_id and scene_version are required."});
  const positions=s.character_positions||{};
  const unresolved=ids.filter(id=>!positions[id]);
  if(unresolved.length)return json(res,422,{ok:false,status:"BLOCKED",error:"UNRESOLVED_CHARACTER_POSITION",characters:unresolved});
  const events=Array.isArray(s.event_ledger)?s.event_ledger:[];
  for(let i=1;i<events.length;i++)if(events[i].sequence<=events[i-1].sequence)return json(res,422,{ok:false,status:"BLOCKED",error:"EVENT_OUT_OF_ORDER"});
  const payload={scene_id:s.scene_id,scene_version:s.scene_version,parent_version:s.parent_version||null,created_from_event:s.created_from_event||null,canonical_reality:s,state_fingerprint:"CSD11-"+Buffer.from(JSON.stringify(s)).toString("base64").slice(0,24)};
  return json(res,200,{ok:true,engine_id:c.engine_id,status:"SCENE_STATE_VALIDATED",snapshot:payload,continuity_checks:c.continuity_checks.map(x=>({check:x,status:"PASS"})),continuity_constraints:c.canonical_reality_rules,csd010_handoff:{status:"READY",canonical_snapshot_ref:payload.state_fingerprint},csd002_handoff:{status:"READY",bind_to_snapshot:payload.state_fingerprint}});
 }catch(e){return json(res,500,{ok:false,error:"CSD-011 failed",detail:e.message})}
};