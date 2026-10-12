import type { HoroscopeContentProvider, Locale, RashiId, WeeklyHoroscope } from "./domain.js";

const SUPABASE_URL = "https://cfwrgalgscieddkcrtde.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const GEMINI_ENDPOINT = `${SUPABASE_URL}/functions/v1/kalp-intelligence-gateway`;

export const SIGN_MAP: Record<RashiId, string> = {
  mesha: "aries", vrishabha: "taurus", mithuna: "gemini", karka: "cancer",
  simha: "leo", kanya: "virgo", tula: "libra", vrishchika: "scorpio",
  dhanu: "sagittarius", makara: "capricorn", kumbha: "aquarius", meena: "pisces"
};
const SIGN_IDS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"] as const;
export type DailyHoroscope = {
  summary: string; luckyColor: string; luckyNumber: string; luckyTime: string;
  focus: string; career: string; finance: string; relationships: string; caution: string; mantra: string;
};
const daily = new Map<RashiId, DailyHoroscope>();
export function getDailyHoroscope(id: RashiId): DailyHoroscope | undefined { return daily.get(id); }

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
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" }, body: JSON.stringify({}) });
  if (!response.ok) throw new Error(`Gemini horoscope authentication failed (${response.status}).`);
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("Gemini horoscope authentication returned no access token.");
  return body.access_token;
}
function parseHoroscopes(output: string): Record<string, DailyHoroscope> {
  const cleaned = output.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const source = parsed.horoscopes && typeof parsed.horoscopes === "object" ? parsed.horoscopes as Record<string, unknown> : parsed;
  const result: Record<string, DailyHoroscope> = {};
  const fields: Array<keyof DailyHoroscope> = ["summary","luckyColor","luckyNumber","luckyTime","focus","career","finance","relationships","caution","mantra"];
  for (const sign of SIGN_IDS) {
    const raw = source[sign];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.summary !== "string" || !item.summary.trim()) continue;
    const normalized = {} as DailyHoroscope;
    for (const field of fields) normalized[field] = typeof item[field] === "string" && (item[field] as string).trim() ? (item[field] as string).trim() : "स्रोत से उपलब्ध नहीं";
    result[sign] = normalized;
  }
  return result;
}
export async function fetchLiveHoroscopes(locale: Locale): Promise<{ values: Map<string, string>; attributions: Map<string, string>; details: Map<string, DailyHoroscope> }> {
  void locale;
  const token = await getAccessToken();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const prompt = [
    "You are KALP Astro Rashi's daily horoscope writer.",
    `Create a fresh Hindi daily horoscope for ${date} India time for all 12 zodiac signs.`,
    "Return ONLY valid JSON: {\"horoscopes\":{\"aries\":{\"summary\":\"...\",\"luckyColor\":\"...\",\"luckyNumber\":\"...\",\"luckyTime\":\"...\",\"focus\":\"...\",\"career\":\"...\",\"finance\":\"...\",\"relationships\":\"...\",\"caution\":\"...\",\"mantra\":\"...\"}, and the same object for taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces}}",
    "Every field must be a useful, concise Hindi Devanagari string. summary: 2-3 sentences; each other field: one practical sentence or short phrase.",
    "Lucky color/number/time are light entertainment suggestions, not calculated facts. Do not claim planetary positions, transits, or a calculated birth chart.",
    "Avoid guarantees, medical advice, and guaranteed financial outcomes. Vary content across signs. No field may be blank.",
    "AI-generated entertainment and self-reflection, not a verified astronomical calculation."
  ].join("\n");
  const response = await fetch(GEMINI_ENDPOINT, { method: "POST", headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY ?? "", "Content-Type": "application/json" }, body: JSON.stringify({ provider: "gemini", gemini_models: ["gemini-2.5-flash"], prompt }) });
  const body = await response.json() as { output?: string; message?: string };
  if (!response.ok || !body.output) throw new Error(body.message ?? `Gemini horoscope request failed (${response.status}).`);
  const parsed = parseHoroscopes(body.output);
  const values = new Map<string, string>();
  const details = new Map<string, DailyHoroscope>();
  for (const [sign, item] of Object.entries(parsed)) { values.set(sign, item.summary); details.set(sign, item); }
  if (values.size !== 12) throw new Error(`Gemini returned ${values.size} of 12 structured daily horoscopes; please retry later.`);
  for (const [sign, item] of details) {
    const id = (Object.keys(SIGN_MAP) as RashiId[]).find((key) => SIGN_MAP[key] === sign);
    if (id) daily.set(id, item);
  }
  return { values, attributions: new Map<string, string>(), details };
}
