const fs=require("fs"),path=require("path");
function load(n){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data",n),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
function hasCycle(nodes,edges){const adj={};nodes.forEach(n=>adj[n.event_id]=[]);edges.filter(e=>e.edge_type!=="PARALLEL_WITH").forEach(e=>{if(adj[e.from])adj[e.from].push(e.to)});const v={},stack={};function dfs(x){if(stack[x])return true;if(v[x])return false;v[x]=true;stack[x]=true;for(const y of adj[x]||[])if(dfs(y))return true;stack[x]=false;return false}return nodes.some(n=>dfs(n.event_id))}
module.exports=async function handler(req,res){
 try{
  const c=load("csd-013-scene-event-graph-dependency-resolution.json");
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,graph_model:c.graph_model,graph_stages:c.graph_stages,dependency_rules:c.dependency_rules,execution_waves:c.execution_waves,branch_model:c.branch_model,critical_path:c.critical_path,hard_failures:c.hard_failures,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  const nodes=Array.isArray(b.nodes)?b.nodes:[],edges=Array.isArray(b.edges)?b.edges:[],snapshot=b.canonical_snapshot;
  if(!snapshot||!snapshot.scene_id||!snapshot.scene_version)return out(res,400,{ok:false,error:"canonical_snapshot is required."});
  if(!nodes.length)return out(res,422,{ok:false,status:"BLOCKED",error:"NO_EVENT_NODES"});
  const ids=new Set(nodes.map(n=>n.event_id));const missingNodes=nodes.filter(n=>!n.event_id||!n.actor||!n.event_type||!n.intent||!Array.isArray(n.preconditions)||!Array.isArray(n.state_dependencies)||!Array.isArray(n.outputs));
  if(missingNodes.length)return out(res,422,{ok:false,status:"REJECTED",error:"INVALID_EVENT_NODE",count:missingNodes.length});
  const badEdges=edges.filter(e=>!ids.has(e.from)||!ids.has(e.to)||!e.edge_type);
  if(badEdges.length)return out(res,422,{ok:false,status:"REJECTED",error:"INVALID_DEPENDENCY_EDGE",count:badEdges.length});
  if(hasCycle(nodes,edges))return out(res,422,{ok:false,status:"REJECTED",error:"GRAPH_CYCLE"});
  const waveConflicts=[];
  const waves=Array.isArray(b.execution_waves)?b.execution_waves:[];
  for(const wave of waves){const paths=[];for(const id of wave){const n=nodes.find(x=>x.event_id===id);for(const p of n?.state_dependencies||[])if(paths.includes(p))waveConflicts.push(p);else paths.push(p)}}
  if(waveConflicts.length)return out(res,422,{ok:false,status:"REJECTED",error:"PARALLEL_STATE_CONFLICT",paths:[...new Set(waveConflicts)]});
  const graphId=b.graph_id||("CSD13-"+snapshot.scene_id+"-"+snapshot.scene_version);
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"GRAPH_RESOLVED",graph_id:graphId,scene_id:snapshot.scene_id,snapshot_version:snapshot.scene_version,nodes,edges,execution_waves:waves,branches:b.branches||[],convergence_points:b.convergence_points||[],critical_path:b.critical_path||[],blocked_nodes:[],canonical_snapshot_ref:{scene_id:snapshot.scene_id,scene_version:snapshot.scene_version},transition_handoffs:{CSD012:"READY_FOR_EVENT_TRANSITION",CSD010:"READY_FOR_ORCHESTRATION",CSD002:"READY_FOR_FRAME_DIRECTOR"},production_handoff:"READY"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-013 failed",detail:e.message})}
};