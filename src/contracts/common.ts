export type UUID = string;
export type ISODateTime = string;
export type Score = number;
export type Probability = number;
export type DurationMs = number;
export type TokenCount = number;
export type CostAmount = number;

export type RequestId = string;
export type DecisionId = string;
export type PlanId = string;
export type ExecutionId = string;
export type AttemptId = string;
export type ProviderId = string;
export type ConnectionId = string;
export type ModelId = string;
export type CapabilityId = string;
export type ProvenanceNodeId = string;

export interface RequestContext {
  requestId: RequestId;
  correlationId: string;
  createdAt: ISODateTime;
  actorId?: string;
  tenantId?: string;
  sessionId?: string;
  traceId?: string;
  parentSpanId?: string;
}
