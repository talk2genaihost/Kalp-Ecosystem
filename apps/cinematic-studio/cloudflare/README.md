# KALP Cinematic Studio — Cloudflare Free-Tier Backend

This folder is an **isolated backend scaffold**, not a live deployment. It does not change the current Cinematic Studio API or the existing Supabase projects.

## What it stores

- Character profiles and their current status
- Immutable profile-version snapshots (initial snapshot support in this scaffold)
- Research reference URLs, notes, and verification state
- Human approval decisions linked to a specific profile version

## Free-tier target

Cloudflare's published Workers Free limits include up to 100,000 Worker requests/day. D1's Free limits include 5 million rows read/day, 100,000 rows written/day, and 5 GB total storage across the account; the Free plan currently allows up to 10 D1 databases, with 500 MB maximum per database. These limits can change; confirm the live Cloudflare dashboard before deployment. When daily D1 read/write limits are exceeded, D1 queries can fail until reset. See:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/d1/platform/limits/

## Deploy only after these gates

1. Confirm the correct Cloudflare account and that the account is on Workers Free.
2. Create a **new dedicated D1 database** named `kalp-cinematic-studio`; do not reuse another project's database.
3. Copy `wrangler.toml.example` to `wrangler.toml`, fill the actual database ID and exact allowed Studio origin.
4. Apply `schema.sql` to that dedicated database (or move it into the configured migrations directory).
5. Set a strong API secret with `wrangler secret put KALP_API_TOKEN`. Never expose this token in browser code or commit it to Git.
6. Deploy the Worker, then smoke-test `GET /health` and token-protected API routes.
7. Only then connect the Studio UI through a server-side adapter. Keep the existing API as the fallback until read/write and continuity tests pass.

## Current API scaffold

- `GET /health`: public health check; returns no data.
- `GET /api/characters?limit=50`: list profiles (requires Bearer token).
- `POST /api/characters`: create a profile and initial version (requires Bearer token).
- `GET /api/characters/:id`: retrieve a profile, version metadata, research references, and approvals (requires Bearer token).
- `POST /api/characters/:id/references`: save a research reference as unverified (requires Bearer token).
- `POST /api/characters/:id/approvals`: record a human decision for a version (requires Bearer token).

This scaffold intentionally does not scrape websites, auto-approve characters, store image/video assets, or change the production Studio UI. A browser client must not contain the API token; add a same-origin server-side proxy or authenticated session layer before wiring it into a public frontend. Approval and version-write behavior requires further tests before production use.

## Security notes

- Data endpoints fail closed unless `KALP_API_TOKEN` is configured.
- Request bodies are capped at 256 KB; JSON fields are validated.
- Keep the database dedicated to this project.
- Do not put API secrets in GitHub Actions logs, frontend JavaScript, or committed Wrangler files.
- This API token is a starter gate, not a complete multi-user identity/authorization system.
