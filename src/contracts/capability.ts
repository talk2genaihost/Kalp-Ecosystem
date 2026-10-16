import type { CapabilityId } from "./common.js";
import type { FreshnessRequirement } from "./intent.js";

export interface CapabilityRequirement {
  capabilityId: CapabilityId;
  operation: string;
  dataTypes?: string[];
  requiredInputs?: Record<string, string>;
  outputSchema?: string;
  freshness?: FreshnessRequirement;
  sourceAuthorityRequired?: boolean;
  streaming?: boolean;
}
