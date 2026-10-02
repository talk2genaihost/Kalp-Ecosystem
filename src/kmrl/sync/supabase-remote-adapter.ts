import type { ExperimentSnapshot } from "../runtime/types.js";
import type { OfflineMutation, ConflictEnvelope } from "../contracts/offline.js";
import type { RemoteExperimentRecord, RemoteExperimentSyncAdapter, RemoteMutationResult } from "./remote-sync-contract.js";

export interface SupabaseKMRLConfig { baseUrl:string; publishableKey:string; fetchImpl?:typeof fetch; }
export class KMRLRemoteHttpError extends Error { constructor(public readonly status:number, message:string){super(message);this.name="KMRLRemoteHttpError";} }
export class SupabaseRemoteExperimentSyncAdapter implements RemoteExperimentSyncAdapter {
  private readonly fetchImpl:typeof fetch;
  constructor(private readonly config:SupabaseKMRLConfig){this.fetchImpl=config.fetchImpl ?? fetch;}
  private headers(){return {"content-type":"application/json",apikey:this.config.publishableKey,authorization:`Bearer ${this.config.publishableKey}`};}
  private url(path:string){return `${this.config.baseUrl.replace(/\/$/,"")}/functions/v1/kmrl-sync${path}`;}
  async getExperiment(experimentId:string):Promise<RemoteExperimentRecord|undefined>{const r=await this.fetchImpl(this.url(`/v1/experiments/${encodeURIComponent(experimentId)}`),{headers:this.headers()});if(r.status===404)return undefined;if(!r.ok)throw new KMRLRemoteHttpError(r.status,`KMRL remote GET failed: ${r.status}`);return await r.json() as RemoteExperimentRecord;}
  async putExperiment(experimentId:string,snapshot:ExperimentSnapshot,expectedRevision:number):Promise<RemoteExperimentRecord>{const r=await this.fetchImpl(this.url(`/v1/experiments/${encodeURIComponent(experimentId)}`),{method:"PUT",headers:{...this.headers(),"if-match":String(expectedRevision)},body:JSON.stringify({expectedRevision,snapshot})});if(r.status===409){const body=await r.json() as {current:ExperimentSnapshot};throw new KMRLRemoteConflictError(body.current);}if(!r.ok)throw new KMRLRemoteHttpError(r.status,`KMRL remote PUT failed: ${r.status}`);return await r.json() as RemoteExperimentRecord;}
  async applyMutation(experimentId:string,mutation:OfflineMutation,nextSnapshot:ExperimentSnapshot):Promise<RemoteMutationResult>{const r=await this.fetchImpl(this.url(`/v1/experiments/${encodeURIComponent(experimentId)}/mutations`),{method:"POST",headers:{...this.headers(),"idempotency-key":mutation.mutationId},body:JSON.stringify({mutation,nextSnapshot})});if(!r.ok&&r.status!==409)throw new KMRLRemoteHttpError(r.status,`KMRL remote mutation failed: ${r.status}`);return await r.json() as RemoteMutationResult;}
}
export class KMRLRemoteConflictError extends Error {constructor(public readonly current:ExperimentSnapshot){super("KMRL remote revision conflict");this.name="KMRLRemoteConflictError";}}
export function conflictEnvelope(mutation:OfflineMutation,remoteRevision:number):ConflictEnvelope{return {conflictId:`${mutation.experimentId}:${mutation.mutationId}`,experimentId:mutation.experimentId,local:mutation,remoteRevision,reason:"REMOTE_REVISION_AHEAD"};}
