import { LocalExperimentRepository } from "../data/local-experiment-repository.js";
import { LocalMutationQueue } from "../offline/local-mutation-queue.js";
import { UnifiedScienceKernel } from "../contracts/science.js";
import { scienceTick } from "../simulation/v1-d/science/index.js";
import { ExperimentRuntime } from "../runtime/experiment-runtime.js";
import { MainSandboxScreen } from "../ui/main-sandbox-screen.js";
import { createMainSandboxSyncPort } from "./remote-sync.js";
import { ExperimentLibraryScreen } from "../learning/experiment-library-screen.js";
import { getExperiment, GuidedExperimentSession, type ExperimentDefinition } from "../learning/experiment-library.js";
import { createScienceSandboxApp } from "./science-sandbox-app.js";

const repository = new LocalExperimentRepository();
const offline = new LocalMutationQueue();
const rootElement = document.getElementById("kmrl-app");
if (!(rootElement instanceof HTMLElement)) throw new Error("KMRL app root not found");
const root: HTMLElement = rootElement;
const syncPort = createMainSandboxSyncPort(repository, offline);

const launch = (experiment: ExperimentDefinition): void => {
  const runtime = new ExperimentRuntime({ experimentId: experiment.id, initialScience: experiment.initialState, science: new UnifiedScienceKernel(scienceTick), repository, offline });
  const sandbox = createScienceSandboxApp(runtime);
  const guided = new GuidedExperimentSession(experiment, experiment.id);
  new MainSandboxScreen(sandbox.application.domain, offline, syncPort, { onOpenLibrary: showLibrary }, guided).mount(root);
};

function showLibrary(): void {
  new ExperimentLibraryScreen({ onStartExperiment: launch }).mount(root);
}

launch(getExperiment("physics-constant-force"));
