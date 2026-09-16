# KALP Gemini Partnership v0.1

## Purpose

KALP applications should share one governed Gemini access path instead of embedding independent Gemini API keys in each application.

## Existing AdManthan pattern

AdManthan calls two Supabase Edge Functions in the KALP Supabase project:

1. `admanthan-research` — retrieves current evidence from Google News RSS and Wikipedia.
2. `kalp-intelligence-gateway` — performs AI reasoning and selects the configured provider; Gemini is one of its providers.

The Gemini secret is therefore held server-side by the intelligence gateway rather than in the browser application.

## Market Manthan integration

Market Manthan now follows the same pattern:

`Market Manthan intent → admanthan-research → evidence pack → kalp-intelligence-gateway(provider=gemini) → MarketSignal → MTR`

The MTR runtime receives only the governed `MarketSignal` contract. It does not need direct access to the Gemini secret.

## Security boundary

- `GEMINI_API_KEY` is not required in the Market Manthan application runtime.
- `KALP_SUPABASE_PUBLISHABLE_KEY` is the client-facing credential used to invoke the authenticated Edge Functions.
- The Gemini API secret remains inside Supabase Edge Function configuration.
- The deterministic Market Manthan fixture remains available for offline tests.

## Current verification boundary

The Supabase project and both Edge Functions are active. The shared integration has been wired in the KALP repository, but a live end-to-end Gemini request from this GitHub execution environment still requires the runtime environment to provide the Supabase publishable key and network access to the Edge Functions.
