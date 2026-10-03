import test from "node:test";
import assert from "node:assert/strict";
import { renderMainSandbox } from "./main-sandbox-renderer.js";
import { quantity } from "../simulation/v1-a/quantity.js";

const science = { timeS: quantity(0.4, "s"), physics: { positionM: quantity(0.2, "m"), velocityMps: quantity(1, "m/s"), accelerationMps2: quantity(0, "m/s2"), massKg: quantity(1, "kg") }, materials: [], temperature: quantity(25, "degC") };

test("MainSandbox renderer exposes runtime state and command controls", () => { const html = renderMainSandbox({ experimentId: "UI-001", status: "RUNNING", tick: 4, science, measurements: [], pendingMutations: 2, syncState: "OFFLINE" }); assert.match(html, /Main Sandbox/); assert.match(html, /data-action="step"/); assert.match(html, /2 pending/); assert.match(html, /OFFLINE/); assert.match(html, /0\.2 m/); });

test("MainSandbox renderer presents sync conflict and explicit resolution choices", () => { const html = renderMainSandbox({ experimentId: "UI-002", status: "PAUSED", tick: 8, science: { ...science, temperature: quantity(30, "degC") }, measurements: [], pendingMutations: 1, syncState: "CONFLICT", syncConflict: { conflictId: "UI-002:m-1", remoteRevision: 9, reason: "REMOTE_REVISION_AHEAD" } }); assert.match(html, /Sync conflict/); assert.match(html, /remote revision 9/i); assert.match(html, /data-action="resolve-remote"/); assert.match(html, /data-action="resolve-local"/); assert.match(html, /Keep remote/); assert.match(html, /Keep local/); });

test("MainSandbox renderer exposes experiment library navigation", () => { const html = renderMainSandbox({ experimentId: "UI-003", status: "CREATED", tick: 0, science, measurements: [], pendingMutations: 0, syncState: "ONLINE" }); assert.match(html, /data-action="open-library"/); assert.match(html, /Experiment Library/); });

test("MainSandbox renderer presents the current guided experiment step", () => { const html = renderMainSandbox({ experimentId: "UI-004", status: "CREATED", tick: 0, science, measurements: [], pendingMutations: 0, syncState: "ONLINE", guided: { title: "Constant Force: Observe Motion", objective: "Observe motion.", currentStep: { id: "observe", title: "Observe the starting motion", instruction: "Record initial position and velocity." }, completed: 0, total: 4 } }); assert.match(html, /Guided Experiment/); assert.match(html, /Observe the starting motion/); assert.match(html, /data-action="complete-guided-step"/); assert.match(html, /0 \/ 4/); });
