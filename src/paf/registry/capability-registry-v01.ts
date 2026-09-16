import type { CapabilityDescriptor, CapabilityId } from "../../contracts/index.js";
import type { CanonicalProviderRegistry } from "./provider-registry-v01.js";

export interface CanonicalCapabilityRegistry {
  register(capability: CapabilityDescriptor): void;
  unregister(capabilityId: CapabilityId): void;
  get(capabilityId: CapabilityId): CapabilityDescriptor | undefined;
  has(capabilityId: CapabilityId): boolean;
  list(): CapabilityDescriptor[];
  findProviders(capabilityId: CapabilityId, providers: CanonicalProviderRegistry): string[];
}

export class CapabilityRegistryV01 implements CanonicalCapabilityRegistry {
  private readonly capabilities = new Map<CapabilityId, CapabilityDescriptor>();

  register(capability: CapabilityDescriptor): void {
    this.capabilities.set(capability.capabilityId, capability);
  }

  unregister(capabilityId: CapabilityId): void { this.capabilities.delete(capabilityId); }
  get(capabilityId: CapabilityId): CapabilityDescriptor | undefined { return this.capabilities.get(capabilityId); }
  has(capabilityId: CapabilityId): boolean { return this.capabilities.has(capabilityId); }
  list(): CapabilityDescriptor[] { return [...this.capabilities.values()]; }

  findProviders(capabilityId: CapabilityId, providers: CanonicalProviderRegistry): string[] {
    if (!this.has(capabilityId)) return [];
    return providers.findByCapability(capabilityId).map(provider => provider.provider_id);
  }
}

export const MARKET_QUOTE_CAPABILITY: CapabilityDescriptor = {
  capabilityId: "market.quote",
  operations: ["getQuote"],
  inputSchema: "MarketQuoteRequestV1",
  outputSchema: "MarketQuoteV1",
  streaming: false,
  freshnessSupport: true
};

export function createCapabilityRegistry(): CapabilityRegistryV01 {
  const registry = new CapabilityRegistryV01();
  registry.register(MARKET_QUOTE_CAPABILITY);
  return registry;
}
