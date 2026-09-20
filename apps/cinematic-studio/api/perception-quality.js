const fs=require("fs");
const path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
  try{
    const c=load("csd-009-perception-quality-validation.json");
    if(req.method==="GET")return json(res,200,{ok:true,engine_id:c.engine_id,status:c.status,layers:c.validation_layers,hard_failures:c.hard_failures,quality_dimensions:c.quality_dimensions,demo_test:c.demo_test,downstream:c.downstream});
    if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"})}
    let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
    const ids=Array.isArray(b.character_ids)?b.character_ids:[];
    if(ids.length<1||ids.length>5)return json(res,400,{ok:false,error:"character_ids must contain 1 to 5 characters."});
    const missing=["canonical_reality","character_perceptions","frame_perspective_map","knowledge_state","emotional_state"].filter(k=>b[k]==null);
    if(missing.length)return json(res,400,{ok:false,error:"Missing validation inputs.",missing});
    const frames=b.frame_perspective_map;
    const frameIds=Array.isArray(frames)?frames.map(x=>x.frame_id).filter(Boolean):[];
    const violations=[];
    if(frameIds.length!==8||new Set(frameIds).size!==8)violations.push({gate:"EIGHT_FRAME_COVERAGE",type:"HARD",detail:"Exactly eight unique frame directives F01-F08 are required."});
    if(Array.isArray(b.active_characters)&&b.active_characters.length>5)violations.push({gate:"ACTIVE_CHARACTER_COUNT",type:"HARD",detail:"Maximum five active characters."});
    if(!Array.isArray(b.canonical_reality)||b.canonical_reality.length===0)violations.push({gate:"CANONICAL_REALITY_INTEGRITY",type:"HARD",detail:"Canonical reality is empty."});
    const perceptions=Array.isArray(b.character_perceptions)?b.character_perceptions:[];
    for(const p of perceptions){
      if(!p.character_id)violations.push({gate:"CHARACTER_IDENTITY_INTEGRITY",type:"HARD",detail:"Perception has no character_id."});
      if(p.observation_vs_interpretation&&(!Array.isArray(p.observation_vs_interpretation.observations)||!Array.isArray(p.observation_vs_interpretation.interpretations)))violations.push({gate:"OBSERVATION_INTERPRETATION_SEPARATION",type:"HARD",detail:"Observation/interpretation separation is malformed.",character_id:p.character_id});
    }
    const knowledge=Array.isArray(b.knowledge_state.character_information_states)?b.knowledge_state.character_information_states:[];
    for(const k of knowledge)for(const item of (k.known||[])){
      if(!item.source_type||!item.confidence)violations.push({gate:"KNOWLEDGE_BOUNDARY_VALIDATION",type:"HARD",detail:"Known item lacks provenance.",character_id:k.character_id});
    }
    const hard=violations.filter(v=>v.type==="HARD");
    const status=hard.length?"BLOCKED":(violations.length?"PASS_WITH_ADVISORIES":"PASS");
    const results={};
    for(const layer of c.validation_layers)results[layer]=hard.some(v=>v.gate===layer)?"BLOCKED":"PASS";
    const fingerprint=require("crypto").createHash("sha256").update(JSON.stringify({canonical_reality:b.canonical_reality,character_perceptions:perceptions,frame_perspective_map:frames})).digest("hex").slice(0,24);
    return json(res,200,{ok:!hard.length,engine_id:c.engine_id,status,gate_results:results,violations,canonical_reality_check:{status:results.CANONICAL_REALITY_INTEGRITY},perspective_differentiation_check:{status:results.MULTI_CHARACTER_PERSPECTIVE_DIFFERENTIATION},frame_coverage:{required:8,received:frameIds.length,frame_ids:frameIds},production_handoff:{status:hard.length?"BLOCKED":"READY",next_stage:"CSD-002-8-FRAME-DIRECTOR",constraints:c.demo_test.production_handoff.constraints},validation_fingerprint:fingerprint});
  }catch(e){return json(res,500,{ok:false,error:"CSD-009 failed",detail:e.message})}
};