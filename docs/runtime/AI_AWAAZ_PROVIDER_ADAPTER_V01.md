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

### Next gate

**AWAAZ-03 — Controlled Provider Connectivity Test**

AWAAZ-03 starts only after the official API contract and credentials are available.
