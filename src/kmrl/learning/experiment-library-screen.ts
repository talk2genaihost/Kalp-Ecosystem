import { getExperiment, listExperiments, type ExperimentDefinition } from "./experiment-library.js";
import { renderExperimentLibrary } from "./experiment-library-renderer.js";

export interface ExperimentLibraryScreenOptions {
  readonly onStartExperiment: (experiment: ExperimentDefinition) => void;
}

export class ExperimentLibraryScreen {
  private root?: HTMLElement;

  constructor(private readonly options: ExperimentLibraryScreenOptions) {}

  mount(root: HTMLElement): void {
    this.root = root;
    this.render();
  }

  render(): void {
    if (!this.root) return;
    this.root.innerHTML = renderExperimentLibrary(listExperiments());
    this.root.querySelectorAll<HTMLButtonElement>('[data-action="start-experiment"]').forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.experimentId;
        if (id) this.options.onStartExperiment(getExperiment(id));
      });
    });
  }
}
