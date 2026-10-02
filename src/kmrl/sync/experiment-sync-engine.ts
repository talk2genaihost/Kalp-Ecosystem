import type { ExperimentRepositoryPort } from "../contracts/data.js";
import type { OfflineQueuePort, ConflictEnvelope } from "../contracts/offline.js";
import type { RemoteExperimentSyncAdapter } from "./remote-sync-contract.js";
import type { ExperimentSnapshot } from "../runtime/types.js";
export interface SyncReport { experimentId:string; applied:number; duplicate:number; conflicts:ConflictEnvelope[]; remote?:ExperimentSnapshot; }
export class ExperimentSyncEngine {
  constructor(private readonly repository:ExperimentRepositoryPort, private readonly offline:OfflineQueuePort, private readonly remote:RemoteExperimentSyncAdapter){}
  async sync(experimentId:string):Promise<SyncReport>{
    const local=this.repository.load(experimentId);const remote=await this.remote.getExperiment(experimentId);
    if(!local){if(remote)this.repository.save(remote.snapshot);return {experimentId,applied:0,duplicate:0,conflicts:[],remote:remote?.snapshot};}
    const pending=this.offline.pending(experimentId);
    if(!pending.length){if(remote&&remote.snapshot.revision>local.revision)this.repository.save(remote.snapshot);return {experimentId,applied:0,duplicate:0,conflicts:[],remote:remote?.snapshot};}
    const expectedRevision=pending[0].baseRevision;
    if(remote&&remote.snapshot.revision!==expectedRevision){const conflict:ConflictEnvelope={conflictId:`${experimentId}:sync:${expectedRevision}`,experimentId,local:pending[0],remoteRevision:remote.snapshot.revision,reason:"REMOTE_REVISION_AHEAD"};return {experimentId,applied:0,duplicate:0,conflicts:[conflict],remote:remote.snapshot};}
    const saved=await this.remote.putExperiment(experimentId,local,expectedRevision);this.repository.save(saved.snapshot);this.offline.clear?.(experimentId);
    return {experimentId,applied:pending.length,duplicate:0,conflicts:[],remote:saved.snapshot};
  }
}
