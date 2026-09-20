const fs=require("fs");const path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-030-master-production-assembly-handoff.json");
  if(req.method==="GET")return json(res,200,{ok:true,engine_id:c.engine_id,status:c.status,pipeline:c.assembly_pipeline,hard_gates:c.hard_gates,master_package:c.master_package,change_policy:c.change_policy,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const required=c.master_package.required_sections;
  const missing=required.filter(k=>b[k]===undefined||b[k]===null);
  const blockers=[];
  if(!b.scene_id)blockers.push("MISSING_SCENE_ID");
  if(!b.canonical_scene_version)blockers.push("MISSING_CANONICAL_SCENE_VERSION");
  if(!Array.isArray(b.active_characters)||b.active_characters.length<1||b.active_characters.length>5)blockers.push("INVALID_ACTIVE_CHARACTER_COUNT");
  if(missing.length)blockers.push("MISSING_MASTER_SECTIONS:"+missing.join(","));
  if(b.unresolved_blockers?.length)blockers.push("UPSTREAM_BLOCKERS_PRESENT");
  if(b.provider_specific_master===true)blockers.push("PROVIDER_SPECIFIC_DATA_IN_MASTER");
  const status=blockers.length?"ASSEMBLY_BLOCKED":"READY_FOR_EXECUTION";
  const revision=b.master_revision||("CSD30-MASTER-"+b.scene_id+"-v1.0");
  return json(res,blockers.length?422:200,{ok:!blockers.length,engine_id:c.engine_id,status,master_revision:revision,missing_sections:missing,blockers,master_fingerprint:!blockers.length?"GENERATE_SHA256_CANONICAL_PACKAGE":null,production_snapshot:!blockers.length?"FROZEN":"NOT_FROZEN",handoff:!blockers.length?"READY_FOR_EXECUTION":"BLOCKED",change_policy:c.change_policy,next_stage:!blockers.length?"CMSE-013-PRODUCTION-PROMPT-COMPILER":"UPSTREAM_REWORK"});
 }catch(e){return json(res,500,{ok:false,error:"CSD-030 failed",detail:e.message})}
};