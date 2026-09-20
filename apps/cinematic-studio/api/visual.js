const fs=require("fs");
const path=require("path");

function json(res,status,payload){
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");
  res.end(JSON.stringify(payload));
}
function load(name){
  return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",name),"utf8"));
}
function charMap(registry){
  return Object.fromEntries(registry.characters.map(c=>[c.character_id,c]));
}
function compilePrompt(scene,frame,registry){
  const chars=charMap(registry);
  const ids=scene.selected_characters||[];
  const visible=frame.perspective==="AUDIENCE"||frame.perspective==="SHARED"
    ? ids : [frame.perspective,...ids.filter(id=>id!==frame.perspective)];
  const identity=visible.map(id=>{
    const c=chars[id];
    if(!c)return null;
    return {
      character_id:id,
      display_name:c.display_name,
      status:c.status,
      visual_lock:c.visual_lock||null,
      performance_lock:c.performance_lock||null,
      voice_lock:c.voice_lock||null
    };
  }).filter(Boolean);
  const perspective=frame.perspective==="AUDIENCE"
    ? "Audience omniscient cinematic view"
    : frame.perspective==="SHARED"
      ? "Shared cinematic perception of all active characters"
      : "POV/subjective cinematic perception anchored to "+(chars[frame.perspective]?.display_name||frame.perspective);
  const negative=[
    "Do not change character identity, face, body proportions, costume, hair, age, or canonical accessories.",
    "Do not change Mount Kailash, twilight timing, spatial blocking, or established environment continuity.",
    "Do not introduce extra principal characters.",
    "Do not fully manifest Ravan's power in F06; energy remains emerging and controlled.",
    "No modern objects, modern clothing, text artifacts, duplicate limbs, duplicate faces, distorted hands, or anatomy errors."
  ];
  return {
    subject:identity,
    perspective,
    narrative_purpose:frame.purpose,
    emotion:frame.emotion,
    action:frame.action,
    dialogue:frame.dialogue,
    camera:frame.camera,
    environment:{
      location_id:scene.world.location_id,
      location:scene.world.location,
      time_of_day:scene.world.time_of_day,
      environment_lock:scene.world.environment_lock
    },
    composition:"Cinematic 16:9 composition with clear subject hierarchy and continuity-safe spatial blocking.",
    lighting:"Twilight Himalayan cinematic light; preserve established light direction and intensity.",
    atmosphere:"Epic mythological cinema, grounded physical atmosphere, restrained divine energy.",
    vfx:frame.frame_id==="F06"?"Controlled emerging energy around Ravan's hand; no full discharge.":frame.frame_id==="F07"?"Subtle divine energy suppression from Shiva; controlled, not chaotic.":"No additional VFX beyond scene-consistent atmospheric detail.",
    continuity_constraints:scene.validation_rules,
    negative_constraints:negative
  };
}
module.exports=async function handler(req,res){
  try{
    const registry=load("character-registry.json");
    const scene=load("scene-contract.json");
    if(req.method==="GET"){
      return json(res,200,{ok:true,contract:"KALP-CSD-VISUAL-1.0",engine:"KALP-CSD-003",status:"READY"});
    }
    if(req.method==="POST"){
      let body=req.body||{};
      if(typeof body==="string") body=JSON.parse(body||"{}");
      const frameIds=Array.isArray(body.frame_ids)&&body.frame_ids.length
        ? body.frame_ids : scene.frames.map(f=>f.frame_id);
      const frames=frameIds.map(id=>scene.frames.find(f=>f.frame_id===id));
      if(frames.some(f=>!f))return json(res,400,{ok:false,error:"Unknown frame ID"});
      const jobs=frames.map(frame=>{
        const prompt=compilePrompt(scene,frame,registry);
        return {
          job_id:"CSD3-"+scene.scene_id+"-"+frame.frame_id,
          engine_id:"KALP-CSD-003",
          scene_id:scene.scene_id,
          frame_id:frame.frame_id,
          status:"READY",
          aspect_ratio:scene.storyboard.aspect_ratio,
          output_type:"IMAGE",
          provider_neutral:true,
          context_fingerprint:"CSD3:"+scene.scene_id+":"+frame.frame_id,
          visual_spec:prompt,
          downstream:["CMSE-012","CMSE-013","CMSE-014","CMSE-015"]
        };
      });
      return json(res,200,{ok:true,contract:"KALP-CSD-VISUAL-JOB-1.0",engine:"KALP-CSD-003",data:{scene_id:scene.scene_id,job_count:jobs.length,jobs}});
    }
    res.setHeader("Allow","GET, POST");
    return json(res,405,{ok:false,error:"Method not allowed"});
  }catch(error){
    return json(res,500,{ok:false,error:"CSD-003 runtime failed",detail:error.message});
  }
};