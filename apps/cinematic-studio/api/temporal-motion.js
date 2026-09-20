const fs=require("fs"),path=require("path");
function load(){return JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","csd-020-scene-temporal-motion-continuity.json"),"utf8"))}
function out(res,s,p){res.statusCode=s;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(p))}
module.exports=async function handler(req,res){
 try{
  const c=load();
  if(req.method==="GET")return out(res,200,{ok:true,engine_id:c.engine_id,status:c.status,timeline_schema:c.timeline_schema,motion_track_schema:c.motion_track_schema,character_motion:c.character_motion,camera_motion:c.camera_motion,object_motion:c.object_motion,environment_motion:c.environment_motion,vfx_motion:c.vfx_motion,sync_contract:c.sync_contract,temporal_continuity:c.temporal_continuity,transition_types:c.transition_types,temporal_pipeline:c.temporal_pipeline,validation:c.validation,demo_test:c.demo_test,downstream:c.downstream});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return out(res,405,{ok:false,error:"Method not allowed"})}
  let b=req.body||{};if(typeof b==="string")b=JSON.parse(b||"{}");
  if(!b.timeline_id||!b.scene_id||typeof b.scene_duration_seconds!=="number")return out(res,422,{ok:false,status:"REJECTED",error:"INVALID_TIMELINE_CONTRACT"});
  const tracks=Array.isArray(b.motion_tracks)?b.motion_tracks:[];
  const required=["track_id","entity_id","entity_type","start_time","end_time","start_state","end_state","motion_type","causal_source","interpolation","continuity_state"];
  const missing=tracks.flatMap(t=>required.filter(k=>t[k]===undefined||t[k]===null).map(k=>t.track_id+":"+k));
  if(missing.length)return out(res,422,{ok:false,status:"REJECTED",error:"INCOMPLETE_MOTION_TRACK",missing});
  for(const t of tracks){
   if(t.start_time<0||t.end_time> b.scene_duration_seconds||t.end_time<t.start_time)return out(res,422,{ok:false,status:"REJECTED",error:"MOTION_OUTSIDE_SCENE_TIMELINE",track_id:t.track_id});
  }
  const active=Array.isArray(b.active_character_ids)?b.active_character_ids:[];
  if(active.length>5)return out(res,422,{ok:false,status:"REJECTED",error:"ACTIVE_CHARACTER_COUNT_ABOVE_5"});
  return out(res,200,{ok:true,engine_id:c.engine_id,status:"TEMPORAL_MOTION_RESOLVED",temporal_contract:b,character_motion_map:tracks.filter(t=>t.entity_type==="CHARACTER"),camera_motion_map:tracks.filter(t=>t.entity_type==="CAMERA"),object_motion_map:tracks.filter(t=>t.entity_type==="OBJECT"),environment_motion_map:tracks.filter(t=>t.entity_type==="ENVIRONMENT"),vfx_motion_map:tracks.filter(t=>t.entity_type==="VFX"),sync_map:b.sync_points||[],continuity_checkpoints:b.continuity_checkpoints||[],frame_temporal_package:{timeline:b,tracks,sync_points:b.sync_points||[]},production_handoff:"CMSE010_READY"});
 }catch(e){return out(res,500,{ok:false,error:"CSD-020 failed",detail:e.message})}
};