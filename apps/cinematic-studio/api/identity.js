const fs=require("fs");
const path=require("path");

function json(res,status,payload){res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(payload));}
function load(name){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",name),"utf8"));}
function validate(scene,registry,frameId){
  const frame=scene.frames.find(f=>f.frame_id===frameId);
  if(!frame)return {ok:false,error:"Unknown frame ID"};
  const ids=scene.selected_characters||[];
  const map=Object.fromEntries(registry.characters.map(c=>[c.character_id,c]));
  const coverage=ids.map(id=>{const c=map[id];return {character_id:id,display_name:c?.display_name||id,status:c?.status||"UNKNOWN",visual_lock:c?.visual_lock||null,identity_gate:c?.visual_lock?"LOCK_AVAILABLE":"LOCK_MISSING"};});
  const missing=coverage.filter(c=>!c.visual_lock).map(c=>c.character_id);
  return {ok:true,gate:"CSD-003.2",scene_id:scene.scene_id,frame_id:frameId,required_character_ids:ids,lock_coverage:coverage,result:{status:missing.length?"PASS_WITH_LOCK_COVERAGE_GAP":"READY_FOR_VISUAL_IDENTITY_MATCH",trusted_reference:missing.length===0,missing_visual_locks:missing,downstream_propagation:missing.length?"BLOCKED":"ELIGIBLE"}};
}
module.exports=async function handler(req,res){
  try{
    const registry=load("character-registry.json");
    const canonicalScene=load("scene-contract.json");
    if(req.method==="GET")return json(res,200,{ok:true,engine:"KALP-CSD-003.2",status:"READY",contract:"KALP-CSD-IDENTITY-VALIDATION-1.0",hard_gate:"Missing canonical visual lock blocks identity PASS."});
    if(req.method==="POST"){
      let body=req.body||{}; if(typeof body==="string")body=JSON.parse(body||"{}");
      const scene=body.scene && Array.isArray(body.scene.frames) ? body.scene : canonicalScene;
      return json(res,200,validate(scene,registry,body.frame_id||"F01"));
    }
    res.setHeader("Allow","GET, POST"); return json(res,405,{ok:false,error:"Method not allowed"});
  }catch(error){return json(res,500,{ok:false,error:"CSD-003.2 runtime failed",detail:error.message});}
};
