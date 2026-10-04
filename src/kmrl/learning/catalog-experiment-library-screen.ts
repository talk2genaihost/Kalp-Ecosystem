import type { StemLabCatalog } from "./excel-catalog-loader.js";
import type { KMRLModelRegistry } from "./model-registry.js";

export interface CatalogExperimentLibraryScreenOptions {
  readonly catalog: StemLabCatalog;
  readonly registry: KMRLModelRegistry;
  readonly onStartExperiment: (experimentId: string) => void;
}

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export class CatalogExperimentLibraryScreen {
  private root?: HTMLElement;

  constructor(private readonly options: CatalogExperimentLibraryScreenOptions) {}

  mount(root: HTMLElement): void {
    this.root = root;
    this.render();
  }

  private render(): void {
    if (!this.root) return;

    const groups = ["PHYSICS", "CHEMISTRY", "MATHEMATICS"] as const;
    const sections = groups.map((domain) => {
      const experiments = this.options.catalog.experiments.filter((item) => item.domain === domain);
      const cards = experiments.map((experiment) => {
        const model = this.options.registry.get(experiment.modelId);
        const executable = model?.status === "EXECUTABLE";
        return `
          <article class="kmrl-experiment-card" data-domain="${domain.toLowerCase()}">
            <div class="kmrl-experiment-card__domain">${escapeHtml(domain)}</div>
            <h3>${escapeHtml(experiment.experimentName)}</h3>
            <p>${escapeHtml(experiment.category)}</p>
            <div class="kmrl-experiment-card__meta">
              ${escapeHtml(experiment.level)} · ${escapeHtml(experiment.status)} · Model ${escapeHtml(experiment.modelId)}
            </div>
            <button type="button" data-action="start-experiment" data-experiment-id="${escapeHtml(experiment.experimentId)}" ${executable ? "" : "disabled"}>
              ${executable ? "Launch in Sandbox" : "Model not executable"}
            </button>
          </article>`;
      }).join("");

      return `
        <section aria-labelledby="${domain.toLowerCase()}-heading">
          <h2 id="${domain.toLowerCase()}-heading">${domain}</h2>
          <div class="kmrl-experiment-grid">${cards || "<p>No experiments defined.</p>"}</div>
        </section>`;
    }).join("");

    const executableCount = this.options.catalog.experiments.filter(
      (experiment) => this.options.registry.get(experiment.modelId)?.status === "EXECUTABLE",
    ).length;

    this.root.innerHTML = `
      <main class="kmrl-experiment-library" aria-label="KMRL Excel Experiment Library">
        <header class="kmrl-experiment-library__header">
          <div>
            <div class="kmrl-kicker">KMRL · EXCEL CATALOG</div>
            <h1>Science Sandbox</h1>
            <p>Experiments are loaded from the Excel catalog and launched through the Dynamic Experiment Runtime.</p>
          </div>
          <div class="kmrl-status-row">
            <span class="kmrl-badge status-created">${this.options.catalog.experiments.length} catalog experiments</span>
            <span class="kmrl-badge sync-online">${executableCount} executable</span>
          </div>
        </header>
        ${sections}
      </main>`;

    this.root.querySelectorAll<HTMLButtonElement>('[data-action="start-experiment"]').forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.experimentId;
        if (id) this.options.onStartExperiment(id);
      });
    });
  }
}
