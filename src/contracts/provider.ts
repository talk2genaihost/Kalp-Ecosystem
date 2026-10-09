import type { CapabilityId, ConnectionId, ModelId, ProviderId } from "./common.js";

export type AuthenticationType = "api_key" | "oauth" | "local" | "anonymous" | "managed";
export interface CapabilityDescriptor { capabilityId: CapabilityId; operations: string[]; inputSchema?: string; outputSchema?: string; streaming: boolean; freshnessSupport?: boolean; sourceAuthority?: number; }
export interface ProviderDescriptor { providerId: ProviderId; name: string; version?: string; capabilities: CapabilityDescriptor[]; authentication: AuthenticationType; enabled: boolean; }
export interface ExecutionTarget { providerId: ProviderId; connectionId?: ConnectionId; modelId?: ModelId; capabilityId: CapabilityId; }
export interface ProviderConnection { connectionId: ConnectionId; providerId: ProviderId; authentication: AuthenticationType; credentialRef: string; enabled: boolean; metadata?: Record<string, string>; }
