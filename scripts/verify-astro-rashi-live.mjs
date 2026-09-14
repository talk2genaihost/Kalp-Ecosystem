const SUPABASE_URL = "https://cfwrgalgscieddkcrtde.supabase.co";
const KUNDLI_ENDPOINT = `${SUPABASE_URL}/functions/v1/astro-kundli`;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!ANON_KEY) throw new Error("SUPABASE_ANON_KEY is required");

const birth = {
  datetime: "1976-11-28T11:15:00+05:30",
  coordinates: "29.69197,76.98448",
  birthPlace: "Karnal, Haryana",
};

function assert(condition, message) {
  if (!condition) throw new Error(`LIVE_EVIDENCE_FAIL: ${message}`);
}

async function getToken() {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const body = await response.json();
  assert(response.ok, `Supabase auth failed (${response.status}): ${JSON.stringify(body)}`);
  assert(typeof body.access_token === "string" && body.access_token.length > 20, "No access token returned");
  return body.access_token;
}

function findCanonical(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 6) return null;
  if (value.lagna && typeof value.lagna === "object" && value.lagna.source === "KALP_CALCULATED") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findCanonical(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  for (const item of Object.values(value)) {
    const found = findCanonical(item, depth + 1);
    if (found) return found;
  }
  return null;
}

async function main() {
  const token = await getToken();
  const response = await fetch(KUNDLI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(birth),
  });
  const payload = await response.json();
  assert(response.ok, `astro-kundli failed (${response.status}): ${JSON.stringify(payload)}`);
  assert(payload.status === "SUCCESS", `unexpected status ${payload.status}`);
  assert(payload.provider === "openkundali", `provider is ${payload.provider}`);

  const canonical = findCanonical(payload);
  const evidence = canonical?.evidence ?? payload.data?.evidence ?? payload.evidence ?? {};
  assert(canonical, `KALP-KUNDLI-CANONICAL-v1 payload missing; top-level keys: ${Object.keys(payload).join(",")}`);
  assert(canonical.lagna?.value === "मकर", `Lagna value ${canonical.lagna?.value}`);
  assert(canonical.lagna?.evidenceStatus === "CALCULATED", `Lagna evidence ${canonical.lagna?.evidenceStatus}`);
  assert(canonical.lagna?.source === "KALP_CALCULATED", `Lagna source ${canonical.lagna?.source}`);
  assert(Number(canonical.lagna?.degree) > 13.4 && Number(canonical.lagna?.degree) < 13.7, `Lagna degree ${canonical.lagna?.degree}`);
  assert(canonical.providerLagna === "Capricorn", `provider Lagna ${canonical.providerLagna}`);
  assert(canonical.moonSign === "Aquarius", `Moon sign ${canonical.moonSign}`);
  assert(canonical.sunSign === "Scorpio", `Sun sign ${canonical.sunSign}`);
  assert(canonical.nakshatra === "Shatabhisha", `Nakshatra ${canonical.nakshatra}`);
  assert(Number(canonical.nakshatraPada) === 1, `Nakshatra pada ${canonical.nakshatraPada}`);
  assert(canonical.nakshatraLord === "Rahu", `Nakshatra lord ${canonical.nakshatraLord}`);
  assert(typeof canonical.tithi === "string" && canonical.tithi.length > 0, "Calculated Tithi missing");
  assert(typeof canonical.karana === "string" && canonical.karana.length > 0, "Calculated Karana missing");
  assert(typeof canonical.yoga === "string" && canonical.yoga.length > 0, "Calculated Panchanga Yoga missing");
  assert(typeof canonical.mangalDosha === "string" && canonical.mangalDosha.length > 0, "Calculated Mangal Dosha missing");
  assert(evidence.lagna === "CALCULATED", `canonical evidence lagna ${evidence.lagna}`);
  assert(evidence.moonSign === "PROVIDER", `canonical evidence moonSign ${evidence.moonSign}`);
  assert(evidence.sunSign === "PROVIDER", `canonical evidence sunSign ${evidence.sunSign}`);
  assert(evidence.nakshatra === "CALCULATED", `canonical evidence nakshatra ${evidence.nakshatra}`);
  assert(evidence.tithi === "CALCULATED", `canonical evidence tithi ${evidence.tithi}`);
  assert(evidence.karana === "CALCULATED", `canonical evidence karana ${evidence.karana}`);
  assert(evidence.yoga === "CALCULATED", `canonical evidence yoga ${evidence.yoga}`);
  assert(evidence.mangalDosha === "CALCULATED", `canonical evidence mangalDosha ${evidence.mangalDosha}`);
  assert(Array.isArray(canonical.planets) && canonical.planets.length >= 9, "planet evidence missing/incomplete");
  assert(Array.isArray(canonical.yogaDetails), "provider yoga evidence missing");
  assert(Array.isArray(canonical.dashaPeriods), "dasha period evidence missing");

  console.log(JSON.stringify({
    status: "PASS",
    provider: payload.provider,
    lagna: { value: canonical.lagna.value, degree: canonical.lagna.degreeText, source: canonical.lagna.source },
    providerFacts: { moonSign: canonical.moonSign, sunSign: canonical.sunSign },
    calculatedFacts: { nakshatra: canonical.nakshatra, pada: canonical.nakshatraPada, tithi: canonical.tithi, karana: canonical.karana, yoga: canonical.yoga, mangalDosha: canonical.mangalDosha },
    evidence,
    yogaCount: canonical.yogaDetails.length,
    dashaPeriodCount: canonical.dashaPeriods.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
