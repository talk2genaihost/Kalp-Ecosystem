import test from "node:test";
import assert from "node:assert/strict";
import {InMemoryExperimentRepository} from "../contracts/data.js";
import {InMemoryOfflineQueue} from "../contracts/offline.js";
import {ExperimentSyncEngine} from "./experiment-sync-engine.js";
import type {RemoteExperimentSyncAdapter,RemoteExperimentRecord,RemoteMutationResult} from "./remote-sync-contract.js";
import type {ExperimentSnapshot} from "../runtime/types.js";
import type {OfflineMutation} from "../contracts/offline.js";
import {quantity} from "../simulation/v1-a/quantity.js";
const snapshot=(revision:number):ExperimentSnapshot=>({experimentId:"E1",status:"RUNNING",tick:revision,revision,science:{timeS:quantity(revision,"s"),physics:{positionM:quantity(0,"m"),velocityMps:quantity(0,"m/s"),accelerationMps2:quantity(0,"m/s2"),massKg:quantity(1,"kg")},materials:[],temperature:quantity(25,"degC")},checkpoints:[],measurements:[]});
class FakeRemote implements RemoteExperimentSyncAdapter { current=snapshot(0);async getExperiment():Promise<RemoteExperimentRecord>{return {snapshot:structuredClone(this.current),updatedAt:new Date(0).toISOString()};}async putExperiment(_:string,next:ExperimentSnapshot,expected:number):Promise<RemoteExperimentRecord>{assert.equal(this.current.revision,expected);this.current=structuredClone(next);return {snapshot:structuredClone(this.current),updatedAt:new Date().toISOString()};}async applyMutation(_:string,__:OfflineMutation,___:ExperimentSnapshot):Promise<RemoteMutationResult>{throw new Error("not used by snapshot sync");}}
test("sync uploads local revision and clears pending mutations",async()=>{const repo=new InMemoryExperimentRepository();const queue=new InMemoryOfflineQueue();repo.save(snapshot(1));queue.enqueue({mutationId:"m1",experimentId:"E1",command:{type:"START"},baseRevision:0});const remote=new FakeRemote();const report=await new ExperimentSyncEngine(repo,queue,remote).sync("E1");assert.equal(report.applied,1);assert.equal(report.conflicts.length,0);assert.equal(remote.current.revision,1);assert.equal(queue.pending("E1").length,0);});
test("sync reports conflict without deleting local mutation",async()=>{const repo=new InMemoryExperimentRepository();const queue=new InMemoryOfflineQueue();repo.save(snapshot(2));queue.enqueue({mutationId:"m2",experimentId:"E1",command:{type:"START"},baseRevision:1});const remote=new FakeRemote();remote.current=snapshot(3);const report=await new ExperimentSyncEngine(repo,queue,remote).sync("E1");assert.equal(report.conflicts[0].reason,"REMOTE_REVISION_AHEAD");assert.equal(queue.pending("E1").length,1);});
