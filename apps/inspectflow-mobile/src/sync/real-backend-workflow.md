# InspectFlow Real Backend E2E Workflow

## Gate
Device -> create -> sync -> verify server -> disable network -> modify -> retry -> restore -> sync -> verify local/server -> queue=0

## Backend
Supabase Edge Function: `inspectflow-sync`
Table: `public.inspectflow_sync_events`

## Acceptance criteria
1. A device-created inspection produces a queued sync operation.
2. With connectivity, the HTTP adapter returns `synced` and the server contains the operation payload.
3. With connectivity disabled, the adapter returns `retry`; local inspection remains readable and the queue item remains pending.
4. Connectivity restored causes the same operation to sync successfully.
5. The queue acknowledges/removes the operation only after `synced`.
6. Local state equals the final submitted state.
7. Server state equals the final submitted state.
8. Pending queue count is zero.
9. A duplicate operation ID is idempotent at the server boundary.
10. A 409 response is surfaced as `conflict` and is not silently discarded.

## Device test
Run with an Expo/React Native device or simulator. Toggle network connectivity using the device/simulator controls. Record timestamps and operation IDs for server verification.

## Current evidence
Backend table/migration is deployed. The actual physical-device execution requires a running Expo build and network-control environment; it is not claimed as passed by source-level tests alone.
