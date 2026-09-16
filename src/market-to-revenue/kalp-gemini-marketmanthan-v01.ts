import type { MarketSignal } from "../../contracts/market-to-revenue-v01.js";

export interface KalpGeminiMarketManthanConfig {
  supabaseUrl?: string;
  publishableKey?: string;
  category?: string;
  geography?: string;
}

interface ResearchResponse {
  status?: string;
  source_count?: number;
  sources?: Array<{ title?: string; url?: string; snippet?: string; source_type?: string; date?: string }>;
  context_pack?: unknown;
  refined_objective?: string;
}

interface GatewayResponse {
  status?: string;
  provider?: string;
  model?: string;
  output?: string;
  attempts?: unknown[];
}

interface SignalPayload {
  category: string;
  geography: string;
  trend: string;
  evidence: string[];
  confidence: number;
}

/**
 * KALP's shared Gemini path used by AdManthan: Supabase research retrieval
 * supplies fresh evidence, then kalp-intelligence-gateway delegates reasoning
 * to the configured Gemini provider. The Gemini secret remains server-side.
 */
export class KalpGeminiMarketManthanSignalSource {
  private readonly supabaseUrl: string;
  private readonly publishableKey: string;
  private readonly category: string;
  private readonly geography: string;

  constructor(config: KalpGeminiMarketManthanConfig = {}) {
    this.supabaseUrl = (config.supabaseUrl ?? process.env.KALP_SUPABASE_URL ?? "").replace(/\/$/, "");
    this.publishableKey = config.publishableKey ?? process.env.KALP_SUPABASE_PUBLISHABLE_KEY ?? "";
    this.category = config.category ?? process.env.MM_CATEGORY ?? "quick-commerce";
    this.geography = config.geography ?? process.env.MM_GEOGRAPHY ?? "Delhi NCR";

    if (!this.supabaseUrl) throw new Error("KALP_SUPABASE_URL is required for shared Gemini mode");
    if (!this.publishableKey) throw new Error("KALP_SUPABASE_PUBLISHABLE_KEY is required for shared Gemini mode");
  }

  async getSignal(now = new Date().toISOString()): Promise<MarketSignal> {
    const intent = `Product=${this.category}; Category=${this.category}; Audience=young professionals; Geography=${this.geography}; Market=${this.geography}; Objective=identify current market opportunity signals; Constraints=evidence-backed, current, no invented facts`;
    const research = await this.post<ResearchResponse>("admanthan-research", { intent });
    if (research.status !== "RESEARCHED") {
      throw new Error(`KALP Market Manthan research unavailable: ${research.status ?? "UNKNOWN"}`);
    }

    const evidence = (research.sources ?? []).slice(0, 12).map((source) => ({
      title: source.title ?? "",
      url: source.url ?? "",
      snippet: source.snippet ?? "",
      source_type: source.source_type ?? "",
      date: source.date ?? null
    }));

    const prompt = [
      "You are the Market Manthan signal analyst inside KALP.",
      "Use ONLY the supplied research evidence to identify one current commercial market signal.",
      `Category: ${this.category}`,
      `Geography: ${this.geography}`,
      `Observed at: ${now}`,
      "Separate observed evidence from interpretation.",
      "Do not invent companies, statistics, sources, dates, or facts.",
      "Return ONLY valid JSON with category, geography, trend, evidence, confidence.",
      "Evidence must contain 2-4 concise statements and preserve source-backed facts.",
      "Confidence must be 0..1 and reflect evidence quality.",
      `RESEARCH EVIDENCE:\n${JSON.stringify(evidence)}`,
      `RESEARCH CONTEXT:\n${JSON.stringify(research.context_pack ?? {})}`
    ].join("\n");

    const gateway = await this.post<GatewayResponse>("kalp-intelligence-gateway", {
      provider: "gemini",
      prompt
    });
    if (gateway.status !== "COMPLETED" || !gateway.output) {
      throw new Error(`KALP Gemini gateway unavailable: ${gateway.status ?? "UNKNOWN"}`);
    }

    const payload = parseSignalPayload(gateway.output);
    return {
      signal_id: `MM-SIG-KALP-GEMINI-${Date.now()}`,
      category: payload.category,
      geography: payload.geography,
      trend: payload.trend,
      evidence: payload.evidence,
      source: "admanthan-research",
      provider: `MM-PAF-KALP-GEMINI:${gateway.model ?? "configured"}`,
      observed_at: now,
      confidence: payload.confidence
    };
  }

  private async post<T>(functionName: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.supabaseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: this.publishableKey,
        Authorization: `Bearer ${this.publishableKey}`
      },
      body: JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Supabase function ${functionName} HTTP ${response.status}: ${text.slice(0, 500)}`);
    return JSON.parse(text) as T;
  }
}

function parseSignalPayload(output: string): SignalPayload {
  const clean = output.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
  let payload: SignalPayload;
  try {
    payload = JSON.parse(clean) as SignalPayload;
  } catch (error) {
    throw new Error(`KALP Gemini returned invalid MarketSignal JSON: ${String(error)}`);
  }
  if (!payload.category || !payload.geography || !payload.trend) throw new Error("KALP Gemini signal is missing required fields");
  if (!Array.isArray(payload.evidence) || payload.evidence.length < 2) throw new Error("KALP Gemini signal requires at least two evidence items");
  if (!Number.isFinite(payload.confidence) || payload.confidence < 0 || payload.confidence > 1) throw new Error("KALP Gemini confidence must be between 0 and 1");
  return payload;
}
