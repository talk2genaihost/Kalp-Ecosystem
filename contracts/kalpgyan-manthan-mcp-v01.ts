export const KALPGYAN_MCP_BOOK_INTAKE_CONTRACT = "KALP-MCP-BOOK-INTAKE-v0.1";

export interface McpBookIntakeRequest {
  sourceRef: string;
  contract: typeof KALPGYAN_MCP_BOOK_INTAKE_CONTRACT;
}

export interface McpBookIntakeResponse {
  text: string;
  provenance?: {
    sourceRef: string;
    provider?: string;
    observedAt: string;
    contentHash?: string;
  };
}
