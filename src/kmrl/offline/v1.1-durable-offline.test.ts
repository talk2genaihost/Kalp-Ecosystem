import test from "node:test";
import assert from "node:assert/strict";
import { DurableOfflineQueue, InMemoryKeyValueStore } from "../contracts/offline.js";
import { DurableExperimentRepository } from "../contracts/data.js";
import type { ExperimentSnapshot } from "../runtime/types.js";
import { quantity } from "../simulation/v1-a/quantity.js";

const snapshot = (id:string):ExperimentSnapshot=>({experimentId:id,status:"CREATED",tick:0,revision:3,science:{timeS:quantity(0,"s"),physics:{positionM:quantity(0,"m"),velocityMps:quantity(0,"m/s"),accelerationMps2:quantity(0,"m/s2"),massKg:quantity(1,"kg")},materials:[],temperature:quantity(25,"degC")},checkpoints:[],measurements:[]});

test("durable repository survives a new repository instance",()=>{const store=new InMemoryKeyValueStore();const a=new DurableExperimentRepository(store);a.save(snapshot("persisted"));const b=new DurableExperimentRepository(store);assert.equal(b.load("persisted")?.revision,3);});
test("durable offline queue survives a new queue instance and de-duplicates mutations",()=>{const store=new InMemoryKeyValueStore();const a=new DurableOfflineQueue(store);const mutation={mutationId:"m1",experimentId:"e1",baseRevision:2,command:{type:"START" as const}};a.enqueue(mutation);a.enqueue(mutation);const b=new DurableOfflineQueue(store);assert.equal(b.pending("e1").length,1);assert.equal(b.drain("e1")[0].mutationId,"m1");assert.equal(new DurableOfflineQueue(store).pending("e1").length,0);});
