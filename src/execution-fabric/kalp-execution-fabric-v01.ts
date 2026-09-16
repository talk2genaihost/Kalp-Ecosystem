import {
  initialFreeProviderMesh,
  type NormalizedProviderResult,
  type ProviderAdapter,
  type ProviderRequest
} from "../market-to-revenue/provider-adapters-v01.js";

export type ExecutionStatus = "SUCCESS" | "PARTIAL" | "FAILED" | "REJECTED";
export type QualityStatus = "VALID" | "CAUTION" | "REJECTED";
export type FusionMode = "single_source" | "median";

export interface MarketQuoteRequestV1 {
  symbol: string;
  exchange?: string;
  freshnessMaxAgeMs?: number;
  parallel?: boolean;
  maxProviders?: number;
}

export interface MarketQuoteV1 {
  symbol: string;
  exchange?: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
  volume?: number;
  currency?: string;
  asOf: string;
  source: { providerId: string };
}

export interface EvidenceRecord<T = unknown> {
  evidenceId: string;
  providerId: string;
  providerName: string;
  payload: T;
  observedAt: string;
  quality: QualityAssessment;
  provenance: ProvenanceNode[];
}

export interface QualityAssessment {
  status: QualityStatus;
  score: number;
  completeness: number;
  freshness: number;
  schemaValidity: number;
  sourceAuthority: number;
  warnings: string[];
}

export interface ProvenanceNode {
  id: string;
  type: "request" | "provider" | "response" | "transformation" | "source" | "fusion";
  parentIds: string[];
  providerId?: string;
  sourceId?: string;
  retrievedAt?: string;
  transformation?: string;
}

export interface AttemptTelemetry {
  attemptId: string;
  providerId: string;
  attemptNumber: number;
  startedAt: string;
  completedAt: string;
  latencyMs: number;
  status: "success" | "failure";
  httpStatus?: number;
  failureCode?: string;
  fallbackTriggered: boolean;
}

export interface FusionAssessment {
  mode: FusionMode;
  evidenceCount: number;
  acceptedCount: number;
  rejectedCount: number;
  agreementScore: number;
  outlierCount: number;
}

export interface ResultIntelligence<T> {
  result: T;
  quality: QualityAssessment;
  confidence: number;
  evidence: EvidenceRecord<T>[];
  provenance: ProvenanceNode[];
  fusion: FusionAssessment;
  warnings: string[];
}

export interface KalpExecutionResult<T> {
  requestId: string;
  executionId: string;
  status: ExecutionStatus;
  result?: ResultIntelligence<T>;
  telemetry: AttemptTelemetry[];
  warnings: string[];
}

export interface ProviderCandidate {
  adapter: ProviderAdapter;
  providerId: string;
  providerName: string;
  capability: "market.quote";
  authority: number;
  enabled: boolean;
}

export interface FabricDependencies {
  providers?: ProviderAdapter[];
  now?: () => Date;
  id?: () => string;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function numberField(data: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = data[key];
    const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isFinite(number)) return number;
  }
  return undefined;
}

function stringField(data: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    if (typeof data[key] === "string" && data[key]) return data[key] as string;
  }
  return undefined;
}

function normalizeQuote(raw: NormalizedProviderResult): MarketQuoteV1 | undefined {
  if (raw.status !== "ok") return undefined;
  const data = raw.data;
  const symbol = stringField(data, "symbol", "Symbol");
  const quote = (data["Global Quote"] ?? data["quote"] ?? data) as Record<string, unknown>;
  const price = numberField(quote, "05. price", "c", "price");
  if (!symbol || price === undefined || price <= 0) return undefined;

  return {
    symbol,
    exchange: stringField(data, "exchange", "Exchange"),
    price,
    open: numberField(quote, "02. open", "o", "open"),
    high: numberField(quote, "03. high", "h", "high"),
    low: numberField(quote, "04. low", "l", "low"),
    previousClose: numberField(quote, "08. previous close", "pc", "previousClose"),
    volume: numberField(quote, "06. volume", "v", "volume"),
    currency: stringField(data, "currency", "Currency"),
    asOf: raw.observed_at,
    source: { providerId: raw.provider_id }
  };
}

function assessQuote(quote: MarketQuoteV1, request: MarketQuoteRequestV1, now: Date, authority: number): QualityAssessment {
  const completeFields = [quote.symbol, quote.price, quote.asOf].filter(value => value !== undefined && value !== "").length;
  const completeness = completeFields / 3;
  const age = Math.max(0, now.getTime() - Date.parse(quote.asOf));
  const maxAge = request.freshnessMaxAgeMs ?? 60_000;
  const freshness = Number.isFinite(age) ? clamp(1 - age / Math.max(maxAge, 1)) : 0;
  const schemaValidity = quote.price > 0 && Boolean(quote.symbol) && Number.isFinite(Date.parse(quote.asOf)) ? 1 : 0;
  const score = clamp(completeness * 0.25 + freshness * 0.35 + schemaValidity * 0.25 + authority * 0.15);
  const warnings: string[] = [];
  if (freshness < 0.5) warnings.push("STALE_DATA");
  if (completeness < 1) warnings.push("PARTIAL_DATA");
  if (authority < 0.7) warnings.push("SOURCE_AUTHORITY_LOW");
  const status: QualityStatus = schemaValidity === 0 ? "REJECTED" : score >= 0.65 ? "VALID" : "CAUTION";
  return { status, score, completeness, freshness, schemaValidity, sourceAuthority: authority, warnings };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function agreementScore(values: number[]): { score: number; outliers: number } {
  if (values.length <= 1) return { score: 1, outliers: 0 };
  const center = median(values);
  if (center === 0) return { score: 0, outliers: 0 };
  const deviations = values.map(value => Math.abs(value - center) / center);
  const outliers = deviations.filter(value => value > 0.05).length;
  return { score: clamp(1 - Math.min(Math.max(...deviations), 1)), outliers };
}

export class KalpExecutionFabricV01 {
  private readonly providers: ProviderAdapter[];
  private readonly now: () => Date;
  private readonly id: () => string;

  constructor(dependencies: FabricDependencies = {}) {
    this.providers = dependencies.providers ?? initialFreeProviderMesh;
    this.now = dependencies.now ?? (() => new Date());
    this.id = dependencies.id ?? (() => crypto.randomUUID());
  }

  discoverCandidates(): ProviderCandidate[] {
    return this.providers
      .filter(provider => provider.role === "market-data")
      .map(provider => ({
        adapter: provider,
        providerId: provider.provider_id,
        providerName: provider.provider_name,
        capability: "market.quote" as const,
        authority: provider.provider_id.includes("FINNHUB") ? 0.9 : 0.85,
        enabled: true
      }));
  }

  async executeMarketQuote(request: MarketQuoteRequestV1): Promise<KalpExecutionResult<MarketQuoteV1>> {
    const requestId = this.id();
    const executionId = this.id();
    const candidates = this.discoverCandidates().slice(0, request.maxProviders ?? this.providers.length);
    if (!request.symbol.trim() || candidates.length === 0) {
      return { requestId, executionId, status: "REJECTED", telemetry: [], warnings: ["NO_ELIGIBLE_PROVIDER_OR_INVALID_REQUEST"] };
    }

    const telemetry: AttemptTelemetry[] = [];
    const evidence: EvidenceRecord<MarketQuoteV1>[] = [];
    const run = async (candidate: ProviderCandidate, attemptNumber: number): Promise<void> => {
      const started = this.now();
      let raw: NormalizedProviderResult;
      try {
        raw = await candidate.adapter.fetch({ symbol: request.symbol });
      } catch (error) {
        const completed = this.now();
        telemetry.push({ attemptId: this.id(), providerId: candidate.providerId, attemptNumber, startedAt: started.toISOString(), completedAt: completed.toISOString(), latencyMs: completed.getTime() - started.getTime(), status: "failure", failureCode: error instanceof Error ? error.message : "UNKNOWN", fallbackTriggered: true });
        return;
      }
      const completed = this.now();
      const normalized = normalizeQuote(raw);
      telemetry.push({ attemptId: this.id(), providerId: candidate.providerId, attemptNumber, startedAt: started.toISOString(), completedAt: completed.toISOString(), latencyMs: completed.getTime() - started.getTime(), status: normalized ? "success" : "failure", httpStatus: raw.status === "ok" ? 200 : raw.status === "rate_limited" ? 429 : 500, failureCode: normalized ? undefined : raw.error ?? "NORMALIZATION_FAILED", fallbackTriggered: attemptNumber > 1 });
      if (!normalized) return;
      const quality = assessQuote(normalized, request, completed, candidate.authority);
      const requestNode = { id: `req-${requestId}`, type: "request" as const, parentIds: [] };
      const providerNode = { id: `provider-${candidate.providerId}`, type: "provider" as const, parentIds: [requestNode.id], providerId: candidate.providerId, retrievedAt: raw.observed_at };
      const responseNode = { id: `response-${this.id()}`, type: "response" as const, parentIds: [providerNode.id], providerId: candidate.providerId, retrievedAt: raw.observed_at };
      const transformNode = { id: `transform-${this.id()}`, type: "transformation" as const, parentIds: [responseNode.id], providerId: candidate.providerId, transformation: "provider-response -> MarketQuoteV1" };
      evidence.push({ evidenceId: `evidence-${this.id()}`, providerId: candidate.providerId, providerName: candidate.providerName, payload: normalized, observedAt: raw.observed_at, quality, provenance: [requestNode, providerNode, responseNode, transformNode] });
    };

    if (request.parallel) {
      await Promise.all(candidates.map((candidate, index) => run(candidate, index + 1)));
    } else {
      for (const [index, candidate] of candidates.entries()) {
        await run(candidate, index + 1);
        if (evidence.some(item => item.quality.status === "VALID")) break;
      }
    }

    const accepted = evidence.filter(item => item.quality.status !== "REJECTED");
    if (accepted.length === 0) {
      return { requestId, executionId, status: "FAILED", telemetry, warnings: ["NO_USABLE_EVIDENCE"] };
    }

    const prices = accepted.map(item => item.payload.price);
    const agreement = agreementScore(prices);
    const fusedPrice = prices.length === 1 ? prices[0] : median(prices);
    const base = accepted[0].payload;
    const fused: MarketQuoteV1 = { ...base, price: fusedPrice, source: { providerId: accepted.length === 1 ? base.source.providerId : "KALP-FUSION" } };
    const qualityScore = clamp(accepted.reduce((sum, item) => sum + item.quality.score, 0) / accepted.length * (0.7 + agreement.score * 0.3));
    const warnings = [...new Set(accepted.flatMap(item => item.quality.warnings))];
    if (agreement.outliers > 0) warnings.push("OUTLIER_DETECTED");
    if (accepted.length < evidence.length) warnings.push("REJECTED_EVIDENCE_PRESENT");
    const provenance = accepted.flatMap(item => item.provenance);
    provenance.push({ id: `fusion-${this.id()}`, type: "fusion", parentIds: provenance.filter(node => node.type === "transformation").map(node => node.id), retrievedAt: this.now().toISOString(), transformation: accepted.length === 1 ? "single_source" : "median_price_fusion" });
    const result: ResultIntelligence<MarketQuoteV1> = {
      result: fused,
      quality: { ...accepted[0].quality, status: qualityScore >= 0.65 ? "VALID" : "CAUTION", score: qualityScore, consistency: agreement.score } as QualityAssessment & { consistency?: number },
      confidence: qualityScore,
      evidence: accepted,
      provenance,
      fusion: { mode: accepted.length === 1 ? "single_source" : "median", evidenceCount: evidence.length, acceptedCount: accepted.length, rejectedCount: evidence.length - accepted.length, agreementScore: agreement.score, outlierCount: agreement.outliers },
      warnings
    };
    return { requestId, executionId, status: warnings.includes("OUTLIER_DETECTED") ? "PARTIAL" : "SUCCESS", result, telemetry, warnings };
  }
}

export function createKalpExecutionFabricV01(dependencies: FabricDependencies = {}): KalpExecutionFabricV01 {
  return new KalpExecutionFabricV01(dependencies);
}

export const defaultKalpExecutionFabricV01 = createKalpExecutionFabricV01();

export type { ProviderAdapter, ProviderRequest };
