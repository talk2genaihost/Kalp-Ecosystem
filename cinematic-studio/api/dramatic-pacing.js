const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-016-scene-dramatic-beat-pacing.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,pacing_model:c.pacing_model,beat_schema:c.beat_schema,timing_contract:c.timing_contract,pacing_dimensions:c.pacing_dimensions,pacing_rules:c.pacing_rules,tension_curve_model:c.tension_curve_model,pacing_pipeline:c.pacing_pipeline,validation:c.validation,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const p=b.pacing||{},beats=Array.isArray(p.beats)?p.beats:[],frames=p.frame_timing_map||{};
  if(!p.scene_duration_seconds||p.scene_duration_seconds<=0)return out(res,422,{ok:false,status:"REJECTED",error:"SCENE_DURATION_INVALID"});
  if(!beats.length)return out(res,422,{ok:false,status:"REJECTED",error:"BEAT_WITHOUT_NARRATIVE_PURPOSE"});
  const missing=beats.filter(x=>!x.beat_id||!x.beat_type||!x.purpose||!x.source_event||typeof x.duration_seconds!=="number");
  if(missing.length)return out(res,422,{ok:false,status:"REJECTED",error:"BEAT_WITHOUT_CAUSAL_SOURCE",count:missing.length});
  if(!p.turning_point_timing?.beat_id)return out(res,422,{ok:false,status:"REJECTED",error:"TURNING_POINT_MISSING"});
  const required=["F01","F02","F03","F04","F05","F06","F07","F08"],unbound=required.filter(x=>!frames[x]);
  if(unbound.length)return out(res,422,{ok:false,status:"REJECTED",error:"FRAME_WITHOUT_BEAT_BINDING",frames:unbound});
  const total=beats.reduce((a,b)=>a+b.duration_seconds,0);
  if(total>p.scene_duration_seconds+0.001)return out(res,422,{ok:false,status:"REJECTED",error:"TIMING_OVERFLOW",total_duration:total});
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"PACING_RESOLVED",pacing_contract:p,beat_map:beats,tension_curve:p.tension_curve||[],turning_point_timing:p.turning_point_timing,frame_timing_map:frames,orchestration_handoff:"READY",frame_handoff:"CSD002_READY"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-016 failed",detail:e.message})}
};