import {
  createDynamicExperimentRuntime,
  type DynamicExperimentRuntime,
} from "./dynamic-experiment-runtime.js";

export interface DynamicExperimentScreenOptions {
  readonly onBackToLibrary: () => void;
}

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatValue = (value: number | string): string =>
  typeof value === "number" ? Number(value.toFixed(4)).toString() : String(value);

export class DynamicExperimentScreen {
  private root?: HTMLElement;

  constructor(
    private readonly runtime: DynamicExperimentRuntime,
    private readonly options: DynamicExperimentScreenOptions,
  ) {}

  mount(root: HTMLElement): void {
    this.root = root;
    this.render();
  }

  private dispatch(action: Parameters<DynamicExperimentRuntime["dispatch"]>[0]): void {
    this.runtime.dispatch(action);
    this.render();
  }

  private render(): void {
    if (!this.root) return;
    const definition = this.runtime.getDefinition();
    const snapshot = this.runtime.getSnapshot();
    const editable = definition.parameters.filter((item) => item.learnerEditable);

    const parameterPanel = definition.parameters.length
      ? definition.parameters.map((parameter) => `
        <label class="kmrl-dynamic-parameter">
          <span>${escapeHtml(parameter.parameterName)} <small>${escapeHtml(parameter.unit)}</small></span>
          <input
            data-parameter-id="${escapeHtml(parameter.parameterId)}"
            type="number"
            value="${escapeHtml(String(parameter.value))}"
            min="${escapeHtml(String(parameter.min))}"
            max="${escapeHtml(String(parameter.max))}"
            step="any"
            ${parameter.learnerEditable ? "" : "disabled"}
          />
          <small>${parameter.learnerEditable ? `Range: ${escapeHtml(String(parameter.min))}–${escapeHtml(String(parameter.max))}` : "Fixed by experiment contract"}</small>
        </label>`).join("")
      : "<p>No parameters declared.</p>";

    const procedurePanel = definition.procedureSteps.length
      ? definition.procedureSteps.map((step, index) => `
        <li class="kmrl-dynamic-step">
          <span>${index + 1}</span>
          <div><strong>${escapeHtml(step.stepType)}</strong><p>${escapeHtml(step.instruction)}</p><small>Runtime: ${escapeHtml(step.runtimeAction)}</small></div>
        </li>`).join("")
      : "<li>No procedure steps declared.</li>";

    const measurements = snapshot.measurements.length
      ? snapshot.measurements.map((measurement) => `
        <div class="kmrl-dynamic-measurement">
          <strong>${escapeHtml(measurement.label)}</strong>
          <span>${formatValue(measurement.quantity.value)} ${escapeHtml(measurement.quantity.unit)}</span>
        </div>`).join("")
      : "<p>No measurements yet. Run a step and choose Measure.</p>";

    const safety = definition.safety.length
      ? `<div class="kmrl-dynamic-safety"><strong>Safety</strong>${definition.safety.map((item) => `<p>${escapeHtml(item.hazards)} ${escapeHtml(item.restrictions)}</p>`).join("")}</div>`
      : "";

    this.root.innerHTML = `
      <section class="kmrl-shell" data-kmrl="dynamic-experiment">
        <header class="kmrl-header">
          <div>
            <div class="kmrl-eyebrow">KMRL • EXCEL CATALOG RUNTIME</div>
            <h1>${escapeHtml(definition.experiment.experimentName)}</h1>
            <p>${escapeHtml(definition.experiment.experimentId)} · ${escapeHtml(definition.experiment.domain)} · Model ${escapeHtml(snapshot.modelId)}</p>
          </div>
          <div class="kmrl-status-row">
            <button data-action="back">Experiment Library</button>
            <span class="kmrl-badge status-${snapshot.status.toLowerCase()}">${snapshot.status}</span>
            <span class="kmrl-pending">Tick ${snapshot.tick}</span>
          </div>
        </header>

        <main class="kmrl-workspace">
          <section class="kmrl-canvas-card">
            <div class="kmrl-card-title"><span>Interactive Simulation</span><span>Catalog-driven</span></div>
            <div class="kmrl-canvas" aria-label="Generic KMRL simulation surface">
              <div class="kmrl-grid"></div>
              <div class="kmrl-dynamic-stage">
                <div class="kmrl-dynamic-stage-label">${escapeHtml(definition.experiment.category)}</div>
                <strong>${escapeHtml(definition.experiment.experimentName)}</strong>
                <span>${escapeHtml(definition.experiment.modelType)}</span>
              </div>
            </div>
            <div class="kmrl-measure-strip">
              <div><span>Parameters</span><strong>${definition.parameters.length}</strong></div>
              <div><span>Procedure</span><strong>${definition.procedureSteps.length} steps</strong></div>
              <div><span>Measurements</span><strong>${definition.measurements.length}</strong></div>
              <div><span>Model</span><strong>${snapshot.modelId}</strong></div>
            </div>
          </section>

          <aside class="kmrl-panel">
            <div class="kmrl-panel-section">
              <div class="kmrl-card-title"><span>Experiment Controls</span></div>
              <div class="kmrl-actions">
                <button data-action="start" ${snapshot.status !== "CREATED" ? "disabled" : ""}>Start</button>
                <button data-action="pause" ${snapshot.status !== "RUNNING" ? "disabled" : ""}>Pause</button>
                <button data-action="resume" ${snapshot.status !== "PAUSED" ? "disabled" : ""}>Resume</button>
                <button data-action="step" ${snapshot.status !== "RUNNING" ? "disabled" : ""}>Step</button>
                <button data-action="measure" ${!["RUNNING", "PAUSED"].includes(snapshot.status) ? "disabled" : ""}>Measure</button>
                <button data-action="reset">Reset</button>
                <button data-action="stop" ${!["RUNNING", "PAUSED"].includes(snapshot.status) ? "disabled" : ""}>Finish</button>
              </div>
            </div>

            <div class="kmrl-panel-section">
              <div class="kmrl-card-title"><span>Excel Parameters</span><span>${editable.length} editable</span></div>
              <div class="kmrl-dynamic-parameters">${parameterPanel}</div>
            </div>

            <div class="kmrl-panel-section">
              <div class="kmrl-card-title"><span>Measurements</span></div>
              <div class="kmrl-dynamic-measurements">${measurements}</div>
            </div>
          </aside>
        </main>

        <section class="kmrl-guided-card">
          <div class="kmrl-card-title"><span>Procedure</span><span>${definition.procedureSteps.length} catalog steps</span></div>
          <ol class="kmrl-dynamic-procedure">${procedurePanel}</ol>
          ${safety}
        </section>
      </section>`;

    this.root.querySelector('[data-action="back"]')?.addEventListener("click", this.options.onBackToLibrary);
    this.root.querySelector('[data-action="start"]')?.addEventListener("click", () => this.dispatch({ type: "START" }));
    this.root.querySelector('[data-action="pause"]')?.addEventListener("click", () => this.dispatch({ type: "PAUSE" }));
    this.root.querySelector('[data-action="resume"]')?.addEventListener("click", () => this.dispatch({ type: "RESUME" }));
    this.root.querySelector('[data-action="step"]')?.addEventListener("click", () => this.dispatch({ type: "STEP" }));
    this.root.querySelector('[data-action="measure"]')?.addEventListener("click", () => this.dispatch({ type: "MEASURE" }));
    this.root.querySelector('[data-action="reset"]')?.addEventListener("click", () => this.dispatch({ type: "RESET" }));
    this.root.querySelector('[data-action="stop"]')?.addEventListener("click", () => this.dispatch({ type: "STOP" }));

    this.root.querySelectorAll<HTMLInputElement>("[data-parameter-id]").forEach((input) => {
      input.addEventListener("change", () => {
        const parameterId = input.dataset.parameterId;
        if (!parameterId) return;
        const value = Number(input.value);
        this.dispatch({ type: "SET_PARAMETER", parameterId, value: Number.isFinite(value) ? value : input.value });
      });
    });
  }
}
