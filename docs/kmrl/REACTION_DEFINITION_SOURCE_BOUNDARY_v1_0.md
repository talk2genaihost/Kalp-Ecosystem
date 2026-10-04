# KMRL Reaction Definition Source — Gate 5.3 Chemistry Boundary

## Purpose
Define the governed source boundary required before `registered_reaction` can become an Excel-driven canonical/executable model.

## Current authority
- Status: PROPOSED
- Authority: INFERENCE
- Scope: Chemistry reaction definitions used by KMRL `MixMaterialsExperimentAdapter`
- This document does not promote any reaction data to canonical status.

## Required source record
| Field | Requirement |
|---|---|
| Reaction_ID | Stable unique reaction identifier |
| Experiment_ID | Owning STEM experiment |
| Reaction_Name | Human-readable reaction name |
| Reactants | One or more material/coefficient pairs |
| Products | One or more material/coefficient pairs |
| Conditions | Optional minimum/maximum temperature constraints |
| Status | Source lifecycle state |

## Runtime compatibility
The source record must project without semantic loss to the existing runtime contract:
`ReactionDefinition = id + name + reactants + products + conditions`

Reactant/product participants map to `{ materialId, coefficient }`.
Temperature constraints map to `MIN_TEMPERATURE` and `MAX_TEMPERATURE`.

## Governance rule
The source may be promoted only when the actual Excel/catalog data supplies the reaction definition and the values are explicitly approved.

Until then: `registered_reaction = NOT_EXECUTABLE_FROM_EXCEL_SOURCE`.

## Next gate
1. Add/approve `REACTION_DEFINITIONS` to the STEM catalog.
2. Populate CHE-MIX-002 from an authoritative reaction source.
3. Add loader + validator support.
4. Add semantic material/reaction mappings.
5. Verify dynamic runtime launch from Excel without runtime-side reaction injection.
6. Only then promote the model to executable.