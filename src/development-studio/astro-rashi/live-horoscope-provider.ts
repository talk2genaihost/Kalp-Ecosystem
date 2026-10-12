import type { HoroscopeContentProvider, Locale, RashiId, WeeklyHoroscope } from "./domain.js";

const DAILY_ENDPOINT = "https://sigastra.com/api/v1/daily";

export const SIGN_MAP: Record<RashiId, string> = {
  mesha: "aries",
  vrishabha: "taurus",
  mithuna: "gemini",
  karka: "cancer",
  simha: "leo",
  kanya: "virgo",
  tula: "libra",
  vrishchika: "scorpio",
  dhanu: "sagittarius",
  makara: "capricorn",
  kumbha: "aquarius",
  meena: "pisces"
};

type ProviderObject = Record<string, unknown>;

function extractText(item: ProviderObject): string | null {
  for (const key of ["text", "teaser", "summary", "description", "prediction", "dek", "articleBody"]) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function extractSign(item: ProviderObject): string | null {
  for (const key of ["sign", "slug", "rashi", "zodiac", "name"]) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim().toLowerCase();
  }
  return null;
}

function normalize(payload: unknown): ProviderObject[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as ProviderObject;
  const candidates = [root.items, root.data, root.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is ProviderObject => Boolean(item && typeof item === "object"));
    }
    if (candidate && typeof candidate === "object") {
      const nested = candidate as ProviderObject;
      if (Array.isArray(nested.items)) {
        return nested.items.filter((item): item is ProviderObject => Boolean(item && typeof item === "object"));
      }
      if (extractText(nested)) return [nested];
    }
  }
  return extractText(root) ? [root] : [];
}

export function createLiveHoroscopeProvider(): HoroscopeContentProvider & {
  setSummary(id: RashiId, summary: string): void;
} {
  const summaries = new Map<RashiId, string>();

  return {
    setSummary(id, summary) {
      summaries.set(id, summary);
    },
    getWeekly(id: RashiId, locale: Locale): WeeklyHoroscope {
      return {
        rashiId: id,
        weekLabel: "Today",
        summary: summaries.get(id) ?? "Loading live horoscope…",
        sourceStatus: summaries.has(id) ? "PROVIDER" : "EDITORIAL",
        locale
      };
    }
  };
}

export async function fetchLiveHoroscopes(
  locale: Locale
): Promise<{ values: Map<string, string>; attribution?: string }> {
  // Sigastra supports 15 languages, but not Hindi. Request English explicitly and label it honestly in the UI.
  void locale;
  const response = await fetch(`${DAILY_ENDPOINT}?lang=en`);
  if (!response.ok) throw new Error(`Live horoscope provider failed (${response.status}).`);

  const payload = await response.json() as ProviderObject;
  const values = new Map<string, string>();

  for (const item of normalize(payload)) {
    const sign = extractSign(item);
    const value = extractText(item);
    if (sign && value) values.set(sign, value);
  }

  const attributionObject = payload.attribution;
  const attribution = attributionObject && typeof attributionObject === "object"
    ? typeof (attributionObject as ProviderObject).localizedHref === "string"
      ? (attributionObject as ProviderObject).localizedHref as string
      : "https://sigastra.com/partners/api"
    : "https://sigastra.com/partners/api";

  return { values, attribution };
}
