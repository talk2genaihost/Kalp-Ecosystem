const fs=require("fs");
const path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
  try{
    const contract=load("csd-006-character-state-emotional-continuity.json");
    const universe=load("ramayana-universe-001.json");
    const registry=load("character-registry.json");
    if(req.method==="GET") return json(res,200,{ok:true,engine_id:contract.engine_id,status:contract.status,pipeline:contract.resolution_pipeline,memory_model:contract.memory_model,demo_test:contract.demo_test,downstream:contract.downstream});
    if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"})}
    let body=req.body||{}; if(typeof body==="string") body=JSON.parse(body||"{}");
    const ids=Array.isArray(body.character_ids)?body.character_ids:[];
    if(ids.length<1||ids.length>5) return json(res,400,{ok:false,error:"character_ids must contain 1 to 5 characters."});
    const known=new Set(registry.characters.map(c=>c.character_id));
    const unknown=ids.filter(id=>!known.has(id));
    if(unknown.length) return json(res,400,{ok:false,error:"Unknown character IDs.",unknown});
    const source=body.previous_scene_ending_snapshot||body.current_scene_state||null;
    if(!source) return json(res,400,{ok:false,error:"previous_scene_ending_snapshot or current_scene_state is required."});
    const universeById=new Map(universe.characters.map(c=>[c.id,c]));
    const states=ids.map(id=>{
      const c=universeById.get(id);
      const supplied=(source.character_states||[]).find(x=>x.character_id===id)||{};
      return {
        character_id:id,
        identity:{name:c.name,identity_seed:c.identity_seed,visual_seed:c.visual_seed,immutable:true},
        entry_state:{
          current_emotion:supplied.current_emotion||"UNSPECIFIED",
          emotional_intensity:supplied.emotional_intensity??0,
          objective:supplied.objective||"INHERIT_FROM_SCENE_INTELLIGENCE",
          fear_or_resistance:supplied.fear_or_resistance||null,
          belief_activation:supplied.belief_activation||null,
          relationship_pressure:supplied.relationship_pressure||null,
          behavioral_tendency:supplied.behavioral_tendency||"INHERIT",
          intention:supplied.intention||"RECALCULATE",
          micro_expression:supplied.micro_expression||"DERIVE",
          body_state:supplied.body_state||"DERIVE",
          dialogue_tendency:supplied.dialogue_tendency||"INHERIT_VOICE_DNA",
          action_readiness:supplied.action_readiness||"DERIVE"
        }
      }
    });
    const transitions=states.map(s=>({character_id:s.character_id,before:s.entry_state.current_emotion,trigger:source.trigger_event||"SCENE_STATE_CARRYOVER",after:s.entry_state.current_emotion,transition_status:"CARRIED_FORWARD"}));
    return json(res,200,{ok:true,engine_id:contract.engine_id,status:"CHARACTER_STATE_RESOLVED",scene_id:body.scene_id||"CSD6-RUNTIME-"+Date.now(),previous_scene_id:body.previous_scene_id||null,active_characters:ids,memory_source:source,character_states:states,state_transitions:transitions,continuity_constraints:contract.continuity_rules,next_stage:"CSD-002-8-FRAME-DIRECTOR"});
  }catch(e){return json(res,500,{ok:false,error:"CSD-006 failed",detail:e.message})}
};