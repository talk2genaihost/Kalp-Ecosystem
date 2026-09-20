const fs=require("fs");const path=require("path");
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p));}
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"));}
module.exports=async function handler(req,res){try{
 const gate=load("csd-003-6-promotion.json");
 if(req.method==="GET")return json(res,200,{ok:true,gate:"CSD-003.6",status:gate.result.status,cmse_010_handoff:gate.result.cmse_010_handoff});
 if(req.method==="POST")return json(res,200,{ok:true,gate:"CSD-003.6",result:gate.result,frame_status:gate.frame_status});
 res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"});
}catch(e){return json(res,500,{ok:false,error:e.message});}};