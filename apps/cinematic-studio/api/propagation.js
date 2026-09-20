const fs=require("fs");const path=require("path");
function json(res,status,payload){res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(payload));}
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"));}
module.exports=async function handler(req,res){try{
 const scene=load("scene-contract.json"), registry=load("character-registry.json"), locks=load("canonical-visual-locks.json");
 if(req.method==="GET")return json(res,200,{ok:true,gate:"CSD-003.3",engine:"KALP-CSD-003.3",status:"READY",source_reference:{frame_id:"F01",asset_id:"5234a294-ed5a-4dfc-a048-54fe84b6d537",trusted:true}});
 if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"});}
 let body=req.body||{};if(typeof body==="string")body=JSON.parse(body||"{}");
 const ids=Array.isArray(body.frame_ids)&&body.frame_ids.length?body.frame_ids:["F02","F03","F04","F05","F06","F07","F08"];
 const frames=ids.map(id=>scene.frames.find(f=>f.frame_id===id));if(frames.some(f=>!f))return json(res,400,{ok:false,error:"Unknown frame ID"});
 const map=Object.fromEntries(registry.characters.map(c=>[c.character_id,c]));
 const jobs=frames.map(f=>{
   const visible=(f.perspective==="AUDIENCE"||f.perspective==="SHARED")?scene.selected_characters:[f.perspective,...scene.selected_characters.filter(id=>id!==f.perspective)];
   return {job_id:"CSD3.3-"+scene.scene_id+"-"+f.frame_id,engine_id:"KALP-CSD-003.3",scene_id:scene.scene_id,frame_id:f.frame_id,status:"READY",source_reference:{frame_id:"F01",asset_id:"5234a294-ed5a-4dfc-a048-54fe84b6d537"},propagation:{identity_lock:"INHERIT_F01",world_lock:"INHERIT_F01",spatial_lock:"INHERIT_F01",environment_lock:"INHERIT_F01"},perspective:f.perspective,characters:visible.map(id=>({character_id:id,display_name:map[id]?.display_name||id,visual_lock:map[id]?.visual_lock||null})),frame_spec:f,negative_constraints:["Do not change canonical face, body, costume, hair, age, crown, ornaments, weapons or accessories.","Do not change Mount Kailash or twilight continuity.","Do not introduce extra principal characters.","Do not break established three-character spatial relationship.","Do not override the frame's declared perspective.","No modern objects, text artifacts, duplicate faces/limbs or anatomy errors."]};
 });
 return json(res,200,{ok:true,contract:"KALP-CSD-REFERENCE-PROPAGATION-1.0",gate:"CSD-003.3",source_reference_trusted:true,job_count:jobs.length,jobs});
}catch(e){return json(res,500,{ok:false,error:"CSD-003.3 runtime failed",detail:e.message});}};