# KMRAL v0.1 — KALP Mobile Reusable Architecture Library

KMRAL is the reusable, offline-first mobile foundation for KALP applications targeting Android and iOS.

## Design principle
Build the platform once; assemble domain applications from reusable capabilities instead of starting from scratch.

## Current scope
- Flutter application shell
- KALP branding/theme
- Domain-pack contract
- Offline-first storage abstraction
- Inspection reference domain
- Navigation contract
- Testable separation between core and domain logic

## Planned packs
- INSPECTION
- INVENTORY
- FIELD_SERVICE
- EXPENSE
- PROPERTY

## Governance
KMRAL is a reusable library, not an application. Product-specific rules belong in `app_blueprints/` or a domain pack. Core modules must remain domain-neutral.

## Status
v0.1 — starter implementation. Production hardening, database migrations, encryption, camera integration, PDF generation and platform QA are pending.
