import type { ISODateTime, ProviderId, ProvenanceNodeId } from "./common.js";
export type ProvenanceNodeType = "request" | "decision" | "provider" | "response" | "source" | "transformation" | "fusion";
export interface ProvenanceNode { id: ProvenanceNodeId; type: ProvenanceNodeType; parentIds: ProvenanceNodeId[]; providerId?: ProviderId; sourceUri?: string; sourceId?: string; retrievedAt?: ISODateTime; transformation?: string; confidence?: number; }
