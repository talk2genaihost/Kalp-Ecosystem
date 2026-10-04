export type ReactionDefinitionSourceStatus = "PROPOSED" | "CANONICAL";

export interface ReactionDefinitionSourceParticipant {
  readonly materialId: string;
  readonly coefficient: number;
}

export interface ReactionDefinitionSourceCondition {
  readonly type: "MIN_TEMPERATURE" | "MAX_TEMPERATURE";
  readonly temperatureC: number;
}

export interface ReactionDefinitionSourceRecord {
  readonly reactionId: string;
  readonly experimentId: string;
  readonly reactionName: string;
  readonly reactants: readonly ReactionDefinitionSourceParticipant[];
  readonly products: readonly ReactionDefinitionSourceParticipant[];
  readonly conditions: readonly ReactionDefinitionSourceCondition[];
  readonly status: ReactionDefinitionSourceStatus;
  readonly authority: "INFERENCE" | "CANONICAL";
}

export const REACTION_DEFINITION_SOURCE_SCHEMA = Object.freeze({
  sheetName: "REACTION_DEFINITIONS",
  columns: [
    "Reaction_ID", "Experiment_ID", "Reaction_Name", "Reactants",
    "Products", "Conditions", "Status",
  ] as const,
});