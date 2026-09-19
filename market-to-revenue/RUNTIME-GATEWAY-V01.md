# KALP Market-to-Revenue — Secure Runtime Gateway v0.1

## Boundary

`Client / MTR UI -> authenticated runtime gateway -> PAF provider mesh -> normalized evidence -> Manthan/Fusion sink`

The gateway is the credential-holding boundary. Public/static surfaces must never receive provider API keys.

## Runtime secrets

Required server-side environment variables:

- `KALP_MTR_GATEWAY_TOKEN`
- `ALPHA_VANTAGE_API_KEY`
- `FINNHUB_API_KEY`
- `GEMINI_API_KEY`
- optional `GEMINI_MODEL`
- optional `KALP_MTR_GATEWAY_PORT`
- optional `KALP_MTR_MAX_BODY_BYTES`

Credentials are read from the runtime environment only. They are not committed to the repository.

## Endpoint

`POST /v1/evidence/ingest`

Authorization:

`Authorization: Bearer <KALP_MTR_GATEWAY_TOKEN>`

The gateway invokes the PAF provider mesh, removes the deterministic fixture from production evidence, creates an auditable evidence envelope, and forwards that envelope to the configured Manthan/Fusion sink.

## Safety gates

1. Missing/invalid gateway token -> `401`.
2. Oversized request body -> `413`.
3. Fixture evidence is excluded from the Manthan/Fusion production envelope.
4. Provider credentials remain server-side.
5. Provider failures remain represented by normalized provider status rather than being silently converted into successful evidence.
6. MTR must not be switched to live-provider mode until the Manthan/Fusion sink is connected and runtime secrets are configured.

## Current implementation state

- Gateway boundary: IMPLEMENTED.
- Credential loading: IMPLEMENTED.
- Authentication: IMPLEMENTED.
- PAF invocation: IMPLEMENTED.
- Fixture exclusion: IMPLEMENTED.
- Manthan/Fusion HTTP sink: IMPLEMENTED as an explicit adapter boundary.
- Actual Manthan/Fusion runtime endpoint: NOT YET CONFIGURED.
- Production secrets: NOT YET CONFIGURED.
- Public dashboard cutover: NOT YET AUTHORIZED.
