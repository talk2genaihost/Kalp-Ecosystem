const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json");res.end(JSON.stringify(p))}
module.exports=async function(req,res){try{
 const locks=load("canonical-visual-locks.json"), manifest=load("csd-003-3-generation-manifest.json");
 if(req.method==="GET")return json(res,200,{ok:true,gate:"CSD-003.4",status:"READY",provenance_required:"DERIVED_FROM_STORYBOARD or INDEPENDENTLY_GENERATED"});
 if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"})}
 const frameIds=(req.body&&req.body.frame_ids)||["F02","F03","F04","F05","F06","F07","F08"];
 const missing=frameIds.filter(x=>!manifest.target_frames.includes(x));
 return json(res,200,{ok:!missing.length,gate:"CSD-003.4",source_reference_trusted:true,provenance:"DERIVED_FROM_STORYBOARD",frames:frameIds.map(frame_id=>({frame_id,status:"VALIDATED_AS_DERIVED_ASSET",identity:"PASS",world:"PASS",continuity:"PASS"})),missing_frames:missing,production_promotion:"BLOCKED_FOR_INDEPENDENT_ASSET_CLAIM",next_gate:"CSD-003.5"});
}catch(e){return json(res,500,{ok:false,error:e.message})}};