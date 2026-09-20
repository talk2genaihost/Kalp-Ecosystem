const fs=require("fs");const path=require("path");
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p));}
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"));}
module.exports=async function handler(req,res){try{
 const b=load("cmse-010-1-context-bundle.json");
 if(req.method==="GET")return json(res,200,{ok:true,engine:b.engine_id,status:b.assembly_status,scene_id:b.scene_id,packet_count:b.packet_count,packet_schema:b.schema_version});
 if(req.method==="POST"){let body=req.body||{};if(typeof body==="string")body=JSON.parse(body||"{}");const ids=Array.isArray(body.frame_ids)&&body.frame_ids.length?body.frame_ids:null;const packets=ids?b.packets.filter(p=>ids.includes(p.frame_id)):b.packets;return json(res,200,{ok:true,engine:b.engine_id,status:packets.length?"ASSEMBLED":"NO_MATCH",packet_count:packets.length,packets});}
 res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"});
}catch(e){return json(res,500,{ok:false,error:"CMSE-010.1 failed",detail:e.message});}};