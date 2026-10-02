# MOBILE-02B-FRESH Validation Gate

Purpose: trigger a fresh mobile-specific CI validation of the current KMRAL/KMRL mobile runtime.

Scope:
- KMRAL library build and tests
- KMRL build
- KMRAL mobile web build
- browser persistence/offline/recovery composition test
- Android native runtime smoke test
- iOS native runtime build/install/launch validation

This file is a validation trigger only. No runtime behavior is changed by this commit.

Entry condition for MOBILE-02C:
- fresh mobile CI evidence must be reviewed
- failures must be classified before proceeding
- MOBILE-02C must not be treated as started until the MOBILE-02B-FRESH gate is resolved.
