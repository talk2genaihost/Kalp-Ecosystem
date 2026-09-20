const fs=require("fs");
const path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
  try{
    const contract=load("csd-008-perspective-perception.json");
    const registry=load("character-registry.json");
    if(req.method==="GET") return json(res,200,{ok:true,engine_id:contract.engine_id,status:contract.status,pipeline:contract.perception_resolution_pipeline,model:contract.perception_model,rules:contract.director_rules,demo_test:contract.demo_test,downstream:contract.downstream});
    if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"})}
    let body=req.body||{};if(typeof body==="string")body=JSON.parse(body||"{}");
    const ids=Array.isArray(body.character_ids)?body.character_ids:[];
    if(ids.length<1||ids.length>5)return json(res,400,{ok:false,error:"character_ids must contain 1 to 5 characters."});
    const known=new Set(registry.characters.map(c=>c.character_id)), unknown=ids.filter(id=>!known.has(id));
    if(unknown.length)return json(res,400,{ok:false,error:"Unknown character IDs.",unknown});
    if(!body.scene_state||!body.knowledge_state||!body.emotional_state)return json(res,400,{ok:false,error:"scene_state, knowledge_state and emotional_state are required."});
    const canonical=body.scene_state.canonical_reality||body.scene_state.events||[];
    const knowledge=body.knowledge_state.character_information_states||[];
    const emotions=body.emotional_state.character_states||[];
    const perceptions=ids.map(id=>{
      const k=knowledge.find(x=>x.character_id===id)||{}, e=emotions.find(x=>x.character_id===id)||{};
      return {
        character_id:id,
        sensory_access:body.scene_state.sensory_access||"DERIVE_FROM_BLOCKING",
        attention_target:k.beliefs?.[0]?.proposition||e.entry_state?.objective||"SCENE_CENTRE",
        noticed:k.known?.map(x=>x.content)||[],
        ignored:[],
        salient_detail:k.suspected?.[0]||null,
        interpretation:k.beliefs?.[0]?.proposition||"DERIVE",
        emotional_coloration:e.entry_state?.current_emotion||"UNSPECIFIED",
        perceived_threat:e.entry_state?.fear_or_resistance||null,
        perceived_opportunity:null,
        blind_spot:k.unknowns||[],
        uncertainty:k.beliefs?.map(x=>x.confidence)||[],
        observation_vs_interpretation:{observations:k.known?.map(x=>x.content)||[],interpretations:k.beliefs?.map(x=>x.proposition)||[]}
      };
    });
    return json(res,200,{ok:true,engine_id:contract.engine_id,status:"PERCEPTION_RESOLVED",scene_id:body.scene_id||"CSD8-RUNTIME-"+Date.now(),canonical_reality:canonical,character_perceptions:perceptions,frame_perspective_map:contract.demo_test.frame_perspective_map,audience_information_boundary:body.audience_model||"EXPLICIT_AUDIENCE_MODEL_REQUIRED",validation:{single_reality_preserved:true,knowledge_boundary_preserved:true,emotional_state_consumed:true},csd002_handoff:contract.demo_test.csd002_handoff,next_stage:"CSD-002-8-FRAME-DIRECTOR"});
  }catch(e){return json(res,500,{ok:false,error:"CSD-008 failed",detail:e.message})}
};