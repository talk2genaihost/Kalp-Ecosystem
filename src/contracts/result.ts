import type { CapabilityId, ExecutionId, ISODateTime, ProviderId, RequestId } from "./common.js";

export interface ResultMetadata { sourceIds?: string[]; rawProviderReference?: string; cached: boolean; transformed: boolean; }
export interface NormalizedResult<T = unknown> { requestId: RequestId; executionId: ExecutionId; providerId: ProviderId; capabilityId: CapabilityId; data: T; schema: string; retrievedAt: ISODateTime; metadata: ResultMetadata; }
export interface QualityAssessment { score: number; completeness: number; freshness: number; consistency: number; schemaValidity: number; sourceAuthority: number; confidence: number; warnings: string[]; assessedAt: ISODateTime; }
export interface KalpExecutionResult<T = unknown> { requestId: RequestId; executionId: ExecutionId; planId: string; result: NormalizedResult<T>; quality: QualityAssessment; telemetry: import("./telemetry.js").ExecutionTelemetry; provenance: import("./provenance.js").ProvenanceNode[]; warnings?: string[]; }
export type _ExecutionIdAnchor = ExecutionId;
