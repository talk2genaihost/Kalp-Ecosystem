# Manthan/Fusion Functional Processing Contract v0.1

**Contract ID:** `MTR-MF-FUNCTIONAL-001`  
**Version:** `v0.1`  
**Status:** DERIVED / GOVERNED IMPLEMENTATION CONTRACT — NOT CANONICAL  
**Scope:** 5F-5E downstream Manthan/Fusion functional execution  
**Boundary:** `MTR-MF-BOUNDARY-001`  
**Upstream adapter:** `MM-PAF-v0.1`

## 1. Purpose

Define the first governed functional-processing boundary after secure Market Manthan evidence intake. The runtime may transform validated evidence into structured intelligence objects, but it must not fabricate evidence, commercial outcomes, attribution, or learning state.

## 2. Processing Pipeline

```text
VALIDATED EVIDENCE
      -> SIGNAL FUSION
      -> OPPORTUNITY DECISION
      -> ACTION RECOMMENDATION
      -> OUTCOME INTAKE
      -> ATTRIBUTION
      -> LEARNING CANDIDATE
```

Only stages supported by the supplied evidence or an explicitly supplied downstream event may produce an object. Absence of evidence results in `NOT_ESTABLISHED`, not an invented value.

## 3. Processing States

| State | Meaning |
|---|---|
| `ACCEPTED` | Envelope passed authentication and schema validation. |
| `PROCESSING` | Functional processing has started. |
| `PROCESSED` | One or more governed functional objects were produced and validated. |
| `PARTIAL` | Some requested processing completed while another stage lacked sufficient evidence. |
| `REJECTED` | Input or generated object failed a governed validation rule. |
| `FAILED` | Runtime execution failed without a valid functional result. |

`ACCEPTED` alone does **not** mean functional processing occurred.

## 4. Evidence and Provenance Rules

Every functional object must preserve:

- `source_envelope_id`
- `source_provider_ids`
- `observed_at`
- `adapter_version`
- `processing_contract`
- `generated_at`
- `evidence_basis`
- `confidence`

AI-derived fields must be explicitly marked as AI-derived. Deterministic fields must remain deterministic.

## 5. Signal Fusion Object

Minimum schema:

```json
{
  "signal_id": "MTR-SIG-*",
  "signal_summary": "string",
  "market": "string",
  "category": "string",
  "trend": "RISING|STABLE|FALLING|MIXED|UNKNOWN",
  "confidence": 0.0,
  "evidence": [],
  "source_envelope_id": "MTR-EVID-*",
  "source_provider_ids": []
}
```

Rules:
- Signal claims must be traceable to provider evidence.
- Confidence is bounded to `0.0–1.0`.
- Contradictory evidence must remain represented; it must not be silently averaged away.

## 6. Opportunity Object

Minimum schema:

```json
{
  "opportunity_id": "MTR-OPP-*",
  "signal_id": "MTR-SIG-*",
  "description": "string",
  "target_segment": "string",
  "market": "string",
  "score": 0,
  "confidence": 0.0,
  "decision": "ACCEPT|REVIEW|REJECT",
  "evidence_basis": []
}
```

Rules:
- `score` is a governed decision score, not a fabricated financial forecast.
- `ACCEPT` requires sufficient evidence under the runtime validation policy.
- `REVIEW` is preferred when evidence is materially incomplete or conflicting.
- No opportunity may be treated as realized revenue.

## 7. Action / Recommendation Object

Minimum schema:

```json
{
  "action_id": "MTR-ACT-*",
  "opportunity_id": "MTR-OPP-*",
  "action_type": "string",
  "recommendation": "string",
  "channel": "string",
  "rationale": "string",
  "confidence": 0.0
}
```

Recommendations are decisions or proposals, not evidence that the action occurred.

## 8. Campaign Object

Where an action is explicitly campaign-oriented:

```json
{
  "campaign_id": "MTR-CAMP-*",
  "action_id": "MTR-ACT-*",
  "name": "string",
  "channel": "string",
  "status": "RECOMMENDED|PLANNED|EXECUTED|UNKNOWN"
}
```

`EXECUTED` requires an externally supplied execution event or trusted runtime evidence. AI generation alone cannot establish execution.

## 9. Commercial Outcome Object

Revenue/conversion is event-derived, not model-invented.

```json
{
  "conversion_id": "MTR-CONV-*",
  "campaign_id": "MTR-CAMP-*",
  "status": "OBSERVED|NOT_ESTABLISHED",
  "value": 0,
  "currency": "INR",
  "observed_at": "date-time",
  "evidence_basis": []
}
```

Revenue object:

```json
{
  "revenue_id": "MTR-REV-*",
  "conversion_id": "MTR-CONV-*",
  "gross_value": 0,
  "currency": "INR",
  "status": "OBSERVED|NOT_ESTABLISHED",
  "evidence_basis": []
}
```

If no trusted commercial event exists, the runtime must return `NOT_ESTABLISHED` rather than `0` as an inferred outcome.

## 10. Attribution Object

```json
{
  "attribution_id": "MTR-ATTR-*",
  "revenue_id": "MTR-REV-*",
  "campaign_id": "MTR-CAMP-*",
  "method": "string",
  "allocation": [],
  "confidence": 0.0,
  "deterministic": true
}
```

Attribution must only execute when the required upstream and outcome identifiers exist. No attribution is created for hypothetical revenue.

## 11. Learning Candidate

```json
{
  "memory_id": "MEM-*",
  "pattern": "string",
  "source_objects": [],
  "confidence": 0.0,
  "status": "CANDIDATE",
  "promoted": false
}
```

A learning candidate is not automatically promoted into persistent memory. Promotion requires a separate governed memory lifecycle.

## 12. Gemini Processing Boundary

Gemini is an intelligence component, not the system of record.

Gemini may:
- synthesize provider evidence;
- classify signals;
- propose opportunity interpretations;
- recommend actions;
- produce structured candidate objects.

Gemini may not:
- invent provider evidence;
- invent executions;
- invent conversions;
- invent revenue;
- silently resolve contradictory provider evidence;
- promote learning into persistent memory.

The implementation should use structured JSON output where appropriate and validate the returned object in application code before accepting it. Google documents structured output as schema-constrained JSON, while also noting that syntactic validity does not guarantee semantic correctness. citeturn0search0turn0search1

## 13. Deterministic Validation Gate

Before an object reaches `PROCESSED`, validate:

1. required identifiers;
2. source-envelope linkage;
3. provider provenance;
4. confidence range;
5. enum values;
6. numerical bounds;
7. upstream/downstream relationship integrity;
8. evidence existence for factual claims;
9. commercial-event evidence for conversion/revenue;
10. idempotency/replay consistency.

Semantic validation failure produces `REJECTED` or `PARTIAL`; it must not be silently repaired by the model.

## 14. Contradiction Policy

If providers materially disagree:

- preserve provider-level evidence;
- mark the fused signal `MIXED` or `REVIEW` where appropriate;
- lower or bound confidence according to validation policy;
- do not fabricate consensus;
- do not discard contradictory evidence without an explicit rule.

## 15. Idempotency

Processing must remain idempotent for the same `idempotency-key` / source envelope. Replays must return the existing processing receipt rather than create duplicate commercial objects.

## 16. Functional Result Envelope

Successful functional processing should return:

```json
{
  "status": "PROCESSED|PARTIAL",
  "contract": "MTR-MF-FUNCTIONAL-001",
  "version": "v0.1",
  "runtime": "manthan-fusion-runtime",
  "source_envelope_id": "MTR-EVID-*",
  "objects": {
    "signal": null,
    "opportunity": null,
    "action": null,
    "campaign": null,
    "conversion": null,
    "revenue": null,
    "attribution": null,
    "learning_candidate": null
  },
  "processing": {
    "state": "PROCESSED|PARTIAL",
    "ai_used": true,
    "validation": "PASS|PARTIAL|FAIL"
  }
}
```

Null means the stage was not established, not that the stage produced a zero-valued result.

## 17. Scope Boundary for v0.1

This contract does **not** authorize:

- autonomous campaign execution;
- payment processing;
- CRM mutation;
- external customer communication;
- automatic persistent-memory promotion;
- financial forecasting presented as realized revenue;
- replacement of higher-authority KALP governance sources.

## 18. Governance Classification

This artifact is a **DERIVED / GOVERNED IMPLEMENTATION CONTRACT** created for 5F-5E.1 from the existing MTR runtime boundary, observed MTR pipeline semantics, and explicit non-fabrication requirements. It is not claimed to be canonical KALP architecture.

Before production promotion, this contract should be registered through the governed source-registration process if it is intended to become a persistent governed source.

## 19. 5F-5E.1 Receipt

**FUNCTIONAL CONTRACT:** CREATED  
**CONTRACT ID:** `MTR-MF-FUNCTIONAL-001`  
**VERSION:** `v0.1`  
**AUTHORITY:** DERIVED / GOVERNED — NOT CANONICAL  
**SECURE BOUNDARY DEPENDENCY:** `MTR-MF-BOUNDARY-001`  
**COMMERCIAL FABRICATION:** PROHIBITED  
**PROVENANCE:** REQUIRED  
**IDEMPOTENCY:** REQUIRED  
**GEMINI ROLE:** INTELLIGENCE / CANDIDATE GENERATION, NOT SYSTEM OF RECORD  
**NEXT STEP:** Implement 5F-5E.2 functional processing behind the existing secure intake boundary.
