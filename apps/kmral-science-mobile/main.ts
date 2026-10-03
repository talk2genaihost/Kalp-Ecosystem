import { LocalStorageKMRALKeyValueStore, LocalStorageKMRALStateStore } from "../../src/kmral/data.js";
import { LocalStorageKMRALMutationQueue } from "../../src/kmral/offline.js";
import { UnifiedScienceKernel } from "../../src/kmrl/contracts/science.js";
import { scienceTick } from "../../src/kmrl/simulation/v1-d/science/index.js";
import { ExperimentRuntime } from "../../src/kmrl/runtime/experiment-runtime.js";
import { getExperiment } from "../../src/kmrl/learning/experiment-library.js";
import { createScienceSandboxApp } from "../../src/kmrl/app/science-sandbox-app.js";
import {
  KMRALExperimentOfflineQueueAdapter,
  KMRALExperimentRepositoryAdapter,
} from "../../src/kmrl/app/kmral-persistence-adapters.js";
import { KMRALUIController } from "../../src/kmral/ui.js";
import type { ExperimentSnapshot } from "../../src/kmrl/runtime/types.js";
import type { OfflineMutation } from "../../src/kmrl/contracts/offline.js";
import "./styles.css";

const experiment = getExperiment("physics-constant-force");
const durableStore = new LocalStorageKMRALKeyValueStore();
const snapshotStore = new LocalStorageKMRALStateStore<ExperimentSnapshot, string>(
  durableStore,
  "kmral:science:state:",
);
const mutationQueue = new LocalStorageKMRALMutationQueue<OfflineMutation>(
  durableStore,
  "kmral:science:offline:v1",
);

const repository = new KMRALExperimentRepositoryAdapter(snapshotStore);
const offline = new KMRALExperimentOfflineQueueAdapter(mutationQueue);

const runtime = new ExperimentRuntime({
  experimentId: experiment.id,
  initialScience: experiment.initialState,
  science: new UnifiedScienceKernel(scienceTick),
  repository,
  offline,
});

const sandbox = createScienceSandboxApp(runtime);
const application = sandbox.application;
const domain = application.domain;
const controller = new KMRALUIController(domain);

let connection: "ONLINE" | "OFFLINE" = "ONLINE";
let lastSyncCount = 0;

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) {
  throw new Error("KMRAL mobile root element is missing");
}

function render(): void {
  const state = controller.getState();
  const velocity = state.science.physics.velocityMps.value;
  const pending = offline.pending(state.experimentId).length;

  root.innerHTML = `
    <section class="shell" data-kmral="mobile-runtime">
      <header class="hero">
        <p class="eyebrow">KMRAL MOBILE RUNTIME</p>
        <h1>Science Sandbox Mobile</h1>
        <p class="subtitle">KMRAL shell → KMRL experiment domain</p>
      </header>

      <section class="card" data-kmrl="composition">
        <div class="row"><span>Application</span><strong>${application.appId}</strong></div>
        <div class="row"><span>Domain</span><strong>${domain.domainId}</strong></div>
        <div class="row"><span>Runtime state</span><strong id="status">${state.status}</strong></div>
        <div class="row"><span>Tick</span><strong id="tick">${state.tick}</strong></div>
        <div class="row"><span>Velocity</span><strong id="velocity">${velocity.toFixed(3)} m/s</strong></div>
      </section>

      <section class="card persistence-card" data-kmral="persistence">
        <div class="row">
          <span>Connection</span>
          <strong id="connection" data-state="${connection}">${connection}</strong>
        </div>
        <div class="row">
          <span>Pending local mutations</span>
          <strong id="pending">${pending}</strong>
        </div>
        <div class="row">
          <span>Last local sync</span>
          <strong id="last-sync">${lastSyncCount} mutation(s)</strong>
        </div>
      </section>

      <section class="controls" aria-label="Experiment controls">
        <button data-action="START">Start</button>
        <button data-action="STEP">Step</button>
        <button data-action="PAUSE">Pause</button>
        <button data-action="RESET">Reset</button>
      </section>

      <section class="controls persistence-controls" aria-label="Persistence controls">
        <button data-action="TOGGLE_CONNECTION" class="secondary">
          Go ${connection === "ONLINE" ? "Offline" : "Online"}
        </button>
        <button data-action="SYNC" class="secondary" ${connection === "OFFLINE" || pending === 0 ? "disabled" : ""}>
          Sync Local Queue
        </button>
      </section>

      <p class="ownership">
        KMRL owns scientific state and experiment semantics. KMRAL provides reusable persistence and offline primitives.
      </p>
    </section>
  `;

  root.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;

      if (action === "TOGGLE_CONNECTION") {
        connection = connection === "ONLINE" ? "OFFLINE" : "ONLINE";
        render();
        return;
      }

      if (action === "SYNC") {
        if (connection === "OFFLINE") return;
        lastSyncCount = runtime.sync().length;
        render();
        return;
      }

      if (action === "START" || action === "PAUSE" || action === "RESET") {
        controller.dispatch({ type: action });
      } else if (action === "STEP") {
        controller.dispatch({
          type: "STEP",
          input: { dtS: 0.1, netForce: { value: 2, unit: "N" } },
        });
      }

      render();
    });
  });
}

render();
