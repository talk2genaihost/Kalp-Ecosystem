import type { AttemptId, ExecutionId, PlanId, RequestId } from "./common.js";
import type { ExecutionTarget } from "./provider.js";
import type { GovernanceDecision } from "./governance.js";

export interface RetryPolicy { maxAttempts: number; backoff: "none" | "fixed" | "exponential"; baseDelayMs?: number; maxDelayMs?: number; retryableFailureCodes: string[]; }
export interface TimeoutPolicy { executionTimeoutMs: number; connectionTimeoutMs?: number; queueTimeoutMs?: number; }
export interface ExecutionPlan { planId: PlanId; requestId: RequestId; primary: ExecutionTarget; fallbackChain: ExecutionTarget[]; retryPolicy: RetryPolicy; timeoutPolicy: TimeoutPolicy; governanceDecision: GovernanceDecision; createdAt: string; }
export interface ExecutionAttempt { attemptId: AttemptId; executionId: ExecutionId; requestId: RequestId; planId: PlanId; target: ExecutionTarget; attemptNumber: number; startedAt: string; completedAt?: string; }
