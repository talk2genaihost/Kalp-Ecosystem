# Heating Water — Canonical Excel Contract v1.1

Source artifact: KALP_STEM_LAB_MASTER_CATALOG_v1_1_HEATING_WATER_CANONICAL.xlsx

Promotion scope: CHE-MIX-001 / heating_water only.

The Excel artifact v1.1 promotes the following fields from the previously placeholder contract:
- Required_Inputs: mass, energy, dt
- State_Outputs: temperature, time
- Rule_or_Equation: Q=m*c*dT; dT=Q/(m*c); T_next=T_current+dT; c=4186 J/(kg·K); T0=20 degC

Semantic PARAMETERS.Model_Input mappings:
- CHE-MIX-001-P01 → mass (kg)
- CHE-MIX-001-P02 → energy (J)
- CHE-MIX-001-P03 → dt (s)

Canonical measurement mappings:
- CHE-MIX-001-M01 → Temperature / degC / temperature
- CHE-MIX-001-M02 → Last heat input / J / heat-energy

Governance:
- This promotion applies only to Heating Water.
- Other Chemistry and Mathematics placeholder contracts remain unchanged.
- registered_reaction / Mixing Materials remains blocked pending an Excel-backed reaction-definition source.
- The workbook remains a controlled model-data source; it does not execute macros or arbitrary code.
