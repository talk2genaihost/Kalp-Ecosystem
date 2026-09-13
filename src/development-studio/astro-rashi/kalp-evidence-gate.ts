type Obj = Record<string, unknown>;

export type EvidenceStatus = "PROVIDER" | "CALCULATED" | "UNAVAILABLE" | "PARTIAL";

export interface EvidenceContext {
  provider: string;
  model: string;
  statuses: Record<string, EvidenceStatus>;
  facts: {
    lagna?: unknown;
    moonSign?: unknown;
    sunSign?: unknown;
    nakshatra?: unknown;
    nakshatraPada?: unknown;
    nakshatraLord?: unknown;
    tithi?: unknown;
    karana?: unknown;
    yoga?: unknown;
    mangalDosha?: unknown;
    dasha?: unknown;
    dashaLevels: string[];
    planets: unknown[];
    yogaDetails: unknown[];
  };
  unavailable: string[];
  rules: string[];
}

function obj(value: unknown): Obj {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Obj : {};
}

function nonEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function clean(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) return value.map(clean).filter((item) => item !== undefined);
  if (typeof value === "object") {
    const source = obj(value);
    const output: Obj = {};
    for (const [key, item] of Object.entries(source)) {
      const normalized = clean(item);
      if (normalized !== undefined) output[key] = normalized;
    }
    return output;
  }
  return value;
}

export function buildEvidenceContext(payload: unknown): EvidenceContext {
  const root = obj(payload);
  const source = obj(root.data);
  const canonical = obj(source.canonical);
  const data: Obj = { ...source, ...canonical };
  const evidence = obj(data.evidence);
  const status = (field: string): EvidenceStatus => {
    const value = evidence[field];
    if (value === "PROVIDER" || value === "CALCULATED" || value === "UNAVAILABLE" || value === "PARTIAL") return value;
    return nonEmpty(data[field]) ? "PROVIDER" : "UNAVAILABLE";
  };
  const statuses: Record<string, EvidenceStatus> = {};
  for (const field of ["lagna", "moonSign", "sunSign", "nakshatra", "nakshatraPada", "nakshatraLord", "tithi", "karana", "yoga", "mangalDosha", "dasha", "dashaPeriods", "yogaDetails"]) {
    statuses[field] = field === "lagna" && nonEmpty(data.lagna) ? "CALCULATED" : status(field);
  }

  const dasha = obj(data.dasha);
  const dashaLevels = [
    ["Mahadasha", dasha.mahadasha ?? dasha.name],
    ["Antardasha", dasha.antardasha],
    ["Pratyantardasha", dasha.pratyantardasha],
  ].filter(([, value]) => nonEmpty(value)).map(([label]) => label);

  const planets = Array.isArray(data.planets) ? data.planets.map((planet) => {
    const p = obj(planet);
    // Only expose chart facts that are safe to interpret without house/aspect calculation.
    return clean({
      name: p.name ?? p.planet,
      sign: p.sign ?? p.rashi ?? p.zodiac,
      degree: p.degree,
      retrograde: p.retrograde,
      combust: p.combust,
    });
  }).filter(nonEmpty) : [];

  const yogaDetails = Array.isArray(data.yogaDetails) ? data.yogaDetails.map(clean).filter(nonEmpty) : [];
  const unavailable = Object.entries(statuses).filter(([, value]) => value === "UNAVAILABLE").map(([key]) => key);

  return {
    provider: String(data.provider ?? root.provider ?? "UNKNOWN"),
    model: String(obj(root.adapter).model ?? "KALP-KUNDLI-CANONICAL-v1"),
    statuses,
    facts: {
      lagna: clean(data.lagna),
      moonSign: clean(data.moonSign),
      sunSign: clean(data.sunSign),
      nakshatra: clean(data.nakshatra),
      nakshatraPada: clean(data.nakshatraPada),
      nakshatraLord: clean(data.nakshatraLord),
      tithi: clean(data.tithi),
      karana: clean(data.karana),
      yoga: clean(data.yoga),
      mangalDosha: clean(data.mangalDosha),
      dasha: clean(dasha),
      dashaLevels,
      planets,
      yogaDetails,
    },
    unavailable,
    rules: [
      "No field may be stated unless its evidence status is PROVIDER or CALCULATED.",
      "UNAVAILABLE and PARTIAL fields must be described as unavailable or omitted; never inferred.",
      "Only the supplied Dasha hierarchy levels may be named. A Mahadasha does not authorize Antardasha or Pratyantardasha claims.",
      "Only supplied yogaDetails entries may be named. Do not derive or invent additional yogas.",
      "Planet records authorize only the supplied planet name, sign, degree, retrograde and combust facts. Do not infer houses, aspects or placements.",
      "Do not infer Tithi, Karana or Mangal Dosha from other chart facts.",
      "Do not make deterministic predictions or medical, legal or guaranteed financial claims.",
    ],
  };
}

function normalized(text: string): string {
  return text.toLowerCase().replace(/[\s.,:;!?()\[\]{}'"“”‘’–—-]/g, "");
}

export function validateInterpretation(value: unknown, evidence: EvidenceContext): { ok: boolean; violations: string[] } {
  const parsed = obj(value);
  const text = Object.values(parsed).flatMap((item) => Array.isArray(item) ? item : [item]).filter((item): item is string => typeof item === "string").join(" ");
  const n = normalized(text);
  const violations: string[] = [];
  const unsupported = (field: string, patterns: string[]) => {
    if (evidence.statuses[field] === "UNAVAILABLE" && patterns.some((pattern) => n.includes(normalized(pattern)))) violations.push(`${field}: unsupported claim`);
  };

  unsupported("tithi", ["तिथि", "tithi"]);
  unsupported("karana", ["करण", "karana"]);
  unsupported("mangalDosha", ["मंगलदोष", "मांगलिक", "mangaldosha", "manglik"]);
  unsupported("yogaDetails", ["योग", "yoga"]);

  const dashaLevels = evidence.facts.dashaLevels;
  if (dashaLevels.length < 2 && ["अंतरदशा", "antardasha", "subperiod"].some((pattern) => n.includes(normalized(pattern)))) violations.push("dasha: Antardasha not evidenced");
  if (dashaLevels.length < 3 && ["प्रत्यंतरदशा", "pratyantardasha", "sub-sub-period"].some((pattern) => n.includes(normalized(pattern)))) violations.push("dasha: Pratyantardasha not evidenced");

  if (!evidence.facts.yogaDetails.length && ["परिवर्तनयोग", "परिवर्तन योग", "राजयोग", "विपरीत राजयोग", "वेशि योग", "केमद्रुम", "parivartana yoga", "raja yoga", "veshi yoga", "kemadruma"].some((pattern) => n.includes(normalized(pattern)))) violations.push("yogaDetails: no supplied yoga evidence");

  return { ok: violations.length === 0, violations };
}
