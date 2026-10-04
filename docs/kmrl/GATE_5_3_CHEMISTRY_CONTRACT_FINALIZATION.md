# Gate 5.3 — Chemistry Contract Finalization Matrix

Status: APPROVAL-READY BASELINE
Authority rule: Source-derived facts are preserved; missing contract semantics are NOT inferred into canonical runtime state.

## Source baseline

The STEM master workbook defines 15 Chemistry experiments and 14 Chemistry model IDs. The MODEL_CONTRACTS sheet currently uses placeholder values for every Chemistry model:

- Required_Inputs: model inputs
- State_Outputs: model state
- Rule_or_Equation: controlled model contract required

The PARAMETERS sheet currently uses generic parameter names (primary_parameter, secondary_parameter, time_step) rather than authoritative semantic Model_Input mappings for these Chemistry experiments.

Therefore this matrix is a finalization boundary, not a promotion of inferred chemistry equations.

## Contract status matrix

| Experiment ID | Experiment | Model ID | Current runtime state | Excel contract state | Gate 5.3 disposition |
|---|---|---|---|---|---|
| CHE-MIX-001 | Heating Water: Observe Temperature Change | heating_water | EXECUTABLE adapter exists | PLACEHOLDER | FINALIZE Excel contract before canonical promotion |
| CHE-MIX-002 | Mixing Materials: Observe a System Change | registered_reaction | Adapter exists, but reaction definition is not Excel-backed | PLACEHOLDER + missing reaction-definition source | BLOCKED |
| CHE-ACB-001 | Acid-Base Neutralization | acid_base_neutralization | NOT EXECUTABLE | PLACEHOLDER | CONTRACT REQUIRED |
| CHE-ACB-002 | pH and Dilution | ph_dilution | NOT EXECUTABLE | PLACEHOLDER | CONTRACT REQUIRED |
| CHE-STO-001 | Stoichiometry | stoichiometry | NOT EXECUTABLE | PLACEHOLDER | CONTRACT REQUIRED |
| CHE-STO-002 | Limiting Reagent | limiting_reagent | NOT EXECUTABLE | PLACEHOLDER | CONTRACT REQUIRED |
| CHE-ELC-001 | Simple Electrolysis | electrolysis | NOT EXECUTABLE | PLACEHOLDER | CONTRACT REQUIRED |
| CHE-ELC-002 | Galvanic Cell | galvanic_cell | NOT EXECUTABLE | PLACEHOLDER | CONTRACT REQUIRED |
| CHE-THM-001 | Exothermic Reaction | reaction_heat | NOT EXECUTABLE | PLACEHOLDER | CONTRACT REQUIRED |
| CHE-THM-002 | Endothermic Reaction | reaction_heat | NOT EXECUTABLE | PLACEHOLDER | CONTRACT REQUIRED |
| CHE-MAT-001 | Steel Making | steelmaking | NOT EXECUTABLE | PLACEHOLDER | CONTRACT REQUIRED |
| CHE-MAT-002 | Alloy Composition | alloy_composition | NOT EXECUTABLE | PLACEHOLDER | CONTRACT REQUIRED |
| CHE-KIN-001 | Reaction Rate vs Temperature | reaction_rate_temperature | NOT EXECUTABLE | PLACEHOLDER | CONTRACT REQUIRED |
| CHE-KIN-002 | Concentration and Reaction Rate | reaction_rate_concentration | NOT EXECUTABLE | PLACEHOLDER | CONTRACT REQUIRED |
| CHE-ORG-001 | Esterification Model | esterification | NOT EXECUTABLE | PLACEHOLDER | CONTRACT REQUIRED |

## Required canonical contract fields

Before a Chemistry model can be promoted to executable, its authoritative contract must define:

1. Model_ID
2. Domain
3. Required_Inputs
4. Semantic parameter mapping (PARAMETERS.Model_Input)
5. Input units and valid ranges
6. State_Outputs
7. Output units
8. Rule_or_Equation / controlled model rule
9. Initial-state requirements
10. Step semantics (if time-evolving)
11. Measurement semantics
12. Reset semantics
13. Validation/error conditions
14. Safety constraints
15. Material/reaction dependencies where applicable

## Promotion rule

PROPOSED or INFERRED chemistry knowledge may be used to prepare a review artifact, but it must not be registered as an executable KMRL model contract until explicit approval/canonical authority exists.

The existing heating_water adapter is implementation evidence, not by itself sufficient to retroactively make the Excel MODEL_CONTRACTS row canonical.

## Gate 5.3 sequence

1. Finalize heating_water contract against the existing adapter.
2. Add a governed reaction-definition source for registered_reaction; then finalize Mixing Materials.
3. Finalize Acid/Base contracts.
4. Finalize Stoichiometry contracts.
5. Finalize Electrochemistry contracts.
6. Finalize Thermochemistry contracts.
7. Finalize Materials Science contracts.
8. Finalize Kinetics contracts.
9. Finalize Organic Chemistry contract.
10. For each approved contract: add semantic Model_Input mappings → implement adapter → register model → dynamic-runtime test → generic UI test.

## Explicit blockers

- No authoritative Chemistry equations/rules are present in the current workbook.
- No authoritative Chemistry semantic parameter mappings are present in the current workbook.
- registered_reaction has no reaction-definition sheet/source in the current workbook.

This file intentionally does not resolve those gaps by inference.
