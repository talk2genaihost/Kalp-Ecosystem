# KMRAL v0.1 — KALP Mobile Reusable Architecture Library

## Objective
Build reusable mobile application capabilities once and compose future KALP applications from governed modules instead of starting from scratch.

## Current modules
- KMRAL-CORE — library identity and app manifest
- KMRAL-UI — reusable UI contracts
- KMRAL-DATA — models, repositories and persistence contracts
- KMRAL-MEDIA — camera, image, document and attachment contracts
- KMRAL-OFFLINE — offline state and synchronization contracts
- KMRAL-DOCUMENTS — reporting and export contracts

## Assembly model
`KMRAL Core + selected modules + domain pack + app requirements = Application Blueprint`

`Application Blueprint + implementation adapters = Application`

## Domain packs planned
- Inspection
- Inventory
- Field Service
- Expense
- Property

## Governance rule
Every reusable module must document:
1. Purpose
2. Public API / contract
3. Dependencies
4. Inputs and outputs
5. Example usage
6. Test requirements
7. Platform constraints
8. Known limitations
9. Version
10. Reuse candidates for future applications

## Status
Architecture and starter implementation only. Production readiness requires implementation, integration tests, platform validation and a reference application.
