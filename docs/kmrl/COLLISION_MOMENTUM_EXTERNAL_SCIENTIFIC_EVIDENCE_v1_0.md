# PHY-MEC-007 Collision Momentum — External Scientific Authority Evidence v1.0

**Status:** EXTERNAL SCIENTIFIC SUPPORT — NOT KALP CANONICAL AUTHORITY

## Purpose

This record captures external scientific evidence relevant to resolving the blocked
`PHY-MEC-007 / collision_momentum` contract. It does not promote the contract to
KALP CANONICAL status.

## Sources

### OpenStax — Physics, Section 8.3: Elastic and Inelastic Collisions

OpenStax states that an elastic collision conserves kinetic energy and that, for a
one-dimensional two-object collision, momentum is conserved:

- m1 v1 + m2 v2 = m1 v1' + m2 v2'
- 1/2 m1 v1^2 + 1/2 m2 v2^2 = 1/2 m1 v1'^2 + 1/2 m2 v2'^2

Source:
https://openstax.org/books/physics/pages/8-3-elastic-and-inelastic-collisions

### OpenStax — University Physics Volume 1, Section 9.4: Types of Collisions

OpenStax gives the solved one-dimensional perfectly elastic collision equations:

v1' = ((m1 - m2) v1 + 2 m2 v2) / (m1 + m2)

v2' = ((m2 - m1) v2 + 2 m1 v1) / (m1 + m2)

Source:
https://openstax.org/books/university-physics-volume-1/pages/9-4-types-of-collisions

## Relevance to the KMRL Proposal

These sources support the scientific correctness of the currently staged proposal for
a one-dimensional perfectly elastic collision. They support:

1. Momentum conservation.
2. Kinetic-energy conservation for an elastic collision.
3. The proposed closed-form final-velocity equations.

## Governance Boundary

External scientific support is **not equivalent to KALP authority**.

The KALP source-governance contracts require explicit authority evidence before a
discovered or inferred source/contract can be promoted to CANONICAL status.

Therefore this evidence record does **not**:

- modify the authoritative Excel catalog;
- register `collision_momentum` as EXECUTABLE;
- add the missing fourth parameter mapping;
- create a runtime adapter;
- authorize browser execution;
- declare the elastic-collision proposal KALP CANONICAL.

## Remaining Promotion Gate

A KALP-authorized decision is still required to select and approve the collision
semantics for `PHY-MEC-007`. Once explicitly approved, the implementation sequence
is:

AUTHORITY APPROVAL
→ AUTHORITATIVE CONTRACT REGISTRATION
→ Excel mappings m1/m2/v1/v2
→ catalog validation
→ executable registry registration
→ adapter + unit tests
→ DynamicExperimentRuntime wiring
→ Sandbox browser E2E
→ green CI

**Decision state:** BLOCKED pending explicit KALP authority/approval.
