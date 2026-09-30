import type { ISODateTime, UUID } from "./common.js";

export const MUSIC_INTENT_TYPES = [
  "MUSIC_CREATE",
  "MUSIC_COMPOSE",
  "MUSIC_GENERATE",
  "MUSIC_ARRANGE",
  "MUSIC_INSTRUMENTAL",
  "MUSIC_VOCAL",
  "MUSIC_THEME",
  "MUSIC_SCORE",
  "MUSIC_JINGLE",
  "MUSIC_DEVOTIONAL",
  "MUSIC_CHARACTER",
  "MUSIC_VARIATION",
  "MUSIC_EXTEND",
  "MUSIC_REMASTER",
  "MUSIC_EVALUATE",
  "MUSIC_REFINE",
  "MUSIC_PRODUCE"
] as const;

export type MusicIntentType = (typeof MUSIC_INTENT_TYPES)[number];

export type MusicOperation =
  | "create"
  | "compose"
  | "generate"
  | "arrange"
  | "evaluate"
  | "refine"
  | "produce";

export interface MusicIntentConstraints {
  creative?: Record<string, unknown>;
  musical?: Record<string, unknown>;
  vocal?: Record<string, unknown>;
  production?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export interface MusicIntentGovernance {
  explicitFields: string[];
  inferredFields: string[];
  inheritedFields: string[];
  defaultedFields: string[];
  conflicts: string[];
  confidence: number;
}

export interface MusicIntentEvaluationRequirements {
  minimumScore?: number;
  requiredChecks?: string[];
}

export interface MusicIntent {
  intentId: UUID;
  contractVersion: "MM-01.0";
  createdAt: ISODateTime;
  intentType: MusicIntentType;
  operation: MusicOperation;
  rawText: string;
  normalizedRequest: string;
  constraints: MusicIntentConstraints;
  contextReference?: string;
  evaluationRequirements?: MusicIntentEvaluationRequirements;
  governance: MusicIntentGovernance;
}

export interface MusicIntentDefinition {
  intentType: MusicIntentType;
  operations: readonly MusicOperation[];
  description: string;
  contractVersion: "MM-01.0";
}
