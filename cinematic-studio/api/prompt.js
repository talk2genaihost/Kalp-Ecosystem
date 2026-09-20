const fs=require("fs"),path=require("path");
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p));}
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"));}
module.exports=async function handler(req,res){try{
 const b=load("cmse-010-2-pir-bundle.json");
 if(req.method==="GET")return json(res,200,{ok:true,engine:b.engine_id,status:b.compilation_status,frame_count:b.frame_count,schema:b.schema_version});
 if(req.method==="POST"){let x=req.body||{};if(typeof x==="string")x=JSON.parse(x||"{}");const ids=Array.isArray(x.frame_ids)&&x.frame_ids.length?x.frame_ids:null;const frames=ids?b.frames.filter(f=>ids.includes(f.frame_id)):b.frames;return json(res,200,{ok:true,engine:b.engine_id,status:frames.length?"COMPILED":"NO_MATCH",frame_count:frames.length,frames});}
 res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"});
}catch(e){return json(res,500,{ok:false,error:e.message});}};