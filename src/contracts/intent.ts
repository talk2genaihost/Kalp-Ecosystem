import type { DurationMs } from "./common.js";

export type TaskType = "chat" | "reasoning" | "coding" | "research" | "market_data" | "market_news" | "fundamentals" | "corporate_actions" | "market_context" | "document" | "media" | "workflow" | "agent";
export type ExecutionPriority = "low" | "normal" | "high" | "critical";

export interface FreshnessRequirement { required: boolean; maxAgeMs?: number; referenceTime?: string; }
export interface QualityRequirement { minimumScore?: number; requireCompleteness?: boolean; requireSchemaValidity?: boolean; requireSourceAuthority?: boolean; requireConsistency?: boolean; }
export interface IntentContract {
  taskType: TaskType;
  objective: string;
  priority: ExecutionPriority;
  latencyBudgetMs?: DurationMs;
  freshnessRequirement?: FreshnessRequirement;
  qualityRequirement?: QualityRequirement;
  streaming?: boolean;
  requestedOutputFormat?: string;
}
