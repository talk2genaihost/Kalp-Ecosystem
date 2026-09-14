# Market Manthan Provider Mesh v0.1

Status: IMPLEMENTED / RUNTIME CONFIG PENDING

## Initial ₹0 provider mesh

- MM-PROV-ALPHA-001 — Alpha Vantage — market data
- MM-PROV-FINNHUB-001 — Finnhub — market/company data
- MM-PROV-GDELT-001 — GDELT — news/event intelligence
- MM-PROV-GEMINI-001 — Google Gemini Free Tier — AI intelligence

## Boundary

Provider → PAF → normalized result → evidence/provenance → Manthan/Fusion → governed Market Signal → MTR.

No provider connects directly to MTR.

## Fixture policy

MM-PAF-FIXTURE remains available only for deterministic replay, regression and fallback testing. It is not the primary evidence provider.

## Security

Provider API keys must remain server-side. GitHub Pages/static UI must never contain provider secrets. The runtime gateway is responsible for credentials, quotas, retries and provider health.

## Gemini Free Tier boundary

Use only for public/non-sensitive intelligence during the ₹0 phase. Google documents that Free Tier content is used to improve Google products; production confidential data therefore requires a different Gemini usage tier or another governed provider.

## Next gate

Configure a secure runtime gateway, inject provider credentials, execute provider health checks, normalize live evidence, and only then switch the dashboard from `MESH READY · RUNTIME CONFIG PENDING` to a live-provider runtime state.
