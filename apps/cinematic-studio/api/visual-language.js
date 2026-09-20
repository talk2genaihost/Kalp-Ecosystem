const fs=require("fs"),path=require("path");
function load(){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","csd-018-scene-visual-language-lighting-atmosphere.json"),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load();
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,lighting_schema:c.lighting_schema,color_language:c.color_language,atmosphere_schema:c.atmosphere_schema,environmental_visual_state:c.environmental_visual_state,vfx_language:c.vfx_language,visual_continuity:c.visual_continuity,visual_pipeline:c.visual_pipeline,validation:c.validation,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const frames=Array.isArray(b.frames)?b.frames:[];
  if(frames.length!==8)return out(res,422,{ok:false,status:"REJECTED",error:"FRAME_COUNT_NOT_EQUAL_TO_8"});
  const required=["frame_id","lighting","color","atmosphere","vfx"];
  const missing=frames.flatMap(f=>required.filter(k=>f[k]===undefined||f[k]===null).map(k=>f.frame_id+":"+k));
  if(missing.length)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_VISUAL_CONTRACT",missing});
  const active=Array.isArray(b.active_character_ids)?b.active_character_ids:[];
  if(active.length>5)return out(res,422,{ok:false,status:"REJECTED",error:"ACTIVE_CHARACTER_COUNT_ABOVE_5"});
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"VISUAL_LANGUAGE_RESOLVED",visual_language_contract:b.visual_language_contract||{},lighting_map:frames.map(f=>({frame_id:f.frame_id,lighting:f.lighting})),color_language_map:frames.map(f=>({frame_id:f.frame_id,color:f.color})),atmosphere_map:frames.map(f=>({frame_id:f.frame_id,atmosphere:f.atmosphere})),vfx_map:frames.map(f=>({frame_id:f.frame_id,vfx:f.vfx})),frame_visual_package:frames,generation_handoff:"CSD003_READY"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-018 failed",detail:e.message})}
};