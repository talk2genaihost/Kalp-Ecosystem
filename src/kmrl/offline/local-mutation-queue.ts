import type { ExperimentCommand } from "../runtime/types.js";
import { DurableOfflineQueue, InMemoryKeyValueStore, type ConflictEnvelope, type OfflineMutation, type DurableKeyValueStore } from "../contracts/offline.js";

const defaultStore = (): DurableKeyValueStore =>
  typeof globalThis !== "undefined" && "localStorage" in globalThis && globalThis.localStorage
    ? new BrowserStorageAdapter()
    : new InMemoryKeyValueStore();

export class LocalMutationQueue extends DurableOfflineQueue {
  constructor(store?: DurableKeyValueStore) { super(store ?? defaultStore(), "kmrl:offline:mutations:v1"); }
  append(experimentId:string, command:ExperimentCommand, baseRevision=0):OfflineMutation {
    const mutation:OfflineMutation={mutationId:`${experimentId}:mutation:${Date.now()}:${Math.random()}`,experimentId,command:structuredClone(command),baseRevision}; this.enqueue(mutation); return structuredClone(mutation);
  }
  createConflict(mutation:OfflineMutation,remoteRevision:number,reason:ConflictEnvelope["reason"]):ConflictEnvelope { return {conflictId:`${mutation.experimentId}:conflict:${mutation.mutationId}`,experimentId:mutation.experimentId,local:structuredClone(mutation),remoteRevision,reason}; }
}

class BrowserStorageAdapter implements DurableKeyValueStore {
  private readonly storage:Storage;
  constructor(){ if(typeof globalThis==="undefined" || !("localStorage" in globalThis) || !globalThis.localStorage) throw new Error("KMRL browser localStorage is unavailable"); this.storage=globalThis.localStorage; }
  get(key:string):string|null{return this.storage.getItem(key);}
  set(key:string,value:string):void{this.storage.setItem(key,value);}
  remove(key:string):void{this.storage.removeItem(key);}
}
