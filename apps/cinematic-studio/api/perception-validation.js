const fs=require("fs");
const path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
  try{
    const c=load("csd-009-scene-perception-quality-validation.json");
    if(req.method==="GET") return json(res,200,{ok:true,engine_id:c.engine_id,status:c.status,quality_dimensions:c.quality_dimensions,validation_pipeline:c.validation_pipeline,hard_rules:c.hard_rules,score_model:c.score_model,demo_test:c.demo_test,downstream:c.downstream});
    if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"})}
    let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
    if(!b.canonical_reality||!Array.isArray(b.character_perceptions)||!Array.isArray(b.frame_perspective_map)||!b.knowledge_state||!b.emotional_state)return json(res,400,{ok:false,error:"canonical_reality, character_perceptions, frame_perspective_map, knowledge_state and emotional_state are required."});
    const ids=[...new Set(b.character_perceptions.map(x=>x.character_id).filter(Boolean))];
    const violations=[];
    if(ids.length<1||ids.length>5)violations.push({severity:"BLOCKER",rule:"MAX_5_ACTIVE_CHARACTERS"});
    if(b.canonical_reality.length===0)violations.push({severity:"BLOCKER",rule:"EMPTY_CANONICAL_REALITY"});
    if(b.frame_perspective_map.length!==8)violations.push({severity:"BLOCKER",rule:"FRAME_COUNT_NOT_EQUAL_TO_8"});
    const active=new Set(ids);
    for(const f of b.frame_perspective_map){
      if(!f.frame_id||!f.perspective||!f.purpose)violations.push({severity:"ERROR",rule:"FRAME_DIRECTIVE_INCOMPLETE",frame_id:f.frame_id||null});
      if(f.perspective!=="AUDIENCE"&&f.perspective!=="SHARED"&&!active.has(f.perspective))violations.push({severity:"ERROR",rule:"INACTIVE_CHARACTER_PERSPECTIVE",frame_id:f.frame_id,perspective:f.perspective});
    }
    for(const p of b.character_perceptions){
      if(p.unknown_information_used===true)violations.push({severity:"BLOCKER",rule:"UNKNOWN_INFORMATION_LEAK",character_id:p.character_id});
      if(p.future_information_used===true)violations.push({severity:"BLOCKER",rule:"FUTURE_INFORMATION_LEAK",character_id:p.character_id});
      if(p.audience_only_information_used===true)violations.push({severity:"BLOCKER",rule:"AUDIENCE_KNOWLEDGE_LEAK",character_id:p.character_id});
      if(!p.observation_vs_interpretation&&!p.interpretation)violations.push({severity:"WARNING",rule:"OBSERVATION_INTERPRETATION_UNDERDEFINED",character_id:p.character_id});
    }
    const uniquePerspectives=new Set(b.frame_perspective_map.map(x=>x.perspective)).size;
    if(ids.length>1&&uniquePerspectives<2)violations.push({severity:"WARNING",rule:"LOW_PERSPECTIVE_DIFFERENTIATION"});
    const hard=violations.filter(v=>v.severity==="BLOCKER"||v.severity==="ERROR").length;
    const score=hard?Math.max(0,80-hard*10):violations.some(v=>v.severity==="WARNING")?90:98;
    const status=hard?"BLOCKED":score<80?"REWORK_REQUIRED":violations.some(v=>v.severity==="WARNING")?"PASS_WITH_WARNINGS":"PASS";
    return json(res,hard?422:200,{ok:!hard,engine_id:c.engine_id,status,quality_score:score,validation_id:b.validation_id||"CSD9-RUNTIME-"+Date.now(),violations,dimension_results:{reality_integrity:hard?"FAIL":"PASS",knowledge_boundary:hard?"FAIL":"PASS",sensory_access:"REQUIRES_RUNTIME_EVIDENCE",chronology:hard?"FAIL":"PASS",emotional_continuity:"REQUIRES_CSD006_EVIDENCE",causal_interpretation:hard?"FAIL":"PASS",character_differentiation:uniquePerspectives>=2?"PASS":"WARNING",audience_boundary:hard?"FAIL":"PASS",frame_coverage:b.frame_perspective_map.length===8?"PASS":"FAIL",cinematic_continuity:"REQUIRES_RUNTIME_EVIDENCE"},rework_plan:hard?c.rework_policy.routing:null,promotion:hard?"REWORK_REQUIRED":"CSD-002_READY",audit_trail:{validation_version:c.schema_version,timestamp:new Date().toISOString(),active_character_count:ids.length},next_stage:hard?"CSD-008-REPAIR":"CSD-002-8-FRAME-DIRECTOR"});
  }catch(e){return json(res,500,{ok:false,error:"CSD-009 failed",detail:e.message})}
};