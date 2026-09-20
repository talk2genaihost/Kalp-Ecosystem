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
