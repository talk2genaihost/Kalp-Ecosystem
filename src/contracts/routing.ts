import type { CapabilityId, CostAmount, ModelId, ProviderId, RequestContext } from "./common.js";
import type { CapabilityRequirement } from "./capability.js";
import type { GovernanceContext, GovernanceDecision } from "./governance.js";
import type { ExecutionTarget } from "./provider.js";
import type { ResilienceSnapshot } from "./resilience.js";

export interface RoutingConstraints { allowedProviders?: ProviderId[]; excludedProviders?: ProviderId[]; allowedModels?: ModelId[]; excludedModels?: ModelId[]; maxCost?: CostAmount; maxLatencyMs?: number; requireFreshness?: boolean; requireSourceAuthority?: boolean; }
export interface RoutingWeights { health: number; reliability: number; capabilityFit: number; quality: number; freshness: number; latency: number; quota: number; cost: number; authority: number; stability: number; }
export interface FallbackPolicy { enabled: boolean; maxTargets: number; }
export interface RoutingProfile { profileId: string; weights: RoutingWeights; explorationRate?: number; fallbackPolicy: FallbackPolicy; }
export interface RoutingRequest { context: RequestContext; intent: import("./intent.js").IntentContract; capability: CapabilityRequirement; governance: GovernanceContext; constraints: RoutingConstraints; profile: RoutingProfile; }
export interface ExecutionCandidate { candidateId: string; target: ExecutionTarget; eligible: boolean; exclusionReason?: string; resilience: ResilienceSnapshot; quota?: QuotaSnapshot; performance?: PerformanceSnapshot; quality?: QualitySnapshot; cost?: CostSnapshot; }
export interface QuotaSnapshot { available: boolean; remaining?: number; limit?: number; resetAt?: string; confidence?: number; }
export interface PerformanceSnapshot { latencyP50Ms?: number; latencyP95Ms?: number; latencyP99Ms?: number; sampleSize: number; measuredAt: string; }
export interface QualitySnapshot { score: number; completeness?: number; correctness?: number; freshness?: number; consistency?: number; schemaValidity?: number; sourceAuthority?: number; sampleSize: number; measuredAt: string; }
export interface CostSnapshot { estimatedInputCost?: CostAmount; estimatedOutputCost?: CostAmount; estimatedTotalCost?: CostAmount; currency?: string; measuredAt: string; }
export interface ScoreBreakdown { total: number; factors: Record<string, number>; }
export interface RoutingDecision { decisionId: string; requestId: string; selected: ExecutionCandidate; alternatives: ExecutionCandidate[]; scoreBreakdown: ScoreBreakdown; reasonCodes: string[]; constraintsApplied: string[]; governance: GovernanceDecision; createdAt: string; }
export type _CapabilityContractAnchor = CapabilityId;
