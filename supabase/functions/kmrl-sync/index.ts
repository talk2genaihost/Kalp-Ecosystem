import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const headers={"content-type":"application/json","access-control-allow-origin":"*"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
  const url=new URL(req.url);const match=url.pathname.match(/\/v1\/experiments\/([^/]+)(?:\/mutations)?$/);if(!match)return json({error:"NOT_FOUND"},404);
  const experimentId=decodeURIComponent(match[1]);const isMutation=url.pathname.endsWith("/mutations");
  if(req.method==="GET"&&!isMutation){const {data,error}=await db.from("kmrl_experiments").select("snapshot,revision,updated_at").eq("experiment_id",experimentId).maybeSingle();if(error)return json({error:error.message},500);if(!data)return json({error:"NOT_FOUND"},404);return json({snapshot:{...data.snapshot,revision:data.revision},updatedAt:data.updated_at});}
  if(req.method==="PUT"&&!isMutation){
    const body=await req.json();const expectedRevision=Number(body.expectedRevision);const snapshot=body.snapshot;const requestedRevision=Number(snapshot?.revision);
    if(!Number.isInteger(expectedRevision)||expectedRevision<0||!snapshot||!Number.isInteger(requestedRevision)||requestedRevision<=expectedRevision)return json({error:"INVALID_REVISION"},422);
    const {data:current,error:readError}=await db.from("kmrl_experiments").select("revision,snapshot").eq("experiment_id",experimentId).maybeSingle();if(readError)return json({error:readError.message},500);
    if(current&&current.revision!==expectedRevision)return json({error:"REVISION_CONFLICT",current:{...current.snapshot,revision:current.revision}},409);
    const nextSnapshot={...snapshot,revision:requestedRevision};
    const {data,error}=await db.from("kmrl_experiments").upsert({experiment_id:experimentId,revision:requestedRevision,snapshot:nextSnapshot,updated_at:new Date().toISOString()}).select("snapshot,revision,updated_at").single();if(error)return json({error:error.message},500);return json({snapshot:{...data.snapshot,revision:data.revision},updatedAt:data.updated_at});
  }
  if(req.method==="POST"&&isMutation){
    const {mutation,nextSnapshot}=await req.json();if(!mutation?.mutationId||!Number.isInteger(mutation.baseRevision)||!nextSnapshot)return json({error:"INVALID_REQUEST"},400);
    const {data:existing}=await db.from("kmrl_mutations").select("mutation_id").eq("mutation_id",mutation.mutationId).maybeSingle();const {data:current}=await db.from("kmrl_experiments").select("snapshot,revision,updated_at").eq("experiment_id",experimentId).maybeSingle();
    if(existing)return json({accepted:false,duplicate:true,snapshot:current?{...current.snapshot,revision:current.revision}:nextSnapshot});const remoteRevision=current?.revision??0;
    if(remoteRevision!==mutation.baseRevision)return json({accepted:false,duplicate:false,conflict:{conflictId:`${experimentId}:${mutation.mutationId}`,experimentId,local:mutation,remoteRevision,reason:"REMOTE_REVISION_AHEAD"},snapshot:current?{...current.snapshot,revision:remoteRevision}:undefined},409);
    if(Number(nextSnapshot.revision)!==mutation.baseRevision+1)return json({error:"INVALID_NEXT_REVISION"},422);
    const {data:saved,error:saveError}=await db.from("kmrl_experiments").upsert({experiment_id:experimentId,revision:mutation.baseRevision+1,snapshot:{...nextSnapshot,revision:mutation.baseRevision+1},updated_at:new Date().toISOString()}).select("snapshot,revision").single();if(saveError)return json({error:saveError.message},500);
    const {error:mutationError}=await db.from("kmrl_mutations").insert({mutation_id:mutation.mutationId,experiment_id:experimentId,base_revision:mutation.baseRevision,command:mutation.command});if(mutationError)return json({error:mutationError.message},500);return json({accepted:true,duplicate:false,snapshot:{...saved.snapshot,revision:saved.revision}});
  }
  return json({error:"METHOD_NOT_ALLOWED"},405);
});
