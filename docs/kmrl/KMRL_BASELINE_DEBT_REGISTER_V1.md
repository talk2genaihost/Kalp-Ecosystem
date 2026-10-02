# KMRL Repository Baseline Debt Register v1

## Purpose

This register preserves repository-wide failures that were identified during KMRL migration provenance verification and classified as **PRE-EXISTING**. These failures are outside the KMRL migration scope and must not be repaired as part of the KMRL gate unless separately authorized.

## Provenance basis

- Baseline branch: `feature/kmral-active-impl`
- Migration branch: `feature/kmrl-migration-v1`
- Baseline commit: `9239bc03202cbf8cd2ab33945a68a81c686a5f7e`
- Migration HEAD at isolation design: `92d8e609c8e805a0e69844c2d9386b0a44fb71aa`
- Classification: repository provenance/static comparison
- Historical baseline workflow reproduction: **NOT VERIFIED**
- KMRL source attribution for these failures: **NONE IDENTIFIED**

## Recorded failures

1. Cinematic Studio integration gate resolves canonical knowledge before production — PRE-EXISTING
2. unified workbook loader normalizes a synthetic workbook — PRE-EXISTING
3. canonical unified workbook loads as the runtime authority — PRE-EXISTING
4. shared cinematic resolver resolves world, physics, progression, effects, style and conflicts — PRE-EXISTING
5. runtime gateway sends only normalized live-provider evidence to Manthan/Fusion — PRE-EXISTING
6. RETRO-64 Gate v1.0: generates and validates requested night-rain-helicopter episode — PRE-EXISTING
7. RETRO-64 Gate v1.0: renderer receives direct scene packets without unresolved tokens — PRE-EXISTING
8. RETRO-64 semantic intent gate: underwater combat intent becomes scene content — PRE-EXISTING
9. RETRO-64 semantic world gate: generated underwater episode uses underwater prop vocabulary — PRE-EXISTING
10. mission arc planner supports user-selected reel counts and final conclusion — PRE-EXISTING
11. mission arc planner rejects fewer than two reels — PRE-EXISTING
12. mission episode gate: generated production JSON contains actual 12-shot reels with Resume continuity — PRE-EXISTING
13. mission reel production gate: every reel generates 12 shots and Resume carries mission state — PRE-EXISTING
14. Resume Reel is blocked when previous reel state is missing — PRE-EXISTING
15. RETRO-64 semantic world gate: desert intent overrides jungle reference world and props — PRE-EXISTING
16. RETRO-64 applies desert world knowledge — PRE-EXISTING
17. Retro Knowledge Base gate: every supported world has physics, props, movement, VFX and audio — PRE-EXISTING

## Isolation rule

These failures are recorded as baseline debt. The KMRL-scoped gate does not use repository-wide test/build success as its pass criterion.

## Status

**ACTIVE BASELINE DEBT — PRESERVED**

No unrelated repair is authorized by this register.
