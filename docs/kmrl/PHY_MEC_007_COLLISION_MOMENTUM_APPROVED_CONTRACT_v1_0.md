# PHY-MEC-007 Collision Momentum — KALP Approved Contract v1.0

**Status:** APPROVED — CANONICAL WITHIN SCIENCE SANDBOX CONTRACT SCOPE

## Explicit approval

The KALP Science Sandbox collision model is approved as a **one-dimensional perfectly elastic collision**.

This approval authorizes promotion of the previously staged proposal into the Science Sandbox executable contract, subject to the implementation gates below.

## Scientific semantics

Two bodies with positive masses m1 and m2 and one-dimensional initial velocities v1 and v2 produce final velocities:

v1' = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2)

v2' = (2 * m1 * v1 + (m2 - m1) * v2) / (m1 + m2)

The executable model must preserve:

- linear momentum;
- kinetic energy for the elastic collision;
- finite numeric inputs;
- strictly positive masses.

## Runtime control

The Science Sandbox runtime uses a positive `dt` control parameter for the generic STEP lifecycle. `dt` is a runtime control input, not a physical collision-state variable.

## Authoritative Excel mappings

Experiment: `PHY-MEC-007`

- P01 → `m1`
- P02 → `m2`
- P03 → `v1`
- P04 → `v2`
- P05 → `dt`

## Promotion boundary

The contract may now proceed through:

APPROVAL → CANONICAL CONTRACT → Excel mappings → VALIDATE → ADAPTER → RUNTIME → SANDBOX E2E → CI

No additional collision type inference is permitted.

## Governance note

This record is the explicit KALP approval artifact for the Science Sandbox collision contract. External scientific sources remain supporting evidence only; they do not independently establish KALP authority.

**Decision:** APPROVED.
