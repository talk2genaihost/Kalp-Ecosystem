import type { ISODateTime } from "./common.js";

export type CircuitState = "CLOSED" | "DEGRADED" | "OPEN" | "HALF_OPEN";
export type TerminalConnectionState = "banned" | "expired" | "credits_exhausted";
export interface ResilienceSnapshot { providerCircuit: CircuitState; connectionAvailable: boolean; cooldownUntil?: ISODateTime; modelLocked: boolean; modelLockoutUntil?: ISODateTime; terminalState?: TerminalConnectionState; retryAfterMs?: number; }
