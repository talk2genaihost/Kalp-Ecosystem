# KALP AI Awaaz Provider Adapter v0.1

## AWAAZ-02 — API Contract Validation

Validation date: 2026-09-19

### Evidence reviewed

The official AI Awaaz public site documents:
- text-to-speech generation
- 20+ Indian languages
- 140+/150+ voices
- emotion-based / neural-emotion TTS
- voice clone functionality
- MP3 output for creator workflows

Official source: https://aiawaaz.io/

### Validation result

**AWAAZ-02 = BLOCKED / NOT YET VALIDATED**

A public, first-party REST API contract could not be established from the official public surface reviewed. The following remain unverified:

1. official API base URL
2. authentication/header contract
3. TTS endpoint and HTTP method
4. request JSON schema
5. voice/model identifier schema
6. language identifier schema
7. emotion/style parameter schema
8. pitch/speed parameter schema
9. binary/base64 response contract
10. rate limits and error schema
11. programmatic/commercial API entitlement
12. voice-cloning API authorization and retention terms

### KALP implementation decision

The provider adapter remains registered as:

- Provider ID: KALP-VOICE-AWAAZ-001
- Integration state: discovered
- Execution state: gated
- Canonical output: KALP VoiceAsset / MP3

No undocumented endpoint has been hard-coded and no browser/UI workflow is being masqueraded as an API integration.

### Pass condition

AWAAZ-02 becomes PASS only after official AI Awaaz developer/API documentation or a provider-issued API contract and credential set is available.

The controlled test must produce real audio and normalize it into the existing KALP VoiceAsset contract without downstream changes.

## AWAAZ-03 — Controlled Provider Connectivity Test

**Status: BLOCKED / NO LIVE CONNECTIVITY CLAIM**

A live provider connectivity test cannot be executed safely yet because the official AI Awaaz REST/API endpoint, request contract, and credentials have not been validated. The official public site currently documents the product capabilities and browser/app workflow, but does not establish the first-party API contract required for a production HTTP adapter. citeturn0search2

### AWAAZ-03 preflight implemented

The KALP runtime now prevents an AI Awaaz provider selection from falling through to the existing Google TTS implementation. This closes the provider-provenance defect identified during PR review.

Guard condition:

`voice.provider === KALP-VOICE-AWAAZ-001`

Result:

- production is blocked
- no Google TTS request is made
- no AI Awaaz provenance is falsely attached to Google-generated audio
- the block explicitly references AWAAZ-02 and AWAAZ-03
- an automated regression test covers the fallback path

### Live connectivity pass criteria

AWAAZ-03 can become PASS only when all of the following are available:

1. first-party API base URL
2. authenticated credential supplied through runtime secret configuration
3. documented TTS HTTP method and endpoint
4. documented request schema
5. documented voice/language identifiers
6. documented output format/response contract
7. controlled Hindi test request
8. returned audio validated as MP3/audio-mpeg
9. output normalized into the canonical KALP VoiceAsset
10. provider provenance and latency captured
11. provider errors mapped without fallback to another provider
12. credential is never persisted in source control, logs, artifacts, or test fixtures

### Current gate state

**AWAAZ-03 = BLOCKED_PENDING_PROVIDER_API_ACCESS**

No fake endpoint, browser automation, or undocumented network call is being used to manufacture a PASS.

### Next action

Obtain the official AI Awaaz API/developer contract and a test credential. Then implement the real controlled request behind the existing adapter boundary and execute AWAAZ-03 against the provider.
