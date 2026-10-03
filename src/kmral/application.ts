export interface KMRALDomainPort<State, Action> {
  readonly domainId: string;
  getState(): State;
  dispatch(action: Action): State;
}

export interface KMRALApplication<State, Action> {
  readonly appId: string;
  readonly domain: KMRALDomainPort<State, Action>;
}

export function createKMRALApplication<State, Action>(
  appId: string,
  domain: KMRALDomainPort<State, Action>,
): KMRALApplication<State, Action> {
  return { appId, domain };
}
