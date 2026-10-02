import { InMemoryExperimentRepository } from "../../src/kmrl/contracts/data.js";
import { InMemoryOfflineQueue } from "../../src/kmrl/contracts/offline.js";
import { UnifiedScienceKernel } from "../../src/kmrl/contracts/science.js";
import { scienceTick } from "../../src/kmrl/simulation/v1-d/science/index.js";
import { ExperimentRuntime } from "../../src/kmrl/runtime/experiment-runtime.js";
import { getExperiment } from "../../src/kmrl/learning/experiment-library.js";
import { createScienceSandboxApp } from "../../src/kmrl/app/science-sandbox-app.js";
import "./styles.css";

const experiment = getExperiment("physics-constant-force");

const runtime = new ExperimentRuntime({
  experimentId: experiment.id,
  initialScience: experiment.initialState,
  science: new UnifiedScienceKernel(scienceTick),
  repository: new InMemoryExperimentRepository(),
  offline: new InMemoryOfflineQueue(),
});

const sandbox = createScienceSandboxApp(runtime);
const application = sandbox.application;
const domain = application.domain;

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) {
  throw new Error("KMRAL mobile root element is missing");
}

function render(): void {
  const state = domain.getState();
  const velocity = state.science.physics.velocityMps.value;

  root.innerHTML = `
    <section class="shell" data-kmral="mobile-runtime">
      <header>
        <p class="eyebrow">KMRAL MOBILE RUNTIME</p>
        <h1>Science Sandbox Mobile</h1>
        <p class="subtitle">KMRAL shell → KMRL experiment domain</p>
      </header>

      <section class="card" data-kmrl="composition">
        <div class="row"><span>Application</span><strong>${application.appId}</strong></div>
        <div class="row"><span>Domain</span><strong>${domain.domainId}</strong></div>
        <div class="row"><span>Status</span><strong id="status">${state.status}</strong></div>
        <div class="row"><span>Tick</span><strong id="tick">${state.tick}</strong></div>
        <div class="row"><span>Velocity</span><strong id="velocity">${velocity.toFixed(3)} m/s</strong></div>
      </section>

      <section class="controls" aria-label="Experiment controls">
        <button data-action="START">Start</button>
        <button data-action="STEP">Step</button>
        <button data-action="PAUSE">Pause</button>
        <button data-action="RESET">Reset</button>
      </section>

      <p class="ownership">
        Scientific state is owned by KMRL. KMRAL provides the reusable application boundary.
      </p>
    </section>
  `;

  root.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "START" || action === "PAUSE" || action === "RESET") {
        domain.dispatch({ type: action });
      } else if (action === "STEP") {
        domain.dispatch({
          type: "STEP",
          input: { dtS: 0.1, netForce: { value: 2, unit: "N" } },
        });
      }
      render();
    });
  });
}

render();
