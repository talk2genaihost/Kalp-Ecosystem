# Heating Water — Contract Finalization Candidate

Status: FINALIZATION CANDIDATE — NOT CANONICAL
Model ID: heating_water
Experiment ID: CHE-MIX-001
Domain: CHEMISTRY

## Source alignment

This candidate is aligned to:
- EXPERIMENT_CATALOG: CHE-MIX-001 / Heating Water: Observe Temperature Change
- PARAMETERS: three current rows for mass/energy/time-step are presently generic in the canonical workbook
- existing KMRL HeatingWaterExperimentAdapter implementation
- existing dynamic runtime binding and tests

The current workbook MODEL_CONTRACTS row remains a placeholder. This document therefore does not promote the workbook row to CANONICAL.

## Proposed contract

### Required inputs

| Model input | Runtime unit | Meaning | Current semantic mapping |
|---|---|---|---|
| mass | kg | water mass | CHE-MIX-001-P01 |
| energy | J | heat energy applied during the step | CHE-MIX-001-P02 |
| dt | s | simulation time step | CHE-MIX-001-P03 |

### Model constant

- specific heat capacity of water: 4186 J/(kg·K)
- This is currently an adapter model constant, not a learner-editable Excel parameter.

### State outputs

- temperature (degC)
- simulation time (s)

### Measurements

- Temperature (degC)
- Last heat input (J)

### Controlled rule

For each simulation step:

Q = m × c × ΔT

therefore:

ΔT = Q / (m × c)

T_next = T_current + ΔT

where:
- Q = heat energy applied for the step
- m = water mass
- c = 4186 J/(kg·K)

The simulation time step advances runtime time but does not alter the calorimetric temperature increment itself.

### Validation

- mass must be in kg and > 0
- heat energy must be in J and > 0
- dt must be in s
- dt must be positive
- specific heat capacity must be finite and > 0

### Reset

Reset restores:
- initial temperature = 20 degC unless explicitly configured
- simulation time = 0 s
- pending heat = 0 J
- last heat measurement = 0 J

### Safety

The canonical workbook marks CHE-MIX-001 as MEDIUM and explicitly states simulation-only unless otherwise marked; no physical procedure is authorized by the app.

## Promotion gate

To promote this candidate into the canonical Excel MODEL_CONTRACTS and PARAMETERS sheets, the authoritative source must explicitly approve:
1. required inputs and units
2. the controlled heat equation
3. the water specific-heat constant
4. state outputs and measurement semantics
5. parameter mappings

Until then:
- KMRL implementation remains usable as existing implementation evidence.
- This candidate remains FINALIZATION CANDIDATE.
- No authority promotion is performed.
