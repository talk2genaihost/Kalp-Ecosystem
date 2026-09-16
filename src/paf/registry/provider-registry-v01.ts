import type { ProviderAdapter } from "../../market-to-revenue/provider-adapters-v01.js";
import type { CapabilityId, ProviderDescriptor, ProviderId } from "../../contracts/index.js";

export interface CanonicalProviderRegistry {
  register(adapter: ProviderAdapter, descriptor?: ProviderDescriptor): void;
  unregister(providerId: ProviderId): void;
  get(providerId: ProviderId): ProviderAdapter | undefined;
  descriptor(providerId: ProviderId): ProviderDescriptor | undefined;
  has(providerId: ProviderId): boolean;
  list(): ProviderDescriptor[];
  findByCapability(capabilityId: CapabilityId): ProviderAdapter[];
}

function descriptorFromAdapter(adapter: ProviderAdapter): ProviderDescriptor {
  const capability = adapter.role === "market-data"
    ? {
        capabilityId: "market.quote",
        operations: ["getQuote"],
        outputSchema: "MarketQuoteV1",
        streaming: false,
        freshnessSupport: true
      }
    : undefined;

  return {
    providerId: adapter.provider_id,
    name: adapter.provider_name,
    version: "MM-PAF-v0.1",
    authentication: "managed",
    capabilities: capability ? [capability] : [],
    enabled: true
  };
}

export class ProviderRegistryV01 implements CanonicalProviderRegistry {
  private readonly adapters = new Map<ProviderId, ProviderAdapter>();
  private readonly descriptors = new Map<ProviderId, ProviderDescriptor>();

  register(adapter: ProviderAdapter, descriptor = descriptorFromAdapter(adapter)): void {
    if (descriptor.providerId !== adapter.provider_id) throw new Error("PROVIDER_DESCRIPTOR_ID_MISMATCH");
    this.adapters.set(adapter.provider_id, adapter);
    this.descriptors.set(adapter.provider_id, descriptor);
  }

  unregister(providerId: ProviderId): void {
    this.adapters.delete(providerId);
    this.descriptors.delete(providerId);
  }

  get(providerId: ProviderId): ProviderAdapter | undefined { return this.adapters.get(providerId); }
  descriptor(providerId: ProviderId): ProviderDescriptor | undefined { return this.descriptors.get(providerId); }
  has(providerId: ProviderId): boolean { return this.adapters.has(providerId); }
  list(): ProviderDescriptor[] { return [...this.descriptors.values()]; }

  findByCapability(capabilityId: CapabilityId): ProviderAdapter[] {
    return this.list()
      .filter(descriptor => descriptor.enabled && descriptor.capabilities.some(capability => capability.capabilityId === capabilityId))
      .map(descriptor => this.adapters.get(descriptor.providerId))
      .filter((adapter): adapter is ProviderAdapter => adapter !== undefined);
  }
}

export function createProviderRegistry(adapters: ProviderAdapter[] = []): ProviderRegistryV01 {
  const registry = new ProviderRegistryV01();
  for (const adapter of adapters) registry.register(adapter);
  return registry;
}
