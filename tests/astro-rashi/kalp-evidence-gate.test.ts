import assert from "node:assert/strict";
import test from "node:test";
import { buildEvidenceContext, validateInterpretation } from "../../src/development-studio/astro-rashi/kalp-evidence-gate.ts";

function basePayload(overrides: Record<string, unknown> = {}) {
  return { provider: "openkundali", adapter: { model: "KALP-KUNDLI-CANONICAL-v1" }, data: { provider: "openkundali", lagna: { value: "मकर", degreeText: "13° 33′" }, moonSign: "Aquarius", sunSign: "Scorpio", nakshatra: "शतभिषा", nakshatraPada: 1, nakshatraLord: "Rahu", tithi: null, karana: null, yoga: null, mangalDosha: null, dasha: { name: "Mercury", mahadasha: "Mercury", antardasha: null, pratyantardasha: null }, dashaPeriods: [], planets: [{ name: "Moon", sign: "Aquarius", degree: 9.1 }], yogaDetails: [], shadbala: [], houses: [], kpHouses: [], evidence: { lagna: "CALCULATED", moonSign: "PROVIDER", sunSign: "PROVIDER", nakshatra: "CALCULATED", nakshatraPada: "CALCULATED", nakshatraLord: "CALCULATED", tithi: "UNAVAILABLE", karana: "UNAVAILABLE", yoga: "UNAVAILABLE", mangalDosha: "UNAVAILABLE", dasha: "PROVIDER", dashaPeriods: "UNAVAILABLE", yogaDetails: "UNAVAILABLE", planets: "PROVIDER", houses: "UNAVAILABLE", kpHouses: "UNAVAILABLE", shadbala: "UNAVAILABLE" }, ...overrides } };
}

test("tracks dasha hierarchy evidence independently", () => {
  const evidence = buildEvidenceContext(basePayload());
  assert.equal(evidence.statuses.dashaMahadasha, "PROVIDER");
  assert.equal(evidence.statuses.dashaAntardasha, "UNAVAILABLE");
  assert.equal(evidence.statuses.dashaPratyantardasha, "UNAVAILABLE");
});

test("rejects claims for unavailable tithi, karana and mangal dosha", () => {
  const evidence = buildEvidenceContext(basePayload());
  const result = validateInterpretation({ guidance: ["तिथि के अनुसार विशेष निष्कर्ष निकाला जा सकता है।", "करण के अनुसार विशेष फल मिलता है।", "जातक मांगलिक है।"] }, evidence);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.startsWith("tithi:")));
  assert.ok(result.violations.some((v) => v.startsWith("karana:")));
  assert.ok(result.violations.some((v) => v.startsWith("mangalDosha:")));
});

test("allows explicitly saying an unavailable field is unavailable", () => {
  const evidence = buildEvidenceContext(basePayload());
  const result = validateInterpretation({ guidance: ["तिथि उपलब्ध नहीं है।", "करण उपलब्ध नहीं है।", "मंगल दोष की जानकारी उपलब्ध नहीं है।"] }, evidence);
  assert.equal(result.ok, true);
});

test("rejects antardasha and pratyantardasha when only mahadasha is evidenced", () => {
  const evidence = buildEvidenceContext(basePayload());
  const result = validateInterpretation({ dasha: ["बुध महादशा चल रही है और इसकी अंतरदशा महत्वपूर्ण है।"] }, evidence);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.includes("Antardasha")));
});

test("rejects a named yoga that is absent from provider yoga evidence", () => {
  const evidence = buildEvidenceContext(basePayload());
  const result = validateInterpretation({ yogas: ["परिवर्तन योग के कारण जीवन में बड़ा बदलाव आता है।"] }, evidence);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.includes("unsupported yoga claim")));
});

test("allows supplied yoga evidence and evidenced mahadasha", () => {
  const payload = basePayload();
  const data = payload.data as Record<string, unknown>;
  data.yogaDetails = [{ name: "Parivartana Yoga", description: "Supplied by provider" }];
  const evidence = buildEvidenceContext(payload);
  const result = validateInterpretation({ dasha: ["बुध महादशा के संदर्भ में यह प्रवृत्ति देखी जा सकती है।"], yogas: ["प्रदाता द्वारा दिए गए परिवर्तन योग के संदर्भ में संकेत देखे जा सकते हैं।"] }, evidence);
  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test("rejects unsupported conjunction, aspect, dignity and lordship claims", () => {
  const evidence = buildEvidenceContext(basePayload());
  const result = validateInterpretation({ planetaryAnalysis: ["मंगल की युति बनती है और शनि की दृष्टि प्रभावी है; मंगल उच्च का है और सप्तम भावेश है।"] }, evidence);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.startsWith("planetaryRelations:")));
  assert.ok(result.violations.some((v) => v.startsWith("aspects:")));
  assert.ok(result.violations.some((v) => v.startsWith("dignity:")));
  assert.ok(result.violations.some((v) => v.startsWith("lordship:")));
});

test("rejects planet-to-house placement without explicit mapping", () => {
  const evidence = buildEvidenceContext(basePayload());
  const result = validateInterpretation({ houseAnalysis: ["मंगल अष्टम भाव में स्थित है।"] }, evidence);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.startsWith("planetaryPlacement:")));
});

test("rejects shadbala claims when strength evidence is unavailable", () => {
  const evidence = buildEvidenceContext(basePayload());
  const result = validateInterpretation({ strengths: ["मंगल का षड्बल बहुत मजबूत है।"] }, evidence);
  assert.equal(result.ok, false);
  assert.ok(result.violations.some((v) => v.startsWith("shadbala:")));
});
