# KALP Astro Rashi — Canonical Architecture Lock v1.0

Status: LOCKED
Effective: 2026-09-19
Repository: talk2genaihost/Kalp-Ecosystem

## 1. Canonical Principle
The Astro Rashi runtime uses a single canonical evidence boundary. Provider evidence and KALP-calculated evidence are explicit, provenance-tagged evidence. Interpretation may consume only declared evidence fields.

## 2. Evidence Layers
Provider evidence: provider-supplied chart facts, planets, KP cusp/star/sub-lord records, Shadbala, dasha and provider yogas.

KALP calculated evidence:
- D1 whole-sign planet-to-house mapping
- KP cusp-boundary planet-to-house mapping when sufficient cusp data exists
- Parashari Graha Drishti under PARASHARI_GRAHA_DRISHTI_V1
- Classical sign lordship from Lagna
- Explicitly contracted derived yogas

Calculated evidence retains provenance, rule and basis.

## 3. D1 vs KP Separation
D1 whole-sign house placement and KP cusp-based placement are separate evidence layers and must never be silently conflated.

## 4. Aspect Contract
Rule set: PARASHARI_GRAHA_DRISHTI_V1.
- All listed grahas: 7th aspect
- Mars: 4th, 7th, 8th
- Jupiter: 5th, 7th, 9th
- Saturn: 3rd, 7th, 10th
- Rahu/Ketu: only universal 7th aspect in v1
No alternate aspect convention may be introduced silently.

## 5. Lordship Contract
House lordship is calculated from Lagna using the locked classical sign-ruler table and D1 whole-sign framework. It is not inferred from KP cusp records.

## 6. Derived Yoga Contract
Derived yogas are allowed only when an explicit KALP rule contract is satisfied. Provider yogas and KALP-derived yogas remain separately identified. Yoga presence does not imply a deterministic result.

## 7. Gemini Interpretation Boundary
Gemini may interpret provider facts, Shadbala, provider yogas, KALP planet-house mappings, KALP aspects, KALP lordships and KALP derived yogas.

Gemini must not invent unsupported dignity, exaltation/debilitation, own-sign, moolatrikona, conjunction/yuti, additional yogas, missing dasha levels, or deterministic predictions.

## 8. Renderer Contract
General retail analysis renders after the canonical chart renderer. If Gemini output is unavailable or rejected, the evidence-grounded deterministic retail fallback remains the page-level fallback.

## 9. Change Control
This architecture is LOCKED. Changes to evidence semantics, D1/KP separation, aspect rules, lordship rules, derived-yoga contracts, Gemini evidence boundary, or renderer ordering require an explicit architecture revision rather than an incidental implementation change.

Implementation baseline: kalp-derived-evidence.ts, kalp-evidence-gate.ts, kalp-gemini-entry.ts, browser-entry.ts.

Validation baseline at lock:
- Astro Rashi browser build: PASS
- Astro Rashi verification: PASS
- Live Evidence Validation: PASS
- Gemini Live Intelligence Validation: PASS
- GitHub Pages deployment: PASS