# Collision Momentum Contract Proposal v1.0

## Status

**PROPOSED — NOT CANONICAL — NOT RUNTIME-EXECUTABLE**

This proposal is derived from the existing KALP STEM catalog contract for collision_momentum and makes the missing collision semantics explicit rather than silently promoting an implementation assumption.

## Existing catalog contract

- Model_ID: collision_momentum
- Domain: PHYSICS
- Required inputs: m1, m2, v1, v2
- State outputs: final velocities
- Rule_or_Equation: momentum conservation
- Catalog experiment: PHY-MEC-007 — Conservation of Momentum

## Proposed execution semantics

**Model:** one-dimensional perfectly elastic collision.

All masses are positive and velocities are signed one-dimensional velocities.

Proposed final velocities:

- v1' = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2)
- v2' = (2 * m1 * v1 + (m2 - m1) * v2) / (m1 + m2)

The runtime contract should verify:

1. linear momentum is conserved within numerical tolerance;
2. kinetic energy is conserved within numerical tolerance;
3. both masses are strictly positive;
4. all velocities are finite.

## Required Excel semantic mappings

The current seed catalog has only three generic parameters for PHY-MEC-007. Four semantic inputs are required:

| Parameter | Model_Input |
|---|---|
| PHY-MEC-007-P01 | m1 |
| PHY-MEC-007-P02 | m2 |
| PHY-MEC-007-P03 | v1 |
| PHY-MEC-007-P04 | v2 |

The fourth parameter does not currently exist in the seed workbook.

## Promotion boundary

This proposal must **not** be registered as an executable model until:

1. the collision type is explicitly approved for PHY-MEC-007;
2. the four semantic parameter mappings are present in the authoritative Excel catalog;
3. the resulting catalog validates;
4. the model is registered as EXECUTABLE;
5. adapter unit tests and Science Sandbox browser validation pass.

Until those gates are satisfied, collision_momentum remains NOT_EXECUTABLE.

## Authority distinction

The existing catalog establishes momentum conservation and final velocities but does **not** specify the collision type or the elastic-collision equations above. The elastic model in this document is therefore an explicit **proposal/inference**, not a claim about existing canonical KALP authority.
