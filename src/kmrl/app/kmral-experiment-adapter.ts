import type { KMRALDomainPort } from "../../kmral/application.js";
import type { ExperimentCommand, ExperimentSnapshot } from "../runtime/types.js";
import type { ExperimentRuntime } from "../runtime/experiment-runtime.js";

export const KMRL_EXPERIMENT_DOMAIN_ID = "KMRL-EXPERIMENT";

export class KMRLExperimentDomainAdapter
  implements KMRALDomainPort<ExperimentSnapshot, ExperimentCommand>
{
  readonly domainId = KMRL_EXPERIMENT_DOMAIN_ID;

  constructor(private readonly runtime: ExperimentRuntime) {}

  getState(): ExperimentSnapshot {
    return this.runtime.getState();
  }

  dispatch(command: ExperimentCommand): ExperimentSnapshot {
    return this.runtime.dispatch(command);
  }
}
