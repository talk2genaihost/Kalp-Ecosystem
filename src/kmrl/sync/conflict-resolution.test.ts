import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryExperimentRepository } from "../contracts/data.js";
import { InMemoryOfflineQueue } from "../contracts/offline.js";
import type { OfflineMutation } from "../contracts/offline.js";
import type { ExperimentSnapshot } from "../runtime/types.js";
import type { RemoteExperimentSyncAdapter, RemoteExperimentRecord, RemoteMutationResult } from "./remote-sync-contract.js";
import { ConflictResolutionEngine } from "./conflict-resolution.js";

const snapshot=(revision:number,position:number):ExperimentSnapshot=>({experimentId:"exp-conflict",status:"RUNNING",tick:revision,revision,science:{physics:{positionM:{value:position,unit:"m"}}} as ExperimentSnapshot["science"],checkpoints:[],measurements:[]});
const mutation=(baseRevision:number):OfflineMutation=>({mutationId:`m-${baseRevision}`,experimentId:"exp-conflict",command:{type:"PAUSE"},baseRevision});

class FakeRemote implements RemoteExperimentSyncAdapter {
  remote:ExperimentSnapshot=snapshot(2,20);
  async getExperiment():Promise<RemoteExperimentRecord>{return{snapshot:structuredClone(this.remote),updatedAt:new Date().toISOString()};}
  async putExperiment(_id:string,next:ExperimentSnapshot,expectedRevision:number):Promise<RemoteExperimentRecord>{assert.equal(this.remote.revision,expectedRevision);this.remote={...structuredClone(next),revision:next.revision};return{snapshot:structuredClone(this.remote),updatedAt:new Date().toISOString()};}
  async applyMutation():Promise<RemoteMutationResult>{throw new Error("not used");}
}

test("KEEP_REMOTE replaces local snapshot and clears pending mutations",async()=>{const repository=new InMemoryExperimentRepository();const offline=new InMemoryOfflineQueue();const remote=new FakeRemote();repository.save(snapshot(1,10));offline.enqueue(mutation(1));const engine=new ConflictResolutionEngine(repository,offline,remote);const result=await engine.resolve("exp-conflict","KEEP_REMOTE");assert.equal(result.state,"ONLINE");assert.equal(result.resolution,"KEEP_REMOTE");assert.equal(repository.load("exp-conflict")?.revision,2);assert.equal(repository.load("exp-conflict")?.science.physics.positionM.value,20);assert.equal(offline.pending("exp-conflict").length,0);assert.equal(remote.remote.revision,2);});

test("KEEP_LOCAL rebases the current local snapshot onto the remote revision",async()=>{const repository=new InMemoryExperimentRepository();const offline=new InMemoryOfflineQueue();const remote=new FakeRemote();repository.save(snapshot(1,10));offline.enqueue(mutation(1));const engine=new ConflictResolutionEngine(repository,offline,remote);const result=await engine.resolve("exp-conflict","KEEP_LOCAL");assert.equal(result.state,"ONLINE");assert.equal(result.resolution,"KEEP_LOCAL");assert.equal(repository.load("exp-conflict")?.revision,3);assert.equal(repository.load("exp-conflict")?.science.physics.positionM.value,10);assert.equal(offline.pending("exp-conflict").length,0);assert.equal(remote.remote.revision,3);assert.equal(remote.remote.science.physics.positionM.value,10);});

test("resolution refuses when there is no remote experiment",async()=>{const repository=new InMemoryExperimentRepository();const offline=new InMemoryOfflineQueue();const remote=new FakeRemote();remote.remote=undefined as unknown as ExperimentSnapshot;repository.save(snapshot(1,10));offline.enqueue(mutation(1));const engine=new ConflictResolutionEngine(repository,offline,remote);await assert.rejects(()=>engine.resolve("exp-conflict","KEEP_LOCAL"),/Remote experiment is unavailable/);});
