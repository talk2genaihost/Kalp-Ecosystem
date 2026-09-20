# KALP Cinematic Studio — CSD-002

This module is the first operational surface for the Character Scene Director.

## Runtime contracts

- `data/character-registry.json` — canonical character selection contract. The registry can grow independently of the scene selector; CSD limits active scene selection to five characters.
- `data/scene-contract.json` — canonical 8-frame scene contract for the Shiva + Ram + Ravan demonstration.

## Scene flow

Character Registry → CSD-001 Scene Director → CSD-002 Perspective Storyboard → CSD-003 Visual Generation → CMSE-012 Context Assembly → CMSE-013 Prompt Compilation → CMSE-014 Provider Routing → CMSE-015 Scheduling → QA → Final Scene.

## Contract rule

The storyboard is a projection of the scene contract. A frame may change perspective, camera, emotion, action or dialogue, but must preserve active character/world identity locks and continuity constraints.

The current `index.html` is a self-contained UI prototype. The JSON contracts are intentionally separated so the next runtime step can replace demo state with API-backed retrieval without redesigning the dashboard.


## Runtime API

`api/cinematic.js` exposes the CSD runtime boundary. `GET /api/cinematic?type=characters` returns the registry; `GET /api/cinematic` returns the canonical scene; `POST /api/cinematic` validates 1–5 selected character IDs and returns a generated scene contract. The dashboard calls this API for boot, generation and reset operations.


## CSD-003 — Perspective-to-Visual Generation Engine

CSD-003 compiles every CSD-002 storyboard frame into a deterministic, provider-neutral visual generation job. It preserves character identity, performance, world, perspective, camera, emotion, action, lighting, VFX and continuity constraints.

### Runtime
- GET `/api/visual` — CSD-003 health/contract status
- POST `/api/visual` with `{ "frame_ids": ["F01"] }` — compile one or more frame visual jobs
- POST with no frame_ids — compile all storyboard frames

### Output
Each job contains a stable job ID, frame ID, perspective, aspect ratio, context fingerprint, visual specification, hard continuity constraints, negative constraints, and downstream routing to CMSE-012/013/014/015.

CSD-003 is deliberately provider-neutral. Provider-specific prompt translation belongs to CMSE-013 and provider selection belongs to CMSE-014. Actual execution belongs to CMSE-010/015.


## CSD-003.2 — Character Identity & Visual Lock Validation

CSD-003.2 validates whether every canonical character present in a generated frame has a machine-addressable visual lock. Missing canonical locks block promotion of a generated frame to trusted continuity reference status.

Runtime endpoint: `POST /api/identity`

- `{ "frame_id": "F01" }` validates the selected frame's registry lock coverage.
- A missing `visual_lock` returns `PASS_WITH_LOCK_COVERAGE_GAP` and blocks downstream propagation.
- Visual presence is intentionally separate from canonical identity match.

F01 real-visual evidence is recorded in `data/csd-003-2-f01-validation.json` with asset id `5234a294-ed5a-4dfc-a048-54fe84b6d537`.


### CSD-003.2A — Canonical Visual Lock Registration

Registered existing canonical identity artifacts for `RAM_001` and `RAVAN_001` in `data/canonical-visual-locks.json` and attached the lock identifiers to `data/character-registry.json`. F01 CSD-003.2 validation now returns `PASS`, `trusted_reference: true`, and `downstream_propagation: ELIGIBLE` after lock coverage completion.


### CSD-003.3 — Reference Propagation & F02–F08

F01 is the trusted reference after CSD-003.2. `POST /api/propagation` compiles F02–F08 jobs that inherit F01 identity, world, spatial, and environment locks while preserving frame-specific perspective, emotion, action, camera, and VFX state.
