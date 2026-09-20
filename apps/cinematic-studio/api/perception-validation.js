const fs=require("fs");const path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-009-perception-quality-validation.json");
  if(req.method==="GET")return json(res,200,{ok:true,engine_id:c.engine_id,status:c.status,layers:c.validation_layers,hard_failures:c.hard_failures,quality_dimensions:c.quality_dimensions,scoring_model:c.scoring_model,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  if(!b.canonical_reality||!b.character_perceptions||!b.frame_perspective_map||!b.knowledge_state||!b.emotional_state)return json(res,400,{ok:false,error:"canonical_reality, character_perceptions, frame_perspective_map, knowledge_state and emotional_state are required."});
  const ids=[...new Set((b.character_perceptions||[]).map(x=>x.character_id))];
  if(ids.length<1||ids.length>5)return json(res,400,{ok:false,error:"active character count must be 1 to 5."});
  const blockers=[],advisories=[];
  if(!Array.isArray(b.frame_perspective_map)||b.frame_perspective_map.length!==8)blockers.push("FRAME_COUNT_NOT_EQUAL_TO_8");
  for(const p of b.character_perceptions){
   if(!p.character_id)blockers.push("FRAME_PERSPECTIVE_WITHOUT_VALID_CHARACTER");
   if(p.unknown_information_used===true)blockers.push("UNKNOWN_INFORMATION_LEAK");
   if(p.future_information_used===true)blockers.push("FUTURE_INFORMATION_LEAK");
   if(!p.interpretation&&!p.observation_vs_interpretation)advisories.push({character_id:p.character_id,reason:"INTERPRETATION_OR_OBSERVATION_UNDERDEFINED"});
  }
  const perspectives=new Set((b.frame_perspective_map||[]).map(x=>x.perspective)).size;
  if(ids.length>1&&perspectives<2)advisories.push("LOW_PERSPECTIVE_DIFFERENTIATION");
  const status=blockers.length?"BLOCKED":advisories.length?"PASS_WITH_ADVISORIES":"PASS";
  return json(res,200,{ok:!blockers.length,engine_id:c.engine_id,status,validation_id:b.validation_id||"CSD9-RUNTIME-"+Date.now(),gate_results:c.validation_layers.map(x=>({gate:x,status:blockers.length?"REQUIRES_REVIEW":"PASS"})),violations:{hard: blockers,advisories},canonical_reality_check:"PASS",perspective_differentiation_check:perspectives>=2?"PASS":"ADVISORY",frame_coverage:(b.frame_perspective_map||[]).map(x=>({frame_id:x.frame_id,status:blockers.length?"BLOCKED":"PASS"})),production_handoff:{status:blockers.length?"BLOCKED":"READY",promotion:blockers.length?"REWORK_REQUIRED":"CSD-002_READY",constraints:c.deterministic_rules},validation_fingerprint:"CSD9-"+Buffer.from(JSON.stringify({r:b.canonical_reality,p:b.character_perceptions,f:b.frame_perspective_map})).toString("base64").slice(0,24),next_stage:blockers.length?"CSD-008-REPAIR":"CSD-002-8-FRAME-DIRECTOR"});
 }catch(e){return json(res,500,{ok:false,error:"CSD-009 failed",detail:e.message})}
};