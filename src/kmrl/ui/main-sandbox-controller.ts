import type { KMRALDomainPort } from "../../kmral/application.js";
import type { ExperimentCommand, ExperimentSnapshot } from "../runtime/types.js";
import type { ConflictEnvelope, OfflineQueuePort, SyncState } from "../contracts/offline.js";
import type { SyncHardeningReport } from "../sync/sync-hardening.js";
import type { ConflictResolution, ConflictResolutionReport } from "../sync/conflict-resolution.js";

export interface MainSandboxSyncPort {
  sync(experimentId:string):Promise<SyncHardeningReport>;
  resolveConflict?(experimentId:string,resolution:ConflictResolution):Promise<ConflictResolutionReport>;
}
export interface MainSandboxGuidedView { readonly title:string; readonly objective:string; readonly currentStep:{readonly id:string;readonly title:string;readonly instruction:string}; readonly completed:number;readonly total:number; }
export interface MainSandboxViewModel { readonly experimentId:string; readonly status:ExperimentSnapshot["status"]; readonly tick:number; readonly science:ExperimentSnapshot["science"]; readonly measurements:ExperimentSnapshot["measurements"]; readonly pendingMutations:number; readonly syncState:SyncState; readonly syncConflict?:Pick<ConflictEnvelope,"conflictId"|"remoteRevision"|"reason">; readonly syncError?:string; readonly syncAttempts?:number; readonly guided?:MainSandboxGuidedView; }

export class MainSandboxController {
  private syncState:SyncState="ONLINE"; private syncConflict?:MainSandboxViewModel["syncConflict"]; private syncError?:string; private syncAttempts=0;
  constructor(private readonly domain:KMRALDomainPort<ExperimentSnapshot, ExperimentCommand>,private readonly offline:OfflineQueuePort,private readonly syncPort?:MainSandboxSyncPort){}
  command(command:ExperimentCommand):MainSandboxViewModel{this.clearSyncNotice();return this.toViewModel(this.domain.dispatch(command));}
  view():MainSandboxViewModel{return this.toViewModel(this.domain.getState());}
  setSyncState(state:SyncState):MainSandboxViewModel{this.syncState=state;if(state!=="CONFLICT")this.syncConflict=undefined;return this.view();}
  async sync():Promise<MainSandboxViewModel>{if(!this.syncPort){this.syncState="OFFLINE";this.syncError="Remote sync is not configured for this sandbox.";return this.view();}this.syncState="SYNCING";this.syncConflict=undefined;this.syncError=undefined;const report=await this.syncPort.sync(this.domain.getState().experimentId);this.syncState=report.state;this.syncAttempts=report.attempts;this.syncConflict=report.conflict?{conflictId:report.conflict.conflictId,remoteRevision:report.conflict.remoteRevision,reason:report.conflict.reason}:undefined;this.syncError=report.error;return this.view();}
  async resolveConflict(resolution:ConflictResolution):Promise<MainSandboxViewModel>{if(!this.syncPort?.resolveConflict){this.syncError="Conflict resolution is not configured for this sandbox.";return this.view();}if(this.syncState!=="CONFLICT"||!this.syncConflict){this.syncError="There is no active sync conflict to resolve.";return this.view();}this.syncState="SYNCING";this.syncError=undefined;try{const report=await this.syncPort.resolveConflict(this.domain.getState().experimentId,resolution);this.syncState=report.state;this.syncConflict=undefined;this.syncAttempts=0;return this.view();}catch(error){this.syncState="CONFLICT";this.syncError=error instanceof Error?error.message:String(error);return this.view();}}
  private clearSyncNotice():void{this.syncConflict=undefined;this.syncError=undefined;if(this.syncState==="CONFLICT")this.syncState="ONLINE";}
  private toViewModel(state:ExperimentSnapshot):MainSandboxViewModel{return{experimentId:state.experimentId,status:state.status,tick:state.tick,science:structuredClone(state.science),measurements:structuredClone(state.measurements),pendingMutations:this.offline.pending(state.experimentId).length,syncState:this.syncState,syncConflict:this.syncConflict,syncError:this.syncError,syncAttempts:this.syncAttempts};}
}
