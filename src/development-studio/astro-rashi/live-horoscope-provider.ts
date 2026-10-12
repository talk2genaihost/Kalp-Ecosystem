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
): Promise<{ values: Map<string, string>; attributions: Map<string, string> }> {
  // Sigastra does not list Hindi as a supported language, so request English and label the source language honestly.
  void locale;

  // The API returns a sign-specific item when the sign query parameter is supplied.
  // Fetch each sign explicitly instead of assuming the endpoint returns all 12 signs.
  const signs = [...new Set(Object.values(SIGN_MAP))];
  const responses = await Promise.allSettled(
    signs.map(async (sign) => {
      const url = new URL(DAILY_ENDPOINT);
      url.searchParams.set("lang", "en");
      url.searchParams.set("sign", sign);
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`Live horoscope provider failed for ${sign} (${response.status}).`);
      const payload = await response.json() as ProviderObject;
      const items = normalize(payload);
      const item = items.find((candidate) => {
        const reportedSign = extractSign(candidate);
        return !reportedSign || reportedSign === sign;
      }) ?? items[0];
      const value = item ? extractText(item) : null;
      const attribution = payload.attribution && typeof payload.attribution === "object"
        ? (payload.attribution as ProviderObject).localizedHref
        : undefined;
      return {
        sign,
        value,
        attribution: typeof attribution === "string" ? attribution : `https://sigastra.com/daily-horoscope/${sign}`
      };
    })
  );

  const values = new Map<string, string>();
  const attributions = new Map<string, string>();
  const failures: string[] = [];
  for (const result of responses) {
    if (result.status === "fulfilled") {
      if (result.value.value) values.set(result.value.sign, result.value.value);
      attributions.set(result.value.sign, result.value.attribution);
    } else {
      failures.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    }
  }

  if (values.size === 0) {
    throw new Error(failures[0] ?? "Live horoscope provider returned no usable daily summaries.");
  }

  return { values, attributions };
}
