# Architecture Decision: Reuse Kalpgyan Manthan capabilities in Cinematic Studio

**Status:** Proposed — architecture/documentation only  
**Scope:** KALP Cinematic Studio and the existing Kalpgyan Manthan TypeScript module  
**Implementation status:** Not implemented by this document

## Recommendation

Reuse selected **capabilities and contracts** from Kalpgyan Manthan as a provider-independent “Knowledge & Script Intelligence” stage in Cinematic Studio. Do not merge the whole Kalpgyan Manthan product or make cinematic production depend on it.

The existing Kalpgyan Manthan contract models book inputs, knowledge packs (themes, concepts, stories, source anchors), discourse plans, speaker/writing/performance styles, voice profiles, production requests/results, and QA. These concepts can strengthen source-grounded adaptations and dialogue/script preparation. They are not, by themselves, a complete cinematic storyboard, character continuity, renderer, or video-generation pipeline.

## Proposed pipeline

1. **Brief and source intake** — user brief, reference assets, source texts, rights/provenance metadata.
2. **Knowledge and research** — optional Kalpgyan Manthan adapter returns a structured knowledge pack with source anchors and uncertainty/provenance.
3. **Story and script planning** — adapt knowledge to format, duration, language, audience, and genre.
4. **Cinematic translation** — transform approved script beats into scene/shot/storyboard contracts; add visual direction, dialogue, audio DNA, character IDs, and renderer-specific fields.
5. **Continuity and policy QA** — validate identity locks, world/character continuity, source fidelity where applicable, rights, schema, duration, and required fields.
6. **Human approval** — reviewer approves the script/storyboard version before rendering.
7. **Renderer adapter** — send only a validated production package to a supported renderer.

Kalpgyan Manthan is an **optional upstream provider**, not the owner of the whole pipeline. Non-book creative projects (original stories, Retro 64, ads) must continue to work when it is disabled or has no relevant source material.

## Reuse vs. keep separate

### Reuse behind a stable adapter
- Book/source intake and structured knowledge packs.
- Themes, concepts, stories, and source anchors as optional script-planning inputs.
- Speaker/writing/performance style metadata, mapped to Cinematic Studio script and audio contracts.
- QA result pattern (passed plus reasons), adapted into a common validation report.
- Provider-independent TypeScript contracts where they can be imported without coupling runtime modules.

### Keep Cinematic Studio-owned
- Character DNA, face/body/costume locks, reference-image mapping.
- Scene/shot planning, storyboard frame contracts, dialogue-per-scene validation.
- Audio DNA for cinematic production, renderer-specific JSON, aspect ratio and duration constraints.
- Asset registry, visual-continuity approvals, production handoff, renderer integration.
- Original/ad/Retro 64 workflows that do not need book-derived knowledge.

## Proposed integration contract

Define a small adapter interface rather than importing Kalpgyan implementation details into UI code:

- analyzeSource(request) returns a KnowledgePackResult
- planScript(request, knowledgePack?) returns a ScriptPlanResult
- validateScript(request) returns a ValidationReport

Each result should include:
- status: ready, needs_review, or blocked
- source anchors/provenance where applicable
- warnings and structured validation reasons
- schema version and provider
- stable IDs for project, character, scene, and version where relevant

Do not treat extracted content as verified fact merely because it has source anchors. Keep references and generated interpretations distinguishable. Preserve a manual path if the provider is unavailable.

## Data and runtime boundaries

- First integrate as a TypeScript adapter at the application/service boundary; keep browser UI independent of provider internals.
- Do not put provider keys or a shared API token in browser code.
- The Cloudflare D1 scaffold in this PR can persist character profiles, references, and approvals, but does not yet implement Kalpgyan integration or store complete scripts/storyboards. Extend schema only after agreeing on versioned project/script/scene contracts.
- Keep existing Supabase projects untouched. No paid service is required for this architecture proposal.
- No live Cloudflare resource should be created as part of this decision document.

## Delivery plan and acceptance gates

**Gate A — contract mapping**
- Map existing Kalpgyan Manthan types to Cinematic Studio's current script/storyboard requirements.
- Identify fields that cannot be mapped; do not silently discard them.
- Add fixture examples for book adaptation, original story, and one short-form production.

**Gate B — adapter and tests**
- Add an adapter with a feature flag / optional-provider setting.
- Test successful results, provider unavailable, empty knowledge, malformed provider output, provenance retention, and validation failures.
- Prove the non-Kalpgyan fallback path still generates a valid cinematic package.

**Gate C — end-to-end validation**
- Confirm character IDs/locks and references survive the pipeline.
- Validate every required renderer field, dialogue per scene, audio DNA, frame/reference-frame, aspect ratio, and duration.
- Require human approval before a package is marked production-ready.

**Gate D — UI and persistence**
- Only after A–C pass, expose a UI option such as “Use source-grounded knowledge (Kalpgyan Manthan)” for relevant projects.
- Persist versioned knowledge/script/storyboard artifacts with provenance and approval history.
- Do not auto-send to a renderer until production-handoff tests pass.

## Risks and controls

- **Over-coupling:** isolate behind adapter and versioned contracts.
- **Weakly grounded interpretation:** retain source anchors, warnings, and reviewer approval; never imply that a citation alone proves a claim.
- **Format mismatch:** keep Kalpgyan long-form discourse duration separate from Cinematic Studio scene/short-form duration rules.
- **Provider outage or quota exhaustion:** fail gracefully to manual/original creative path; surface a clear status.
- **Identity/continuity drift:** use Cinematic Studio Character DNA and continuity validators as authoritative for visual identity.

## Decision requested

Review and approve the architecture direction before implementing the adapter. This PR currently adds the Cloudflare backend scaffold and tests; this document only proposes how Kalpgyan Manthan could contribute. It does not merge the separate module, alter production UI, or claim an end-to-end integration exists.
