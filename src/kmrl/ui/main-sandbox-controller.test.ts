import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryOfflineQueue } from "../contracts/offline.js";
import type { ExperimentSnapshot } from "../runtime/types.js";
import type { SyncHardeningReport } from "../sync/sync-hardening.js";
import type { ConflictResolutionReport } from "../sync/conflict-resolution.js";
import { MainSandboxController } from "./main-sandbox-controller.js";

const state: ExperimentSnapshot = { experimentId: "UI-SYNC-001", status: "PAUSED", tick: 2, revision: 2, science: {} as ExperimentSnapshot["science"], checkpoints: [], measurements: [] };
const runtime = { getState: () => structuredClone(state), dispatch: () => structuredClone(state) } as never;
const report = (stateName: SyncHardeningReport["state"]): SyncHardeningReport => ({ experimentId: state.experimentId, state: stateName, attempts: 2, pendingMutations: 1, conflict: stateName === "CONFLICT" ? { conflictId: "c-1", experimentId: state.experimentId, local: { mutationId: "m-1", experimentId: state.experimentId, command: { type: "PAUSE" }, baseRevision: 1 }, remoteRevision: 3, reason: "REMOTE_REVISION_AHEAD" } : undefined });
const resolution = (choice: "KEEP_LOCAL" | "KEEP_REMOTE"): ConflictResolutionReport => ({ experimentId: state.experimentId, resolution: choice, state: "ONLINE", snapshot: { ...state, revision: choice === "KEEP_LOCAL" ? 4 : 3 } });

test("MainSandbox controller surfaces hardened sync conflict state", async () => { const offline = new InMemoryOfflineQueue(); offline.enqueue({ mutationId: "m-1", experimentId: state.experimentId, command: { type: "PAUSE" }, baseRevision: 1 }); const controller = new MainSandboxController(runtime, offline, { sync: async () => report("CONFLICT") }); const view = await controller.sync(); assert.equal(view.syncState, "CONFLICT"); assert.equal(view.pendingMutations, 1); assert.equal(view.syncConflict?.remoteRevision, 3); assert.equal(view.syncAttempts, 2); });

test("MainSandbox controller keeps durable queue visible after offline sync failure", async () => { const offline = new InMemoryOfflineQueue(); offline.enqueue({ mutationId: "m-2", experimentId: state.experimentId, command: { type: "PAUSE" }, baseRevision: 1 }); const controller = new MainSandboxController(runtime, offline, { sync: async () => report("OFFLINE") }); const view = await controller.sync(); assert.equal(view.syncState, "OFFLINE"); assert.equal(view.pendingMutations, 1); });

test("MainSandbox controller resolves a conflict explicitly and returns ONLINE", async () => { const offline = new InMemoryOfflineQueue(); offline.enqueue({ mutationId: "m-3", experimentId: state.experimentId, command: { type: "PAUSE" }, baseRevision: 2 }); let chosen: string | undefined; const controller = new MainSandboxController(runtime, offline, { sync: async () => report("CONFLICT"), resolveConflict: async (_id, choice) => { chosen = choice; return resolution(choice); } }); await controller.sync(); const view = await controller.resolveConflict("KEEP_REMOTE"); assert.equal(chosen, "KEEP_REMOTE"); assert.equal(view.syncState, "ONLINE"); assert.equal(view.syncConflict, undefined); });
