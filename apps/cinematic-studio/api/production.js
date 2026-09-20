const fs=require("fs");const path=require("path");
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p));}
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"));}
module.exports=async function handler(req,res){try{
 const c=load("cmse-010-production-contract.json");
 if(req.method==="GET")return json(res,200,{ok:true,engine:c.engine_id,name:c.engine_name,state:c.current_status,job_count:c.production_jobs.length,asset_policy:c.asset_policy});
 if(req.method==="POST"){
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const action=b.action||"PLAN";
  const next={PLAN:"PLANNED",VALIDATE:"VALIDATING",READY:"ASSETS_READY",GENERATE:"GENERATING",ASSEMBLE:"ASSEMBLING",QA:"QA",MASTER:"MASTERED",PACKAGE:"PACKAGED"}[action];
  return json(res,200,{ok:true,engine:c.engine_id,action,state:next||c.current_status,jobs:c.production_jobs,assets:c.assets,provenance_policy:c.asset_policy});
 }
 res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"});
}catch(e){return json(res,500,{ok:false,error:e.message});}};