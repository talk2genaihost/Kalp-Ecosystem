const fs=require("fs");const path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function json(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-010-adaptive-multi-character-scene-orchestrator.json");
  const registry=load("character-registry.json");
  if(req.method==="GET")return json(res,200,{ok:true,engine_id:c.engine_id,status:c.status,graph:c.orchestration_graph,dependencies:c.dependency_graph,adaptive_policy:c.adaptive_policy,execution_policy:c.execution_policy,rework_router:c.rework_router,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return json(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const ids=Array.isArray(b.character_ids)?b.character_ids:[];
  if(ids.length<1||ids.length>5)return json(res,400,{ok:false,error:"character_ids must contain 1 to 5 characters."});
  const known=new Set(registry.characters.map(x=>x.character_id)),unknown=ids.filter(x=>!known.has(x));
  if(unknown.length)return json(res,400,{ok:false,error:"Unknown character IDs.",unknown});
  const profile={character_count:ids.length,relationship_density:b.relationship_density||"AUTO",knowledge_conflict:b.knowledge_conflict||"AUTO",emotional_transition:b.emotional_transition||"AUTO",perspective_count:b.perspective_count||"AUTO",audience_information_complexity:b.audience_information_complexity||"AUTO",continuity_risk:b.continuity_risk||"AUTO"};
  const plan=[
   {step:1,module:"CSD-005",state:"READY",depends_on:[]},
   {step:2,module:"CSD-006",state:"READY",depends_on:["CSD-005"]},
   {step:3,module:"CSD-007",state:"READY",depends_on:["CSD-005"]},
   {step:4,module:"CSD-008",state:"WAITING",depends_on:["CSD-005","CSD-006","CSD-007"]},
   {step:5,module:"CSD-009",state:"WAITING",depends_on:["CSD-006","CSD-007","CSD-008"]},
   {step:6,module:"CSD-002",state:"WAITING",depends_on:["CSD-009"]}
  ];
  return json(res,200,{ok:true,engine_id:c.engine_id,status:"ORCHESTRATION_PLAN_READY",orchestration_id:b.orchestration_id||"CSD10-RUNTIME-"+Date.now(),scene_id:b.scene_id||"CSD10-RUNTIME-SCENE-"+Date.now(),active_characters:ids,complexity_profile:profile,execution_plan:plan,module_states:{CSD_005:"READY",CSD_006:"READY",CSD_007:"READY",CSD_008:"WAITING",CSD_009:"WAITING",CSD_002:"WAITING"},rework_router:c.rework_router,production_readiness:"PENDING_MODULE_EXECUTION",next_stage:"CSD-005"});
 }catch(e){return json(res,500,{ok:false,error:"CSD-010 failed",detail:e.message})}
};