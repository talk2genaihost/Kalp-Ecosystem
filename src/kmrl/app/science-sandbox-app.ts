import { createKMRALApplication, type KMRALApplication } from "../../kmral/application.js";
import { KMRLExperimentDomainAdapter } from "./kmral-experiment-adapter.js";
import type { ExperimentCommand, ExperimentSnapshot } from "../runtime/types.js";
import type { ExperimentRuntime } from "../runtime/experiment-runtime.js";

export interface ScienceSandboxApp {
  readonly application: KMRALApplication<ExperimentSnapshot, ExperimentCommand>;
  readonly runtime: ExperimentRuntime;
}

export function createScienceSandboxApp(
  runtime: ExperimentRuntime,
): ScienceSandboxApp {
  const domain = new KMRLExperimentDomainAdapter(runtime);

  return {
    application: createKMRALApplication("science-sandbox", domain),
    runtime,
  };
}
