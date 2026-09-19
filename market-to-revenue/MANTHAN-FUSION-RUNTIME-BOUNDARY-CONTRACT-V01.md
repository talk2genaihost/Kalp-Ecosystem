# KALP Market-to-Revenue — Manthan/Fusion Runtime Boundary Contract v0.1

**Status:** DERIVED / GOVERNED IMPLEMENTATION ARTIFACT — NOT CANONICAL
**Scope:** Market Manthan → Manthan/Fusion downstream runtime boundary
**Source basis:** Existing Market-to-Revenue runtime gateway specification and validated live provider mesh
**Authority:** Derived from retrieved implementation evidence; requires explicit governance registration before canonical promotion

## 1. Purpose

Define the minimum, explicit contract required to connect the authenticated Market-to-Revenue runtime gateway to a real Manthan/Fusion runtime without inventing an endpoint, silently changing business semantics, or promoting an inferred runtime into canonical status.

## 2. Current source-backed boundary

```text
Client / MTR UI
    ↓
authenticated runtime gateway
    ↓
PAF provider mesh
    ↓
normalized live evidence
    ↓
Manthan/Fusion sink
```

The existing runtime specification explicitly identifies the Manthan/Fusion HTTP sink as an adapter boundary while stating that the actual Manthan/Fusion runtime endpoint is not yet configured.

## 3. Boundary ownership

### Upstream — Market Manthan Runtime Gateway

Responsibilities:
- authenticate the caller;
- validate request shape and body limits;
- invoke the provider adapter mesh;
- normalize provider results;
- exclude deterministic fixture evidence from production evidence;
- preserve provider status and provenance;
- construct an auditable evidence envelope;
- submit the envelope to the configured downstream sink.

### Downstream — Manthan/Fusion Runtime

Responsibilities to be established by the implementation:
- authenticate the gateway;
- accept the evidence envelope;
- validate envelope schema and provenance;
- acknowledge acceptance or reject with an explicit machine-readable reason;
- preserve upstream identifiers;
- transform accepted evidence into the next governed intelligence object;
- expose processing state and failure state without falsely acknowledging business completion.

No downstream business behavior beyond this boundary is declared canonical by this artifact.

## 4. Required endpoint contract

The downstream runtime MUST provide an endpoint equivalent to:

`POST <MANTHAN_FUSION_BASE_URL>/<evidence-ingest-path>`

The concrete URL/path is intentionally **UNRESOLVED** until an actual runtime is discovered or explicitly provisioned.

Required gateway configuration:

- `MTR_MANTHAN_FUSION_ENDPOINT` — concrete downstream HTTPS endpoint
- `MTR_MANTHAN_FUSION_TOKEN` — optional/required authentication credential according to the downstream runtime contract

The gateway MUST NOT ship with a fabricated endpoint or token.

## 5. Evidence envelope contract

The gateway-produced envelope MUST contain at minimum:

```json
{
  "envelope_id": "MTR-EVID-<uuid>",
  "observed_at": "<ISO-8601 timestamp>",
  "source": "KALP-MTR-RUNTIME-GATEWAY",
  "adapter_version": "MM-PAF-v0.1",
  "request": {
    "intent": "<original market intent>",
    "symbol": "<optional>",
    "query": "<normalized query>"
  },
  "providers": [
    {
      "provider_id": "<provider id>",
      "provider_name": "<provider name>",
      "role": "market-data | news-intelligence | ai-intelligence",
      "status": "ok",
      "observed_at": "<ISO-8601 timestamp>",
      "data": "<provider result>"
    }
  ]
}
```

Provider credentials MUST never appear in the envelope, request metadata, logs, or public/static client payloads.

## 6. Acceptance semantics

The downstream runtime MUST distinguish transport acceptance from business processing.

Recommended response classes:

### ACCEPTED

```json
{
  "status": "ACCEPTED",
  "envelope_id": "MTR-EVID-...",
  "runtime_receipt_id": "..."
}
```

Means the runtime has accepted the envelope for processing. It does NOT mean an opportunity, action, campaign, revenue event, or learning record has been created.

### REJECTED

```json
{
  "status": "REJECTED",
  "envelope_id": "MTR-EVID-...",
  "reason_code": "...",
  "message": "..."
}
```

### PROCESSING

If asynchronous processing is used:

```json
{
  "status": "PROCESSING",
  "envelope_id": "MTR-EVID-...",
  "runtime_receipt_id": "..."
}
```

### FAILED

```json
{
  "status": "FAILED",
  "envelope_id": "MTR-EVID-...",
  "reason_code": "...",
  "message": "..."
}
```

## 7. Provenance invariants

The downstream runtime MUST preserve the originating `envelope_id` and upstream provider identifiers.

No downstream transformation may:
- erase provider provenance;
- replace an upstream identifier without retaining lineage;
- convert provider failure into successful evidence;
- treat the deterministic fixture as live evidence;
- claim revenue attribution merely from evidence ingestion.

## 8. Idempotency

The downstream boundary SHOULD treat `envelope_id` as an idempotency key.

Repeated delivery of the same envelope MUST NOT silently create duplicate business events.

If an idempotency mechanism is unavailable, that limitation MUST be explicitly recorded before production authorization.

## 9. Authentication and transport security

The connection MUST use HTTPS.

The gateway credential MUST remain server-side. Secrets are not committed to Git and must be supplied through the runtime secret mechanism.

The current gateway already follows this server-side credential boundary. Supabase supports production Edge Function secrets through Dashboard or CLI and exposes them to the function runtime without requiring redeployment after secret updates.

## 10. Failure semantics

The boundary MUST preserve explicit classes for:

- unauthorized
- forbidden
- rate limited
- timeout
- downstream unavailable
- malformed envelope
- schema/version mismatch
- duplicate/idempotency conflict
- internal processing failure

The gateway MUST NOT convert downstream failure into `ACCEPTED`.

## 11. Versioning

Initial contract identifiers:

- Boundary Contract: `MTR-MF-BOUNDARY-001`
- Contract Version: `v0.1`
- Envelope Family: `MTR-EVID-*`
- Provider Adapter Version: `MM-PAF-v0.1`

Schema evolution MUST be explicit. Breaking changes require a new contract version or an explicitly governed compatibility mechanism.

## 12. Production gate

The Market Manthan public/live-provider cutover MUST remain blocked until all of the following are true:

1. actual Manthan/Fusion runtime exists or is explicitly provisioned;
2. concrete HTTPS endpoint is verified;
3. authentication mechanism is verified;
4. intake schema is implemented and tested;
5. envelope acceptance is verified end-to-end;
6. provenance is preserved;
7. idempotency behavior is verified or explicitly governed;
8. downstream failures are observable and non-successful;
9. runtime secrets are configured securely;
10. end-to-end MTR replay passes without deterministic fixture evidence.

## 13. Explicit unresolved state

This artifact does NOT establish:

- a concrete Manthan/Fusion URL;
- a canonical Manthan/Fusion implementation;
- a canonical opportunity schema;
- a canonical action schema;
- a canonical campaign schema;
- a canonical revenue schema;
- a canonical attribution algorithm;
- a canonical learning-memory schema.

Those require their own authoritative sources or explicit governed implementation decisions.

## 14. Governance classification

**Source state:** DERIVED
**Implementation state:** GOVERNED DESIGN ARTIFACT
**Canonical status:** NOT PROMOTED
**Registration status:** PENDING
**Runtime status:** DOWNSTREAM RUNTIME NOT YET CONNECTED

This contract exists to make the missing boundary explicit and implementable without pretending that the downstream runtime already exists.
