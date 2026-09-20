const fs=require("fs");
const path=require("path");

function json(res,status,payload){
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");
  res.end(JSON.stringify(payload));
}
function load(name){
  const file=path.join(__dirname,"..","data",name);
  return JSON.parse(fs.readFileSync(file,"utf8"));
}
module.exports=async function handler(req,res){
  try{
    const registry=load("character-registry.json");
    const scene=load("scene-contract.json");
    if(req.method==="GET"){
      const type=(req.query&&req.query.type)||"scene";
      if(type==="characters") return json(res,200,{ok:true,contract:"KALP_CHARACTER_REGISTRY-1.0",data:registry});
      return json(res,200,{ok:true,contract:"KALP-CSD-SCENE-1.0",data:scene});
    }
    if(req.method==="POST"){
      let body=req.body||{};
      if(typeof body==="string") body=JSON.parse(body||"{}");
      const ids=Array.isArray(body.character_ids)?body.character_ids:[];
      if(ids.length<1||ids.length>5) return json(res,400,{ok:false,error:"character_ids must contain 1–5 characters"});
      const known=new Set(registry.characters.map(c=>c.character_id));
      const unknown=ids.filter(id=>!known.has(id));
      if(unknown.length) return json(res,400,{ok:false,error:"Unknown character IDs",unknown});
      const generated={
        ...scene,
        scene_id:body.scene_id||scene.scene_id,
        scene_title:body.scene_title||scene.scene_title,
        objective:body.objective||scene.objective,
        selected_characters:ids,
        generated_at:new Date().toISOString(),
        runtime_status:"GENERATED"
      };
      return json(res,200,{ok:true,contract:"KALP-CSD-RUNTIME-1.0",data:generated});
    }
    res.setHeader("Allow","GET, POST");
    return json(res,405,{ok:false,error:"Method not allowed"});
  }catch(error){
    return json(res,500,{ok:false,error:"Cinematic runtime failed",detail:error.message});
  }
};