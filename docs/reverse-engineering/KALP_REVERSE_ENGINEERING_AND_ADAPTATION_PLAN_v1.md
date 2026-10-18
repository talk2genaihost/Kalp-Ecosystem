# KALP Repository Reverse Engineering & Adaptation Plan v1.0

**Repository:** `talk2genaihost/Kalp-Ecosystem`  
**Baseline branch:** `main`  
**Baseline commit inspected:** `806fe3bb73c731864d09df79c2358e800d14d79b`  
**Assessment type:** Read-only source inspection; no local build or test execution was performed for this report.  
**Status:** Evidence-based initial audit and proposed adaptation plan; not a production-readiness certification.

## 1. Executive assessment

KALP is structured as a governed AI operating substrate, with a source-governance model, a TypeScript starter kernel, cognitive swarm stages, task ledger, audit events, domain adapters, application modules, schemas, and CI workflows. The repository itself explicitly describes the architecture/governance baseline as source-grounded, the starter runtime as proof-of-concept, and production implementation as pending.

The primary adaptation opportunity is **to make the documented architecture enforceable at runtime and in CI**. Avoid replacing the existing architecture wholesale. Preserve its authority model and domain modules, then introduce explicit contracts, observable execution, deterministic validation, and bounded rollout gates.

## 2. Repository map observed

The recursive Git tree contained 331 tracked file entries at the inspected commit (tree response was not truncated).

| Area | Observed paths | Role inferred from source layout |
|---|---|---|
| Governance and architecture | `docs/governance/`, `docs/architecture/`, `REPOSITORY_MANIFEST.json` | Authority precedence, boot rules, architecture boundaries |
| Core runtime | `src/main.ts`, `src/core/kalp-core.ts`, `src/shared/types.ts` | Request model and kernel orchestration |
| Cognitive swarm | `src/swarm/` | Six named sequential cognitive stages |
| Task orchestration | `src/hive/` | Task creation and in-memory task ledger |
| Audit | `src/audit/event-store.ts` | Runtime event recording |
| Domain runtimes | `src/development-studio/`, `src/kalpgyan-manthan/`, `src/market-to-revenue/` | Domain-specific application logic and integrations |
| Application modules | `apps/cinematic-studio/`, `modules/admanthan/`, `modules/kalpgyan-manthan/` | Production/content workflows and dashboards |
| Contracts | `contracts/` | Message, source, output, production-package and domain contracts |
| Verification | `tests/`, `.github/workflows/` | Unit tests, browser smoke tests and workflow gates |
| Persistence/integrations | `supabase/`, provider-specific modules | Integration surfaces; actual deployment wiring requires separate verification |

## 3. Verified source-level findings

### 3.1 Governance and authority

- The manifest defines precedence as `LOCKED → APPROVED → CANONICAL → ACTIVE → VERSIONED → SUPPORTING → CHAT_MEMORY → INFERENCE`.
- `src/governance/authority-engine.ts` encodes the same order and exposes `outranks` and `resolveHighest`.
- The source-governance receipt explicitly says discovery/indexing/registration do not by themselves confer canonical authority and acknowledges gaps in exhaustive source registration and production implementation.

**Adaptation:** keep the precedence order as a single canonical contract; add automated tests that compare the runtime order to the manifest, test empty/conflicting inputs, and ensure evidence provenance survives adapter boundaries.

### 3.2 Starter kernel and swarm

- `src/main.ts` constructs the six swarm stages, event store, hive manager and core, then runs one hard-coded demonstration request.
- `src/swarm/orchestrator.ts` runs stages sequentially and appends a `STAGE_COMPLETED` event after each stage. The event currently records stage, authority `ACTIVE`, request ID and timestamp.
- `src/core/kalp-core.ts` creates a minimal cognitive state, runs the swarm, creates a task assigned to `result.personas[0]`, and returns the fixed outcome string `KALP kernel pipeline completed`.
- `src/hive/hive-manager.ts` stores tasks through `TaskLedger`, which is an in-memory Map with a `PENDING` task state.

**Risks to verify/fix before production:**
1. The fixed outcome wording can overstate completion: the visible kernel does not itself prove that external actions or deliverables were executed and verified.
2. Task assignment depends on `result.personas[0]`; behavior when no persona is selected should be explicit and tested.
3. Events are useful as a start, but currently lack stage input/output references, duration, error state, retry metadata and evidence/provenance references.
4. The observed entry point is a demonstration runner, not evidence of a production service/API lifecycle.
5. In-memory task state is not durable across process restarts.

### 3.3 Contracts and application boundaries

The repository includes message/source/universal-output schemas and domain contracts, while the nine-part architecture states that applications consume KALP and must not redefine it.

**Adaptation:** validate inputs and outputs at module boundaries; route all domain modules through stable contracts; isolate provider-specific payloads behind adapters; add contract tests for Astro Rashi, Market-to-Revenue, Kalpgyan Manthan, Cinematic Studio and Retro 64.

### 3.4 Application and CI surface

The inspected tree includes Astro Rashi workflows, Retro 64 production handoff/syntax workflows, Kalpgyan Manthan workflow, application code, and tests. The latest visible GitHub Actions runs on the inspected main commit included successful Retro 64 production-handoff and GitHub Pages deployment runs on 2026-10-12. These are workflow-specific results only; they do not establish that every test, domain integration, or production path passes.

## 4. Proposed KALP adaptation architecture

Use the following governed execution path for new and progressively migrated modules:

`REQUEST → CONTRACT VALIDATION → AUTHORITY RESOLUTION → CONTEXT/SMRITI → EVIDENCE GATE → PLAN → POLICY/RISK → APPROVAL → EXECUTION → OUTPUT VALIDATION → AUDIT → OUTCOME/FEEDBACK`

Rules:

1. **Authority first:** source rank, provenance, scope, version and supersession status travel with evidence.
2. **Fail closed on critical gaps:** missing mandatory fields, unresolved authority conflicts, missing approval, or unverified side effects must not be reported as successful execution.
3. **Provider neutrality:** domain services depend on KALP contracts, not directly on provider-specific response formats.
4. **Auditable stages:** every stage emits start, completion/failure, duration, correlation ID and evidence references.
5. **Explicit task lifecycle:** pending → running → succeeded/failed/cancelled, with bounded retry and recovery policy.
6. **No silent production claims:** distinguish generated, validated, approved, dispatched, externally completed and verified.
7. **Incremental migration:** existing domain modules remain operational behind adapters while their contracts and tests are strengthened.

## 5. Prioritized implementation plan

### P0 — Trust and correctness gates
- Add tests for authority precedence and manifest parity.
- Replace ambiguous generic completion wording with explicit execution status.
- Define empty-persona/no-assignee behavior.
- Add request and output contract validation.
- Ensure failed stages produce failure events and do not create false-success outcomes.

**Acceptance:** deterministic tests prove authority ordering, invalid requests are rejected, missing assignees are handled explicitly, and failures are observable.

### P1 — Runtime observability and task lifecycle
- Define a versioned stage-event schema.
- Add correlation IDs, stage durations, error categories and provenance references.
- Formalize task lifecycle, retry ceilings and recovery states.
- Keep the in-memory ledger as a local adapter, but define a persistence port before selecting a production store.

**Acceptance:** a request can be traced end-to-end; failure/retry outcomes are testable; restart durability is explicitly documented for each deployment mode.

### P2 — Provider and domain contract enforcement
- Define provider adapter interfaces and normalize errors/rate limits/timeouts.
- Add contract tests and fixtures for each domain module.
- Keep provider selection and credentials in configuration; never ship secrets to browser bundles.
- Require provenance and evidence gates for Astro Rashi output; require renderer/package validation for production storyboards.

**Acceptance:** provider substitution does not alter domain contracts; stale/demo/static data is labelled and cannot be mistaken for live evidence.

### P3 — CI quality gates and controlled rollout
- Run TypeScript build, unit tests, contract tests, browser smoke tests and security/config checks in pull requests.
- Publish a per-module maturity matrix: documented, implemented, contract-tested, integration-tested, production-verified.
- Deploy domain slices separately; avoid coupling the KALP landing page to a domain application.
- Promote a module only when its acceptance gates pass.

**Acceptance:** each release has reproducible evidence, an explicit rollback path and no unsupported production-readiness claim.

## 6. Suggested first implementation slice

Start with the kernel because its behavior governs all downstream applications:

1. Add `tests/authority-engine.test.ts` for precedence, equal ranks and empty arrays.
2. Add request/state contract validation before swarm execution.
3. Define an explicit execution result type (for example, `status`, `completedStages`, `failedStage`, `taskId`, `evidenceRefs`).
4. Ensure a missing persona cannot silently become an apparently successful assigned task.
5. Add tests that assert audit events on both success and failure.
6. Only then apply the same contracts to one pilot domain, preferably the module currently under active repair.

## 7. Non-goals and safety of change

- Do not rewrite the architecture from scratch.
- Do not mark recovered or inferred documentation as canonical without provenance review.
- Do not merge a change directly to `main` without passing the repository's relevant gates.
- Do not claim the code was built/tested in this assessment; a source inspection and workflow snapshot are not a local test run.
- Do not make destructive schema, data, provider or deployment changes as part of a documentation-only audit.

## 8. Evidence links

- Repository README: https://github.com/talk2genaihost/Kalp-Ecosystem/blob/main/README.md
- Repository manifest: https://github.com/talk2genaihost/Kalp-Ecosystem/blob/main/REPOSITORY_MANIFEST.json
- Source-governance receipt: https://github.com/talk2genaihost/Kalp-Ecosystem/blob/main/docs/source-governance/REPOSITORY_RECEIPT.md
- Nine-part architecture: https://github.com/talk2genaihost/Kalp-Ecosystem/blob/main/docs/architecture/02_NINE_PART_REFERENCE_ARCHITECTURE.md
- Module map: https://github.com/talk2genaihost/Kalp-Ecosystem/blob/main/docs/architecture/04_MODULE_MAP.md
- Kernel: https://github.com/talk2genaihost/Kalp-Ecosystem/blob/main/src/core/kalp-core.ts
- Swarm orchestrator: https://github.com/talk2genaihost/Kalp-Ecosystem/blob/main/src/swarm/orchestrator.ts
- Authority engine: https://github.com/talk2genaihost/Kalp-Ecosystem/blob/main/src/governance/authority-engine.ts
- Latest inspected Retro 64 gate: https://github.com/talk2genaihost/Kalp-Ecosystem/actions/runs/38296866021
- Latest inspected Pages deployment: https://github.com/talk2genaihost/Kalp-Ecosystem/actions/runs/38296781270

---
**Disposition:** Adopt this as the initial engineering audit and implementation backlog. The next code PR should implement P0 only, with tests, and should be reviewed before merge.
