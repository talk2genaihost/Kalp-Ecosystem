import type { HoroscopeContentProvider, Locale, RashiId, WeeklyHoroscope } from "./domain.js";

const SUPABASE_URL = "https://cfwrgalgscieddkcrtde.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const GEMINI_ENDPOINT = `${SUPABASE_URL}/functions/v1/kalp-intelligence-gateway`;

export const SIGN_MAP: Record<RashiId, string> = {
  mesha: "aries", vrishabha: "taurus", mithuna: "gemini", karka: "cancer",
  simha: "leo", kanya: "virgo", tula: "libra", vrishchika: "scorpio",
  dhanu: "sagittarius", makara: "capricorn", kumbha: "aquarius", meena: "pisces"
};

const SIGN_IDS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];

export function createLiveHoroscopeProvider(): HoroscopeContentProvider & { setSummary(id: RashiId, summary: string): void } {
  const summaries = new Map<RashiId, string>();
  return {
    setSummary(id, summary) { summaries.set(id, summary); },
    getWeekly(id: RashiId, locale: Locale): WeeklyHoroscope {
      return { rashiId: id, weekLabel: "Today", summary: summaries.get(id) ?? "आज का राशिफल तैयार किया जा रहा है…", sourceStatus: summaries.has(id) ? "PROVIDER" : "EDITORIAL", locale };
    }
  };
}

async function getAccessToken(): Promise<string> {
  if (!SUPABASE_ANON_KEY) throw new Error("Gemini horoscope is not configured: Supabase browser key is missing.");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  if (!response.ok) throw new Error(`Gemini horoscope authentication failed (${response.status}).`);
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("Gemini horoscope authentication returned no access token.");
  return body.access_token;
}

function parseHoroscopes(output: string): Record<string, string> {
  const cleaned = output.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const source = parsed.horoscopes && typeof parsed.horoscopes === "object" ? parsed.horoscopes as Record<string, unknown> : parsed;
  const result: Record<string, string> = {};
  for (const sign of SIGN_IDS) {
    const value = source[sign];
    if (typeof value === "string" && value.trim()) result[sign] = value.trim();
  }
  return result;
}

export async function fetchLiveHoroscopes(locale: Locale): Promise<{ values: Map<string, string>; attributions: Map<string, string> }> {
  void locale;
  const token = await getAccessToken();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const prompt = [
    "You are KALP Astro Rashi's daily horoscope writer.",
    `Write a fresh, concise Hindi daily horoscope for ${date} (India time) for all 12 zodiac signs.`,
    "Return ONLY valid JSON in this shape: {\"horoscopes\":{\"aries\":\"...\",\"taurus\":\"...\",\"gemini\":\"...\",\"cancer\":\"...\",\"leo\":\"...\",\"virgo\":\"...\",\"libra\":\"...\",\"scorpio\":\"...\",\"sagittarius\":\"...\",\"capricorn\":\"...\",\"aquarius\":\"...\",\"pisces\":\"...\"}}",
    "Each value must be natural conversational Hindi in Devanagari, 2-3 sentences and about 35-55 words.",
    "Give reflective, non-deterministic guidance for general mood, work, relationships, and practical focus. Do not invent planetary positions, transits, or claim a calculated birth chart.",
    "No guaranteed predictions, medical advice, or guaranteed financial outcomes. Avoid repeating the same wording across signs.",
    "This is AI-generated entertainment and self-reflection, not a verified astronomical calculation."
  ].join("\n");
  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "gemini", gemini_models: ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-2.5-flash"], prompt })
  });
  const body = await response.json() as { output?: string; message?: string };
  if (!response.ok || !body.output) throw new Error(body.message ?? `Gemini horoscope request failed (${response.status}).`);
  const parsed = parseHoroscopes(body.output);
  const values = new Map<string, string>(Object.entries(parsed));
  if (values.size !== 12) throw new Error(`Gemini returned ${values.size} of 12 daily horoscopes; please retry later.`);
  return { values, attributions: new Map<string, string>() };
}
