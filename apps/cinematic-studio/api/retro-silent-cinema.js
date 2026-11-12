const { createSilentCinemaPlan } = require("../engine/retro-silent-cinema.cjs");
function json(res,status,payload){res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(payload));}
module.exports=async function handler(req,res){
 if(req.method==="GET")return json(res,200,{ok:true,module:"KALP-CINE-RSCE-001",name:"KALP Retro Silent Cinema Engine",version:"1.0.0",status:"BLUEPRINT_ENGINE_READY",capabilities:["universal-story-brief","genre-detection","silent-acting-direction","intertitle-planning","period-cinematography","character-continuity-contract","provider-neutral-prompts"],supported_formats:["short-film","feature-film","social-reel","advertisement","scene-recreation"],supported_aspect_ratios:["4:3","16:9","9:16"]});
 if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"});}
 try{let body=req.body||{};if(typeof body==="string")body=JSON.parse(body||"{}");return json(res,200,{ok:true,contract:"KALP-RETRO-SILENT-CINEMA-PLAN-1.0",data:createSilentCinemaPlan(body)});}
 catch(e){return json(res,e.statusCode||500,{ok:false,error:e.message||"Transformation failed"});}
};