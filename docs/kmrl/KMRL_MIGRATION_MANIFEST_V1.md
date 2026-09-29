# KMRL Migration Manifest v1

Status: M4.1A — READY FOR CONTROLLED IMPORT

## Source

- Repository: `talk2genaihost/Kalp`
- Branch: `feat/kmrl-v1-integration`
- Source tree commit: `7fb6d3f51322ca05c186aea3d10ea387592ebe19`

## Target

- Repository: `talk2genaihost/Kalp-Ecosystem`
- Branch: `feature/kmrl-migration-v1`
- Base: existing KMRAL implementation branch

## Import policy

- Preserve the KMRL directory structure.
- Keep `src/kmral/**` unchanged.
- Do not overwrite existing KALP-Ecosystem package/configuration files.
- Merge package/build configuration only when required by the migrated KMRL source.
- Keep the source branch in `Kalp` as the rollback/reference source until all migration gates pass.

## Source → target mapping

### KMRL source boundary — COPY

- `src/kmrl/**` → `src/kmrl/**`
- `apps/kmrl-sandbox/**` → `apps/kmrl-sandbox/**`
- `supabase/functions/kmrl-sync/**` → `supabase/functions/kmrl-sync/**`
- `supabase/migrations/20260928000100_kmrl_remote_sync.sql` → same target path
- `supabase/migrations/20260928000200_kmrl_revision_alignment.sql` → same target path

### KMRL CI — ADAPT

- `.github/workflows/kmrl-v1-gate.yml` → `.github/workflows/kmrl-v1-gate.yml`
- `.github/workflows/kmrl-remote-integration.yml` → `.github/workflows/kmrl-remote-integration.yml`

Workflow commands must be reconciled with the target repository's existing build/test conventions before enabling them as authoritative gates.

### KMRL documentation — COPY/REBASE

- `docs/kmrl/**` → `docs/kmrl/**`

Existing target documentation with the same purpose must be reviewed before replacement.

### Shared configuration — MERGE, NEVER BLIND COPY

- `package.json`
- `tsconfig.json`
- any root-level build/test configuration referenced by KMRL

Target configuration is authoritative for the ecosystem repository. KMRL requirements must be incorporated without removing existing ecosystem scripts or dependencies.

### Existing KMRAL — KEEP

- `src/kmral/**`

No KMRL source is to be placed inside `src/kmral/**`.

### Non-KMRL Kalp source — KEEP OUT

Do not migrate unrelated source from:

- `src/core/**`
- `src/governance/**`
- `src/hive/**`
- `src/swarm/**`
- `src/persona/**`
- unrelated `modules/**`
- unrelated `apps/**`

unless a later dependency audit proves a specific shared dependency is required.

## Verification gates after import

1. M4.2 — import/dependency repair
2. M4.3 — TypeScript build
3. M4.4 — KMRL test suite
4. M4.5 — MainSandbox validation
5. Remote Supabase integration validation

## Cutover rule

`Kalp-Ecosystem` does not become the canonical KMRL home until the migrated branch passes the complete migration/build/test/integration gates.

Source branch `Kalp/feat/kmrl-v1-integration` remains the rollback reference until cutover is explicitly approved.
