import type { ExperimentSnapshot } from "../runtime/types.js";
import type { OfflineMutation, ConflictEnvelope } from "../contracts/offline.js";

export interface RemoteExperimentRecord { readonly snapshot: ExperimentSnapshot; readonly updatedAt: string; }
export interface RemoteMutationResult { readonly accepted:boolean; readonly duplicate:boolean; readonly conflict?:ConflictEnvelope; readonly snapshot:ExperimentSnapshot; }

/** KMRL Remote Synchronization API v1.1: remote storage is authoritative; science remains client/runtime-owned. */
export interface RemoteExperimentSyncAdapter {
  getExperiment(experimentId:string):Promise<RemoteExperimentRecord|undefined>;
  putExperiment(experimentId:string,snapshot:ExperimentSnapshot,expectedRevision:number):Promise<RemoteExperimentRecord>;
  applyMutation(experimentId:string,mutation:OfflineMutation,nextSnapshot:ExperimentSnapshot):Promise<RemoteMutationResult>;
}

export interface KMRLRemoteSyncApiContract {
  "GET /v1/experiments/:experimentId": { response:RemoteExperimentRecord|{error:"NOT_FOUND"} };
  "PUT /v1/experiments/:experimentId": { request:{expectedRevision:number;snapshot:ExperimentSnapshot}; response:RemoteExperimentRecord|{error:"REVISION_CONFLICT";current:ExperimentSnapshot} };
  "POST /v1/experiments/:experimentId/mutations": { request:{mutation:OfflineMutation;nextSnapshot:ExperimentSnapshot}; response:RemoteMutationResult };
}
