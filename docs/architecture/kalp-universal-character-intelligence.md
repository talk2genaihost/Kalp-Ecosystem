# KALP Universal Character Intelligence — Integration Plan

## Decision
Implement the Universal Character Intelligence workflow inside the existing KALP Cinematic Studio. Do not create a new dashboard, duplicate the storyboard generator, or replace the existing character registry.

## Audit findings from the current main branch
- UI entry points already exist: Create, Characters, Scenes, Storyboard, Production, Library, and the dedicated Retro 64 view in `apps/cinematic-studio/index.html`.
- The existing Characters view renders the canonical registry; it is the natural home for profile status and first-version approval controls.
- `apps/cinematic-studio/data/character-registry.json` is the current canonical character list, with existing visual/performance lock fields.
- `apps/cinematic-studio/api/cinematic.js` reads the character registry and scene contract and returns generated scene data. It validates registered character IDs and emits an 8-frame scene package. It does not currently expose durable character-profile CRUD or an approval workflow.
- `apps/cinematic-studio/retro64-ui-v2.js` already reads Excel reference workbooks and builds reference-driven character/world/action DNA, intent, progression, and 3 reels × 8 shots. Reuse this as the game/action adapter; do not generalize it by removing its game-specific constraints.
- `apps/cinematic-studio/retro64-ready-bootstrap.js` synchronizes the Retro 64 reference workbook JSON. This is an existing reference ingestion path, not a general-purpose web research engine.
- `apps/cinematic-studio/index.html` contains an intelligence-layer banner naming MCP, Gemini, KALP Governor, and provider routing. The visible selector alone does not establish that automatic web research, durable memory, or profile approval are wired end-to-end.
- Root `package.json` includes TypeScript, tsx, Vite, Playwright and xlsx; the existing Retro 64 UI loads SheetJS for workbook reading.

## Gate-to-module map
| Gate | Reuse / extension point | Required work |
|---|---|---|
| Intent intake | Existing Create and Retro 64 intent fields | Normalize subject, topic, language, reel/frame count and target format into one request contract |
| Background research | MCP/retrieval provider only after its actual runtime contract is verified | Add provider adapter, source records, timestamps, confidence and uncertainty; no fake research success |
| DNA construction | Character registry plus Retro 64 reference-DNA pattern | Build versioned identity, persona, communication, knowledge, world and production sections |
| Validation | Existing identity locks, Retro 64 continuity checks and scene schema | Add cross-domain profile validation and explicit blocking errors |
| Human approval | Existing Characters view | First version and major identity/persona changes require explicit approval |
| Memory and Excel | Existing persistence must be audited before choosing the canonical store; existing xlsx dependency is reusable | Durable profile CRUD, version history, read-back verification, Excel export/import |
| Content catering | Existing scene runtime and Retro 64 progression engine | Route by domain adapter; use approved DNA and the new intent, without rebuilding the storyboard engine |
| 24-frame storyboard | Existing Retro 64 3×8 logic as a reference implementation | Generalize through a shared contract and validate exactly 24 frames |
| Production | Existing Storyboard and Production views/handoff | Keep current renderer contracts and block invalid packages |

## Approval policy
- Research and validation run automatically when a real research provider is connected.
- The first profile version remains `PENDING_APPROVAL` until a human approves it.
- Major identity/persona changes create a proposed new version; the active approved version remains available until approval.
- Topic changes reuse the approved profile and do not trigger a full identity rebuild.
- Generation cannot pass the profile gate until the approved version is saved and read back.

## Storage principle
Excel is the human-readable registry/export, not the runtime's only source of truth. Browser localStorage and files committed to the application repository must not be described as cross-user durable memory. Select the canonical persistence adapter only after verifying the deployed runtime and database capabilities.

## Implementation sequence
1. Approve and test this shared contract.
2. Implement profile versioning and the approval controls inside the existing Characters view.
3. Wire canonical persistence and Excel export with read-back checks.
4. Connect real background research through the existing MCP/retrieval provider contract.
5. Route approved profiles into existing scene/Retro 64 adapters and generalize the 3×8 storyboard contract.
6. Add integration tests for approval blocking, version immutability, 24-frame exactness, continuity and production handoff.

## Acceptance criteria
- No new dashboard or duplicate storyboard engine.
- Existing Retro 64 behavior remains intact.
- First profile and major identity changes cannot bypass human approval.
- No profile is called saved until persistence read-back succeeds.
- Every research-derived claim can be traced to a source record or marked uncertain.
- Three-reel requests produce exactly 24 validated frame objects before handoff.
