import test from "node:test";
import assert from "node:assert/strict";
import { SupabaseRemoteExperimentSyncAdapter } from "./supabase-remote-adapter.js";
import { ConflictResolutionEngine } from "./conflict-resolution.js";
import { InMemoryExperimentRepository } from "../contracts/data.js";
import { InMemoryOfflineQueue } from "../contracts/offline.js";
import type { ExperimentSnapshot } from "../runtime/types.js";
import { quantity } from "../simulation/v1-a/quantity.js";

const baseUrl=process.env.KMRL_SUPABASE_URL;
const publishableKey=process.env.KMRL_SUPABASE_KEY;
const testEmail=process.env.KMRL_TEST_EMAIL;
const testPassword=process.env.KMRL_TEST_PASSWORD;
const required=process.env.KMRL_REMOTE_REQUIRED==="true";
const live=Boolean(baseUrl&&publishableKey&&testEmail&&testPassword);
if(required&&!live)throw new Error("KMRL_REMOTE_REQUIRED=true but KMRL_SUPABASE_URL/KMRL_SUPABASE_KEY/KMRL_TEST_EMAIL/KMRL_TEST_PASSWORD are not configured");

const getAccessToken=async():Promise<string>=>{
  const response=await fetch(`${baseUrl!}/auth/v1/token?grant_type=password`,{
    method:"POST",
    headers:{"content-type":"application/json",apikey:publishableKey!},
    body:JSON.stringify({email:testEmail!,password:testPassword!}),
  });
  if(!response.ok)throw new Error(`KMRL_TEST_USER_AUTH_FAILED:${response.status}:${await response.text()}`);
  const payload=await response.json() as {access_token?:string};
  if(!payload.access_token)throw new Error("KMRL_TEST_USER_AUTH_FAILED:NO_ACCESS_TOKEN");
  return payload.access_token;
};

const makeSnapshot=(experimentId:string,revision:number):ExperimentSnapshot=>({experimentId,status:"RUNNING",tick:revision,revision,science:{timeS:quantity(revision,"s"),physics:{positionM:quantity(revision,"m"),velocityMps:quantity(0,"m/s"),accelerationMps2:quantity(0,"m/s2"),massKg:quantity(1,"kg")},materials:[],temperature:quantity(25,"degC")},checkpoints:[],measurements:[]});

test("live KMRL remote write/read/revision conflict",{skip:!live},async()=>{
  const accessToken=await getAccessToken();
  const experimentId=`KMRL-CI-${Date.now()}`;
  const adapter=new SupabaseRemoteExperimentSyncAdapter({baseUrl:baseUrl!,publishableKey:publishableKey!,accessToken});
  const first=await adapter.putExperiment(experimentId,makeSnapshot(experimentId,1),0);
  assert.equal(first.snapshot.revision,1);
  const read=await adapter.getExperiment(experimentId);
  assert.ok(read);
  assert.equal(read!.snapshot.revision,1);
  assert.equal(read!.snapshot.experimentId,experimentId);
  const batched=await adapter.putExperiment(experimentId,makeSnapshot(experimentId,3),1);
  assert.equal(batched.snapshot.revision,3);
  const batchedRead=await adapter.getExperiment(experimentId);
  assert.equal(batchedRead!.snapshot.revision,3);
  await assert.rejects(()=>adapter.putExperiment(experimentId,makeSnapshot(experimentId,2),1),(error:unknown)=>error instanceof Error&&error.name==="KMRLRemoteConflictError");
});

test("live KMRL conflict resolution can explicitly keep remote",{skip:!live},async()=>{
  const accessToken=await getAccessToken();
  const experimentId=`KMRL-CI-CONFLICT-${Date.now()}`;
  const adapter=new SupabaseRemoteExperimentSyncAdapter({baseUrl:baseUrl!,publishableKey:publishableKey!,accessToken});
  await adapter.putExperiment(experimentId,makeSnapshot(experimentId,2),0);
  const repository=new InMemoryExperimentRepository();
  const offline=new InMemoryOfflineQueue();
  repository.save(makeSnapshot(experimentId,1));
  offline.enqueue({mutationId:`${experimentId}:m1`,experimentId,command:{type:"PAUSE"},baseRevision:1});
  const engine=new ConflictResolutionEngine(repository,offline,adapter);
  const result=await engine.resolve(experimentId,"KEEP_REMOTE");
  assert.equal(result.state,"ONLINE");
  assert.equal(result.snapshot.revision,2);
  assert.equal(repository.load(experimentId)?.revision,2);
  assert.equal(offline.pending(experimentId).length,0);
});

test("live integration is skipped outside credentialed CI",{skip:live},()=>assert.equal(live,false));
