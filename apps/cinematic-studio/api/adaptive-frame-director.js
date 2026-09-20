const fs=require("fs");
const path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
  try{
    const c=load("csd-010-adaptive-8-frame-director.json");
    if(req.method==="GET")return json(res,200,{ok:true,engine_id:c.engine_id,status:c.status,hard_contract:c.hard_contract,adaptive_director_model:c.adaptive_director_model,resolution_pipeline:c.resolution_pipeline,demo_test:c.demo_test,downstream:c.downstream});
    if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"})}
    let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
    const required=["scene_intelligence","emotional_state","knowledge_state","perception_state","validation_result"];
    const missing=required.filter(k=>b[k]==null);
    if(missing.length)return json(res,400,{ok:false,error:"Missing upstream inputs.",missing});
    const v=b.validation_result;
    if(v.status!=="PASS"&&v.status!=="PASS_WITH_ADVISORIES")return json(res,409,{ok:false,status:"BLOCKED_UPSTREAM_VALIDATION",message:"CSD-009 must PASS before adaptive direction.",validation_status:v.status});
    const ids=Array.isArray(b.character_ids)?b.character_ids:((b.scene_intelligence.active_characters||[]).map(x=>typeof x==="string"?x:x.character_id||x.id));
    if(ids.length<1||ids.length>5)return json(res,400,{ok:false,error:"active character count must be 1 to 5"});
    const frames=Array.isArray(b.frame_perspective_map)?b.frame_perspective_map:[];
    if(frames.length!==8)return json(res,422,{ok:false,error:"CSD-010 requires exactly 8 frame directives."});
    const frameIds=frames.map(x=>x.frame_id);
    const unique=frameIds.length===new Set(frameIds).size&&c.hard_contract.frame_ids.every(id=>frameIds.includes(id));
    if(!unique)return json(res,422,{ok:false,error:"Frame IDs must be exactly F01-F08."});
    const turning=frames.find(x=>x.purpose==="TURNING_POINT"||x.frame_id==="F07");
    const ending=frames.find(x=>x.frame_id==="F08");
    if(!turning||!ending)return json(res,422,{ok:false,error:"Turning point and ending/hook are required."});
    return json(res,200,{ok:true,engine_id:c.engine_id,status:"ADAPTIVE_8_FRAME_RESOLVED",scene_id:b.scene_id||"CSD10-RUNTIME-"+Date.now(),active_characters:ids,adaptive_mode:true,frame_plan:frames,turning_point:turning.frame_id,ending_state:ending.frame_id,upstream_validation:v.status,next_stage:"CSD-003-PERSPECTIVE-TO-VISUAL-GENERATION"});
  }catch(e){return json(res,500,{ok:false,error:"CSD-010 failed",detail:e.message})}
};