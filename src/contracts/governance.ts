import type { ISODateTime } from "./common.js";

export type GovernanceDecisionType = "ALLOW" | "ALLOW_WITH_RESTRICTION" | "REQUIRE_APPROVAL" | "DENY";
export interface GovernanceContext { actorId?: string; tenantId?: string; policyProfile?: string; dataClassification?: string; permissions?: string[]; restrictions?: string[]; }
export interface GovernanceDecision { decision: GovernanceDecisionType; policyId?: string; reasonCodes: string[]; restrictions?: string[]; evaluatedAt: ISODateTime; }
