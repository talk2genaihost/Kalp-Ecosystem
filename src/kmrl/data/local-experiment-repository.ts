import { DurableExperimentRepository } from "../contracts/data.js";
import type { DurableKeyValueStore } from "../contracts/offline.js";

class BrowserStorageAdapter implements DurableKeyValueStore {
  private readonly storage:Storage;
  constructor(){ if(typeof globalThis==="undefined" || !("localStorage" in globalThis)) throw new Error("KMRL browser localStorage is unavailable"); this.storage=globalThis.localStorage; }
  get(key:string):string|null{return this.storage.getItem(key);}
  set(key:string,value:string):void{this.storage.setItem(key,value);}
  remove(key:string):void{this.storage.removeItem(key);}
}

export class LocalExperimentRepository extends DurableExperimentRepository {
  constructor(){ super(new BrowserStorageAdapter(), "kmrl:experiment:"); }
}
