import type { ExperimentRepositoryPort } from "../contracts/data.js";
import type { ConflictEnvelope, OfflineQueuePort, SyncState } from "../contracts/offline.js";
import type { ExperimentSnapshot } from "../runtime/types.js";
import type { RemoteExperimentSyncAdapter } from "./remote-sync-contract.js";
import { KMRLRemoteConflictError, KMRLRemoteHttpError, conflictEnvelope } from "./supabase-remote-adapter.js";

export interface SyncHardeningOptions { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number; sleep?: (ms: number) => Promise<void>; }
export interface SyncHardeningReport { readonly experimentId:string; readonly state:SyncState; readonly attempts:number; readonly pendingMutations:number; readonly conflict?:ConflictEnvelope; readonly error?:string; readonly snapshot?:ExperimentSnapshot; }
interface RetryResult<T> { value:T; attempts:number; }
const defaultSleep=(ms:number):Promise<void>=>new Promise(resolve=>setTimeout(resolve,ms));

export class SyncHardeningEngine {
  private readonly maxAttempts:number; private readonly baseDelayMs:number; private readonly maxDelayMs:number; private readonly sleep:(ms:number)=>Promise<void>; private readonly states=new Map<string,SyncState>();
  constructor(private readonly repository:ExperimentRepositoryPort,private readonly offline:OfflineQueuePort,private readonly remote:RemoteExperimentSyncAdapter,options:SyncHardeningOptions={}){this.maxAttempts=Math.max(1,options.maxAttempts??3);this.baseDelayMs=Math.max(0,options.baseDelayMs??250);this.maxDelayMs=Math.max(this.baseDelayMs,options.maxDelayMs??4000);this.sleep=options.sleep??defaultSleep;}
  status(experimentId:string):SyncState{return this.states.get(experimentId)??"ONLINE";}
  async sync(experimentId:string):Promise<SyncHardeningReport>{
    this.states.set(experimentId,"SYNCING");const local=this.repository.load(experimentId);const pending=this.offline.pending(experimentId);
    try{
      const remoteResult=await this.withRetry(()=>this.remote.getExperiment(experimentId));const remote=remoteResult.value;
      if(!local){if(remote)this.repository.save(remote.snapshot);this.states.set(experimentId,"ONLINE");return this.report(experimentId,"ONLINE",remoteResult.attempts,undefined,undefined,remote?.snapshot);}
      if(!pending.length){if(remote&&remote.snapshot.revision>local.revision)this.repository.save(remote.snapshot);this.states.set(experimentId,"ONLINE");return this.report(experimentId,"ONLINE",remoteResult.attempts,undefined,undefined,remote?.snapshot??local);}
      const first=pending[0];const expectedRevision=first.baseRevision;
      if(remote&&remote.snapshot.revision!==expectedRevision){const conflict=conflictEnvelope(first,remote.snapshot.revision);this.states.set(experimentId,"CONFLICT");return this.report(experimentId,"CONFLICT",remoteResult.attempts,conflict,undefined,remote.snapshot);}
      const saved=await this.withRetry(()=>this.remote.putExperiment(experimentId,local,expectedRevision),error=>error instanceof KMRLRemoteConflictError);
      this.repository.save(saved.value.snapshot);this.offline.clear?.(experimentId);this.states.set(experimentId,"ONLINE");return this.report(experimentId,"ONLINE",remoteResult.attempts+saved.attempts,undefined,undefined,saved.value.snapshot);
    }catch(error){
      if(error instanceof KMRLRemoteConflictError){const first=pending[0];const conflict=first?conflictEnvelope(first,error.current.revision):undefined;this.states.set(experimentId,"CONFLICT");return this.report(experimentId,"CONFLICT",1,conflict,undefined,error.current);}
      this.states.set(experimentId,"OFFLINE");const attempts=error instanceof SyncRetryExhaustedError?error.attempts:1;return this.report(experimentId,"OFFLINE",attempts,undefined,error instanceof Error?error.message:String(error),local);
    }
  }
  private report(experimentId:string,state:SyncState,attempts:number,conflict?:ConflictEnvelope,error?:string,snapshot?:ExperimentSnapshot):SyncHardeningReport{return{experimentId,state,attempts,pendingMutations:this.offline.pending(experimentId).length,conflict,error,snapshot};}
  private async withRetry<T>(operation:()=>Promise<T>,stopRetry:(error:unknown)=>boolean=()=>false):Promise<RetryResult<T>>{let lastError:unknown;for(let attempt=1;attempt<=this.maxAttempts;attempt+=1){try{return{value:await operation(),attempts:attempt};}catch(error){lastError=error;if(stopRetry(error))throw error;if(!this.isTransient(error)||attempt===this.maxAttempts)throw new SyncRetryExhaustedError(attempt,lastError);await this.sleep(Math.min(this.maxDelayMs,this.baseDelayMs*2**(attempt-1)));}}throw new SyncRetryExhaustedError(this.maxAttempts,lastError);}
  private isTransient(error:unknown):boolean{if(error instanceof KMRLRemoteHttpError)return error.status===408||error.status===429||error.status>=500;return error instanceof TypeError;}
}
class SyncRetryExhaustedError extends Error{constructor(public readonly attempts:number,public readonly cause:unknown){super(cause instanceof Error?cause.message:String(cause));this.name="SyncRetryExhaustedError";}}
