const fs=require("fs");
const path=require("path");
const crypto=require("crypto");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
function compileFrame(f,scene,registry,validationFingerprint){
  const chars=Array.isArray(f.characters)?f.characters:[];
  return {
    job_id:"CSD11-"+scene.scene_id+"-"+f.frame_id,
    scene_id:scene.scene_id,frame_id:f.frame_id,frame_purpose:f.purpose,perspective:f.perspective,
    canonical_reality:scene.canonical_reality||scene.events||[],
    characters:chars.map(id=>({character_id:id,lock:(registry.characters.find(c=>c.character_id===id)||{}).visual_lock||null})),
    performance:f.emotional_state||{},perception:{attention_target:f.attention_target,information_revealed:f.information_revealed,information_withheld:f.information_withheld},
    action:f.action||null,environment:scene.environment||"INHERIT_SCENE_ENVIRONMENT",
    camera:{intent:f.camera_intent||"DERIVE_FROM_PERSPECTIVE",composition:f.composition||"DERIVE_FROM_FRAME_INTENT"},
    lighting:f.lighting||"INHERIT_SCENE_LIGHTING",atmosphere:f.atmosphere||"INHERIT_SCENE_ATMOSPHERE",vfx:f.vfx||[],
    continuity_locks:f.continuity_constraints||[],negative_constraints:["IDENTITY_DRIFT","FACE_DRIFT","COSTUME_DRIFT","UNAUTHORIZED_CHARACTER","KNOWLEDGE_LEAK","PERCEPTION_CONTRADICTION"],
    output:{aspect_ratio:scene.aspect_ratio||"16:9",resolution:scene.resolution||"DEFERRED",provider_neutral:true},
    source_lineage:{adaptive_frame_source:f.frame_id,validation_fingerprint:validationFingerprint,compiler:"KALP-CSD-011"}
  };
}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-011-adaptive-frame-visual-compiler.json"), registry=load("character-registry.json");
  if(req.method==="GET")return json(res,200,{ok:true,engine_id:c.engine_id,status:c.status,layers:c.compilation_layers,contract:c.provider_neutral_contract,rules:c.perception_compilation_rules,validation:c.validation,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  if(!b.validation_result||!["PASS","PASS_WITH_ADVISORIES"].includes(b.validation_result.status))return json(res,409,{ok:false,status:"BLOCKED_UPSTREAM_VALIDATION"});
  const frames=b.adaptive_frame_plan?.frame_plan||b.adaptive_frame_plan?.frames||[];
  if(frames.length!==8)return json(res,422,{ok:false,error:"Exactly 8 adaptive frame directives are required."});
  const scene=b.scene_state||{}, known=new Set(registry.characters.map(c=>c.character_id)), unauthorized=[];
  for(const f of frames)for(const id of (f.characters||[]))if(!known.has(id))unauthorized.push(id);
  if(unauthorized.length)return json(res,422,{ok:false,error:"Unauthorized characters in frame plan.",unauthorized:[...new Set(unauthorized)]});
  const fingerprint=b.validation_result.validation_fingerprint||"INHERITED_FROM_CSD-009";
  const jobs=frames.map(f=>compileFrame(f,scene,registry,fingerprint));
  const compilerFingerprint=crypto.createHash("sha256").update(JSON.stringify(jobs)).digest("hex").slice(0,24);
  return json(res,200,{ok:true,engine_id:c.engine_id,status:"VISUAL_SPECS_COMPILED",scene_id:scene.scene_id||"CSD11-RUNTIME-"+Date.now(),frame_count:jobs.length,jobs,compiler_fingerprint:compilerFingerprint,next_stage:"CSD-003-PERSPECTIVE-TO-VISUAL-GENERATION"});
 }catch(e){return json(res,500,{ok:false,error:"CSD-011 failed",detail:e.message})}
};