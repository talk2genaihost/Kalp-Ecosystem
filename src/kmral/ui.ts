import type { KMRALDomainPort } from './application.js';

export class KMRALUIController<State, Action> {
  constructor(private readonly domain: KMRALDomainPort<State, Action>) {}

  getState(): State {
    return this.domain.getState();
  }

  dispatch(action: Action): State {
    return this.domain.dispatch(action);
  }
}
