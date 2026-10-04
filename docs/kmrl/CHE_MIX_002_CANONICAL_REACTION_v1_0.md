# CHE-MIX-002 Canonical Reaction Definition v1.0

## Authority
- Status: CANONICAL
- Authority: APPROVED
- Domain: CHEMISTRY
- Experiment: CHE-MIX-002 — Mixing Materials: Observe a System Change
- Reaction ID: RXN-CHE-MIX-002-001

## Canonical reaction

**Hydrochloric acid + sodium hydroxide neutralization**

HCl(aq) + NaOH(aq) → NaCl(aq) + H2O(l)

Stoichiometry:
- HCl: 1
- NaOH: 1
- NaCl: 1
- H2O: 1

No additional temperature condition is imposed by this contract.

## Excel semantic mappings

| Parameter | Model_Input |
|---|---|
| CHE-MIX-002-P01 | material:MAT-HCL |
| CHE-MIX-002-P02 | material:MAT-NAOH |
| CHE-MIX-002-P03 | dt |

Material source records:
- MAT-HCL — Hydrochloric Acid
- MAT-NAOH — Sodium Hydroxide
- MAT-H2O — Water
- MAT-NACL — Sodium Chloride

## Evidence basis

The KALP STEM catalog defines CHE-MIX-002 as a Chemistry registered_reaction experiment and already contains HCl and NaOH as Chemistry materials. The canonical reaction equation is independently supported by OpenStax Chemistry: HCl(aq) and NaOH(aq) react to form NaCl(aq) and H2O(l).

Source: OpenStax Chemistry, section 14.4, equation 14.116:
https://openstax.org/books/chemistry/pages/14-4-hydrolysis-of-salt-solutions

This source establishes the chemistry equation and neutralization classification. The KALP contract supplies the experiment-specific IDs and semantic mappings.
