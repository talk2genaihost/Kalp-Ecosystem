import type { MarketSignal } from "../../contracts/market-to-revenue-v01.js";

export interface GeminiMarketManthanConfig {
  apiKey?: string;
  model?: string;
  category?: string;
  geography?: string;
}

interface GeminiSignalPayload {
  category: string;
  geography: string;
  trend: string;
  evidence: string[];
  confidence: number;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: {
      webSearchQueries?: string[];
    };
  }>;
}

const signalSchema = {
  type: "object",
  properties: {
    category: { type: "string" },
    geography: { type: "string" },
    trend: { type: "string" },
    evidence: { type: "array", items: { type: "string" } },
    confidence: { type: "number" }
  },
  required: ["category", "geography", "trend", "evidence", "confidence"]
};

/**
 * Live Market Manthan source backed by Gemini + Google Search grounding.
 * The API key is read from GEMINI_API_KEY and is never embedded in source.
 */
export class GeminiMarketManthanSignalSource {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly category: string;
  private readonly geography: string;

  constructor(config: GeminiMarketManthanConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.GEMINI_API_KEY ?? "";
    this.model = config.model ?? process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
    this.category = config.category ?? process.env.MM_CATEGORY ?? "quick-commerce";
    this.geography = config.geography ?? process.env.MM_GEOGRAPHY ?? "Delhi NCR";

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is required for live Market Manthan mode");
    }
  }

  async getSignal(now = new Date().toISOString()): Promise<MarketSignal> {
    const prompt = [
      "You are the Market Manthan signal analyst for KALP.",
      "Use Google Search grounding to identify one current, commercially relevant market signal.",
      `Category: ${this.category}`,
      `Geography: ${this.geography}`,
      `Current timestamp: ${now}`,
      "Prefer fresh evidence and distinguish observed facts from interpretation.",
      "Do not invent statistics, companies, sources, or facts.",
      "Return exactly one JSON object matching the supplied schema.",
      "Evidence must contain 2-4 concise evidence statements grounded in the searched web results.",
      "Confidence must be a number from 0 to 1 reflecting evidence quality, not certainty about the future."
    ].join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: signalSchema,
            temperature: 0.2
          }
        })
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Gemini Market Manthan request failed (${response.status}): ${detail.slice(0, 500)}`);
    }

    const body = (await response.json()) as GeminiResponse;
    const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!text) throw new Error("Gemini returned no Market Manthan signal payload");

    let payload: GeminiSignalPayload;
    try {
      payload = JSON.parse(text) as GeminiSignalPayload;
    } catch (error) {
      throw new Error(`Gemini returned invalid Market Manthan JSON: ${String(error)}`);
    }

    validateSignalPayload(payload);

    const searchQueries = body.candidates?.[0]?.groundingMetadata?.webSearchQueries ?? [];
    const evidence = searchQueries.length > 0
      ? [...payload.evidence, `Gemini Google Search queries: ${searchQueries.join(" | ")}`]
      : payload.evidence;

    return {
      signal_id: `MM-SIG-GEMINI-${Date.now()}`,
      category: payload.category,
      geography: payload.geography,
      trend: payload.trend,
      evidence,
      source: "gemini-google-search",
      provider: "MM-PAF-GEMINI",
      observed_at: now,
      confidence: payload.confidence
    };
  }
}

function validateSignalPayload(payload: GeminiSignalPayload): void {
  if (!payload.category || !payload.geography || !payload.trend) {
    throw new Error("Gemini Market Manthan signal is missing required text fields");
  }
  if (!Array.isArray(payload.evidence) || payload.evidence.length < 2) {
    throw new Error("Gemini Market Manthan signal requires at least two evidence items");
  }
  if (!Number.isFinite(payload.confidence) || payload.confidence < 0 || payload.confidence > 1) {
    throw new Error("Gemini Market Manthan confidence must be between 0 and 1");
  }
}
