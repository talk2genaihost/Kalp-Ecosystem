const fs=require("fs"),path=require("path");
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p));}
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"));}
module.exports=async function handler(req,res){try{
 const r=load("cmse-010-3-routing-plan.json"),p=load("provider-capability-registry.json");
 if(req.method==="GET")return json(res,200,{ok:true,engine:r.engine_id,status:r.status,route_count:r.routes.length,profile:r.requirements.routing_profile});
 if(req.method==="POST"){let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");const ids=Array.isArray(b.frame_ids)&&b.frame_ids.length?b.frame_ids:null;const routes=ids?r.routes.filter(x=>ids.includes(x.frame_id)):r.routes;return json(res,200,{ok:true,engine:r.engine_id,status:"ROUTING_PLAN_READY",routes,provider_registry:p});}
 res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"});
}catch(e){return json(res,500,{ok:false,error:e.message});}};