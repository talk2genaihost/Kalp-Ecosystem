const fs=require("fs");
const path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
  try{
    const contract=load("csd-007-character-knowledge-belief-information.json");
    const universe=load("ramayana-universe-001.json");
    const registry=load("character-registry.json");
    if(req.method==="GET") return json(res,200,{ok:true,engine_id:contract.engine_id,status:contract.status,pipeline:contract.knowledge_reconciliation,memory_model:contract.provenance_model,information_classes:contract.information_classes,demo_test:contract.demo_test,downstream:contract.downstream});
    if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"})}
    let body=req.body||{}; if(typeof body==="string") body=JSON.parse(body||"{}");
    const ids=Array.isArray(body.character_ids)?body.character_ids:[];
    if(ids.length<1||ids.length>5) return json(res,400,{ok:false,error:"character_ids must contain 1 to 5 characters."});
    const known=new Set(registry.characters.map(c=>c.character_id));
    const unknown=ids.filter(id=>!known.has(id));
    if(unknown.length) return json(res,400,{ok:false,error:"Unknown character IDs.",unknown});
    if(!body.scene_state) return json(res,400,{ok:false,error:"scene_state is required."});
    const byId=new Map(universe.characters.map(c=>[c.id,c]));
    const supplied=body.scene_state.character_information_states||[];
    const states=ids.map(id=>{
      const c=byId.get(id), s=supplied.find(x=>x.character_id===id)||{};
      return {character_id:id,identity:{name:c.name,immutable:true},known:s.known||[],beliefs:s.beliefs||[],suspected:s.suspected||[],misbeliefs:s.misbeliefs||[],unknowns:s.unknowns||[],withheld_information:s.withheld_information||[]};
    });
    const provenanceErrors=[];
    for(const s of states) for(const item of s.known) if(!item.source_type||!item.confidence) provenanceErrors.push({character_id:s.character_id,item});
    if(provenanceErrors.length) return json(res,422,{ok:false,status:"KNOWLEDGE_PROVENANCE_INVALID",errors:provenanceErrors});
    const perspective=states.map(s=>({character_id:s.character_id,sees:s.sees||"DERIVE_FROM_SCENE_AND_KNOWN_INFORMATION",knows:s.known.map(x=>x.content),believes:s.beliefs.map(x=>x.proposition),suspects:s.suspected,misunderstands:s.misbeliefs,unaware_of:s.unknowns}));
    return json(res,200,{ok:true,engine_id:contract.engine_id,status:"KNOWLEDGE_STATE_RESOLVED",scene_id:body.scene_id||"CSD7-RUNTIME-"+Date.now(),active_characters:ids,character_information_states:states,perspective_state:perspective,behavioral_constraints:["No action may depend on an UNKNOWN_FACT.","Inference must remain distinct from witnessed fact.","Audience-only information must not leak into character perspective."],csd002_handoff:{status:"READY",rule:"CSD-002 must derive each frame perspective from the selected character information state plus CSD-006 emotional state."},next_stage:"CSD-002-8-FRAME-DIRECTOR"});
  }catch(e){return json(res,500,{ok:false,error:"CSD-007 failed",detail:e.message})}
};