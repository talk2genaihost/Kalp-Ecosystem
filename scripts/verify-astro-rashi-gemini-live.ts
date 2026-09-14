import { buildEvidenceContext, validateInterpretation, type EvidenceContext } from "../src/development-studio/astro-rashi/kalp-evidence-gate.js";

const SUPABASE_URL = "https://cfwrgalgscieddkcrtde.supabase.co";
const KUNDLI_ENDPOINT = `${SUPABASE_URL}/functions/v1/astro-kundli`;
const GATEWAY_ENDPOINT = `${SUPABASE_URL}/functions/v1/kalp-intelligence-gateway`;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!ANON_KEY) throw new Error("SUPABASE_ANON_KEY is required");

const birth = { datetime: "1976-11-28T11:15:00+05:30", coordinates: "29.69197,76.98448", birthPlace: "Karnal, Haryana" };
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`LIVE_GEMINI_FAIL: ${message}`); }
async function token(): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: { apikey: ANON_KEY!, "Content-Type": "application/json" }, body: JSON.stringify({}) });
  const body = await response.json() as { access_token?: string };
  assert(response.ok && typeof body.access_token === "string", `auth failed (${response.status})`);
  return body.access_token;
}
function findCanonical(value: unknown, depth = 0): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || depth > 7) return null;
  if (Array.isArray(value)) { for (const item of value) { const found = findCanonical(item, depth + 1); if (found) return found; } return null; }
  const object = value as Record<string, unknown>;
  if (object.lagna && typeof object.lagna === "object" && (object.lagna as Record<string, unknown>).source === "KALP_CALCULATED") return object;
  for (const item of Object.values(object)) { const found = findCanonical(item, depth + 1); if (found) return found; }
  return null;
}
function evidencePrompt(e: EvidenceContext): string { return ["EVIDENCE GATE — HARD CONSTRAINT.", `Provider: ${e.provider}`, `Canonical model: ${e.model}`, `Field evidence status: ${JSON.stringify(e.statuses)}`, `Evidence-safe facts ONLY: ${JSON.stringify(e.facts)}`, `Unavailable fields: ${JSON.stringify(e.unavailable)}`, "Rules:", ...e.rules.map((rule) => `- ${rule}`), "The Evidence-safe facts are the complete factual boundary. Do not use, reconstruct, calculate, or infer facts outside them."].join("\n"); }
async function main() {
  const auth = await token();
  const kundliResponse = await fetch(KUNDLI_ENDPOINT, { method: "POST", headers: { Authorization: `Bearer ${auth}`, apikey: ANON_KEY!, "Content-Type": "application/json" }, body: JSON.stringify(birth) });
  const kundli = await kundliResponse.json();
  assert(kundliResponse.ok && kundli.status === "SUCCESS", `astro-kundli failed (${kundliResponse.status})`);
  const canonical = findCanonical(kundli);
  assert(canonical, "canonical evidence missing");
  const evidence = buildEvidenceContext(kundli);
  assert(evidence.provider === "openkundali", `provider ${evidence.provider}`);
  const prompt = [
    "You are KALP's Full Kundli Intelligence layer. Produce a structured, evidence-gated Vedic chart interpretation from the supplied canonical evidence.",
    "Use only the supplied evidence-safe facts. Do not reconstruct, calculate, derive, or infer unsupported facts.",
    "A planet's sign or degree alone authorizes ONLY that planet's supplied name, sign, degree, retrograde, and combust status.",
    "CRITICAL: KP Houses are cusp records only in this evidence. They do NOT provide a planet-to-house mapping. Therefore do not say that any planet is in, placed in, situated in, or rules any house.",
    "CRITICAL: Do not mention drishti/aspect, yuti/conjunction, planetary relationship, dignity/exaltation/debilitation, own-sign, moolatrikona, bhavesh/lordship, or planetary house placement unless that exact relationship is explicitly present in the supplied evidence. The current evidence does not supply those planetary relationships.",
    "Do not derive new yogas. Discuss only supplied yogaDetails. Do not derive Tithi, Karana, Mangal Dosha, houses, aspects, or Dasha subperiods from other facts.",
    "For planetaryAnalysis, keep discussion limited to supplied planet facts and supplied Shadbala where applicable. Do not attach planets to houses or aspects.",
    "For houseAnalysis, discuss only the supplied KP-house cusp/star-lord/sub-lord records as house evidence; do not assign planets to those houses.",
    "Use cautious, non-deterministic language. No medical diagnosis/treatment, deterministic predictions, legal advice, or guaranteed financial outcomes.",
    "Return JSON only with exactly these keys: summary, chartSynthesis, personality, planetaryAnalysis, houseAnalysis, career, relationships, finance, dasha, dashaTimeline, nakshatra, yogas, yogaAnalysis, strengths, cautions, focus, guidance. summary is a string; every other key is string[].",
    "Write natural conversational Hindi. Return an empty array when evidence does not support a section. Do not fill unsupported sections with generic astrology claims.",
    evidencePrompt(evidence),
  ].join("\n\n");
  const response = await fetch(GATEWAY_ENDPOINT, { method: "POST", headers: { Authorization: `Bearer ${auth}`, apikey: ANON_KEY!, "Content-Type": "application/json" }, body: JSON.stringify({ provider: "gemini", gemini_models: ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-2.5-flash"], prompt }) });
  const body = await response.json() as { output?: string; message?: string };
  assert(response.ok && body.output, `Gemini gateway failed (${response.status}): ${body.message ?? "no output"}`);
  let interpretation: unknown;
  try { interpretation = JSON.parse(body.output); } catch { throw new Error("LIVE_GEMINI_FAIL: Gemini returned non-JSON output"); }
  const validation = validateInterpretation(interpretation, evidence);
  assert(validation.ok, `Evidence Gate rejected Gemini output: ${validation.violations.join("; ")}`);
  const result = interpretation as Record<string, unknown>;
  const arrays = Object.entries(result).filter(([, value]) => Array.isArray(value)).reduce((count, [, value]) => count + (value as unknown[]).length, 0);
  console.log(JSON.stringify({ status: "PASS", provider: evidence.provider, model: evidence.model, evidenceStatus: evidence.statuses, outputKeys: Object.keys(result), supportedArrayItems: arrays, gate: "ACCEPTED" }, null, 2));
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
