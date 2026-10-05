# KALP STEM LAB Catalog Source Receipt — v1.0 Collision Approved

Status: SOURCE RETRIEVED FROM USER UPLOAD / RUNTIME MANIFEST GENERATED

## Sources

- Approved workbook: `KALP_STEM_LAB_MASTER_CATALOG_v1_0_collision_approved.xlsx`
- SHA-256: `d20c89ea77d8eaf8a5c59ea0fd91d169138a9f5de9d07e135b561aa9d79f54d8`
- Legacy workbook: `KALP_STEM_LAB_MASTER_CATALOG_v1_0.xlsx`
- SHA-256: `edea26e4a05a3b9db6510c7100c07f2941b14b14cbf713a8f361a11a0700af61`

## Workbook structure

Both workbooks contain:
README, EXPERIMENT_CATALOG, MODEL_CONTRACTS, PARAMETERS, PROCEDURE_STEPS, MEASUREMENTS, SAFETY, MATERIALS, OUTCOMES, CURRICULUM_MAP, MEDIA_ASSETS.

## Material differences verified

The collision-approved workbook explicitly records:

- PHY-MEC-007 approved for one-dimensional perfectly elastic collision execution.
- dt represented as PHY-MEC-007-P05.
- MODEL_CONTRACTS collision_momentum updated with m1, m2, v1, v2, dt and the elastic-collision equations.
- PARAMETERS gains the Model_Input column.
- PHY-MEC-007 parameters become:
  P01 mass_1 → m1
  P02 mass_2 → m2
  P03 initial_velocity_1 → v1
  P04 initial_velocity_2 → v2
  P05 time_step → dt

The legacy workbook has the older collision mapping and does not contain the Model_Input column.

## Runtime boundary

The mobile app consumes a generated TypeScript runtime manifest derived from the approved workbook. The workbook remains the source asset; the Android app does not parse XLSX directly at runtime.

Runtime flow:

Excel source → catalog extraction/validation → typed runtime manifest → KMRL mobile runtime

This preserves the Excel-governed data model without requiring an XLSX parser inside the Android runtime.

## Important governance note

This receipt records source evidence and the approved workbook's explicit collision update. It does not by itself promote the workbook to global KALP CANONICAL status; registry authority remains governed by the KALP source registry.
