# Collision Momentum Authority Resolution v1.0

## Resolution status

**UNRESOLVED / BLOCKED — NO KALP CANONICAL AUTHORITY FOUND**

## Scope

Record the authority resolution for PHY-MEC-007 / collision_momentum after PR #34 promotion.

## Sources reviewed

1. The active KALP STEM catalog contract for PHY-MEC-007.
   - Model_ID: collision_momentum
   - Required inputs: m1, m2, v1, v2
   - State outputs: final velocities
   - Rule_or_Equation: momentum conservation

2. Existing KMRL implementation and test corpus.
   - Confirms the catalog/runtime boundary.
   - Does not provide an authoritative collision-type definition.

3. COLLISION_MOMENTUM_CONTRACT_PROPOSAL_v1_0.
   - Explicitly marked PROPOSED / NOT CANONICAL.
   - Proposes a perfectly elastic one-dimensional collision.
   - This is inference, not KALP authority.

## Resolution

The available KALP source material establishes momentum conservation, but does not establish:

- elastic versus inelastic collision;
- the governing final-velocity equations;
- whether energy conservation is required;
- the authoritative fourth Excel parameter mapping for v2.

Therefore the collision contract cannot be promoted to CANONICAL or EXECUTABLE under the KALP authority rules.

## Required authority to unblock

A KALP-authoritative source must explicitly define the missing semantics, or an explicit KALP approval must promote a proposed contract.

Minimum required contract:

- collision model/type;
- m1;
- m2;
- v1;
- v2;
- final velocity equations;
- conservation checks;
- units and validation bounds;
- authoritative Excel parameter mappings.

## Current runtime state

collision_momentum remains NOT_EXECUTABLE.

No adapter registration, Excel mutation, or browser launch path has been added.

## Decision

**RESOLUTION: BLOCKED**

The correct next action is source/authority acquisition or explicit approval of a proposed collision contract. Implementing the elastic model before that point would promote inference into runtime authority and is therefore prohibited.
